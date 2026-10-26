import { useState } from 'react'
import { db } from '../db.js'
import { CATEGORIES, defaultSeason } from '../options.js'
import SectionPicker from './SectionPicker.jsx'
import DetailsForm from './DetailsForm.jsx'

export default function EditItem({ item, onClose, onSaved }) {
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (patch) => setDetails((d) => ({ ...d, ...patch }))

  async function save() {
    setSaving(true)
    try {
      const category = details.category && (CATEGORIES[section] || []).includes(details.category) ? details.category : null
      await db.items.update(item.id, {
        name: name.trim() || item.name,
        section,
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
          <SectionPicker value={section} onChange={setSection} />
        </div>

        <DetailsForm section={section} value={details} onChange={update} />

        {error && <p className="notice">{error}</p>}
      </div>
    </div>
  )
}
