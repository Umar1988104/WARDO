// Geometry for the by-hand cutout editor. Kept separate so it can be tested without a screen.
//
// view = { s, tx, ty }: zoom and offset of the photo inside the stage (CSS px).
// geom = { w, h, fit, W, H }: photo size in pixels, fit scale at zoom 1, stage size in CSS px.

export const MIN_ZOOM = 1
export const MAX_ZOOM = 8
const MARGIN = 40 // how far the photo may be dragged past the stage edge

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function centeredView(geom) {
  return { s: 1, tx: (geom.W - geom.w * geom.fit) / 2, ty: (geom.H - geom.h * geom.fit) / 2 }
}

// keeps the photo from being lost off-screen; centres it when it is smaller than the stage
export function clampView(view, geom) {
  const s = clamp(view.s, MIN_ZOOM, MAX_ZOOM)
  const cw = geom.w * geom.fit * s
  const ch = geom.h * geom.fit * s
  const tx = cw <= geom.W ? (geom.W - cw) / 2 : clamp(view.tx, geom.W - cw - MARGIN, MARGIN)
  const ty = ch <= geom.H ? (geom.H - ch) / 2 : clamp(view.ty, geom.H - ch - MARGIN, MARGIN)
  return { s, tx, ty }
}

// stage point (CSS px) -> photo pixel, kept inside the photo
export function toCanvas(view, geom, px, py) {
  const k = view.s * geom.fit
  return {
    x: clamp((px - view.tx) / k, 0, geom.w),
    y: clamp((py - view.ty) / k, 0, geom.h),
  }
}

// photo pixels per CSS pixel (so lines keep the same thickness on screen at any zoom)
export const pixelsPerScreenPx = (view, geom) => 1 / (view.s * geom.fit)

// Two-finger pinch: the spot between your fingers stays under them while zooming and moving.
// start = { d0, mid0:{x,y}, view0 }, a/b = current finger positions
export function pinchView(start, a, b, geom) {
  const d = Math.hypot(a.x - b.x, a.y - b.y)
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const s = clamp(start.view0.s * (d / start.d0), MIN_ZOOM, MAX_ZOOM)
  const lx = (start.mid0.x - start.view0.tx) / start.view0.s
  const ly = (start.mid0.y - start.view0.ty) / start.view0.s
  return clampView({ s, tx: mid.x - lx * s, ty: mid.y - ly * s }, geom)
}

// zoom around one point (mouse wheel on a computer)
export function zoomAt(view, px, py, newS, geom) {
  const s = clamp(newS, MIN_ZOOM, MAX_ZOOM)
  const lx = (px - view.tx) / view.s
  const ly = (py - view.ty) / view.s
  return clampView({ s, tx: px - lx * s, ty: py - ly * s }, geom)
}

export function pathLength(pts) {
  let n = 0
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return n
}

// After lifting a finger: has the outline come back around to where it started?
// k = photo pixels per screen pixel, closePx = how close counts, in screen pixels.
export function backAtStart(pts, k, closePx = 22) {
  if (pts.length < 8) return false
  const first = pts[0]
  const last = pts[pts.length - 1]
  const near = Math.hypot(first.x - last.x, first.y - last.y) <= closePx * k
  return near && pathLength(pts) >= closePx * 8 * k // a tiny scribble near the start does not count
}
