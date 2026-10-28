// Price helpers. A price is stored as a plain number (or null when not set).

// "1,299.50" or "₹1299" -> 1299.5 / 1299, anything that is not a price -> null
export function parsePrice(text) {
  if (text == null) return null
  const cleaned = String(text).replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

export function formatMoney(n, symbol = '₹') {
  if (n == null || !Number.isFinite(n)) return ''
  const digits = n < 100 && !Number.isInteger(n) ? 2 : 0
  return symbol + n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

// price divided by the number of times worn; null until it has a price and at least one wear
export function costPerWear(item, wearCount) {
  if (item.price == null || !wearCount) return null
  return item.price / wearCount
}
