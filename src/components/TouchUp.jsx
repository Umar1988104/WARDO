import { useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../lib/image.js'

const ZOOMS = [1, 2, 3]
const MAX_HISTORY = 8

// Touch-up editor: erase leftover background, or restore parts that were cut off.
export default function TouchUp({ originalBlob, cutoutBlob, onDone, onCancel }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const startRef = useRef(null) // ImageBitmap of the cutout we began with
  const patternRef = useRef(null) // original photo as a paint pattern (for Restore)
  const historyRef = useRef([])
  const lastRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [fit, setFit] = useState(1)
  const [tool, setTool] = useState('erase') // erase | restore | move
  const [brush, setBrush] = useState(30)
  const [zoomIdx, setZoomIdx] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [orig, cut] = await Promise.all([createImageBitmap(originalBlob), createImageBitmap(cutoutBlob)])
      if (!alive) return
      const canvas = canvasRef.current
      canvas.width = cut.width
      canvas.height = cut.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(cut, 0, 0)
      startRef.current = cut

      // original photo, scaled to the cutout's size, used as the "restore" paint
      const oc = document.createElement('canvas')
      oc.width = cut.width
      oc.height = cut.height
      oc.getContext('2d').drawImage(orig, 0, 0, cut.width, cut.height)
      patternRef.current = ctx.createPattern(oc, 'no-repeat')

      const r = stageRef.current.getBoundingClientRect()
      setFit(Math.min((r.width - 24) / cut.width, (r.height - 24) / cut.height))
      setSize({ w: cut.width, h: cut.height })
      setReady(true)
    })().catch(() => onCancel())
    return () => {
      alive = false
    }
  }, [originalBlob, cutoutBlob]) // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = ZOOMS[zoomIdx]
  const drawing = tool !== 'move'

  function toCanvasPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const k = canvas.width / rect.width
    return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k, k }
  }

  function paint(from, to, radius) {
    const ctx = canvasRef.current.getContext('2d')
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = radius * 2
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000'
      ctx.fillStyle = '#000'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = patternRef.current
      ctx.fillStyle = patternRef.current
    }
    ctx.beginPath()
    ctx.arc(to.x, to.y, radius, 0, Math.PI * 2)
    ctx.fill()
    if (from) {
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }
    ctx.restore()
  }

  function snapshot() {
    const canvas = canvasRef.current
    const hist = historyRef.current
    hist.push(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height))
    if (hist.length > MAX_HISTORY) hist.shift()
    setCanUndo(true)
  }

  function onDown(e) {
    if (!drawing || !ready) return
    e.currentTarget.setPointerCapture(e.pointerId)
    snapshot()
    const p = toCanvasPoint(e)
    lastRef.current = p
    paint(null, p, (brush / 2) * p.k)
  }

  function onMove(e) {
    if (!lastRef.current) return
    const p = toCanvasPoint(e)
    paint(lastRef.current, p, (brush / 2) * p.k)
    lastRef.current = p
  }

  function onUp() {
    lastRef.current = null
  }

  function undo() {
    const hist = historyRef.current
    const last = hist.pop()
    if (last) canvasRef.current.getContext('2d').putImageData(last, 0, 0)
    setCanUndo(hist.length > 0)
  }

  function reset() {
    snapshot()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(startRef.current, 0, 0)
  }

  async function done() {
    setSaving(true)
    try {
      onDone(await canvasToBlob(canvasRef.current))
    } catch {
      setSaving(false)
    }
  }

  const display = { width: size.w * fit * zoom, height: size.h * fit * zoom }

  return (
    <div className="overlay touchup">
      <header className="ov-head">
        <button className="ov-link" onClick={onCancel}>
          Cancel
        </button>
        <strong>Touch up</strong>
        <button className="ov-link ov-strong" onClick={done} disabled={!ready || saving}>
          Done
        </button>
      </header>

      <div className="tu-stage checker" ref={stageRef}>
        {!ready && <div className="spinner tu-spinner" aria-label="Loading" />}
        <canvas
          ref={canvasRef}
          className={'tu-canvas' + (drawing ? ' tu-draw' : '')}
          style={ready ? display : { display: 'none' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>

      <div className="tu-tools glass">
        <div className="tu-modes" role="tablist">
          {[
            ['erase', 'Erase'],
            ['restore', 'Restore'],
            ['move', 'Move'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tool === id} className={tool === id ? 'seg-on' : ''} onClick={() => setTool(id)}>
              {label}
            </button>
          ))}
        </div>

        <label className="tu-brush">
          <span className="muted">Brush</span>
          <input type="range" min="8" max="90" value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
        </label>

        <div className="tu-actions">
          <button className="pill" onClick={() => setZoomIdx((zoomIdx + 1) % ZOOMS.length)}>
            Zoom {zoom}x
          </button>
          <button className="pill" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button className="pill" onClick={reset} disabled={!ready}>
            Reset
          </button>
        </div>

        <p className="muted tu-hint">
          {tool === 'erase' && 'Erase leftover background.'}
          {tool === 'restore' && 'Paint back parts of the clothing that were cut off.'}
          {tool === 'move' && 'Drag to look around when zoomed in.'}
        </p>
      </div>
    </div>
  )
}
