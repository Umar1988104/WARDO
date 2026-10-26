import { useState } from 'react'
import ItemImage from './ItemImage.jsx'
import { sectionById } from '../sections.js'

export default function ItemDetail({ item, onClose, onDelete }) {
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

  return (
    <div className="overlay detail">
      <header className="ov-head">
        <button className="ov-link" onClick={onClose}>
          Close
        </button>
        <strong>{section?.label || 'Item'}</strong>
        <span className="ov-spacer" />
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
