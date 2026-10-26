import { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from './db.js'
import { todayKey } from './lib/dates.js'

// Loads the wardrobe from the device and exposes actions that change it.
export default function useData() {
  const [items, setItems] = useState([])
  const [wears, setWears] = useState([])
  const [outfits, setOutfits] = useState([])

  const refresh = useCallback(async () => {
    try {
      const [i, w, o] = await Promise.all([
        db.items.orderBy('createdAt').reverse().toArray(),
        db.wears.toArray(),
        db.outfits.toArray(),
      ])
      setItems(i)
      setWears(w)
      setOutfits(o)
    } catch (err) {
      console.error('Could not read the wardrobe:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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

    return {
      refresh,

      async deleteItem(id) {
        await db.transaction('rw', db.items, db.wears, db.outfits, async () => {
          await db.items.delete(id)
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

      // log or un-log that one piece was worn on a day (default: today)
      async toggleWorn(itemId, date = todayKey()) {
        const has = await db.wears.where('[itemId+date]').equals([itemId, date]).first()
        if (has) await db.wears.delete(has.id)
        else await db.wears.add({ itemId, date })
        await refresh()
      },

      async saveOutfit(date, itemIds, note = '') {
        const existing = await db.outfits.get(date)
        if (existing?.worn) await undoWorn(date)
        await db.outfits.put({ date, itemIds, note, worn: false })
        await refresh()
      },

      async deleteOutfit(date) {
        const existing = await db.outfits.get(date)
        if (existing?.worn) await undoWorn(date)
        await db.outfits.delete(date)
        await refresh()
      },

      async markOutfitWorn(date) {
        const o = await db.outfits.get(date)
        if (!o) return
        for (const itemId of o.itemIds) {
          const has = await db.wears.where('[itemId+date]').equals([itemId, date]).first()
          if (!has) await db.wears.add({ itemId, date })
        }
        await db.outfits.update(date, { worn: true })
        await refresh()
      },

      async undoOutfitWorn(date) {
        await undoWorn(date)
        await refresh()
      },
    }
  }, [refresh])

  return { items, wearInfo, outfitMap, outfits, actions }
}
