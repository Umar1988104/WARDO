import { useMemo, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Chips from '../components/Chips.jsx'
import OutfitPicker from '../components/OutfitPicker.jsx'
import OutfitStrip from '../components/OutfitStrip.jsx'
import { OCCASIONS } from '../options.js'
import { suggestOutfit } from '../lib/suggest.js'
import { todayKey, monthGrid, dayTag, fromKey } from '../lib/dates.js'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Planner({ items, outfitMap, wearInfo, actions, onOpenItem }) {
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [picker, setPicker] = useState(false)
  const [occasion, setOccasion] = useState(null)
  const [proposal, setProposal] = useState(null) // { ids, message }
  const [seed, setSeed] = useState(0)

  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const outfit = outfitMap[selected]
  const outfitItems = outfit ? outfit.itemIds.map((id) => byId[id]).filter(Boolean) : []
  const proposalItems = proposal ? proposal.ids.map((id) => byId[id]).filter(Boolean) : []

  const cells = monthGrid(cursor.y, cursor.m)
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const fullDate = fromKey(selected).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const tag = dayTag(selected)
  const canMarkWorn = selected <= today

  function shiftMonth(n) {
    const d = new Date(cursor.y, cursor.m + n, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  function select(key) {
    setSelected(key)
    setProposal(null)
  }

  function propose(nextSeed) {
    setSeed(nextSeed)
    setProposal(suggestOutfit(items, wearInfo, { date: selected, occasion, seed: nextSeed }))
  }

  async function useProposal() {
    await actions.saveOutfit(selected, proposal.ids, '')
    setProposal(null)
  }

  return (
    <Screen title="Planner">
      <section className="cal glass">
        <div className="cal-head">
          <button className="cal-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <strong>{monthLabel}</strong>
          <button className="cal-nav" onClick={() => shiftMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>
        <div className="cal-grid">
          {DOW.map((d, i) => (
            <span key={i} className="cal-dow">
              {d}
            </span>
          ))}
          {cells.map((key, i) =>
            key === null ? (
              <span key={'b' + i} />
            ) : (
              <button
                key={key}
                className={
                  'day' +
                  (key === today ? ' day-today' : '') +
                  (key === selected ? ' day-sel' : '')
                }
                onClick={() => select(key)}
                aria-label={fromKey(key).toDateString()}
                aria-pressed={key === selected}
              >
                {Number(key.slice(8))}
                {outfitMap[key] && <i className={'day-dot' + (outfitMap[key].worn ? ' day-dot-worn' : '')} />}
              </button>
            )
          )}
        </div>
      </section>

      <section className="daypanel glass">
        <div className="daypanel-head">
          <h2>{fullDate}</h2>
          {tag && <span className="tagchip">{tag}</span>}
        </div>

        {outfit && outfitItems.length > 0 ? (
          <>
            <OutfitStrip items={outfitItems} onOpen={onOpenItem} />
            {outfit.note && <p className="muted">{outfit.note}</p>}
            <div className="daypanel-actions">
              {outfit.worn ? (
                <button className="pill" onClick={() => actions.undoOutfitWorn(selected)}>
                  Worn ✓ Undo
                </button>
              ) : (
                <button className="pill pill-accent" disabled={!canMarkWorn} onClick={() => actions.markOutfitWorn(selected)}>
                  Mark as worn
                </button>
              )}
              <button className="pill" onClick={() => setPicker(true)}>
                Edit
              </button>
              <button className="pill pill-quiet" onClick={() => actions.deleteOutfit(selected)}>
                Remove
              </button>
            </div>
            {!canMarkWorn && <p className="muted small">You can mark it as worn on the day.</p>}
          </>
        ) : (
          <>
            <p className="muted">No outfit planned for this day.</p>
            <button className="btn-primary btn-wide" onClick={() => setPicker(true)}>
              Plan outfit
            </button>

            <div className="suggest">
              <span className="muted small">Or get a suggestion</span>
              <Chips options={OCCASIONS} value={occasion} onChange={setOccasion} />
              <button className="pill pill-accent" disabled={items.length === 0} onClick={() => propose(seed + 1)}>
                Suggest an outfit
              </button>
            </div>

            {proposal && (
              <div className="proposal">
                {proposalItems.length > 0 ? (
                  <>
                    <OutfitStrip items={proposalItems} onOpen={onOpenItem} />
                    {proposal.message && <p className="muted small">{proposal.message}</p>}
                    <div className="daypanel-actions">
                      <button className="pill pill-accent" onClick={useProposal}>
                        Use this
                      </button>
                      <button className="pill" onClick={() => propose(seed + 1)}>
                        Shuffle
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">{proposal.message}</p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {picker && (
        <OutfitPicker
          items={items}
          title={tag || 'Outfit'}
          initialIds={outfit ? outfit.itemIds.filter((id) => byId[id]) : []}
          initialNote={outfit?.note || ''}
          onClose={() => setPicker(false)}
          onSave={async (ids, note) => {
            await actions.saveOutfit(selected, ids, note)
            setPicker(false)
          }}
        />
      )}
    </Screen>
  )
}
