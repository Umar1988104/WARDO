import { ROLE, NEUTRALS } from '../options.js'
import { usable } from './suggest.js'

export const CLIMATES = [
  { value: 'warm', label: 'Warm', season: 'Summer' },
  { value: 'mild', label: 'Mild', season: 'Mid-season' },
  { value: 'cold', label: 'Cold', season: 'Winter' },
]

export const PACK_ROLES = [
  { role: 'top', label: 'Tops' },
  { role: 'bottom', label: 'Bottoms' },
  { role: 'layer', label: 'Layers' },
  { role: 'shoes', label: 'Shoes' },
]

// how many pieces of each kind a trip of this length needs
export function neededCounts(days, climate) {
  return {
    top: Math.max(1, days <= 2 ? days : Math.min(10, Math.ceil(days * 0.8))),
    bottom: Math.max(1, Math.min(4, Math.ceil(days / 3))),
    layer: climate === 'cold' ? (days > 5 ? 2 : 1) : climate === 'mild' ? 1 : 0,
    shoes: days <= 3 ? 1 : 2,
  }
}

// Picks clean pieces for a trip. Favours pieces you already wear a lot and neutral colours that mix easily,
// and avoids packing many pieces in the same colour.
export function buildPacking(items, wearInfo, { days, climate, occasions = [] }) {
  const season = CLIMATES.find((c) => c.value === climate)?.season || 'Mid-season'
  const need = neededCounts(days, climate)
  const pool = items.filter(
    (i) => ROLE[i.category] && (occasions.length === 0 ? usable(i, season, null) : occasions.some((o) => usable(i, season, o)))
  )

  const ids = []
  const missing = []
  for (const { role, label } of PACK_ROLES) {
    const want = need[role]
    if (want === 0) continue
    const score = (i) => (wearInfo[i.id]?.count || 0) + (NEUTRALS.includes(i.color) ? (role === 'bottom' ? 15 : 8) : 0)
    const ranked = pool.filter((i) => ROLE[i.category] === role).sort((a, b) => score(b) - score(a))

    const chosen = []
    const perColor = {}
    for (const item of ranked) {
      if (chosen.length >= want) break
      const c = item.color || '-'
      if ((perColor[c] || 0) >= 2) continue // keep some variety
      perColor[c] = (perColor[c] || 0) + 1
      chosen.push(item)
    }
    for (const item of ranked) {
      if (chosen.length >= want) break
      if (!chosen.includes(item)) chosen.push(item)
    }
    ids.push(...chosen.map((i) => i.id))
    if (chosen.length < want) missing.push({ label: label.toLowerCase(), need: want, have: chosen.length })
  }

  return {
    ids,
    missing,
    extras: [{ label: 'Innerwear and socks', note: `${days + 1} sets` }],
  }
}
