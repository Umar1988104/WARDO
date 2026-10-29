import { memo, useMemo, useState } from 'react'
import ItemImage from './ItemImage.jsx'
import { ROLE } from '../options.js'

const ROLE_ORDER = { top: 0, layer: 1, bottom: 2, shoes: 3 }
const FIRST = 14 // hangers drawn per rail until "more" is tapped

const Hanger = () => (
  <svg className="hanger-svg" viewBox="0 0 48 26" aria-hidden="true">
    <path d="M24 3.5a3.2 3.2 0 1 1 3.2 3.2c-1.8 0-3.2 1.4-3.2 3.2v2.6M24 12.5 3 23h42z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
)

function Hung({ item, onOpen }) {
  const [swing, setSwing] = useState(false)
  const tag = item.status === 'donate' ? 'To donate' : item.status === 'sell' ? 'To sell' : item.laundry === 'dirty' ? 'Laundry' : null
  return (
    <button
      className={'hung' + (swing ? ' hung-swing' : '')}
      onClick={() => {
        setSwing(true)
        onOpen(item.id)
      }}
      onAnimationEnd={() => setSwing(false)}
    >
      <Hanger />
      <span className="hung-pic">
        <ItemImage blob={item.thumb || item.front} alt={item.name} />
      </span>
      <span className="hung-name">{item.name}</span>
      {tag && <em className="hung-tag">{tag}</em>}
    </button>
  )
}

// Wardrobe as clothes hanging on rails, one rail per category. Swipe sideways along a rail.
function HangerRail({ items, onOpen }) {
  const [more, setMore] = useState({}) // category -> how many are drawn

  const rails = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      const key = item.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return [...map.entries()].sort(([a, la], [b, lb]) => {
      const ra = ROLE_ORDER[ROLE[a]] ?? 9
      const rb = ROLE_ORDER[ROLE[b]] ?? 9
      return ra - rb || lb.length - la.length || a.localeCompare(b)
    })
  }, [items])

  return (
    <div className="rails">
      {rails.map(([cat, list]) => {
        const limit = more[cat] || FIRST
        const shown = list.length > limit ? list.slice(0, limit) : list
        return (
          <section key={cat} className="rail">
            <h3 className="rail-title">
              {cat} <span className="muted">{list.length}</span>
            </h3>
            <div className="rail-bar" aria-hidden="true" />
            <div className="rail-track">
              {shown.map((item) => (
                <Hung key={item.id} item={item} onOpen={onOpen} />
              ))}
              {list.length > limit && (
                <button className="hung hung-more" onClick={() => setMore((m) => ({ ...m, [cat]: limit + FIRST }))}>
                  <span className="hung-pic">+{list.length - limit}</span>
                  <span className="hung-name">more</span>
                </button>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default memo(HangerRail)
