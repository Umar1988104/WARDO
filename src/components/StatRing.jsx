import { useEffect, useState } from 'react'

const R = 29
const C = 2 * Math.PI * R

// A small progress ring with a number inside. It draws itself in when the screen opens
// (instantly when animations are reduced or off, because the CSS removes the transition).
export default function StatRing({ value, total, label, warn = false, children }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const fraction = total > 0 ? Math.min(1, value / total) : 0
  return (
    <div className={'ring-card glass' + (warn && value > 0 ? ' ring-warn' : '')}>
      <div className="ring">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle className="ring-bg" cx="36" cy="36" r={R} />
          <circle className="ring-fg" cx="36" cy="36" r={R} strokeDasharray={C} strokeDashoffset={ready ? C * (1 - fraction) : C} />
        </svg>
        <span className="ring-num">{children}</span>
      </div>
      <span className="ring-label">{label}</span>
    </div>
  )
}
