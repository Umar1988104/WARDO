import { useState } from 'react'
import { db } from '../db.js'
import { CATEGORIES, defaultSeason } from '../options.js'
import SectionPicker from './SectionPicker.jsx'
import DetailsForm from './DetailsForm.jsx'
import FolderField from './FolderField.jsx'
import FolderSheet from './FolderSheet.jsx'
import ItemImage from './ItemImage.jsx'
import TouchUp from './TouchUp.jsx'
import { trimTransparent, compactImage, makeThumb } from '../lib/image.js'
import { parsePrice } from '../lib/money.js'
import { similarCount } from '../lib/gaps.js'
import { useBackClose } from '../lib/backstack.js'

export default function EditItem({ item, items = [], folders, actions, onClose, onSaved }) {
  useBackClose(onClose)
  const [name, setName] = useState(item.name || '')
  const [section, setSection] = useState(item.section)
  const [details, setDetails] = useState({
    category: item.category || null,
    color: item.color || null,
    season: item.season || null,
    occasions: item.occasions || [],
    tags: item.tags || [],
    notes: item.notes || '',
    price: item.price ?? '',
  })
  const [folderId, setFolderId] = useState(item.folderId ?? null)
  const [folderSheet, setFolderSheet] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // photos: the saved cutouts. Touch up changes them here, and they are written when you tap Save.
  const [photos, setPhotos] = useState({ front: item.front, back: item.back || null })
  const [editing, setEditing] = useState(null) // 'front' | 'back'

  const update = (patch) => setDetails((d) => ({ ...d, ...patch }))

  function chooseSection(id) {
    if (id !== section) setFolderId(null) // folders belong to one section
    setSection(id)
  }

  async function finishTouchUp(blob) {
    const slot = editing
    try {
      const trimmed = await trimTransparent(blob)
      setPhotos((p) => ({ ...p, [slot]: trimmed }))
    } catch {
      setError('Could not apply the touch-up. Try again.')
    } finally {
      setEditing(null)
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
      const folderOk = folderId != null && folders.some((f) => f.id === folderId && f.section === section)
      const category = details.category && (CATEGORIES[section] || []).includes(details.category) ? details.category : null
      // only photos that changed are re-compressed
      const photoChanges = {}
      if (photos.front !== item.front) {
        photoChanges.front = await compactImage(photos.front)
        photoChanges.thumb = await makeThumb(photoChanges.front)
      }
      if (photos.back !== (item.back || null)) photoChanges.back = photos.back ? await compactImage(photos.back) : null
      await db.items.update(item.id, {
        ...photoChanges,
        needsDetails: false,
        name: name.trim() || item.name,
        section,
        folderId: folderOk ? folderId : null,
        category,
        color: details.color,
        season: details.season || defaultSeason(section),
        occasions: details.occasions,
        tags: details.tags,
        notes: details.notes.trim(),
        price: parsePrice(details.price),
        updatedAt: Date.now(),
      })
      onSaved()
    } catch (err) {
      console.error(err)
      setError('Could not save your changes. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="overlay edit">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Cancel
        </button>
        <strong>Edit item</strong>
        <button className="ov-link ov-strong" onClick={save} disabled={saving || !section}>
          Save
        </button>
      </header>

      <div className="ov-body">
        <div className="field">
          <span>Photos</span>
          <div className="slots">
            {[
              { id: 'front', label: 'Front' },
              { id: 'back', label: 'Back' },
            ]
              .filter(({ id }) => photos[id])
              .map(({ id, label }) => (
                <div className="slot-wrap" key={id}>
                  <div className="slot checker">
                    <ItemImage blob={photos[id]} alt={label} className="slot-img" />
                  </div>
                  <div className="slot-actions">
                    <button className="pill" type="button" onClick={() => setEditing(id)}>
                      Touch up {label.toLowerCase()}
                    </button>
                    {id === 'back' && (
                      <button className="pill pill-quiet" type="button" onClick={() => setPhotos((p) => ({ ...p, back: null }))}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <p className="muted small">Erase leftover background or paint parts back. To redo a photo from scratch, add the piece again.</p>
        </div>

        <label className="field">
          <span>Name</span>
          <input type="text" value={name} maxLength={40} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="field">
          <span>Section</span>
          <SectionPicker value={section} onChange={chooseSection} />
        </div>

        <FolderField section={section} folders={folders} value={folderId} onChange={setFolderId} onNew={() => setFolderSheet(true)} />

        <DetailsForm section={section} value={details} onChange={update} similar={similarCount(items, details, item.id)} />

        {error && <p className="notice">{error}</p>}
      </div>

      {editing && <TouchUp originalBlob={photos[editing]} cutoutBlob={photos[editing]} onDone={finishTouchUp} onCancel={() => setEditing(null)} />}

      {folderSheet && (
        <FolderSheet
          title="New folder"
          cta="Create folder"
          takenNames={folders.filter((f) => f.section === section).map((f) => f.name)}
          onClose={() => setFolderSheet(false)}
          onSave={newFolder}
        />
      )}
    </div>
  )
}
