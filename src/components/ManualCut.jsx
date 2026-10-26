import { useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../lib/image.js'

const ZOOMS = [1, 2, 3, 4]
const CLOSE_DISTANCE = 22 // screen px: tap this close to the first point to close the shape

// Adds one shape to the current canvas path. Freehand shapes are smoothed a little.
function addPath(ctx, { pts, smooth }) {
  const n = pts.length
  if (n === 0) return
  if (!smooth || n < 3) {
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    return
  }
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const m0 = mid(pts[n - 1], pts[0])
  ctx.moveTo(m0.x, m0.y)
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const m = mid(p, pts[(i + 1) % n])
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y)
  }
  ctx.closePath()
}

// Cut out the clothing yourself: draw (or tap) around it, and everything outside is removed.
// You can add several areas, and fine-tune afterwards with Touch up.
export default function ManualCut({ originalBlob, onDone, onCancel }) {
  const stageRef = useRef(null)
  const photoRef = useRef(null)
  const overlayRef = useRef(null)
  const bmpRef = useRef(null)
  const shapesRef = useRef([]) // finished shapes: { pts, smooth }
  const draftRef = useRef([]) // points of the shape being drawn
  const drawingRef = useRef(false)
  const rafRef = useRef(0)

  const [ready, setReady] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [fit, setFit] = useState(1)
  const [zoomIdx, setZoomIdx] = useState(0)
  const [mode, setMode] = useState('free') // free | points | move
  const [counts, setCounts] = useState({ shapes: 0, draft: 0 })
  const [saving, setSaving] = useState(false)

  const zoom = ZOOMS[zoomIdx]
  const drawing = mode !== 'move'

  function sync() {
    setCounts({ shapes: shapesRef.current.length, draft: draftRef.current.length })
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      const bmp = await createImageBitmap(originalBlob)
      if (!alive) {
        bmp.close?.()
        return
      }
      bmpRef.current = bmp
      for (const c of [photoRef.current, overlayRef.current]) {
        c.width = bmp.width
        c.height = bmp.height
      }
      photoRef.current.getContext('2d').drawImage(bmp, 0, 0)
      const r = stageRef.current.getBoundingClientRect()
      setFit(Math.min((r.width - 24) / bmp.width, (r.height - 24) / bmp.height))
      setSize({ w: bmp.width, h: bmp.height })
      setReady(true)
    })().catch(() => onCancel())
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
      bmpRef.current?.close?.()
    }
  }, [originalBlob]) // eslint-disable-line react-hooks/exhaustive-deps

  function redraw() {
    const c = overlayRef.current
    if (!c || !ready) return
    const ctx = c.getContext('2d')
    const { width: W, height: H } = c
    const k = W / c.getBoundingClientRect().width // canvas px per screen px
    ctx.clearRect(0, 0, W, H)

    const shapes = shapesRef.current
    if (shapes.length > 0) {
      // darken everything outside the kept areas
      ctx.fillStyle = 'rgba(10, 12, 24, 0.62)'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'destination-out'
      for (const s of shapes) {
        ctx.beginPath()
        addPath(ctx, s)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineJoin = 'round'
      for (const s of shapes) {
        ctx.beginPath()
        addPath(ctx, s)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
        ctx.lineWidth = 4.5 * k
        ctx.stroke()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 * k
        ctx.stroke()
      }
    }

    const draft = draftRef.current
    if (draft.length > 0) {
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(draft[0].x, draft[0].y)
      for (let i = 1; i < draft.length; i++) ctx.lineTo(draft[i].x, draft[i].y)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.lineWidth = 4.5 * k
      ctx.stroke()
      ctx.strokeStyle = '#7c93ff'
      ctx.lineWidth = 2.5 * k
      ctx.stroke()

      if (mode === 'points') {
        draft.forEach((p, i) => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, (i === 0 ? 8 : 5) * k, 0, Math.PI * 2)
          ctx.fillStyle = i === 0 && draft.length >= 3 ? '#22c55e' : '#fff'
          ctx.fill()
          ctx.strokeStyle = '#4263eb'
          ctx.lineWidth = 2 * k
          ctx.stroke()
        })
      }
    }
  }

  function schedule() {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(redraw)
  }

  // redraw when the zoom, mode or size changes (line thickness depends on the zoom)
  useEffect(() => {
    schedule()
  }, [zoomIdx, mode, ready, size]) // eslint-disable-line react-hooks/exhaustive-deps

  function point(e) {
    const c = overlayRef.current
    const rect = c.getBoundingClientRect()
    const k = c.width / rect.width
    return {
      x: Math.min(c.width, Math.max(0, (e.clientX - rect.left) * k)),
      y: Math.min(c.height, Math.max(0, (e.clientY - rect.top) * k)),
      k,
    }
  }

  function closeDraft(smooth) {
    const draft = draftRef.current
    if (draft.length >= 3) shapesRef.current.push({ pts: draft.map(({ x, y }) => ({ x, y })), smooth })
    draftRef.current = []
  }

  function onDown(e) {
    if (!ready || mode === 'move') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    const draft = draftRef.current

    if (mode === 'free') {
      drawingRef.current = true
      draftRef.current = [p]
    } else {
      // points: tapping near the first point closes the shape
      if (draft.length >= 3) {
        const first = draft[0]
        const d = Math.hypot(first.x - p.x, first.y - p.y) / p.k
        if (d < CLOSE_DISTANCE) {
          closeDraft(false)
          sync()
          schedule()
          return
        }
      }
      drawingRef.current = true
      draft.push(p) // the new point follows your finger until you let go
    }
    sync()
    schedule()
  }

  function onMove(e) {
    if (!drawingRef.current) return
    const p = point(e)
    const draft = draftRef.current
    if (mode === 'free') {
      const last = draft[draft.length - 1]
      if (Math.hypot(last.x - p.x, last.y - p.y) >= 3 * p.k) draft.push(p)
    } else if (draft.length > 0) {
      draft[draft.length - 1] = p
    }
    schedule()
  }

  function onUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (mode === 'free') closeDraft(true)
    sync()
    schedule()
  }

  function undo() {
    if (draftRef.current.length > 0) draftRef.current.pop()
    else shapesRef.current.pop()
    sync()
    schedule()
  }

  function clearAll() {
    draftRef.current = []
    shapesRef.current = []
    sync()
    schedule()
  }

  function changeMode(next) {
    if (next === mode) return
    draftRef.current = [] // an unfinished outline is dropped when you switch tools
    drawingRef.current = false
    setMode(next)
    sync()
  }

  function closeShape() {
    closeDraft(false)
    sync()
    schedule()
  }

  async function done() {
    if (draftRef.current.length >= 3) closeDraft(mode === 'free')
    const shapes = shapesRef.current
    if (shapes.length === 0 || !bmpRef.current) return
    setSaving(true)
    try {
      const out = document.createElement('canvas')
      out.width = bmpRef.current.width
      out.height = bmpRef.current.height
      const ctx = out.getContext('2d')
      for (const s of shapes) {
        ctx.save()
        ctx.beginPath()
        addPath(ctx, s)
        ctx.clip()
        ctx.drawImage(bmpRef.current, 0, 0)
        ctx.restore()
      }
      onDone(await canvasToBlob(out))
    } catch {
      setSaving(false)
    }
  }

  const display = { width: size.w * fit * zoom, height: size.h * fit * zoom }
  const hasShape = counts.shapes > 0 || counts.draft >= 3

  let hint = 'Draw around your clothing with your finger. Lift to finish the outline.'
  if (mode === 'points') {
    hint =
      counts.draft >= 3
        ? 'Tap the green dot (or Close shape) to finish. Drag a new point to place it exactly.'
        : 'Tap points along the edge of your clothing, one after another.'
  }
  if (mode === 'move') hint = 'Drag to look around when zoomed in.'
  if (mode !== 'move' && counts.shapes > 0 && counts.draft === 0)
    hint = 'Done with this area. Add another area if needed, then tap Cut out.'

  return (
    <div className="overlay manualcut">
      <header className="ov-head">
        <button className="ov-link" onClick={onCancel}>
          Cancel
        </button>
        <strong>Cut out by hand</strong>
        <button className="ov-link ov-strong" onClick={done} disabled={!ready || saving || !hasShape}>
          Cut out
        </button>
      </header>

      <div className="tu-stage checker" ref={stageRef}>
        {!ready && <div className="spinner tu-spinner" aria-label="Loading" />}
        <div className="mc-wrap" style={ready ? display : { display: 'none' }}>
          <canvas ref={photoRef} className="mc-canvas" />
          <canvas
            ref={overlayRef}
            className={'mc-canvas' + (drawing ? ' tu-draw' : '')}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
      </div>

      <div className="tu-tools glass">
        <div className="tu-modes" role="tablist">
          {[
            ['free', 'Draw'],
            ['points', 'Points'],
            ['move', 'Move'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'seg-on' : ''} onClick={() => changeMode(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="tu-actions">
          <button className="pill" onClick={() => setZoomIdx((zoomIdx + 1) % ZOOMS.length)}>
            Zoom {zoom}x
          </button>
          <button className="pill" onClick={undo} disabled={counts.shapes === 0 && counts.draft === 0}>
            Undo
          </button>
          <button className="pill" onClick={clearAll} disabled={counts.shapes === 0 && counts.draft === 0}>
            Clear
          </button>
          {mode === 'points' && (
            <button className="pill pill-accent" onClick={closeShape} disabled={counts.draft < 3}>
              Close shape
            </button>
          )}
        </div>

        <p className="muted tu-hint">{hint}</p>
      </div>
    </div>
  )
}
