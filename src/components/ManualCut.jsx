import { useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../lib/image.js'
import {
  centeredView,
  clampView,
  toCanvas,
  pixelsPerScreenPx,
  pinchView,
  zoomAt,
  backAtStart,
} from '../lib/cutmath.js'

const CLOSE_PX = 22 // screen px: finishing this close to the first point closes the outline
const SNAP_PX = 28 // screen px: starting this close to the end of the line continues that line
const SAMPLE_PX = 1.5 // screen px: a new point is added each time the finger moves this far
const LOUPE = 88 // screen px: size of the magnifier circle
const LOUPE_ZOOM = 3

function tracePath(ctx, pts) {
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
}

// Cut out the clothing yourself.
//  - One finger traces the outline. Lift and carry on: it is still the same outline.
//  - Two fingers: pinch to zoom, drag to move.
//  - Finish by coming back to the green dot (or tap Close shape), then tap Cut out.
export default function ManualCut({ originalBlob, onDone, onCancel }) {
  const stageRef = useRef(null)
  const wrapRef = useRef(null)
  const photoRef = useRef(null)
  const overlayRef = useRef(null)
  const loupeRef = useRef(null)
  const bmpRef = useRef(null)
  const rafRef = useRef(0)

  const geomRef = useRef({ w: 0, h: 0, fit: 1, W: 1, H: 1 })
  const viewRef = useRef({ s: 1, tx: 0, ty: 0 })

  const shapesRef = useRef([]) // finished areas: { pts, kind: 'keep' | 'remove' }
  const draftRef = useRef([]) // the outline being drawn (stays open when you lift your finger)
  const marksRef = useRef([]) // where each stroke started in the draft, so Undo removes one stroke
  const modeRef = useRef('draw')
  const kindRef = useRef('keep')

  const pointersRef = useRef(new Map()) // finger id -> position in the stage (screen px)
  const gestureRef = useRef(null) // two-finger zoom/move in progress
  const strokeRef = useRef(null) // one-finger stroke in progress: { startLen }
  const blockedRef = useRef(false) // after a pinch, ignore drawing until every finger is lifted
  const loupeAt = useRef(null) // { cx, cy (photo px), px, py (stage px) } while a finger is tracing

  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState('draw') // draw | points
  const [kind, setKind] = useState('keep') // keep | remove
  const [counts, setCounts] = useState({ shapes: 0, draft: 0, keeps: 0 })
  const [saving, setSaving] = useState(false)

  modeRef.current = mode
  kindRef.current = kind

  function sync() {
    const shapes = shapesRef.current
    if (kindRef.current === 'remove' && !shapes.some((s) => s.kind === 'keep')) setKind('keep')
    setCounts({
      shapes: shapes.length,
      draft: draftRef.current.length,
      keeps: shapes.filter((s) => s.kind === 'keep').length,
    })
  }

  // ---------- setup ----------
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
      layout(bmp.width, bmp.height)
      setReady(true)
    })().catch(() => onCancel())
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
      bmpRef.current?.close?.()
    }
  }, [originalBlob]) // eslint-disable-line react-hooks/exhaustive-deps

  function layout(w, h) {
    const r = stageRef.current.getBoundingClientRect()
    const fit = Math.min((r.width - 16) / w, (r.height - 16) / h)
    geomRef.current = { w, h, fit, W: r.width, H: r.height }
    const wrap = wrapRef.current
    wrap.style.width = w * fit + 'px'
    wrap.style.height = h * fit + 'px'
    setView(centeredView(geomRef.current))
  }

  function setView(v) {
    viewRef.current = clampView(v, geomRef.current)
    const { s, tx, ty } = viewRef.current
    wrapRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
    schedule()
  }

  // ---------- drawing the outline on top of the photo ----------
  function redraw() {
    const c = overlayRef.current
    if (!c || !bmpRef.current) return
    const ctx = c.getContext('2d')
    const { width: W, height: H } = c
    const k = pixelsPerScreenPx(viewRef.current, geomRef.current)
    ctx.clearRect(0, 0, W, H)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    const shapes = shapesRef.current
    if (shapes.length > 0) {
      // darken what will be removed, following the order you drew the areas
      ctx.fillStyle = 'rgba(10, 12, 24, 0.62)'
      ctx.fillRect(0, 0, W, H)
      for (const s of shapes) {
        ctx.globalCompositeOperation = s.kind === 'keep' ? 'destination-out' : 'source-over'
        ctx.beginPath()
        tracePath(ctx, s.pts)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      for (const s of shapes) {
        ctx.beginPath()
        tracePath(ctx, s.pts)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
        ctx.lineWidth = 4 * k
        ctx.stroke()
        ctx.strokeStyle = s.kind === 'keep' ? '#ffffff' : '#ff6b6b'
        ctx.lineWidth = 1.8 * k
        ctx.stroke()
      }
    }

    const draft = draftRef.current
    if (draft.length > 0) {
      ctx.beginPath()
      ctx.moveTo(draft[0].x, draft[0].y)
      for (let i = 1; i < draft.length; i++) ctx.lineTo(draft[i].x, draft[i].y)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.lineWidth = 4 * k
      ctx.stroke()
      ctx.strokeStyle = kindRef.current === 'keep' ? '#7c93ff' : '#ff8a8a'
      ctx.lineWidth = 2 * k
      ctx.stroke()

      if (draft.length >= 3) {
        // faint line showing where the outline will close
        ctx.beginPath()
        ctx.moveTo(draft[draft.length - 1].x, draft[draft.length - 1].y)
        ctx.lineTo(draft[0].x, draft[0].y)
        ctx.setLineDash([6 * k, 6 * k])
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.lineWidth = 1.5 * k
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (modeRef.current === 'points') {
        for (const p of draft) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 4 * k, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
        }
      }

      // start (green once it can be closed) and end (where to carry on from)
      const first = draft[0]
      const last = draft[draft.length - 1]
      ctx.beginPath()
      ctx.arc(first.x, first.y, 8 * k, 0, Math.PI * 2)
      ctx.fillStyle = draft.length >= 6 ? '#22c55e' : '#fff'
      ctx.fill()
      ctx.strokeStyle = '#1b2a6b'
      ctx.lineWidth = 2 * k
      ctx.stroke()
      if (draft.length > 1) {
        ctx.beginPath()
        ctx.arc(last.x, last.y, 6 * k, 0, Math.PI * 2)
        ctx.fillStyle = '#4263eb'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 * k
        ctx.stroke()
      }
    }

    drawLoupe()
  }

  function schedule() {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(redraw)
  }

  // ---------- magnifier: shows the exact spot under your finger ----------
  function showLoupe(on) {
    if (!on) loupeAt.current = null
    const el = loupeRef.current
    if (el) el.style.display = on ? 'block' : 'none'
  }

  function drawLoupe() {
    const at = loupeAt.current
    const el = loupeRef.current
    if (!at || !el) return
    // sit in a top corner, away from your finger
    const nearLeft = at.px < LOUPE + 80 && at.py < LOUPE + 80
    el.style.left = nearLeft ? 'auto' : '8px'
    el.style.right = nearLeft ? '8px' : 'auto'

    const size = el.width
    const k = pixelsPerScreenPx(viewRef.current, geomRef.current)
    const side = (LOUPE / LOUPE_ZOOM) * k // photo px that fill the circle
    const sx = at.cx - side / 2
    const sy = at.cy - side / 2
    const ctx = el.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = '#202333'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(photoRef.current, sx, sy, side, side, 0, 0, size, size)
    ctx.drawImage(overlayRef.current, sx, sy, side, side, 0, 0, size, size)
    ctx.restore()
    // crosshair
    const m = size / 2
    ctx.beginPath()
    ctx.moveTo(m - 12, m)
    ctx.lineTo(m + 12, m)
    ctx.moveTo(m, m - 12)
    ctx.lineTo(m, m + 12)
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // ---------- fingers ----------
  function stagePoint(e) {
    const r = stageRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function startGesture() {
    const [a, b] = [...pointersRef.current.values()]
    gestureRef.current = {
      d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view0: { ...viewRef.current },
    }
  }

  // forget the half-drawn stroke (a second finger landing means zoom, not draw)
  function dropStroke() {
    const stroke = strokeRef.current
    if (!stroke) return
    draftRef.current.length = stroke.startLen
    if (marksRef.current[marksRef.current.length - 1] === stroke.startLen) marksRef.current.pop()
    strokeRef.current = null
    showLoupe(false)
    sync()
  }

  function closeDraft() {
    const draft = draftRef.current
    if (draft.length >= 3) {
      shapesRef.current.push({ pts: draft.map(({ x, y }) => ({ x, y })), kind: kindRef.current })
    }
    draftRef.current = []
    marksRef.current = []
  }

  function onPointerDown(e) {
    if (!bmpRef.current || saving) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, stagePoint(e))
    const count = pointersRef.current.size

    if (count === 2) {
      dropStroke()
      blockedRef.current = true
      startGesture()
      schedule()
      return
    }
    if (count > 2 || blockedRef.current) return

    const sp = pointersRef.current.get(e.pointerId)
    const p = toCanvas(viewRef.current, geomRef.current, sp.x, sp.y)
    const draft = draftRef.current
    const k = pixelsPerScreenPx(viewRef.current, geomRef.current)

    // points mode: tapping the first point closes the outline
    if (modeRef.current === 'points' && draft.length >= 3) {
      const f = draft[0]
      if (Math.hypot(f.x - p.x, f.y - p.y) <= CLOSE_PX * k) {
        closeDraft()
        sync()
        schedule()
        return
      }
    }

    strokeRef.current = { startLen: draft.length }
    marksRef.current.push(draft.length)
    const end = draft[draft.length - 1]
    const resuming = modeRef.current === 'draw' && end && Math.hypot(end.x - p.x, end.y - p.y) <= SNAP_PX * k
    // starting near the blue end dot just carries the same line on, with no gap
    if (!resuming) draft.push(p)
    loupeAt.current = { cx: p.x, cy: p.y, px: sp.x, py: sp.y }
    showLoupe(true)
    sync()
    schedule()
  }

  function onPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    const sp = stagePoint(e)
    pointersRef.current.set(e.pointerId, sp)

    if (gestureRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()]
      setView(pinchView(gestureRef.current, a, b, geomRef.current))
      return
    }
    if (!strokeRef.current) return

    const draft = draftRef.current
    const k = pixelsPerScreenPx(viewRef.current, geomRef.current)
    if (modeRef.current === 'points') {
      // the new point follows your finger until you lift it
      const p = toCanvas(viewRef.current, geomRef.current, sp.x, sp.y)
      draft[draft.length - 1] = p
      loupeAt.current = { cx: p.x, cy: p.y, px: sp.x, py: sp.y }
    } else {
      // use every sample the phone recorded, for a faithful line
      const r = stageRef.current.getBoundingClientRect()
      const events = e.nativeEvent.getCoalescedEvents?.() || []
      const list = events.length ? events : [e.nativeEvent]
      let p = null
      for (const ev of list) {
        p = toCanvas(viewRef.current, geomRef.current, ev.clientX - r.left, ev.clientY - r.top)
        const last = draft[draft.length - 1]
        if (Math.hypot(last.x - p.x, last.y - p.y) >= SAMPLE_PX * k) draft.push(p)
      }
      if (p) loupeAt.current = { cx: p.x, cy: p.y, px: sp.x, py: sp.y }
    }
    schedule()
  }

  function onPointerUp(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) gestureRef.current = null

    if (strokeRef.current) {
      const { startLen } = strokeRef.current
      strokeRef.current = null
      showLoupe(false)
      if (modeRef.current === 'draw' && draftRef.current.length - startLen < 2) {
        draftRef.current.length = startLen
        if (marksRef.current[marksRef.current.length - 1] === startLen) marksRef.current.pop()
      }
      const k = pixelsPerScreenPx(viewRef.current, geomRef.current)
      // draw mode: coming back around to the green dot closes the outline
      if (modeRef.current === 'draw' && backAtStart(draftRef.current, k, CLOSE_PX)) closeDraft()
      sync()
      schedule()
    }
    if (pointersRef.current.size === 0) blockedRef.current = false
  }

  function onWheel(e) {
    // mouse wheel zoom (for trying this on a computer)
    const p = stagePoint(e)
    setView(zoomAt(viewRef.current, p.x, p.y, viewRef.current.s * Math.exp(-e.deltaY * 0.0015), geomRef.current))
  }

  // ---------- buttons ----------
  function undo() {
    if (draftRef.current.length > 0) {
      // remove the last stroke only, so you can redo just that part
      const start = marksRef.current.pop() ?? 0
      draftRef.current.length = Math.min(start, draftRef.current.length)
    } else {
      shapesRef.current.pop()
    }
    sync()
    schedule()
  }

  function clearAll() {
    draftRef.current = []
    marksRef.current = []
    shapesRef.current = []
    sync()
    schedule()
  }

  function closeShape() {
    closeDraft()
    sync()
    schedule()
  }

  function changeMode(next) {
    modeRef.current = next // the open outline is kept: you can mix Draw and Points
    setMode(next)
    schedule()
  }

  async function done() {
    if (draftRef.current.length >= 3) closeDraft()
    const shapes = shapesRef.current
    if (!shapes.some((s) => s.kind === 'keep') || !bmpRef.current) return
    setSaving(true)
    try {
      const out = document.createElement('canvas')
      out.width = bmpRef.current.width
      out.height = bmpRef.current.height
      const ctx = out.getContext('2d')
      for (const s of shapes) {
        ctx.save()
        ctx.beginPath()
        tracePath(ctx, s.pts)
        if (s.kind === 'keep') {
          ctx.clip()
          ctx.drawImage(bmpRef.current, 0, 0)
        } else {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.fill()
        }
        ctx.restore()
      }
      onDone(await canvasToBlob(out))
    } catch {
      setSaving(false)
    }
  }

  const drafting = counts.draft > 0
  const canCut = counts.keeps > 0 || (counts.draft >= 3 && kind === 'keep')

  let hint = 'One finger traces around your clothing. Two fingers pinch to zoom and drag to move.'
  if (mode === 'points') hint = 'Tap to place points along the edge. Drag before lifting to fine-tune a point.'
  if (drafting) hint = 'Lift anytime and carry on from the blue dot. Finish at the green dot, or tap Close shape.'
  else if (counts.shapes > 0) hint = 'Outline done. Add another area, remove a part, or tap Cut out.'

  return (
    <div className="overlay manualcut">
      <header className="ov-head">
        <button className="ov-link" onClick={onCancel}>
          Cancel
        </button>
        <strong>Cut out by hand</strong>
        <button className="ov-link ov-strong" onClick={done} disabled={!ready || saving || !canCut}>
          Cut out
        </button>
      </header>

      <div
        className="mc-stage checker"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {!ready && <div className="spinner tu-spinner" aria-label="Loading" />}
        <div className="mc-wrap" ref={wrapRef} style={ready ? undefined : { display: 'none' }}>
          <canvas ref={photoRef} className="mc-canvas" />
          <canvas ref={overlayRef} className="mc-canvas" />
        </div>
        <canvas ref={loupeRef} className="mc-loupe" width={LOUPE * 2} height={LOUPE * 2} />
      </div>

      <div className="tu-tools glass">
        <div className="tu-modes" role="tablist" aria-label="Tool">
          {[
            ['draw', 'Draw'],
            ['points', 'Points'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'seg-on' : ''} onClick={() => changeMode(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="tu-modes" role="tablist" aria-label="What the outline does">
          <button role="tab" aria-selected={kind === 'keep'} className={kind === 'keep' ? 'seg-on' : ''} onClick={() => setKind('keep')}>
            Keep area
          </button>
          <button
            role="tab"
            aria-selected={kind === 'remove'}
            className={kind === 'remove' ? 'seg-on' : ''}
            disabled={counts.keeps === 0}
            onClick={() => setKind('remove')}
          >
            Remove area
          </button>
        </div>

        <div className="tu-actions">
          <button className="pill" onClick={undo} disabled={counts.shapes === 0 && counts.draft === 0}>
            Undo
          </button>
          <button className="pill" onClick={clearAll} disabled={counts.shapes === 0 && counts.draft === 0}>
            Clear
          </button>
          <button className="pill" onClick={() => setView(centeredView(geomRef.current))} disabled={!ready}>
            Fit
          </button>
          <button className="pill pill-accent" onClick={closeShape} disabled={counts.draft < 3}>
            Close shape
          </button>
        </div>

        <p className="muted tu-hint">{hint}</p>
      </div>
    </div>
  )
}
