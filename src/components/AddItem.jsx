import { useRef, useState } from 'react'
import { db } from '../db.js'
import { defaultSeason } from '../options.js'
import { downscale, cutout, trimTransparent, dominantColor } from '../lib/image.js'
import ItemImage from './ItemImage.jsx'
import TouchUp from './TouchUp.jsx'
import SectionPicker from './SectionPicker.jsx'
import DetailsForm from './DetailsForm.jsx'

const SLOTS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back (optional)' },
]

const EMPTY_DETAILS = { category: null, color: null, season: null, occasions: [], tags: [], notes: '' }

export default function AddItem({ itemCount, onClose, onSaved }) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)
  const targetRef = useRef('front')
  const colorTouched = useRef(false)

  const [photos, setPhotos] = useState({ front: null, back: null })
  const [busy, setBusy] = useState(null) // { slot, message, pct }
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null) // 'front' | 'back'
  const [name, setName] = useState('')
  const [section, setSection] = useState(null)
  const [details, setDetails] = useState(EMPTY_DETAILS)
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)

  const setPhoto = (slot, value) => setPhotos((p) => ({ ...p, [slot]: value }))

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

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const slot = targetRef.current

    setNotice('')
    setBusy({ slot, message: 'Preparing your photo', pct: null })
    try {
      const original = await downscale(file)

      let raw
      let lastPct = -1
      try {
        raw = await cutout(original, (key, current, total) => {
          const pct = total ? Math.round((current / total) * 100) : null
          if (pct === lastPct && pct !== null) return
          lastPct = pct
          setBusy({
            slot,
            message: key.startsWith('fetch')
              ? 'Downloading the cutout model (first time only)'
              : 'Cutting out your clothes',
            pct,
          })
        })
      } catch (err) {
        console.error('Cutout failed:', err)
        raw = original
        setNotice(
          'Automatic cutout did not work, so your original photo is shown. You can erase the background by hand with Touch up, or try another photo.'
        )
      }

      const final = await trimTransparent(raw)
      setPhoto(slot, { original, raw, final })
      if (slot === 'front') autoColor(final)
    } catch (err) {
      setNotice(err?.message || 'Something went wrong with this photo.')
    } finally {
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

  async function save() {
    setSaving(true)
    try {
      const now = Date.now()
      await db.items.add({
        name: name.trim() || `Item ${itemCount + 1}`,
        section,
        category: details.category,
        color: details.color,
        season: details.season || defaultSeason(section),
        occasions: details.occasions,
        tags: details.tags,
        notes: details.notes.trim(),
        front: photos.front.final,
        back: photos.back ? photos.back.final : null,
        createdAt: now,
        updatedAt: now,
      })
      // ask the browser not to clear our storage when the phone is low on space
      navigator.storage?.persist?.()
      onSaved(section)
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
        <p className="muted tip">Use a plain, contrasting background and good light for the cleanest cutout.</p>

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
          <SectionPicker value={section} onChange={setSection} />
        </div>

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
