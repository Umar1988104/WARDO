import Dexie from 'dexie'

// Everything is stored on the device (IndexedDB). Nothing is uploaded anywhere.
export const db = new Dexie('wardo')

db.version(1).stores({
  // only indexed fields are listed; blobs and other fields are stored too
  items: '++id, section, createdAt',
})
