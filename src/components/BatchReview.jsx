import { useState } from 'react'
import { db } from '../db.js'
import { defaultSeason } from '../options.js'
import ItemImage from './ItemImage.jsx'
import DetailsForm from './DetailsForm.jsx'
import { useBackClose } from '../lib/backstack.js'

const detailsOf = (item) => ({
  category: item.category || null,
  color: item.color || null,
  season: item.season || null,
  occasions: item.occasions || [],
  tags: item.tags || [],
  notes: item.notes || '',
})

// Goes through new pieces one by one: name, category, colour, tags.
export default function BatchReview({ ids, items, actions, onClose }) {
  useBackClose(onClose)
  const [list] = useState(() => ids.map((id) => items.find((i) => i.id === id)).filter(Boolean))
  const [index, setIndex] = useState(0)
  const item = list[index]
  const [name, setName] = useState(item ? item.name : '')
  const [details, setDetails] = useState(item ? detailsOf(item) : null)
  const [saving, setSaving] = useState(false)

  if (!item) {
    onClose()
    return null
  }

  const last = index === list.length - 1

  async function next(save) {
    setSaving(true)
    try {
      if (save) {
        await db.items.update(item.id, {
          name: name.trim() || item.name,
          category: details.category,
          color: details.color,
          season: details.season || defaultSeason(item.section),
          occasions: details.occasions,
          tags: details.tags,
          notes: details.notes.trim(),
          needsDetails: false,
          updatedAt: Date.now(),
        })
      }
      if (last) {
        await actions.refresh()
        onClose()
        return
      }
      const n = list[index + 1]
      setIndex(index + 1)
      setName(n.name)
      setDetails(detailsOf(n))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay addflow">
      <header className="ov-head">
        <button className="ov-link" onClick={async () => { await actions.refresh(); onClose() }}>
          Later
        </button>
        <strong>
          {index + 1} of {list.length}
        </strong>
        <span className="ov-spacer" />
      </header>

      <div className="ov-body" key={item.id}>
        <div className="review-pic checker">
          <ItemImage blob={item.thumb || item.front} alt={item.name} className="slot-img" />
        </div>

        <label className="field">
          <span>Name</span>
          <input type="text" value={name} maxLength={40} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </label>

        <DetailsForm section={item.section} value={details} onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))} />

        <button className="btn-primary btn-wide" disabled={saving} onClick={() => next(true)}>
          {last ? 'Save and finish' : 'Save and next'}
        </button>
        <button className="link-btn" disabled={saving} onClick={() => next(false)}>
          {last ? 'Skip and finish' : 'Skip this one'}
        </button>
      </div>
    </div>
  )
}
