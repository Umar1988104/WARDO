import { useEffect, useState } from 'react'

// A number that counts up when it first appears. It just shows the number when animations are reduced or off.
export default function CountNumber({ to, format = (n) => String(n) }) {
  const [v, setV] = useState(0)
  useEffect(() => {
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
  return <>{format(v)}</>
}
