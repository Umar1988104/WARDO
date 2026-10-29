import { useEffect, useMemo, useState } from 'react'
import Segmented from './Segmented.jsx'
import { PERIODS, computeWrapped, drawWrappedCard } from '../lib/wrapped.js'
import { usePrefs } from '../lib/prefs.js'
import { useBackClose } from '../lib/backstack.js'

// Wardrobe Wrapped: pick a period, see the card, share it as a picture or save it.
export default function Wrapped({ items, goneItems, wears, outfits, onClose }) {
  useBackClose(onClose)
  const { currency } = usePrefs()
  const [period, setPeriod] = useState('month')
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState(null)
  const [msg, setMsg] = useState('')

  const stats = useMemo(() => computeWrapped({ items, goneItems, wears, outfits, period }), [items, goneItems, wears, outfits, period])

  useEffect(() => {
    let alive = true
    let made = null
    setMsg('')
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6fd0bd'
    drawWrappedCard(stats, { accent: /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#6fd0bd', currency })
      .then((b) => {
        if (!alive) return
        made = URL.createObjectURL(b)
        setBlob(b)
        setUrl(made)
      })
      .catch(() => alive && setMsg('Could not draw the card. Try again.'))
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [stats, currency])

  async function share() {
    if (!blob) return
    const file = new File([blob], `wardrobe-wrapped-${period}.png`, { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Wardrobe Wrapped' })
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
    save()
  }

  function save() {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `wardrobe-wrapped-${period}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setMsg('Saved to your downloads.')
  }

  return (
    <div className="overlay wrapped">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Close
        </button>
        <strong>Wardrobe Wrapped</strong>
        <span />
      </header>
      <div className="ov-body">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />

        {stats.wearCount === 0 && (
          <p className="muted center">Nothing logged for this period yet. Tap "I wore this" on a piece or mark an outfit as worn, and it will show up here.</p>
        )}

        <div className="wrapped-card">{url ? <img src={url} alt={`Wardrobe Wrapped, ${stats.label}`} /> : <p className="muted center">Drawing your card…</p>}</div>

        <div className="mm-actions">
          <button className="btn-primary btn-wide" onClick={share} disabled={!blob || stats.wearCount === 0}>
            Share image
          </button>
          <button className="pill btn-wide" onClick={save} disabled={!blob || stats.wearCount === 0}>
            Save to phone
          </button>
        </div>
        {msg && <p className="notice">{msg}</p>}
        <p className="muted small center">Innerwear is never included. The picture is made on your phone and goes nowhere unless you share it.</p>
      </div>
    </div>
  )
}
