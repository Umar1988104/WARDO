import { COLORS, NEUTRALS, ROLE } from '../options.js'

// Simple colour-wheel rules, no network and nothing to learn:
// neutrals go with everything, similar hues sit well together, opposite hues make a bold pair.

function hue(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}

const HUE = Object.fromEntries(COLORS.map((c) => [c.name, hue(c.hex)]))
const gap = (a, b) => {
  const d = Math.abs(HUE[a] - HUE[b]) % 360
  return d > 180 ? 360 - d : d
}
const isNeutral = (name) => NEUTRALS.includes(name)
const chromatic = COLORS.map((c) => c.name).filter((n) => !isNeutral(n))

// Colours that go well with `name`, grouped for display. Returns [] when the colour is unknown.
export function harmonyFor(name) {
  if (!name || HUE[name] == null) return []
  if (isNeutral(name)) {
    return [{ kind: 'Goes with almost anything', colors: COLORS.map((c) => c.name).filter((n) => n !== name) }]
  }
  const similar = chromatic.filter((n) => n !== name && gap(n, name) <= 45)
  const bold = chromatic.filter((n) => gap(n, name) >= 140)
  const neutrals = NEUTRALS.filter((n) => n !== name)
  return [
    { kind: 'Safe', colors: neutrals },
    ...(similar.length ? [{ kind: 'Similar shades', colors: similar }] : []),
    ...(bold.length ? [{ kind: 'Bold contrast', colors: bold }] : []),
  ]
}

export function matchingColors(name) {
  return new Set(harmonyFor(name).flatMap((g) => g.colors))
}

// which kinds of pieces complete a piece of this role
const PARTNER_ROLES = { top: ['bottom', 'shoes', 'layer'], bottom: ['top', 'shoes', 'layer'], layer: ['top', 'bottom'], shoes: ['top', 'bottom'] }

// Pieces from the wardrobe that pair well with `item`: right colour and a partner role.
export function pairsFor(item, items, wearInfo = {}, limit = 8) {
  const roles = PARTNER_ROLES[ROLE[item.category]]
  if (!roles || !item.color) return []
  const ok = matchingColors(item.color)
  return items
    .filter(
      (o) =>
        o.id !== item.id &&
        o.section !== 'inner' &&
        o.laundry !== 'dirty' &&
        o.status !== 'donate' &&
        o.status !== 'sell' &&
        roles.includes(ROLE[o.category]) &&
        o.color &&
        (ok.has(o.color) || o.color === item.color)
    )
    .sort((a, b) => (wearInfo[b.id]?.count || 0) - (wearInfo[a.id]?.count || 0))
    .slice(0, limit)
}

// A short verdict for the colours in an outfit: { label, tone: 'good' | 'ok' | 'busy' }
export function rateColors(colors) {
  const known = colors.filter((c) => HUE[c] != null)
  if (known.length < 2) return null
  const pops = [...new Set(known.filter((c) => !isNeutral(c)))]
  if (pops.length === 0) return { label: 'Clean neutral look', tone: 'good' }
  if (pops.length === 1) return { label: `${pops[0]} stands out nicely`, tone: 'good' }
  if (pops.length === 2) {
    const d = gap(pops[0], pops[1])
    if (d <= 45) return { label: 'Similar shades, easy on the eye', tone: 'good' }
    if (d >= 140) return { label: 'Bold contrast', tone: 'ok' }
    return { label: 'Two colours, a little busy', tone: 'ok' }
  }
  return { label: 'Lots of colours, try keeping to two', tone: 'busy' }
}
