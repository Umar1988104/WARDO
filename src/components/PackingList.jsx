import { useMemo, useState } from 'react'
import ItemImage from './ItemImage.jsx'
import Chips from './Chips.jsx'
import Segmented from './Segmented.jsx'
import OutfitPicker from './OutfitPicker.jsx'
import { OCCASIONS, ROLE } from '../options.js'
import { CLIMATES, PACK_ROLES, buildPacking } from '../lib/packing.js'
import { useBackClose } from '../lib/backstack.js'

// Trips and packing lists: pick the length and climate, get a list built from your clean clothes,
// then tick pieces off as you pack. Lists are saved on the phone.
export default function PackingList({ items, wearInfo, trips, actions, onClose }) {
  useBackClose(onClose)
  const [view, setView] = useState('list') // list | new | trip
  const [tripId, setTripId] = useState(null)
  const [picker, setPicker] = useState(false)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [days, setDays] = useState(3)
  const [climate, setClimate] = useState('mild')
  const [occasions, setOccasions] = useState([])
  const [notes, setNotes] = useState(null) // { missing, extras } from the last build

  // Back goes from a trip or the new-trip form to the list first
  useBackClose(() => setView('list'), view !== 'list')

  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const trip = trips.find((t) => t.id === tripId)

  async function build(e) {
    e.preventDefault()
    setBusy(true)
    const plan = buildPacking(items, wearInfo, { days, climate, occasions })
    const id = await actions.createTrip({
      name: name.trim() || 'My trip',
      days,
      climate,
      occasions,
      itemIds: plan.ids,
      missing: plan.missing,
    })
    setNotes({ extras: plan.extras })
    setTripId(id)
    setView('trip')
    setBusy(false)
  }

  function toggle(id) {
    const packed = trip.packed.includes(id) ? trip.packed.filter((x) => x !== id) : [...trip.packed, id]
    actions.updateTrip(trip.id, { packed })
  }

  function openTrip(t) {
    setTripId(t.id)
    setNotes({ extras: [{ label: 'Innerwear and socks', note: `${t.days + 1} sets` }] })
    setView('trip')
  }

  // ---- the saved-trips list ----
  if (view === 'list') {
    return (
      <div className="overlay packing">
        <header className="ov-head">
          <button className="ov-link" onClick={onClose}>
            Close
          </button>
          <strong>Packing lists</strong>
          <span />
        </header>
        <div className="ov-body">
          <button className="btn-primary btn-wide" onClick={() => setView('new')}>
            New trip
          </button>
          {trips.length === 0 ? (
            <div className="empty glass">
              <h2>No trips yet</h2>
              <p className="muted">Tell Wardo how long you are away and what the weather is like. It builds a list from your clean clothes.</p>
            </div>
          ) : (
            trips.map((t) => {
              const have = t.itemIds.filter((id) => byId[id])
              const done = have.filter((id) => t.packed.includes(id)).length
              return (
                <button key={t.id} className="trip-row glass" onClick={() => openTrip(t)}>
                  <strong>{t.name}</strong>
                  <span className="muted">
                    {t.days} {t.days === 1 ? 'day' : 'days'} · {done}/{have.length} packed
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ---- the new-trip form ----
  if (view === 'new') {
    return (
      <div className="overlay packing">
        <header className="ov-head">
          <button className="ov-link" onClick={() => setView('list')}>
            Cancel
          </button>
          <strong>New trip</strong>
          <span />
        </header>
        <form className="ov-body" onSubmit={build}>
          <label className="field">
            <span>Trip name</span>
            <input type="text" value={name} maxLength={30} placeholder="Goa weekend, Manali hackathon..." autoComplete="off" onChange={(e) => setName(e.target.value)} />
          </label>

          <div className="field">
            <span>
              Days away: {days}
            </span>
            <div className="stepper">
              <button type="button" className="pill" onClick={() => setDays((d) => Math.max(1, d - 1))} aria-label="Fewer days">
                −
              </button>
              <strong>{days}</strong>
              <button type="button" className="pill" onClick={() => setDays((d) => Math.min(30, d + 1))} aria-label="More days">
                +
              </button>
            </div>
          </div>

          <div className="field">
            <span>Weather there</span>
            <Segmented options={CLIMATES.map((c) => ({ value: c.value, label: c.label }))} value={climate} onChange={setClimate} />
          </div>

          <div className="field">
            <span>What for (optional)</span>
            <Chips multi options={OCCASIONS} value={occasions} onChange={setOccasions} />
          </div>

          <button className="btn-primary btn-wide" type="submit" disabled={busy}>
            Build my list
          </button>
        </form>
      </div>
    )
  }

  // ---- one trip ----
  if (!trip) {
    return null
  }
  const tripItems = trip.itemIds.map((id) => byId[id]).filter(Boolean)
  const packedCount = tripItems.filter((i) => trip.packed.includes(i.id)).length
  const groups = [...PACK_ROLES, { role: 'other', label: 'Other' }]
    .map((g) => ({ ...g, list: tripItems.filter((i) => (ROLE[i.category] || 'other') === g.role) }))
    .filter((g) => g.list.length > 0)

  return (
    <div className="overlay packing">
      <header className="ov-head">
        <button className="ov-link" onClick={() => setView('list')}>
          Back
        </button>
        <strong>{trip.name}</strong>
        <button className="ov-link ov-strong" onClick={() => setPicker(true)}>
          Edit
        </button>
      </header>
      <div className="ov-body">
        <p className="muted">
          {trip.days} {trip.days === 1 ? 'day' : 'days'} · {packedCount}/{tripItems.length} packed
        </p>

        {(trip.missing || []).length > 0 && (
          <div className="note glass">
            <span className="muted">Not enough clean pieces</span>
            {trip.missing.map((m) => (
              <p key={m.label}>
                {m.label[0].toUpperCase() + m.label.slice(1)}: you would want {m.need}, found {m.have}. Use Edit to add more, or check the laundry.
              </p>
            ))}
          </div>
        )}

        {groups.map((g) => (
          <section key={g.role} className="mm-row">
            <h3 className="section-title">{g.label}</h3>
            <div className="pack-grid">
              {g.list.map((item) => {
                const on = trip.packed.includes(item.id)
                return (
                  <button key={item.id} className={'pack-card' + (on ? ' pack-on' : '')} aria-pressed={on} onClick={() => toggle(item.id)}>
                    <span className="pack-thumb">
                      <ItemImage blob={item.thumb || item.front} alt={item.name} />
                      <i className="pk-check" aria-hidden="true">
                        ✓
                      </i>
                    </span>
                    <span className="pk-name">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        {tripItems.length === 0 && (
          <div className="empty glass">
            <h2>Nothing in this list</h2>
            <p className="muted">Tap Edit to choose the pieces you want to take.</p>
          </div>
        )}

        {(notes?.extras || []).map((x) => (
          <div key={x.label} className="wearbox glass">
            <div>
              <strong>{x.label}</strong>
              <span className="muted">{x.note}, not tracked in Wardo</span>
            </div>
          </div>
        ))}

        <button
          className="btn-danger"
          onClick={() => {
            if (window.confirm(`Delete "${trip.name}"? Your clothes are kept.`)) {
              actions.deleteTrip(trip.id)
              setView('list')
            }
          }}
        >
          Delete this trip
        </button>
      </div>

      {picker && (
        <OutfitPicker
          items={items}
          title="Pieces to pack"
          saveLabel="Save list"
          noNote
          initialIds={trip.itemIds.filter((id) => byId[id])}
          onClose={() => setPicker(false)}
          onSave={async (ids) => {
            await actions.updateTrip(trip.id, { itemIds: ids, packed: trip.packed.filter((x) => ids.includes(x)), missing: [] })
            setPicker(false)
          }}
        />
      )}
    </div>
  )
}
