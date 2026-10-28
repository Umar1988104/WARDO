import { ROLE, NEUTRALS } from '../options.js'
import { daysSince, keyOf } from './dates.js'

// small seeded random generator, so "today's pick" stays the same until you shuffle
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// the day's forecast decides the season when weather is on
export function seasonFromWeather(w) {
  if (!w) return null
  if (w.max <= 18 || w.min <= 10) return 'Winter'
  if (w.max <= 27) return 'Mid-season'
  return 'Summer'
}

export function seasonForDate(key) {
  const m = Number(key.slice(5, 7))
  if ([11, 12, 1, 2].includes(m)) return 'Winter'
  if ([3, 10].includes(m)) return 'Mid-season'
  return 'Summer'
}

// pieces that can go into an outfit or a packing list at all
export function usable(item, season, occasion) {
  if (item.section === 'inner') return false
  if (item.laundry === 'dirty') return false // still in the wash
  if (item.status === 'donate' || item.status === 'sell') return false // on its way out
  const tags = item.tags || []
  if (tags.includes('Torn') || tags.includes('Needs repair')) return false

  const s = item.season || 'All year'
  const seasonOk = s === 'All year' || s === 'Mid-season' || season === 'Mid-season' || s === season
  if (!seasonOk) return false

  if (occasion) {
    const occ = item.occasions || []
    if (!(occ.includes(occasion) || (occ.length === 0 && occasion === 'Casual'))) return false
  }
  return true
}

// how long since the piece was last worn (or added, if never worn), capped
function idleDays(item, wearInfo) {
  const last = wearInfo[item.id]?.last || keyOf(new Date(item.createdAt))
  return Math.min(Math.max(daysSince(last), 0), 120)
}

function choose(list, scoreOf, rnd) {
  if (list.length === 0) return null
  const ranked = list
    .map((item) => ({ item, score: scoreOf(item) + rnd() * 20 }))
    .sort((a, b) => b.score - a.score)
  const pool = ranked.slice(0, 4)
  return pool[Math.floor(rnd() * pool.length)].item
}

// Rule-based outfit: top + bottom (+ layer on cooler days, + shoes), favouring pieces you haven't worn lately.
export function suggestOutfit(items, wearInfo, { date, occasion = null, seed = 0, weather = null }) {
  const rnd = mulberry32(hash(`${date}:${occasion || ''}:${seed}`))
  const season = seasonFromWeather(weather) || seasonForDate(date)
  const pool = items.filter((i) => usable(i, season, occasion))

  const byRole = (role) => pool.filter((i) => ROLE[i.category] === role)
  const stale = (i) => idleDays(i, wearInfo)

  const top = choose(byRole('top'), stale, rnd)
  const bottom = choose(byRole('bottom'), (i) => {
    let score = stale(i)
    if (top) {
      if (NEUTRALS.includes(i.color) || NEUTRALS.includes(top.color)) score += 25
      if (i.color && i.color === top.color) score -= 40
    }
    return score
  }, rnd)
  const layer = season !== 'Summer' ? choose(byRole('layer'), stale, rnd) : null
  const shoes = choose(byRole('shoes'), stale, rnd)

  const picked = [top, bottom, layer, shoes].filter(Boolean)
  if (picked.length >= 2) return { ids: picked.map((i) => i.id), message: '' }

  // not enough categorised pieces: fall back to the pieces left unworn the longest
  const fallback = [...pool].sort((a, b) => stale(b) - stale(a)).slice(0, 3)
  return {
    ids: fallback.map((i) => i.id),
    message:
      fallback.length > 0
        ? 'Add a category (T-shirt, jeans...) to your pieces for complete outfits. Here are your longest-unworn pieces.'
        : occasion
          ? `No pieces match "${occasion}" yet. Try another occasion or add tags in Edit.`
          : 'Add a few more clothes to get suggestions.',
  }
}
