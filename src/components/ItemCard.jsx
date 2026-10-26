import { memo } from 'react'
import ItemImage from './ItemImage.jsx'
import { sectionById } from '../sections.js'

// Grid card. Uses the small preview picture (thumb); memo keeps it from re-drawing
// when something unrelated changes (like marking another piece as worn).
function ItemCard({ item, onOpen, small, badge, selecting = false, selected = false }) {
  const tone = sectionById(item.section)?.tone || 'blue'
  return (
    <button
      className={'item-card tone-' + tone + (small ? ' item-card-small' : '') + (selected ? ' item-card-on' : '')}
      onClick={() => onOpen(item.id)}
      aria-pressed={selecting ? selected : undefined}
    >
      <span className="item-thumb">
        <ItemImage blob={item.thumb || item.front} alt={item.name} />
        {badge && <em className="item-badge">{badge}</em>}
        {selecting && (
          <i className={'sel-dot' + (selected ? ' sel-dot-on' : '')} aria-hidden="true">
            {selected ? '✓' : ''}
          </i>
        )}
      </span>
      <span className="item-name">{item.name}</span>
    </button>
  )
}

export default memo(ItemCard)
