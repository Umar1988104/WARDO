import { useMemo, useState } from 'react'
import OutfitStrip from './OutfitStrip.jsx'
import { CalendarIcon } from './Icons.jsx'
import { suggestOutfit } from '../lib/suggest.js'
import { todayKey } from '../lib/dates.js'

// The big gradient card at the top of the Wardrobe screen.
export default function TodayCard({ items, outfitMap, wearInfo, actions, onPlan, onOpenItem }) {
  const today = todayKey()
  const outfit = outfitMap[today]
  const [seed, setSeed] = useState(0)

  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const planned = outfit ? outfit.itemIds.map((id) => byId[id]).filter(Boolean) : []

  const pick = useMemo(
    () => (outfit ? null : suggestOutfit(items, wearInfo, { date: today, occasion: null, seed })),
    [outfit, items, wearInfo, today, seed]
  )
  const picked = pick ? pick.ids.map((id) => byId[id]).filter(Boolean) : []

  if (planned.length > 0) {
    return (
      <section className="hero">
        <div className="hero-text">
          <h2>{outfit.worn ? 'You wore this today' : "Today's outfit"}</h2>
          {outfit.note && <p>{outfit.note}</p>}
        </div>
        <OutfitStrip items={planned} onOpen={onOpenItem} />
        <div className="hero-actions">
          {outfit.worn ? (
            <button className="hero-btn" onClick={() => actions.undoOutfitWorn(today)}>
              Undo worn
            </button>
          ) : (
            <button className="hero-btn" onClick={() => actions.markOutfitWorn(today)}>
              I wore it
            </button>
          )}
          <button className="hero-btn hero-btn-ghost" onClick={onPlan}>
            <CalendarIcon />
            Planner
          </button>
        </div>
      </section>
    )
  }

  if (picked.length >= 2) {
    return (
      <section className="hero">
        <div className="hero-text">
          <h2>Today's pick</h2>
          <p>{pick.message || 'Made from pieces you have not worn in a while.'}</p>
        </div>
        <OutfitStrip items={picked} onOpen={onOpenItem} />
        <div className="hero-actions">
          <button className="hero-btn" onClick={() => actions.saveOutfit(today, pick.ids, '')}>
            Plan this
          </button>
          <button className="hero-btn hero-btn-ghost" onClick={() => setSeed(seed + 1)}>
            Shuffle
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="hero-text">
        <h2>What are you wearing today?</h2>
        <p>Add a few clothes, then plan your outfit in one tap.</p>
      </div>
      <div className="hero-actions">
        <button className="hero-btn" onClick={onPlan}>
          <CalendarIcon />
          Open planner
        </button>
      </div>
    </section>
  )
}
