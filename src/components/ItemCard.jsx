import ItemImage from './ItemImage.jsx'
import { sectionById } from '../sections.js'

export default function ItemCard({ item, onOpen, small, badge }) {
  const tone = sectionById(item.section)?.tone || 'blue'
  return (
    <button className={'item-card tone-' + tone + (small ? ' item-card-small' : '')} onClick={() => onOpen(item.id)}>
      <span className="item-thumb">
        <ItemImage blob={item.front} alt={item.name} />
        {badge && <em className="item-badge">{badge}</em>}
      </span>
      <span className="item-name">{item.name}</span>
    </button>
  )
}
