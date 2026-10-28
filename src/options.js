// Fixed lists used by the item form, the filters and the search.

export const COLORS = [
  { name: 'Black', hex: '#1c1c1e' },
  { name: 'White', hex: '#f5f5f7' },
  { name: 'Grey', hex: '#8e8e93' },
  { name: 'Navy', hex: '#1f2a5c' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Green', hex: '#22a06b' },
  { name: 'Olive', hex: '#6b7a2f' },
  { name: 'Yellow', hex: '#f5c542' },
  { name: 'Orange', hex: '#f08a24' },
  { name: 'Red', hex: '#e03a3a' },
  { name: 'Pink', hex: '#f27ab0' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Brown', hex: '#7a4b2a' },
  { name: 'Beige', hex: '#d9c3a0' },
]

export const colorHex = (name) => COLORS.find((c) => c.name === name)?.hex

export const CATEGORIES = {
  common: ['T-shirt', 'Shirt', 'Jeans', 'Trousers', 'Shorts', 'Track pants', 'Kurta', 'Sweater', 'Hoodie', 'Jacket', 'Shoes', 'Cap', 'Belt', 'Bag', 'Other'],
  winter: ['Jacket', 'Coat', 'Sweater', 'Hoodie', 'Thermal', 'Jeans', 'Trousers', 'Muffler', 'Gloves', 'Other'],
  summer: ['T-shirt', 'Shirt', 'Shorts', 'Jeans', 'Trousers', 'Kurta', 'Track pants', 'Other'],
  inner: ['Vest', 'Briefs', 'Socks', 'Thermal', 'Other'],
  accessories: ['Cap', 'Belt', 'Watch', 'Shoes', 'Bag', 'Sunglasses', 'Scarf', 'Other'],
}

export const ALL_CATEGORIES = [...new Set(Object.values(CATEGORIES).flat())]

export const SEASONS = ['Summer', 'Winter', 'Mid-season', 'All year']

export const defaultSeason = (section) => ({ winter: 'Winter', summer: 'Summer' })[section] || 'All year'

export const OCCASIONS = ['Casual', 'College', 'Gym', 'Formal', 'Party', 'Traditional', 'Home']

export const TAGS = ['Slim fit', 'Regular fit', 'Loose fit', 'Short', 'Long', 'Faded', 'Torn', 'Needs repair', 'Needs ironing']

export const SORTS = [
  { id: 'new', label: 'Newest' },
  { id: 'old', label: 'Oldest' },
  { id: 'name', label: 'Name' },
]

// How each category is used when building outfit suggestions.
export const ROLE = {
  'T-shirt': 'top',
  Shirt: 'top',
  Kurta: 'top',
  Jeans: 'bottom',
  Trousers: 'bottom',
  Shorts: 'bottom',
  'Track pants': 'bottom',
  Jacket: 'layer',
  Coat: 'layer',
  Sweater: 'layer',
  Hoodie: 'layer',
  Shoes: 'shoes',
}

export const NEUTRALS = ['Black', 'White', 'Grey', 'Navy', 'Beige']
