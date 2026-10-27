import { db } from '../db.js'

// One backup file (.wardo) holding everything. Layout:
//   8 bytes  "WARDOBK1"
//   4 bytes  length of the JSON part
//   JSON     items, folders, wear log, outfits, and where each photo sits
//   photos   all the photos, one after another
// The photos are never loaded into memory as one big piece: the browser streams them,
// so saving and restoring stay light even for a big wardrobe.

const MAGIC = 'WARDOBK1'
const APP_VERSION = '0.10.0'
const LAST_KEY = 'wardo-last-backup'

export function getLastBackup() {
  try {
    const v = Number(localStorage.getItem(LAST_KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

function setLastBackup() {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()))
  } catch {
    /* fine: the reminder just will not know */
  }
}

export async function buildBackup() {
  const [items, folders, wears, outfits] = await Promise.all([
    db.items.toArray(),
    db.folders.toArray(),
    db.wears.toArray(),
    db.outfits.toArray(),
  ])

  const parts = []
  const table = []
  let offset = 0
  const pack = (blob) => {
    table.push({ offset, length: blob.size, type: blob.type })
    parts.push(blob)
    offset += blob.size
    return table.length - 1
  }

  const packed = items.map((it) => {
    const out = {}
    for (const [k, v] of Object.entries(it)) {
      if (k === 'thumb') continue // rebuilt automatically after a restore
      out[k] = v instanceof Blob ? { $blob: pack(v) } : v
    }
    return out
  })

  const meta = {
    app: 'wardo',
    format: 1,
    appVersion: APP_VERSION,
    createdAt: Date.now(),
    items: packed,
    folders,
    wears,
    outfits,
    blobs: table,
  }
  const json = new TextEncoder().encode(JSON.stringify(meta))
  const head = new Uint8Array(12)
  head.set(new TextEncoder().encode(MAGIC), 0)
  new DataView(head.buffer).setUint32(8, json.length)

  return new Blob([head, json, ...parts], { type: 'application/octet-stream' })
}

export function backupFileName() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `wardo-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.wardo`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  setLastBackup()
}

export function canShareFile(blob, filename) {
  try {
    return !!navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] })
  } catch {
    return false
  }
}

export async function shareBlob(blob, filename) {
  await navigator.share({ files: [new File([blob], filename, { type: blob.type })], title: 'Wardo backup' })
  setLastBackup()
}

const bad = () => new Error('This file is not a Wardo backup.')

// Reads a backup file and checks it. Nothing is changed yet.
export async function readBackup(file) {
  if (file.size < 12) throw bad()
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (new TextDecoder().decode(head.slice(0, 8)) !== MAGIC) throw bad()
  const len = new DataView(head.buffer).getUint32(8)
  if (len <= 0 || len > file.size - 12) throw bad()

  let meta
  try {
    meta = JSON.parse(await file.slice(12, 12 + len).text())
  } catch {
    throw bad()
  }
  if (meta.app !== 'wardo' || !Array.isArray(meta.items) || !Array.isArray(meta.blobs)) throw bad()

  const base = 12 + len
  const blobAt = (i) => {
    const e = meta.blobs[i]
    if (!e || base + e.offset + e.length > file.size) throw new Error('This backup file looks cut short.')
    return file.slice(base + e.offset, base + e.offset + e.length, e.type)
  }
  const revive = (rec) =>
    Object.fromEntries(
      Object.entries(rec).map(([k, v]) => [k, v && typeof v === 'object' && '$blob' in v ? blobAt(v.$blob) : v])
    )

  return {
    createdAt: meta.createdAt,
    items: meta.items.map(revive),
    folders: meta.folders || [],
    wears: meta.wears || [],
    outfits: meta.outfits || [],
  }
}

// Replace everything on this phone with the backup. All or nothing.
export async function restoreReplace(data) {
  await db.transaction('rw', db.items, db.wears, db.outfits, db.folders, async () => {
    await Promise.all([db.items.clear(), db.wears.clear(), db.outfits.clear(), db.folders.clear()])
    await db.folders.bulkAdd(data.folders)
    await db.items.bulkAdd(data.items)
    await db.wears.bulkAdd(data.wears)
    await db.outfits.bulkAdd(data.outfits)
  })
  return { added: data.items.length, skipped: 0 }
}

// Add what is in the backup to what is already here. Pieces that are already here
// (same name and same date added) are skipped, so nothing doubles up.
export async function restoreMerge(data) {
  let added = 0
  let skipped = 0
  await db.transaction('rw', db.items, db.wears, db.outfits, db.folders, async () => {
    const existing = await db.items.toArray()
    const known = new Map(existing.map((i) => [`${i.createdAt}|${i.name}`, i.id]))

    const folderMap = new Map()
    const haveFolders = await db.folders.toArray()
    for (const f of data.folders) {
      const twin = haveFolders.find((x) => x.section === f.section && x.name.toLowerCase() === f.name.toLowerCase())
      folderMap.set(f.id, twin ? twin.id : await db.folders.add({ name: f.name, section: f.section, createdAt: f.createdAt }))
    }

    const itemMap = new Map()
    for (const it of data.items) {
      const key = `${it.createdAt}|${it.name}`
      if (known.has(key)) {
        itemMap.set(it.id, known.get(key))
        skipped += 1
        continue
      }
      const { id, ...rest } = it
      rest.folderId = rest.folderId != null ? folderMap.get(rest.folderId) ?? null : null
      itemMap.set(id, await db.items.add(rest))
      added += 1
    }

    for (const w of data.wears) {
      const itemId = itemMap.get(w.itemId)
      if (itemId == null) continue
      const has = await db.wears.where('[itemId+date]').equals([itemId, w.date]).first()
      if (!has) await db.wears.add({ itemId, date: w.date })
    }

    for (const o of data.outfits) {
      if (await db.outfits.get(o.date)) continue
      const itemIds = o.itemIds.map((x) => itemMap.get(x)).filter((x) => x != null)
      if (itemIds.length) await db.outfits.put({ ...o, itemIds })
    }
  })
  return { added, skipped }
}
