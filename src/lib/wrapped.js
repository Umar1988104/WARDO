import { colorHex } from '../options.js'
import { costPerWear, formatMoney } from './money.js'
import { keyOf } from './dates.js'

// Wardrobe Wrapped: numbers about what you wore, drawn into a shareable picture.
// Everything happens on the phone. Innerwear is never included.

export const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

export function periodRange(period, now = new Date()) {
  const today = keyOf(now)
  if (period === 'month') {
    return { from: keyOf(new Date(now.getFullYear(), now.getMonth(), 1)), to: today, label: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
  }
  if (period === 'year') return { from: `${now.getFullYear()}-01-01`, to: today, label: String(now.getFullYear()) }
  return { from: '0000-01-01', to: today, label: 'All time' }
}

const dayNumber = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

export function computeWrapped({ items, goneItems = [], wears, outfits = [], period }) {
  const { from, to, label } = periodRange(period)
  const pool = items.filter((i) => i.section !== 'inner')
  const byId = Object.fromEntries(pool.map((i) => [i.id, i]))

  const inRange = wears.filter((w) => w.date >= from && w.date <= to && byId[w.itemId])
  const counts = {}
  const colours = {}
  const days = new Set()
  for (const w of inRange) {
    counts[w.itemId] = (counts[w.itemId] || 0) + 1
    days.add(w.date)
    const c = byId[w.itemId].color
    if (c) colours[c] = (colours[c] || 0) + 1
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const top = ranked[0] ? { item: byId[ranked[0][0]], count: ranked[0][1] } : null

  const sortedDays = [...days].sort()
  let streak = 0
  let run = 0
  let prev = null
  for (const d of sortedDays) {
    const n = dayNumber(d)
    run = prev != null && n === prev + 1 ? run + 1 : 1
    streak = Math.max(streak, run)
    prev = n
  }

  const colourTotal = Object.values(colours).reduce((a, b) => a + b, 0)
  const topColours = Object.entries(colours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, hex: colorHex(name) || '#888', share: Math.round((n / colourTotal) * 100) }))

  // best value: lowest cost per wear over all time
  const allCounts = {}
  for (const w of wears) if (byId[w.itemId]) allCounts[w.itemId] = (allCounts[w.itemId] || 0) + 1
  const value = pool
    .map((item) => ({ item, cpw: costPerWear(item, allCounts[item.id]) }))
    .filter((x) => x.cpw != null)
    .sort((a, b) => a.cpw - b.cpw)[0]

  const earned = goneItems
    .filter((i) => i.status === 'sold' && i.goneAt && keyOf(new Date(i.goneAt)) >= from && keyOf(new Date(i.goneAt)) <= to)
    .reduce((sum, i) => sum + (i.soldFor || 0), 0)

  return {
    label,
    wearCount: inRange.length,
    distinct: ranked.length,
    total: pool.length,
    streak,
    top,
    topColours,
    untouched: pool.length - ranked.length,
    planned: outfits.filter((o) => o.date >= from && o.date <= to).length,
    value: value ? { name: value.item.name, cpw: value.cpw } : null,
    earned,
  }
}

function fit(text, ctx, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

// Draws the 1080 x 1350 card and returns a PNG blob.
export async function drawWrappedCard(stats, { accent = '#6fd0bd', currency = '₹' } = {}) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

  // black background with a soft accent glow, like a spotlight
  ctx.fillStyle = '#050607'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 720)
  glow.addColorStop(0, accent + '55')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.fillStyle = accent
  ctx.font = `700 30px ${font}`
  ctx.fillText('W A R D R O B E   W R A P P E D', W / 2, 96)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 64px ${font}`
  ctx.fillText(stats.label, W / 2, 176)

  // hero: the most-worn piece in a spotlight circle
  const cx = W / 2
  const cy = 520
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 250, 0, Math.PI * 2)
  const disc = ctx.createRadialGradient(cx, cy - 90, 20, cx, cy, 250)
  disc.addColorStop(0, 'rgba(255,255,255,0.22)')
  disc.addColorStop(1, 'rgba(255,255,255,0.04)')
  ctx.fillStyle = disc
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.stroke()
  ctx.restore()

  if (stats.top) {
    try {
      const bmp = await createImageBitmap(stats.top.item.front || stats.top.item.thumb)
      const box = 400
      const s = Math.min(box / bmp.width, box / bmp.height)
      ctx.drawImage(bmp, cx - (bmp.width * s) / 2, cy - (bmp.height * s) / 2, bmp.width * s, bmp.height * s)
      bmp.close?.()
    } catch {
      /* the card still works without the picture */
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = `600 28px ${font}`
    ctx.fillText('MOST WORN', W / 2, 850)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 52px ${font}`
    ctx.fillText(fit(stats.top.item.name, ctx, 880), W / 2, 912)
    ctx.fillStyle = accent
    ctx.font = `700 34px ${font}`
    ctx.fillText(`${stats.top.count} ${stats.top.count === 1 ? 'wear' : 'wears'}`, W / 2, 962)
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = `700 44px ${font}`
    ctx.fillText('No wears logged yet', W / 2, cy + 14)
  }

  // three big numbers
  const cols = [
    { n: String(stats.wearCount), l: 'wears logged' },
    { n: `${stats.distinct}/${stats.total}`, l: 'pieces worn' },
    { n: String(stats.streak), l: 'day streak' },
  ]
  cols.forEach((c, i) => {
    const x = 180 + i * 360
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 70px ${font}`
    ctx.fillText(c.n, x, 1074)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = `600 26px ${font}`
    ctx.fillText(c.l, x, 1114)
  })

  // colour dots
  if (stats.topColours.length) {
    const gapX = 150
    const startX = W / 2 - ((stats.topColours.length - 1) * gapX) / 2
    stats.topColours.forEach((c, i) => {
      const x = startX + i * gapX
      ctx.beginPath()
      ctx.arc(x, 1186, 26, 0, Math.PI * 2)
      ctx.fillStyle = c.hex
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = `600 22px ${font}`
      ctx.fillText(`${c.share}%`, x, 1240)
    })
  }

  // one line of extra facts
  const facts = []
  if (stats.value) facts.push(`Best value: ${stats.value.name}, ${formatMoney(stats.value.cpw, currency)} a wear`)
  if (stats.earned > 0) facts.push(`${formatMoney(stats.earned, currency)} earned from selling`)
  if (stats.untouched > 0 && stats.total > 0) facts.push(`${stats.untouched} pieces untouched`)
  if (facts.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = `600 27px ${font}`
    ctx.fillText(fit(facts.slice(0, 2).join('   ·   '), ctx, 960), W / 2, 1296)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = `600 22px ${font}`
  ctx.fillText('Made with Wardo', W / 2, 1334)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'))
}
