import { useMemo, useState } from 'react'
import ItemImage from './ItemImage.jsx'
import OutfitStrip from './OutfitStrip.jsx'
import { ROLE } from '../options.js'
import { useBackClose } from '../lib/backstack.js'

const ROWS = [
  { role: 'top', label: 'Top', optional: false },
  { role: 'layer', label: 'Layer', optional: true },
  { role: 'bottom', label: 'Bottom', optional: false },
  { role: 'shoes', label: 'Shoes', optional: true },
]

// Mix & Match: slide through your tops, layers, bottoms and shoes, and try combinations.
// onUse(ids) plans it for the day chosen in the Planner, onSave(ids) makes it a favourite.
export default function MixMatch({ items, dayLabel, onUse, onSave, onClose }) {
  useBackClose(onClose)

  // clean pieces only, innerwear never; dirty ones stay out of the carousels
  const byRole = useMemo(() => {
    const out = { top: [], layer: [], bottom: [], shoes: [] }
    for (const item of items) {
      if (item.section === 'inner' || item.laundry === 'dirty' || item.status === 'donate' || item.status === 'sell') continue
      const role = ROLE[item.category]
      if (role) out[role].push(item)
    }
    return out
  }, [items])

  // chosen piece per role: an item id, or null for "none" on optional rows
  const [pick, setPick] = useState(() => {
    const first = {}
    for (const r of ROWS) first[r.role] = r.optional ? null : byRole[r.role][0]?.id ?? null
    return first
  })
  const [busy, setBusy] = useState(false)

  const chosen = ROWS.map((r) => items.find((i) => i.id === pick[r.role])).filter(Boolean)
  const ids = chosen.map((i) => i.id)
  const ready = ids.length >= 2

  function shuffle() {
    const next = {}
    for (const r of ROWS) {
      const list = byRole[r.role]
      if (list.length === 0) next[r.role] = null
      else if (r.optional && Math.random() < 0.3) next[r.role] = null
      else next[r.role] = list[Math.floor(Math.random() * list.length)].id
    }
    setPick(next)
  }

  async function run(fn) {
    if (!ready || busy) return
    setBusy(true)
    try {
      await fn(ids)
    } finally {
      setBusy(false)
    }
  }

  const total = ROWS.reduce((n, r) => n + byRole[r.role].length, 0)

  return (
    <div className="overlay mixmatch">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Close
        </button>
        <strong>Mix &amp; Match</strong>
        <button className="ov-link ov-strong" onClick={shuffle} disabled={total === 0}>
          Shuffle
        </button>
      </header>

      <div className="ov-body">
        {total === 0 ? (
          <div className="empty glass">
            <h2>Nothing to mix yet</h2>
            <p className="muted">
              Give your pieces a category (T-shirt, Jeans, Shoes...) in Edit. Pieces in the laundry are left out until they are clean.
            </p>
          </div>
        ) : (
          <>
            <section className="mm-preview glass">
              {chosen.length > 0 ? <OutfitStrip items={chosen} /> : <p className="muted center">Tap pieces below to build a look.</p>}
              {!ready && chosen.length > 0 && <p className="muted small center">Pick at least two pieces.</p>}
            </section>

            {ROWS.map((r) => {
              const list = byRole[r.role]
              return (
                <section key={r.role} className="mm-row">
                  <h3 className="section-title">{r.label}</h3>
                  {list.length === 0 ? (
                    <p className="muted small">No clean {r.label.toLowerCase()} pieces with a category yet.</p>
                  ) : (
                    <div className="mm-track">
                      {r.optional && (
                        <button
                          className={'mm-card mm-none' + (pick[r.role] == null ? ' mm-on' : '')}
                          aria-pressed={pick[r.role] == null}
                          onClick={() => setPick((p) => ({ ...p, [r.role]: null }))}
                        >
                          <span>None</span>
                        </button>
                      )}
                      {list.map((item) => (
                        <button
                          key={item.id}
                          className={'mm-card' + (pick[r.role] === item.id ? ' mm-on' : '')}
                          aria-pressed={pick[r.role] === item.id}
                          aria-label={item.name}
                          onClick={() => setPick((p) => ({ ...p, [r.role]: item.id }))}
                        >
                          <ItemImage blob={item.thumb || item.front} alt={item.name} />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}

            <div className="mm-actions">
              <button className="btn-primary btn-wide" disabled={!ready || busy} onClick={() => run(onUse)}>
                Plan for {dayLabel}
              </button>
              <button className="pill btn-wide" disabled={!ready || busy} onClick={() => run(onSave)}>
                Save as favorite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
