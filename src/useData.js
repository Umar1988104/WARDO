import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from './db.js'
import { todayKey } from './lib/dates.js'
import { makeThumb } from './lib/image.js'
import { getPrefs } from './lib/prefs.js'

// Keeps the same object for a piece that did not change, so its picture is not
// reloaded and its card is not redrawn every time something else in the app changes.
function reconcile(prev, next) {
  const old = new Map(prev.map((i) => [i.id, i]))
  let same = prev.length === next.length
  const out = next.map((n, idx) => {
    const o = old.get(n.id)
    const keep =
      o &&
      o.updatedAt === n.updatedAt &&
      o.folderId === n.folderId &&
      o.section === n.section &&
      o.laundry === n.laundry &&
      o.status === n.status &&
      o.price === n.price &&
      !!o.thumb === !!n.thumb
        ? o
        : n
    if (keep !== prev[idx]) same = false
    return keep
  })
  return same ? prev : out
}

const byName = (a, b) => (a.name || '').localeCompare(b.name || '')

// Loads the wardrobe from the device and exposes actions that change it.
export default function useData() {
  const [items, setItems] = useState([])
  const [wears, setWears] = useState([])
  const [outfits, setOutfits] = useState([])
  const [folders, setFolders] = useState([])
  const [favorites, setFavorites] = useState([])
  const [trips, setTrips] = useState([])
  const failedThumbs = useRef(new Set())
  const backfilling = useRef(false)

  // scope: 'all' | 'wear' (only wear logs and outfits) | 'folders'
  const refresh = useCallback(async (scope = 'all') => {
    try {
      if (scope === 'wear') {
        const [w, o] = await Promise.all([db.wears.toArray(), db.outfits.toArray()])
        setWears(w)
        setOutfits(o)
        return
      }
      if (scope === 'folders') {
        setFolders((await db.folders.toArray()).sort(byName))
        return
      }
      if (scope === 'trips') {
        setTrips((await db.trips.toArray()).sort((a, b) => b.createdAt - a.createdAt))
        return
      }
      if (scope === 'favorites') {
        setFavorites((await db.favorites.toArray()).sort((a, b) => b.createdAt - a.createdAt))
        return
      }
      const [i, w, o, f, fav, tr] = await Promise.all([
        db.items.orderBy('createdAt').reverse().toArray(),
        db.wears.toArray(),
        db.outfits.toArray(),
        db.folders.toArray(),
        db.favorites.toArray(),
        db.trips.toArray(),
      ])
      setItems((prev) => reconcile(prev, i))
      setWears(w)
      setOutfits(o)
      setFolders(f.sort(byName))
      setFavorites(fav.sort((a, b) => b.createdAt - a.createdAt))
      setTrips(tr.sort((a, b) => b.createdAt - a.createdAt))
    } catch (err) {
      console.error('Could not read the wardrobe:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Older pieces have no small preview picture yet. Make them quietly, one at a time.
  useEffect(() => {
    if (backfilling.current) return
    const missing = items.filter((i) => !i.thumb && i.front && !failedThumbs.current.has(i.id))
    if (missing.length === 0) return
    backfilling.current = true
    ;(async () => {
      try {
        let done = 0
        for (const it of missing) {
          try {
            const thumb = await makeThumb(it.front)
            await db.items.update(it.id, { thumb })
          } catch (err) {
            console.error('Preview failed for item', it.id, err)
            failedThumbs.current.add(it.id)
          }
          done += 1
          if (done % 12 === 0) await refresh()
          await new Promise((r) => setTimeout(r, 40)) // let the screen breathe between pieces
        }
        await refresh()
      } finally {
        backfilling.current = false
      }
    })()
  }, [items, refresh])

  // { [itemId]: { count, last, dates:Set } }
  const wearInfo = useMemo(() => {
    const map = {}
    for (const w of wears) {
      const e = map[w.itemId] || (map[w.itemId] = { count: 0, last: null, dates: new Set() })
      e.count += 1
      e.dates.add(w.date)
      if (!e.last || w.date > e.last) e.last = w.date
    }
    return map
  }, [wears])

  const outfitMap = useMemo(() => Object.fromEntries(outfits.map((o) => [o.date, o])), [outfits])

  const actions = useMemo(() => {
    async function undoWorn(date) {
      const o = await db.outfits.get(date)
      if (!o) return
      await db.wears
        .where('date')
        .equals(date)
        .filter((w) => o.itemIds.includes(w.itemId))
        .delete()
      await db.outfits.update(date, { worn: false })
    }

    // used by "move to laundry after wearing"; reloads the items so cards and filters update
    async function sendToLaundry(ids) {
      await db.items.where(':id').anyOf(ids).modify({ laundry: 'dirty', updatedAt: Date.now() })
      await refresh()
    }

    return {
      refresh,

      async deleteItem(id) {
        await db.transaction('rw', db.items, db.wears, db.outfits, db.favorites, db.trips, async () => {
          await db.items.delete(id)
          for (const t of await db.trips.toArray()) {
            if (!t.itemIds.includes(id)) continue
            await db.trips.update(t.id, { itemIds: t.itemIds.filter((x) => x !== id), packed: t.packed.filter((x) => x !== id) })
          }
          for (const fav of await db.favorites.toArray()) {
            if (!fav.itemIds.includes(id)) continue
            const ids = fav.itemIds.filter((x) => x !== id)
            if (ids.length >= 2) await db.favorites.update(fav.id, { itemIds: ids })
            else await db.favorites.delete(fav.id)
          }
          await db.wears.where('itemId').equals(id).delete()
          for (const o of await db.outfits.toArray()) {
            if (!o.itemIds.includes(id)) continue
            const ids = o.itemIds.filter((x) => x !== id)
            if (ids.length) await db.outfits.update(o.date, { itemIds: ids })
            else await db.outfits.delete(o.date)
          }
        })
        await refresh()
      },

      // ----- folders -----
      async createFolder(section, name) {
        const id = await db.folders.add({ section, name: name.trim(), createdAt: Date.now() })
        await refresh('folders')
        return id
      },

      async renameFolder(id, name) {
        await db.folders.update(id, { name: name.trim() })
        await refresh('folders')
      },

      // the clothes are kept: they go back to the section, outside any folder
      async deleteFolder(id) {
        await db.transaction('rw', db.items, db.folders, async () => {
          await db.items.where('folderId').equals(id).modify({ folderId: null, updatedAt: Date.now() })
          await db.folders.delete(id)
        })
        await refresh()
      },

      // folderId = null moves the pieces out of any folder
      async moveItems(ids, folderId) {
        const now = Date.now()
        await db.items.where(':id').anyOf(ids).modify({ folderId, updatedAt: now })
        await refresh()
      },

      // ----- laundry -----
      // dirty = true sends the pieces to the laundry, false marks them clean again
      async setLaundry(ids, dirty) {
        const now = Date.now()
        await db.items.where(':id').anyOf(ids).modify({ laundry: dirty ? 'dirty' : null, updatedAt: now })
        await refresh()
      },

      async washAll() {
        const now = Date.now()
        await db.items.filter((i) => i.laundry === 'dirty').modify({ laundry: null, updatedAt: now })
        await refresh()
      },

      // ----- letting go -----
      // status: 'donate' | 'sell' (planned, still in the wardrobe), 'donated' | 'sold' (gone, kept in history), or null (keep it)
      async setStatus(ids, status, extra = {}) {
        const gone = status === 'donated' || status === 'sold'
        await db.items.where(':id').anyOf(ids).modify({
          status: status || null,
          soldFor: status === 'sold' ? extra.soldFor ?? null : null,
          goneAt: gone ? Date.now() : null,
          updatedAt: Date.now(),
        })
        await refresh()
      },

      // ----- trips and packing lists -----
      async createTrip(trip) {
        const id = await db.trips.add({ ...trip, packed: [], createdAt: Date.now() })
        await refresh('trips')
        return id
      },

      async updateTrip(id, patch) {
        await db.trips.update(id, patch)
        await refresh('trips')
      },

      async deleteTrip(id) {
        await db.trips.delete(id)
        await refresh('trips')
      },

      // ----- favourite outfits -----
      async saveFavorite(name, itemIds) {
        const id = await db.favorites.add({ name: name.trim(), itemIds, createdAt: Date.now() })
        await refresh('favorites')
        return id
      },

      async deleteFavorite(id) {
        await db.favorites.delete(id)
        await refresh('favorites')
      },

      // ----- wear tracking (these only reload wear data, not every picture) -----
      // log or un-log that one piece was worn on a day (default: today)
      async toggleWorn(itemId, date = todayKey()) {
        const has = await db.wears.where('[itemId+date]').equals([itemId, date]).first()
        if (has) await db.wears.delete(has.id)
        else {
          await db.wears.add({ itemId, date })
          if (getPrefs().autoLaundry) await sendToLaundry([itemId])
        }
        await refresh('wear')
      },

      async saveOutfit(date, itemIds, note = '') {
        const existing = await db.outfits.get(date)
        if (existing?.worn) await undoWorn(date)
        await db.outfits.put({ date, itemIds, note, worn: false })
        await refresh('wear')
      },

      async deleteOutfit(date) {
        const existing = await db.outfits.get(date)
        if (existing?.worn) await undoWorn(date)
        await db.outfits.delete(date)
        await refresh('wear')
      },

      async markOutfitWorn(date) {
        const o = await db.outfits.get(date)
        if (!o) return
        for (const itemId of o.itemIds) {
          const has = await db.wears.where('[itemId+date]').equals([itemId, date]).first()
          if (!has) await db.wears.add({ itemId, date })
        }
        await db.outfits.update(date, { worn: true })
        if (getPrefs().autoLaundry) await sendToLaundry(o.itemIds)
        await refresh('wear')
      },

      async undoOutfitWorn(date) {
        await undoWorn(date)
        await refresh('wear')
      },
    }
  }, [refresh])

  return { items, folders, favorites, trips, wears, wearInfo, outfitMap, outfits, actions }
}
