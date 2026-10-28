import { ROLE, NEUTRALS } from '../options.js'

const ROLE_WORD = { top: 'tops', bottom: 'bottoms', layer: 'layers', shoes: 'shoes' }

// Looks for holes and doubles in the wardrobe. Plain rules, nothing is uploaded.
// Returns { gaps: [{ id, title, detail }], duplicates: [{ id, label, items }] }
export function analyzeWardrobe(items) {
  const list = items.filter((i) => i.section !== 'inner')
  const gaps = []
  const duplicates = []

  // ---- duplicates ----
  const groups = new Map()
  for (const item of list) {
    if (!item.category || !item.color) continue
    const key = `${item.category}|${item.color}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  for (const [key, group] of groups) {
    if (group.length < 3) continue
    const [category, color] = key.split('|')
    duplicates.push({ id: key, label: `${group.length} ${color.toLowerCase()} ${category.toLowerCase()} pieces`, items: group })
  }
  const names = new Map()
  for (const item of list) {
    const n = (item.name || '').trim().toLowerCase()
    if (!n || /^item \d+$/.test(n)) continue
    if (!names.has(n)) names.set(n, [])
    names.get(n).push(item)
  }
  for (const [n, group] of names) {
    if (group.length < 2) continue
    duplicates.push({ id: 'name:' + n, label: `Added twice? "${group[0].name}"`, items: group })
  }
  duplicates.sort((a, b) => b.items.length - a.items.length)

  if (list.length < 6) return { gaps, duplicates, tooFew: true }

  // ---- gaps ----
  const count = { top: 0, bottom: 0, layer: 0, shoes: 0 }
  for (const i of list) if (ROLE[i.category]) count[ROLE[i.category]] += 1

  for (const role of ['top', 'bottom', 'shoes']) {
    if (count[role] === 0) {
      gaps.push({ id: 'no-' + role, title: `No ${ROLE_WORD[role]} with a category`, detail: `Outfits and Mix & Match need at least one. Add some, or set a category in Edit.` })
    }
  }
  const warmLayers = list.filter((i) => ROLE[i.category] === 'layer' && ['Winter', 'Mid-season', 'All year'].includes(i.season || 'All year')).length
  if (warmLayers === 0) {
    gaps.push({ id: 'no-layer', title: 'Nothing warm for cool days', detail: 'No jacket, sweater or hoodie that works for winter or mid-season.' })
  }
  if (count.top >= 3 && count.bottom > 0 && count.bottom * 3 < count.top) {
    gaps.push({ id: 'few-bottoms', title: 'Many tops, few bottoms', detail: `You have ${count.top} tops but only ${count.bottom} bottoms, so the same few get worn again and again.` })
  }
  if (count.bottom >= 3 && count.top > 0 && count.top * 2 < count.bottom) {
    gaps.push({ id: 'few-tops', title: 'Many bottoms, few tops', detail: `You have ${count.bottom} bottoms but only ${count.top} tops.` })
  }
  const bottoms = list.filter((i) => ROLE[i.category] === 'bottom')
  if (bottoms.length >= 2 && !bottoms.some((i) => NEUTRALS.includes(i.color))) {
    gaps.push({ id: 'no-neutral-bottom', title: 'No neutral bottoms', detail: 'Black, navy, grey, white or beige bottoms go with almost everything.' })
  }
  if (list.length >= 8 && !list.some((i) => (i.occasions || []).includes('Formal'))) {
    gaps.push({ id: 'no-formal', title: 'Nothing marked Formal', detail: 'If you ever need a presentation or interview outfit, mark the right pieces as Formal in Edit, or add one.' })
  }
  const uncategorised = list.filter((i) => !i.category).length
  if (uncategorised >= 3) {
    gaps.push({ id: 'no-category', title: `${uncategorised} pieces have no category`, detail: 'They are left out of suggestions, Mix & Match and packing lists until you set a category in Edit.' })
  }

  return { gaps, duplicates, tooFew: false }
}

// how many pieces of the same category and colour you already own, for the "you already have" hint
export function similarCount(items, { category, color }, selfId = null) {
  if (!category || !color) return 0
  return items.filter((i) => i.id !== selfId && i.section !== 'inner' && i.category === category && i.color === color).length
}
