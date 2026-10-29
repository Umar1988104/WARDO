import { useMemo, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Segmented from '../components/Segmented.jsx'
import ItemCard from '../components/ItemCard.jsx'
import { costPerWear, formatMoney } from '../lib/money.js'
import { usePrefs } from '../lib/prefs.js'
import { analyzeWardrobe } from '../lib/gaps.js'
import Wrapped from '../components/Wrapped.jsx'
import { daysSince, keyOf, todayKey } from '../lib/dates.js'

const WINDOWS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

export default function Insights({ items, goneItems = [], wears = [], wearInfo, outfits, onOpenItem, onBack }) {
  const [days, setDays] = useState(30)
  const [wrappedOpen, setWrappedOpen] = useState(false)
  const { currency } = usePrefs()

  // a piece counts from the day it was last worn, or the day it was added if never worn
  const forgotten = useMemo(
    () =>
      items
        .map((item) => {
          const last = wearInfo[item.id]?.last
          const idle = daysSince(last || keyOf(new Date(item.createdAt)))
          return { item, idle, never: !last }
        })
        .filter((x) => x.idle >= days)
        .sort((a, b) => b.idle - a.idle),
    [items, wearInfo, days]
  )

  const mostWorn = useMemo(
    () =>
      items
        .map((item) => ({ item, count: wearInfo[item.id]?.count || 0 }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [items, wearInfo]
  )

  // money: what the wardrobe cost, which pieces paid off, and which still sit unworn
  const value = useMemo(() => {
    const priced = items.filter((i) => i.price != null)
    const total = priced.reduce((sum, i) => sum + i.price, 0)
    const paidOff = priced
      .map((item) => ({ item, cpw: costPerWear(item, wearInfo[item.id]?.count) }))
      .filter((x) => x.cpw != null)
      .sort((a, b) => a.cpw - b.cpw)
      .slice(0, 6)
    const idle = priced
      .filter((i) => !wearInfo[i.id]?.count)
      .sort((a, b) => b.price - a.price)
      .slice(0, 6)
    return { count: priced.length, total, paidOff, idle }
  }, [items, wearInfo])
  const check = useMemo(() => analyzeWardrobe(items), [items])
  const donated = goneItems.filter((i) => i.status === 'donated').length
  const sold = goneItems.filter((i) => i.status === 'sold')
  const earned = sold.reduce((sum, i) => sum + (i.soldFor || 0), 0)
  const inLaundry = items.filter((i) => i.laundry === 'dirty').length

  const today = todayKey()
  const upcoming = outfits.filter((o) => o.date >= today).length

  const stats = [
    { label: 'Items', value: items.length },
    { label: 'Outfits planned', value: upcoming },
    { label: 'Not worn lately', value: forgotten.length },
    ...(inLaundry > 0 ? [{ label: 'In laundry', value: inLaundry }] : []),
  ]

  return (
    <Screen
      title="Insights"
      back={onBack ? { label: 'Home', onClick: onBack } : undefined}
      overlays={wrappedOpen && <Wrapped items={items} goneItems={goneItems} wears={wears} outfits={outfits} onClose={() => setWrappedOpen(false)} />}
    >
      <button className="wrapped-cta glass" onClick={() => setWrappedOpen(true)}>
        <span>
          <strong>Wardrobe Wrapped</strong>
          <span className="muted">Your month in clothes, as a picture to share</span>
        </span>
        <i className="prof-chev" aria-hidden="true">
          ›
        </i>
      </button>
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat glass">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="title-row">
        <h3 className="section-title">Not worn lately</h3>
      </div>
      <Segmented options={WINDOWS} value={days} onChange={setDays} />

      {items.length === 0 ? (
        <div className="empty glass">
          <h2>Nothing to track yet</h2>
          <p className="muted">Add some clothes and mark what you wear. Wardo will show what you forget.</p>
        </div>
      ) : forgotten.length === 0 ? (
        <div className="empty glass">
          <h2>Nothing forgotten</h2>
          <p className="muted">You have worn or added everything in the last {days} days.</p>
        </div>
      ) : (
        <div className="item-grid">
          {forgotten.map(({ item, idle, never }) => (
            <ItemCard
              key={item.id}
              item={item}
              onOpen={onOpenItem}
              badge={never ? `Never worn · ${idle}d` : `${idle} days ago`}
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <h3 className="section-title">Wardrobe check</h3>
          {check.tooFew && check.duplicates.length === 0 ? (
            <div className="note glass">
              <p className="muted">Add a few more pieces (about 6) and Wardo will point out what is missing.</p>
            </div>
          ) : check.gaps.length === 0 && check.duplicates.length === 0 ? (
            <div className="note glass">
              <p>Nothing missing and no doubles. Your wardrobe looks balanced.</p>
            </div>
          ) : (
            <>
              {check.gaps.map((g) => (
                <div key={g.id} className="note glass">
                  <strong>{g.title}</strong>
                  <p className="muted">{g.detail}</p>
                </div>
              ))}
              {check.duplicates.map((d) => (
                <div key={d.id} className="note glass">
                  <strong>{d.label}</strong>
                  <p className="muted">Do you need all of them? Good ones to donate or sell: open a piece and tap Donate or Sell.</p>
                  <div className="recent-row">
                    {d.items.map((item) => (
                      <ItemCard key={item.id} item={item} onOpen={onOpenItem} small />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {goneItems.length > 0 && (
        <div className="wearbox glass">
          <div>
            <strong>
              {donated} donated · {sold.length} sold
            </strong>
            <span className="muted">{earned > 0 ? `${formatMoney(earned, currency)} earned. ` : ''}Pieces you let go of</span>
          </div>
        </div>
      )}

      {value.count > 0 && (
        <>
          <h3 className="section-title">Value</h3>
          <div className="wearbox glass">
            <div>
              <strong>{formatMoney(value.total, currency)}</strong>
              <span className="muted">
                Across {value.count} priced {value.count === 1 ? 'piece' : 'pieces'}
              </span>
            </div>
          </div>
          {value.paidOff.length > 0 && (
            <>
              <p className="muted small">Lowest cost per wear</p>
              <div className="recent-row">
                {value.paidOff.map(({ item, cpw }) => (
                  <ItemCard key={item.id} item={item} onOpen={onOpenItem} small badge={formatMoney(cpw, currency) + '/wear'} />
                ))}
              </div>
            </>
          )}
          {value.idle.length > 0 && (
            <>
              <p className="muted small">Paid for but never worn</p>
              <div className="recent-row">
                {value.idle.map((item) => (
                  <ItemCard key={item.id} item={item} onOpen={onOpenItem} small badge={formatMoney(item.price, currency)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {mostWorn.length > 0 && (
        <>
          <h3 className="section-title">Most worn</h3>
          <div className="recent-row">
            {mostWorn.map(({ item, count }) => (
              <ItemCard key={item.id} item={item} onOpen={onOpenItem} small badge={`${count}×`} />
            ))}
          </div>
        </>
      )}
    </Screen>
  )
}
