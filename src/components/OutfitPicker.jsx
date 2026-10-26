import { useState } from 'react'
import ItemImage from './ItemImage.jsx'
import Segmented from './Segmented.jsx'
import { SECTIONS, sectionById } from '../sections.js'

// Full-screen picker: tap pieces to put them in an outfit.
export default function OutfitPicker({ items, initialIds = [], initialNote = '', title, onClose, onSave }) {
  const [ids, setIds] = useState(initialIds)
  const [note, setNote] = useState(initialNote)
  const [sec, setSec] = useState('all')

  const filters = [{ value: 'all', label: 'All' }, ...SECTIONS.map((s) => ({ value: s.id, label: s.label }))]
  const list = items.filter((i) => sec === 'all' || i.section === sec)

  const toggle = (id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <div className="overlay picker">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Cancel
        </button>
        <strong>{title}</strong>
        <button className="ov-link ov-strong" disabled={ids.length === 0} onClick={() => onSave(ids, note.trim())}>
          Save
        </button>
      </header>

      <div className="ov-body">
        <Segmented options={filters} value={sec} onChange={setSec} scroll />

        {items.length === 0 ? (
          <div className="empty glass">
            <h2>Your wardrobe is empty</h2>
            <p className="muted">Add some clothes first, then come back to build an outfit.</p>
          </div>
        ) : list.length === 0 ? (
          <p className="muted center">Nothing in this section yet.</p>
        ) : (
          <div className="pk-grid">
            {list.map((item) => {
              const on = ids.includes(item.id)
              const tone = sectionById(item.section)?.tone || 'blue'
              return (
                <button
                  key={item.id}
                  className={'pk tone-' + tone + (on ? ' pk-on' : '')}
                  aria-pressed={on}
                  onClick={() => toggle(item.id)}
                >
                  <span className="pk-thumb">
                    <ItemImage blob={item.front} alt={item.name} />
                    <i className="pk-check" aria-hidden="true">
                      ✓
                    </i>
                  </span>
                  <span className="pk-name">{item.name}</span>
                </button>
              )
            })}
          </div>
        )}

        <label className="field">
          <span>Note (optional)</span>
          <input
            type="text"
            value={note}
            maxLength={60}
            placeholder="College day, presentation..."
            autoComplete="off"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <button className="btn-primary btn-wide" disabled={ids.length === 0} onClick={() => onSave(ids, note.trim())}>
          Save outfit ({ids.length})
        </button>
      </div>
    </div>
  )
}
