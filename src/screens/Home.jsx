import { useEffect, useMemo, useState } from 'react'
import WeatherChip, { WeatherCredit } from '../components/WeatherChip.jsx'
import BackupNudge from '../components/BackupNudge.jsx'
import StatRing from '../components/StatRing.jsx'
import { SearchIcon, PlusIcon, CalendarIcon, InsightsIcon, SettingsIcon, LockIcon } from '../components/Icons.jsx'
import { usePrefs } from '../lib/prefs.js'
import { SECTIONS } from '../sections.js'
import { addDays, daysSince, keyOf, todayKey } from '../lib/dates.js'

// numbers roll up from 0 when the screen opens
function CountUp({ to }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    // no counting animation when animations are reduced or off
    if (document.documentElement.dataset.motion !== 'full') {
      setV(to)
      return undefined
    }
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

// a small icon for the time of day, shown in the floating orb next to the greeting
function timeIcon() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return '🌤️'
  if (h >= 12 && h < 17) return '☀️'
  if (h >= 17 && h < 20) return '🌇'
  return '🌙'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home({ items, innerHidden = false, onReview, wearInfo, weather = null, onAdd, onPlan, onInsights, onOpenSettings, onSearch, onOpenSection, onOpenItem }) {
  const prefs = usePrefs()
  const who = prefs.name.trim()
  const todayWeather = weather?.days?.[todayKey()] || null
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

  // days in a row with something worn, counting back from today (or yesterday if today is not logged yet)
  const streak = useMemo(() => {
    const days = new Set()
    for (const item of items) for (const d of wearInfo[item.id]?.dates || []) days.add(d)
    let cur = todayKey()
    if (!days.has(cur)) cur = addDays(cur, -1)
    let n = 0
    while (days.has(cur)) {
      n += 1
      cur = addDays(cur, -1)
    }
    return n
  }, [items, wearInfo])

  const pending = useMemo(() => items.filter((i) => i.needsDetails).length, [items])

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
        <div className="hello-row">
          <span className="hello-orb" aria-hidden="true">
            {timeIcon()}
          </span>
          <div>
            <h1>{who ? `${greeting()}, ${who}` : greeting()}</h1>
            <p className="muted">{prefs.title.trim() || 'Your style, your way'}</p>
          </div>
        </div>
        {streak >= 2 && (
          <p className="home-weather">
            <span className="streak-chip">
              <span className="streak-flame" aria-hidden="true">
                🔥
              </span>
              {streak}-day wear streak
            </span>
          </p>
        )}
        {todayWeather && (
          <p className="home-weather">
            <WeatherChip w={todayWeather} stale={weather?.stale} />
            <WeatherCredit />
          </p>
        )}
      </div>

      <button className="home-search glass" onClick={onSearch}>
        <SearchIcon />
        Search your wardrobe...
      </button>

      <div className="rings">
        <StatRing value={stats.total} total={stats.total} label="Total items">
          <CountUp to={stats.total} />
        </StatRing>
        <StatRing value={stats.worn} total={stats.total} label="Worn this month">
          <CountUp to={stats.worn} />
        </StatRing>
        <StatRing value={stats.forgotten} total={stats.total} label="Forgotten" warn>
          <CountUp to={stats.forgotten} />
        </StatRing>
      </div>

      {pending > 0 && (
        <button className="pending glass" onClick={onReview}>
          <span>
            <strong>
              {pending} new {pending === 1 ? 'piece needs' : 'pieces need'} a name
            </strong>
            <em>Tap to add names and details</em>
          </span>
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      <BackupNudge count={items.length} onOpen={onOpenSettings} />

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
                {s.id === 'inner' && innerHidden ? (
                  <span className="tile-lock">
                    <LockIcon /> Locked
                  </span>
                ) : (
                  <>
                    {count} {count === 1 ? 'item' : 'items'}
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
