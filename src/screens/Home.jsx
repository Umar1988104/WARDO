import { useEffect, useMemo, useState } from 'react'
import TodayCard from '../components/TodayCard.jsx'
import BackupNudge from '../components/BackupNudge.jsx'
import { SearchIcon, PlusIcon, CalendarIcon, InsightsIcon, SettingsIcon } from '../components/Icons.jsx'
import { SECTIONS } from '../sections.js'
import { daysSince, keyOf, todayKey } from '../lib/dates.js'

// numbers roll up from 0 when the screen opens
function CountUp({ to }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 800)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return v
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home({ items, wearInfo, outfitMap, actions, onAdd, onPlan, onInsights, onOpenSettings, onSearch, onOpenSection, onOpenItem }) {
  const stats = useMemo(() => {
    const month = todayKey().slice(0, 7)
    let worn = 0
    let forgotten = 0
    for (const item of items) {
      const info = wearInfo[item.id]
      if (info && [...info.dates].some((d) => d.startsWith(month))) worn += 1
      const idle = daysSince(info?.last || keyOf(new Date(item.createdAt)))
      if (idle >= 30) forgotten += 1
    }
    return { total: items.length, worn, forgotten }
  }, [items, wearInfo])

  const counts = useMemo(() => {
    const map = {}
    for (const i of items) map[i.section] = (map[i.section] || 0) + 1
    return map
  }, [items])

  const quick = [
    { label: 'Add item', Icon: PlusIcon, tone: 'mint', onClick: onAdd },
    { label: 'Planner', Icon: CalendarIcon, tone: 'rose', onClick: onPlan },
    { label: 'Forgotten', Icon: InsightsIcon, tone: 'amber', onClick: onInsights },
    { label: 'Backup', Icon: SettingsIcon, tone: 'blue', onClick: onOpenSettings },
  ]

  return (
    <main className="screen home">
      <div className="home-hello">
        <h1>{greeting()},</h1>
        <p className="muted">Your style, your way</p>
      </div>

      <button className="home-search glass" onClick={onSearch}>
        <SearchIcon />
        Search your wardrobe...
      </button>

      <div className="stats home-stats">
        <div className="stat glass">
          <strong><CountUp to={stats.total} /></strong>
          <span>Total items</span>
        </div>
        <div className="stat glass">
          <strong><CountUp to={stats.worn} /></strong>
          <span>Worn this month</span>
        </div>
        <div className={'stat glass' + (stats.forgotten > 0 ? ' stat-warn' : '')}>
          <strong><CountUp to={stats.forgotten} /></strong>
          <span>Forgotten</span>
        </div>
      </div>

      <BackupNudge count={items.length} onOpen={onOpenSettings} />

      <TodayCard items={items} outfitMap={outfitMap} wearInfo={wearInfo} actions={actions} onPlan={onPlan} onOpenItem={onOpenItem} />

      <h3 className="section-title">Quick actions</h3>
      <div className="quick-row">
        {quick.map((q) => (
          <button key={q.label} className={'quick glass tone-' + q.tone} onClick={q.onClick}>
            <span className="quick-ic">
              <q.Icon />
            </span>
            {q.label}
          </button>
        ))}
      </div>

      <h3 className="section-title">Your wardrobe</h3>
      <div className="tiles">
        {SECTIONS.map((s) => {
          const count = counts[s.id] || 0
          return (
            <button key={s.id} className={'tile glass tone-' + s.tone} onClick={() => onOpenSection(s.id)}>
              <span className="chip">
                <s.Icon />
              </span>
              <strong>{s.label}</strong>
              <span className="muted tile-hint">{s.hint}</span>
              <span className="tile-count">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
