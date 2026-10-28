import { useState } from 'react'
import ItemImage from './ItemImage.jsx'
import Segmented from './Segmented.jsx'
import { formatMoney, parsePrice } from '../lib/money.js'
import { usePrefs } from '../lib/prefs.js'
import { useBackClose } from '../lib/backstack.js'

const TABS = [
  { value: 'donate', label: 'To donate' },
  { value: 'sell', label: 'To sell' },
  { value: 'history', label: 'History' },
]

// Pieces you are letting go of: plan to donate or sell, mark them done, and keep a short history.
export default function LetGo({ items, actions, onClose }) {
  useBackClose(onClose)
  const { currency } = usePrefs()
  const [tab, setTab] = useState('donate')
  const [soldId, setSoldId] = useState(null)
  const [price, setPrice] = useState('')

  const list =
    tab === 'history'
      ? items.filter((i) => i.status === 'donated' || i.status === 'sold').sort((a, b) => (b.goneAt || 0) - (a.goneAt || 0))
      : items.filter((i) => i.status === tab)

  const earned = items.filter((i) => i.status === 'sold').reduce((sum, i) => sum + (i.soldFor || 0), 0)

  function dateText(ts) {
    return ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  }

  return (
    <div className="overlay letgo">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Close
        </button>
        <strong>Let go</strong>
        <span />
      </header>

      <div className="ov-body">
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'history' && earned > 0 && (
          <div className="wearbox glass">
            <div>
              <strong>{formatMoney(earned, currency)}</strong>
              <span className="muted">Earned from selling</span>
            </div>
          </div>
        )}

        {list.length === 0 ? (
          <div className="empty glass">
            <h2>{tab === 'history' ? 'Nothing here yet' : 'Nothing marked'}</h2>
            <p className="muted">
              {tab === 'history'
                ? 'Pieces you donate or sell are kept here, out of your wardrobe.'
                : 'Open a piece and tap ' + (tab === 'donate' ? 'Donate' : 'Sell') + ' to add it to this list. Good picks are in Insights, under Not worn lately.'}
            </p>
          </div>
        ) : (
          list.map((item) => (
            <div key={item.id} className="letgo-row glass">
              <span className="letgo-thumb">
                <ItemImage blob={item.thumb || item.front} alt={item.name} />
              </span>
              <div className="letgo-info">
                <strong>{item.name}</strong>
                <span className="muted">
                  {tab === 'history'
                    ? item.status === 'sold'
                      ? `Sold${item.soldFor != null ? ' for ' + formatMoney(item.soldFor, currency) : ''} · ${dateText(item.goneAt)}`
                      : `Donated · ${dateText(item.goneAt)}`
                    : item.price != null
                      ? 'Bought for ' + formatMoney(item.price, currency)
                      : 'No price saved'}
                </span>

                {tab === 'history' ? (
                  <div className="letgo-actions">
                    <button className="pill" onClick={() => actions.setStatus([item.id], null)}>
                      Bring back
                    </button>
                  </div>
                ) : soldId === item.id ? (
                  <form
                    className="letgo-actions"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      await actions.setStatus([item.id], 'sold', { soldFor: parsePrice(price) })
                      setSoldId(null)
                      setPrice('')
                    }}
                  >
                    <span className="price-input">
                      <i aria-hidden="true">{currency}</i>
                      <input
                        type="text"
                        inputMode="decimal"
                        maxLength={9}
                        autoFocus
                        value={price}
                        placeholder="Sold for"
                        aria-label="Sold for"
                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                      />
                    </span>
                    <button className="pill pill-accent" type="submit">
                      Save
                    </button>
                    <button className="pill" type="button" onClick={() => setSoldId(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="letgo-actions">
                    {tab === 'donate' ? (
                      <button className="pill pill-accent" onClick={() => actions.setStatus([item.id], 'donated')}>
                        Donated
                      </button>
                    ) : (
                      <button
                        className="pill pill-accent"
                        onClick={() => {
                          setSoldId(item.id)
                          setPrice('')
                        }}
                      >
                        Sold
                      </button>
                    )}
                    <button className="pill" onClick={() => actions.setStatus([item.id], null)}>
                      Keep it
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
