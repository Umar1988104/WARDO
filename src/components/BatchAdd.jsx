import { useRef, useState } from 'react'
import { db } from '../db.js'
import { defaultSeason } from '../options.js'
import { downscale, cutout, trimTransparent, dominantColor, makeThumb, compactImage, MODELS } from '../lib/image.js'
import SectionPicker from './SectionPicker.jsx'
import FolderField from './FolderField.jsx'
import FolderSheet from './FolderSheet.jsx'
import { useBackClose } from '../lib/backstack.js'

// Add many pieces in a row. Pick a section once, then take or choose photos. Each one is cut out and
// saved in the background, so nothing is lost. Names and details are filled in afterwards.
export default function BatchAdd({ itemCount, folders, actions, defaultSection = null, defaultFolderId = null, onClose, onFinished }) {
  useBackClose(onClose)
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const pumping = useRef(false)
  const stopped = useRef(false)
  const counter = useRef(itemCount)
  const section = useRef(null)
  const folder = useRef(null)

  const [sec, setSec] = useState(defaultSection)
  const [folderId, setFolderId] = useState(defaultSection ? defaultFolderId : null)
  const [folderSheet, setFolderSheet] = useState(false)
  const [queue, setQueue] = useState([])
  const files = useRef(new Map()) // key -> File, released once the piece is saved
  const nextKey = useRef(1)
  const savedIds = useRef([])

  section.current = sec
  folder.current = folderId

  const patch = (key, fields) => setQueue((q) => q.map((e) => (e.key === key ? { ...e, ...fields } : e)))

  function chooseSection(id) {
    if (id !== sec) setFolderId(null)
    setSec(id)
  }

  async function pump() {
    if (pumping.current) return
    pumping.current = true
    try {
      for (;;) {
        if (stopped.current) break
        const entry = queueRef.current.find((e) => e.status === 'wait')
        if (!entry) break
        const file = files.current.get(entry.key)
        patch(entry.key, { status: 'work', msg: 'Cutting out' })
        try {
          const original = await downscale(file)
          let raw
          try {
            raw = await cutout(
              original,
              (k) => patch(entry.key, { msg: k.startsWith('fetch') ? 'Downloading model (first time)' : 'Cutting out' }),
              MODELS.fast
            )
          } catch (err) {
            console.error('Cutout failed:', err)
            throw new Error('Could not cut this one out. Add it on its own and cut it by hand.')
          }
          const final = await trimTransparent(raw)
          const front = await compactImage(final)
          const thumb = await makeThumb(front)
          const color = await dominantColor(final).catch(() => null)
          const now = Date.now()
          counter.current += 1
          const sectionId = section.current
          const id = await db.items.add({
            name: `Item ${counter.current}`,
            section: sectionId,
            category: null,
            color,
            season: defaultSeason(sectionId),
            occasions: [],
            tags: [],
            notes: '',
            folderId: folder.current ?? null,
            front,
            back: null,
            thumb,
            createdAt: now,
            updatedAt: now,
            needsDetails: true,
          })
          navigator.storage?.persist?.()
          savedIds.current.push(id)
          files.current.delete(entry.key)
          patch(entry.key, { status: 'done', msg: 'Saved' })
        } catch (err) {
          files.current.delete(entry.key)
          patch(entry.key, { status: 'fail', msg: err?.message || 'Failed' })
        }
        await new Promise((r) => setTimeout(r, 30))
      }
    } finally {
      pumping.current = false
    }
  }

  // keep a ref so the loop always sees the latest queue
  const queueRef = useRef([])
  queueRef.current = queue

  function addFiles(e) {
    const list = [...(e.target.files || [])]
    e.target.value = ''
    if (!list.length || !section.current) return
    const entries = list.map((file) => {
      const key = nextKey.current++
      files.current.set(key, file)
      return { key, url: URL.createObjectURL(file), status: 'wait', msg: 'Waiting' }
    })
    queueRef.current = [...queueRef.current, ...entries]
    setQueue(queueRef.current)
    pump()
  }

  const working = queue.some((e) => e.status === 'work')
  const waiting = queue.filter((e) => e.status === 'wait').length
  const done = queue.filter((e) => e.status === 'done').length
  const failed = queue.filter((e) => e.status === 'fail').length

  function close() {
    stopped.current = true
    queue.forEach((e) => URL.revokeObjectURL(e.url))
    onClose()
  }

  async function finish(nameNow) {
    stopped.current = true
    queue.forEach((e) => URL.revokeObjectURL(e.url))
    await actions.refresh()
    onFinished(nameNow ? [...savedIds.current] : [], sec, folderId)
  }

  async function newFolder(name) {
    const id = await actions.createFolder(sec, name)
    setFolderId(id)
    setFolderSheet(false)
  }

  return (
    <div className="overlay addflow">
      <header className="ov-head">
        <button className="ov-link" onClick={close} disabled={working}>
          {done > 0 ? 'Close' : 'Cancel'}
        </button>
        <strong>Add many</strong>
        <span className="ov-spacer" />
      </header>

      <div className="ov-body">
        <p className="muted tip">
          Choose a section once, then photograph or pick as many pieces as you like. They are cut out and saved in the
          background. You can name and tag them afterwards.
        </p>

        <div className="field">
          <span>Section</span>
          <SectionPicker value={sec} onChange={chooseSection} />
        </div>
        <FolderField section={sec} folders={folders} value={folderId} onChange={setFolderId} onNew={() => setFolderSheet(true)} />

        <div className="batch-actions">
          <button className="btn-primary" disabled={!sec} onClick={() => cameraRef.current?.click()}>
            Take a photo
          </button>
          <button className="pill" disabled={!sec} onClick={() => galleryRef.current?.click()}>
            Choose photos
          </button>
        </div>
        {!sec && <p className="muted center">Choose a section to start.</p>}
        <p className="muted tip">Tip: one piece per photo, plain background, good light. Tap Take a photo again for the next piece.</p>

        {queue.length > 0 && (
          <>
            <p className="muted results-count">
              {done} saved{waiting + (working ? 1 : 0) > 0 ? `, ${waiting + (working ? 1 : 0)} to go` : ''}
              {failed > 0 ? `, ${failed} failed` : ''}
            </p>
            <div className="batch-grid">
              {queue.map((e) => (
                <div key={e.key} className={'batch-cell batch-' + e.status}>
                  <img src={e.url} alt="" />
                  <span className="batch-state">
                    {e.status === 'work' && <i className="spinner batch-spin" />}
                    {e.status === 'done' && <b>{'\u2713'}</b>}
                    {e.status === 'fail' && <b>!</b>}
                    {e.status === 'wait' && <em>Waiting</em>}
                  </span>
                  {e.status === 'work' && <small>{e.msg}</small>}
                  {e.status === 'fail' && <small>{e.msg}</small>}
                </div>
              ))}
            </div>
          </>
        )}

        {done > 0 && (
          <div className="batch-finish">
            <button className="btn-primary btn-wide" disabled={working || waiting > 0} onClick={() => finish(true)}>
              {working || waiting > 0 ? 'Still cutting out...' : `Name and tag ${done} ${done === 1 ? 'piece' : 'pieces'}`}
            </button>
            <button className="link-btn" disabled={working || waiting > 0} onClick={() => finish(false)}>
              Later
            </button>
          </div>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={addFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={addFiles} />

      {folderSheet && (
        <FolderSheet
          title="New folder"
          cta="Create folder"
          takenNames={folders.filter((f) => f.section === sec).map((f) => f.name)}
          onClose={() => setFolderSheet(false)}
          onSave={newFolder}
        />
      )}
    </div>
  )
}
