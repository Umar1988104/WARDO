import { useState } from 'react'
import ItemImage from './ItemImage.jsx'
import { sectionById } from '../sections.js'
import { colorHex } from '../options.js'
import { agoText } from '../lib/dates.js'

export default function ItemDetail({ item, wear, wornToday, onToggleWorn, onClose, onEdit, onDelete }) {
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
