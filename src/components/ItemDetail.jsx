import { useState } from 'react'
import ItemImage from './ItemImage.jsx'
import { sectionById } from '../sections.js'
import { colorHex } from '../options.js'
import { agoText } from '../lib/dates.js'
import { useBackClose } from '../lib/backstack.js'
import { costPerWear, formatMoney } from '../lib/money.js'
import { usePrefs } from '../lib/prefs.js'
import { harmonyFor, pairsFor } from '../lib/harmony.js'
import ItemCard from './ItemCard.jsx'

export default function ItemDetail({ item, wear, wornToday, onToggleWorn, onLaundry, onStatus, items = [], wearInfo = {}, onOpenOther, onClose, onEdit, onDelete }) {
  useBackClose(onClose)
  const { currency } = usePrefs()
  const dirty = item.laundry === 'dirty'
  const cpw = costPerWear(item, wear?.count)
  const harmony = harmonyFor(item.color)
  const pairs = pairsFor(item, items, wearInfo)
  const [side, setSide] = useState('front')
  const [confirm, setConfirm] = useState(false)
  const section = sectionById(item.section)
  const tone = section?.tone || 'blue'
  const shown = side === 'back' && item.back ? item.back : item.front
  const added = new Date(item.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const facts = [
    item.category,
    item.season,
    ...(item.occasions || []),
  ].filter(Boolean)
  const tags = item.tags || []

  return (
    <div className="overlay detail">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Close
        </button>
        <strong>{section?.label || 'Item'}</strong>
        <button className="ov-link ov-strong" onClick={() => onEdit(item.id)}>
          Edit
        </button>
      </header>

      <div className="ov-body">
        <div className={'detail-art tone-' + tone}>
          <ItemImage blob={shown} alt={item.name} className="detail-img" />
        </div>

        {item.back && (
          <div className="segmented glass detail-seg" role="tablist">
            {['front', 'back'].map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={side === s}
                className={side === s ? 'seg-on' : ''}
                onClick={() => setSide(s)}
              >
                {s === 'front' ? 'Front' : 'Back'}
              </button>
            ))}
          </div>
        )}

        <div className="detail-info">
          <h2>{item.name}</h2>
          <p className="muted">
            {section?.label} · Added {added}
          </p>
        </div>

        <div className="wearbox glass">
          <div>
            <strong>{wear && wear.count > 0 ? `Worn ${wear.count} ${wear.count === 1 ? 'time' : 'times'}` : 'Not worn yet'}</strong>
            <span className="muted">{wear && wear.last ? `Last worn ${agoText(wear.last)}` : 'Mark it when you wear it'}</span>
          </div>
          <button className={'pill' + (wornToday ? '' : ' pill-accent')} onClick={() => onToggleWorn(item.id)}>
            {wornToday ? 'Worn today ✓ Undo' : 'I wore this today'}
          </button>
        </div>

        <div className="wearbox glass">
          <div>
            <strong>{dirty ? 'In the laundry' : 'Clean and ready'}</strong>
            <span className="muted">{dirty ? 'Left out of outfit suggestions' : 'Send it to the wash after you wear it'}</span>
          </div>
          <button className={'pill' + (dirty ? ' pill-accent' : '')} onClick={() => onLaundry(item.id, !dirty)}>
            {dirty ? 'Mark clean' : 'To laundry'}
          </button>
        </div>

        {harmony.length > 0 && (
          <section className="harmony glass">
            <h3 className="section-title">Goes well with</h3>
            {harmony.map((g) => (
              <div key={g.kind} className="harmony-group">
                <span className="muted">{g.kind}</span>
                <div className="harmony-dots">
                  {g.colors.map((c) => (
                    <i key={c} className="harmony-dot" style={{ background: colorHex(c) }} title={c} />
                  ))}
                </div>
              </div>
            ))}
            {pairs.length > 0 && (
              <>
                <span className="muted">From your wardrobe</span>
                <div className="recent-row">
                  {pairs.map((p) => (
                    <ItemCard key={p.id} item={p} onOpen={onOpenOther} small />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        <div className="wearbox glass">
          <div>
            <strong>{item.status === 'donate' ? 'Marked to donate' : item.status === 'sell' ? 'Marked to sell' : 'Letting go of it?'}</strong>
            <span className="muted">
              {item.status === 'donate' || item.status === 'sell'
                ? 'Left out of outfits. Finish it in Let go.'
                : 'It stays out of outfit suggestions once marked'}
            </span>
          </div>
          {item.status === 'donate' || item.status === 'sell' ? (
            <button className="pill" onClick={() => onStatus(item.id, null)}>
              Keep it
            </button>
          ) : (
            <div className="letgo-actions">
              <button className="pill" onClick={() => onStatus(item.id, 'donate')}>
                Donate
              </button>
              <button className="pill" onClick={() => onStatus(item.id, 'sell')}>
                Sell
              </button>
            </div>
          )}
        </div>

        {item.price != null && (
          <div className="wearbox glass">
            <div>
              <strong>{formatMoney(item.price, currency)}</strong>
              <span className="muted">Price paid</span>
            </div>
            <div className="cpw">
              <strong>{cpw != null ? formatMoney(cpw, currency) : '–'}</strong>
              <span className="muted">{cpw != null ? 'Cost per wear' : 'Wear it to see cost per wear'}</span>
            </div>
          </div>
        )}

        {(item.color || facts.length > 0) && (
          <div className="taglist">
            {item.color && (
              <span className="tagchip">
                <i className="dot" style={{ background: colorHex(item.color) }} />
                {item.color}
              </span>
            )}
            {facts.map((f) => (
              <span className="tagchip" key={f}>
                {f}
              </span>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="taglist">
            {tags.map((t) => (
              <span className="tagchip tagchip-note" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}

        {item.notes && (
          <div className="note glass">
            <span className="muted">Notes</span>
            <p>{item.notes}</p>
          </div>
        )}

        <button
          className={'btn-danger' + (confirm ? ' btn-danger-on' : '')}
          onClick={() => (confirm ? onDelete(item.id) : setConfirm(true))}
        >
          {confirm ? 'Tap again to delete' : 'Delete item'}
        </button>
      </div>
    </div>
  )
}
