// Dates are stored as local 'YYYY-MM-DD' strings so they sort correctly and ignore time zones.
const pad = (n) => String(n).padStart(2, '0')

export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = () => keyOf(new Date())

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return keyOf(d)
}

// whole days from a to b (b - a)
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000)
export const daysSince = (key) => daysBetween(key, todayKey())

export function dayTag(key) {
  const diff = daysBetween(todayKey(), key)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return null
}

export function agoText(key) {
  const n = daysSince(key)
  if (n <= 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n} days ago`
}

// Cells for a month grid, Monday first. Leading blanks are null.
export function monthGrid(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells = Array(offset).fill(null)
  for (let d = 1; d <= count; d++) cells.push(keyOf(new Date(year, month, d)))
  return cells
}
