import Dexie from 'dexie'

// Everything is stored on the device (IndexedDB). Nothing is uploaded anywhere.
export const db = new Dexie('wardo')

db.version(1).stores({
  // only indexed fields are listed; blobs and other fields are stored too
  items: '++id, section, createdAt',
})

db.version(2).stores({
  items: '++id, section, createdAt',
  // one row each time a piece is worn: { itemId, date: 'YYYY-MM-DD' }
  wears: '++id, itemId, date, [itemId+date]',
  // one planned outfit per day: { date, itemIds[], note, worn }
  outfits: 'date',
})

// v0.8: folders. A folder lives inside one section; a piece sits in at most one folder.
db.version(3).stores({
  items: '++id, section, folderId, createdAt',
  wears: '++id, itemId, date, [itemId+date]',
  outfits: 'date',
  // { id, name, section, createdAt }
  folders: '++id, section',
})

// v0.11: favourite outfits (saved looks, not tied to a day). { id, name, itemIds[], createdAt }
// Laundry status and price are plain extra fields on items, so they need no new index.
db.version(4).stores({
  items: '++id, section, folderId, createdAt',
  wears: '++id, itemId, date, [itemId+date]',
  outfits: 'date',
  folders: '++id, section',
  favorites: '++id, createdAt',
})

// v0.12: packing lists for trips. { id, name, days, climate, occasions[], itemIds[], packed[] (item ids), createdAt }
// Donate / sell status is stored on the item itself: status, soldFor, goneAt.
db.version(5).stores({
  items: '++id, section, folderId, createdAt',
  wears: '++id, itemId, date, [itemId+date]',
  outfits: 'date',
  folders: '++id, section',
  favorites: '++id, createdAt',
  trips: '++id, createdAt',
})
