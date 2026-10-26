import { useState } from 'react'
import { db } from '../db.js'
import { CATEGORIES, defaultSeason } from '../options.js'
import SectionPicker from './SectionPicker.jsx'
import DetailsForm from './DetailsForm.jsx'
import FolderField from './FolderField.jsx'
import FolderSheet from './FolderSheet.jsx'

export default function EditItem({ item, folders, actions, onClose, onSaved }) {
  const [name, setName] = useState(item.name || '')
  const [section, setSection] = useState(item.section)
  const [details, setDetails] = useState({
    category: item.category || null,
    color: item.color || null,
    season: item.season || null,
    occasions: item.occasions || [],
    tags: item.tags || [],
    notes: item.notes || '',
  })
  const [folderId, setFolderId] = useState(item.folderId ?? null)
  const [folderSheet, setFolderSheet] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (patch) => setDetails((d) => ({ ...d, ...patch }))

  function chooseSection(id) {
    if (id !== section) setFolderId(null) // folders belong to one section
    setSection(id)
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
      await db.items.update(item.id, {
        name: name.trim() || item.name,
        section,
        folderId: folderOk ? folderId : null,
        category,
        color: details.color,
        season: details.season || defaultSeason(section),
        occasions: details.occasions,
        tags: details.tags,
        notes: details.notes.trim(),
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
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} maxLength={40} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="field">
          <span>Section</span>
          <SectionPicker value={section} onChange={chooseSection} />
        </div>

        <FolderField section={section} folders={folders} value={folderId} onChange={setFolderId} onNew={() => setFolderSheet(true)} />

        <DetailsForm section={section} value={details} onChange={update} />

        {error && <p className="notice">{error}</p>}
      </div>

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
