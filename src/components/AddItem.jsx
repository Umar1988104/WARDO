import { useRef, useState } from 'react'
import { db } from '../db.js'
import { defaultSeason } from '../options.js'
import { downscale, cutout, trimTransparent, dominantColor, makeThumb, compactImage, bgSimilarity, MODELS } from '../lib/image.js'
import ItemImage from './ItemImage.jsx'
import TouchUp from './TouchUp.jsx'
import ManualCut from './ManualCut.jsx'
import Segmented from './Segmented.jsx'
import SectionPicker from './SectionPicker.jsx'
import DetailsForm from './DetailsForm.jsx'
import FolderField from './FolderField.jsx'
import FolderSheet from './FolderSheet.jsx'

const SLOTS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back (optional)' },
]

const EMPTY_DETAILS = { category: null, color: null, season: null, occasions: [], tags: [], notes: '' }

const CUT_MODES = [
  { value: 'auto', label: 'Auto cutout' },
  { value: 'manual', label: 'Cut out myself' },
]

function loadCutMode() {
  try {
    return localStorage.getItem('wardo-cut-mode') === 'manual' ? 'manual' : 'auto'
  } catch {
    return 'auto'
  }
}

export default function AddItem({ itemCount, folders, actions, defaultSection = null, defaultFolderId = null, onClose, onSaved, onBatch }) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const targetRef = useRef('front')
  const colorTouched = useRef(false)

  const [photos, setPhotos] = useState({ front: null, back: null })
  const [busy, setBusy] = useState(null) // { slot, message, pct }
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null) // 'front' | 'back'
  const [warn, setWarn] = useState(null) // { slot, original, similar, busy } before an auto cutout that may be rough
  const [manual, setManual] = useState(null) // { slot, original } while the by-hand cutout is open
  const [cutMode, setCutModeState] = useState(loadCutMode)
  const [name, setName] = useState('')
  const [section, setSection] = useState(defaultSection)
  const [folderId, setFolderId] = useState(defaultSection ? defaultFolderId : null)
  const [folderSheet, setFolderSheet] = useState(false)
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)

  const setPhoto = (slot, value) => setPhotos((p) => ({ ...p, [slot]: value }))

  function setCutMode(mode) {
    setCutModeState(mode)
    try {
      localStorage.setItem('wardo-cut-mode', mode)
    } catch {
      /* the choice just will not be remembered */
    }
  }

  function chooseSection(id) {
    if (id !== section) setFolderId(null) // folders belong to one section
    setSection(id)
  }

  function updateDetails(patch) {
    if ('color' in patch) colorTouched.current = true
    setDetails((d) => ({ ...d, ...patch }))
  }

  // detect the colour from the front photo, unless the user already picked one
  async function autoColor(blob) {
    if (colorTouched.current) return
    try {
      const name = await dominantColor(blob)
      if (name && !colorTouched.current) setDetails((d) => ({ ...d, color: name }))
    } catch (err) {
      console.error('Colour detection failed:', err)
    }
  }

  function pick(slot, kind) {
    targetRef.current = slot
    const input = kind === 'camera' ? cameraRef.current : galleryRef.current
    input?.click()
  }

  // model: 'fast' (default) or 'best' (the other free model, used for the quick retry)
  async function runAuto(slot, original, model = 'fast') {
    setNotice('')
    setBusy({ slot, message: model === 'best' ? 'Trying the best-quality model' : 'Cutting out your clothes', pct: null })
    try {
      let raw
      let lastPct = -1
      try {
        raw = await cutout(
          original,
          (key, current, total) => {
            const pct = total ? Math.round((current / total) * 100) : null
            if (pct === lastPct && pct !== null) return
            lastPct = pct
            setBusy({
              slot,
              message: key.startsWith('fetch')
                ? 'Downloading the cutout model (first time only)'
                : model === 'best'
                  ? 'Trying the best-quality model'
                  : 'Cutting out your clothes',
              pct,
            })
          },
          MODELS[model]
        )
      } catch (err) {
        console.error('Cutout failed:', err)
        raw = original
        setNotice(
          'Automatic cutout did not work, so your original photo is shown. Tap Cut by hand to outline the clothing yourself, or try another photo.'
        )
      }

      const final = await trimTransparent(raw)
      setPhoto(slot, { original, raw, final, model })
      if (slot === 'front') autoColor(final)
    } catch (err) {
      setNotice(err?.message || 'Something went wrong with this photo.')
    } finally {
      setBusy(null)
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const slot = targetRef.current

    setNotice('')
    setWarn(null)
    setBusy({ slot, message: 'Preparing your photo', pct: null })
    try {
      const original = await downscale(file)

      if (cutMode === 'manual') {
        // no AI model to download: you cut it out yourself
        setManual({ slot, original })
        setBusy(null)
        return
      }

      // warn first if the background looks like the clothes, instead of after a slow rough cutout
      const check = await bgSimilarity(original).catch(() => null)
      if (check && (check.similar || check.busy)) {
        setWarn({ slot, original, similar: check.similar, busy: check.busy })
        setBusy(null)
        return
      }
      await runAuto(slot, original)
    } catch (err) {
      setNotice(err?.message || 'Something went wrong with this photo.')
      setBusy(null)
    }
  }

  async function finishTouchUp(blob) {
    const slot = editing
    const current = photos[slot]
    try {
      const final = await trimTransparent(blob)
      setPhoto(slot, { ...current, raw: blob, final })
      if (slot === 'front') autoColor(final)
    } finally {
      setEditing(null)
    }
  }

  async function finishManual(blob) {
    const { slot, original } = manual
    try {
      const final = await trimTransparent(blob)
      setPhoto(slot, { original, raw: blob, final })
      if (slot === 'front') autoColor(final)
    } catch (err) {
      setNotice(err?.message || 'Something went wrong with this photo.')
    } finally {
      setManual(null)
    }
  }

  async function newFolder(folderName) {
    const id = await actions.createFolder(section, folderName)
    setFolderId(id)
    setFolderSheet(false)
  }

  async function save() {
    setSaving(true)
    try {
      const now = Date.now()
      // smaller files on the phone, plus a tiny preview so grids stay fast
      const front = await compactImage(photos.front.final)
      const back = photos.back ? await compactImage(photos.back.final) : null
      const thumb = await makeThumb(front)
      await db.items.add({
        name: name.trim() || `Item ${itemCount + 1}`,
        section,
        category: details.category,
        color: details.color,
        season: details.season || defaultSeason(section),
        occasions: details.occasions,
        tags: details.tags,
        notes: details.notes.trim(),
        folderId: folderId ?? null,
        front,
        back,
        thumb,
        createdAt: now,
        updatedAt: now,
      })
      // ask the browser not to clear our storage when the phone is low on space
      navigator.storage?.persist?.()
      onSaved(section, folderId ?? null)
    } catch (err) {
      console.error(err)
      setNotice('Could not save this item on your phone. Check that storage is not full and try again.')
      setSaving(false)
    }
  }

  const canSave = photos.front && section && !busy && !saving

  return (
    <div className="overlay addflow">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Cancel
        </button>
        <strong>New item</strong>
        <span className="ov-spacer" />
      </header>

      <div className="ov-body">
        {onBatch && (
          <button type="button" className="batch-link glass" onClick={onBatch}>
            <span>
              <strong>Add many at once</strong>
              <em>Photograph lots of clothes now, name them later</em>
            </span>
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </button>
        )}
        <Segmented options={CUT_MODES} value={cutMode} onChange={setCutMode} />
        <p className="muted tip">
          {cutMode === 'auto'
            ? 'Use a plain, contrasting background and good light for the cleanest cutout.'
            : 'After you pick a photo, draw around the clothing with your finger. No download needed, and it is light on your phone.'}
        </p>

        <div className="slots">
          {SLOTS.map(({ id, label }) => {
            const photo = photos[id]
            const working = busy && busy.slot === id
            return (
              <div className="slot-wrap" key={id}>
                <div className="slot checker">
                  {photo && <ItemImage blob={photo.final} alt={label} className="slot-img" />}
                  {!photo && !working && <span className="slot-label">{label}</span>}
                  {working && (
                    <div className="slot-busy">
                      <div className="spinner" />
                      <span>{busy.message}</span>
                      {busy.pct !== null && (
                        <div className="bar">
                          <i style={{ width: busy.pct + '%' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="slot-actions">
                  <button className="pill" disabled={!!busy} onClick={() => pick(id, 'camera')}>
                    Camera
                  </button>
                  <button className="pill" disabled={!!busy} onClick={() => pick(id, 'gallery')}>
                    Gallery
                  </button>
                  {photo && (
                    <>
                      {photo.model !== 'best' && cutMode === 'auto' && (
                        <button className="pill" disabled={!!busy} onClick={() => runAuto(id, photo.original, 'best')}>
                          Retry (best quality)
                        </button>
                      )}
                      <button className="pill" disabled={!!busy} onClick={() => setManual({ slot: id, original: photo.original })}>
                        Cut by hand
                      </button>
                      <button className="pill" disabled={!!busy} onClick={() => setEditing(id)}>
                        Touch up
                      </button>
                      <button className="pill pill-quiet" disabled={!!busy} onClick={() => setPhoto(id, null)}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {(photos.front || photos.back) && !warn && (
          <p className="muted tip">Edges look rough? Try Retry (best quality), Touch up, or Cut by hand.</p>
        )}

        {warn && (
          <div className="warn-card glass">
            <strong>This photo may cut out roughly</strong>
            <p className="muted">
              {warn.similar && 'The background looks close to the colour of the clothing. '}
              {warn.busy && 'The background looks busy. '}
              A plain background in a different colour, with good light, gives the cleanest result.
            </p>
            <div className="group-buttons">
              <button
                className="btn-primary"
                onClick={() => {
                  const w = warn
                  setWarn(null)
                  runAuto(w.slot, w.original)
                }}
              >
                Cut out anyway
              </button>
              <button
                className="pill"
                onClick={() => {
                  const w = warn
                  setWarn(null)
                  setManual({ slot: w.slot, original: w.original })
                }}
              >
                Cut by hand
              </button>
              <button
                className="pill pill-quiet"
                onClick={() => {
                  const w = warn
                  setWarn(null)
                  pick(w.slot, 'camera')
                }}
              >
                Retake photo
              </button>
            </div>
          </div>
        )}

        {notice && <p className="notice">{notice}</p>}

        <label className="field">
          <span>Name (optional)</span>
          <input
            type="text"
            value={name}
            maxLength={40}
            placeholder="Blue slim jeans"
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="field">
          <span>Section</span>
          <SectionPicker value={section} onChange={chooseSection} />
        </div>

        <FolderField section={section} folders={folders} value={folderId} onChange={setFolderId} onNew={() => setFolderSheet(true)} />

        <button type="button" className="more-toggle glass" aria-expanded={more} onClick={() => setMore(!more)}>
          <span>
            More details
            {details.color && !more ? ' · detected ' + details.color.toLowerCase() : ''}
          </span>
          <span className={'chev' + (more ? ' chev-open' : '')} aria-hidden="true">
            ›
          </span>
        </button>
        {more && <DetailsForm section={section} value={details} onChange={updateDetails} />}

        <button className="btn-primary btn-wide" disabled={!canSave} onClick={save}>
          {saving ? 'Saving' : 'Save to wardrobe'}
        </button>
        {!photos.front && <p className="muted center">Add a front photo to continue.</p>}
        {photos.front && !section && <p className="muted center">Choose a section to continue.</p>}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />

      {manual && <ManualCut originalBlob={manual.original} onDone={finishManual} onCancel={() => setManual(null)} />}

      {folderSheet && (
        <FolderSheet
          title="New folder"
          cta="Create folder"
          takenNames={folders.filter((f) => f.section === section).map((f) => f.name)}
          onClose={() => setFolderSheet(false)}
          onSave={newFolder}
        />
      )}

      {editing && photos[editing] && (
        <TouchUp
          originalBlob={photos[editing].original}
          cutoutBlob={photos[editing].raw}
          onDone={finishTouchUp}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
