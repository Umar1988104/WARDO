import { sectionById } from '../sections.js'

export const EMPTY_FILTERS = {
  section: [],
  color: [],
  season: [],
  occasion: [],
  category: [],
  tags: [],
  laundry: [],
}

export function countActive(filters) {
  return Object.values(filters).reduce((n, list) => n + list.length, 0)
}

function matchesQuery(item, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    item.name,
    item.category,
    item.color,
    item.season,
    item.notes,
    sectionById(item.section)?.label,
    ...(item.occasions || []),
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

export const LAUNDRY_OPTIONS = ['In laundry', 'Clean']
const laundryLabel = (item) => (item.laundry === 'dirty' ? 'In laundry' : 'Clean')
const anyOf = (selected, value) => selected.length === 0 || selected.includes(value)
const overlaps = (selected, values = []) => selected.length === 0 || selected.some((s) => values.includes(s))

export function applyFilters(items, query, f) {
  return items.filter(
    (item) =>
      matchesQuery(item, query) &&
      anyOf(f.section, item.section) &&
      anyOf(f.color, item.color) &&
      anyOf(f.season, item.season) &&
      anyOf(f.category, item.category) &&
      anyOf(f.laundry, laundryLabel(item)) &&
      overlaps(f.occasion, item.occasions) &&
      overlaps(f.tags, item.tags)
  )
}

export function sortItems(items, sort) {
  const list = [...items]
  if (sort === 'old') return list.sort((a, b) => a.createdAt - b.createdAt)
  if (sort === 'name') return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  return list.sort((a, b) => b.createdAt - a.createdAt)
}
