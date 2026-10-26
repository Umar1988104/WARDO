import { useState } from 'react'
import ItemCard from './ItemCard.jsx'

// Two-column grid that draws 48 pieces at a time, so a big wardrobe stays smooth.
export default function ItemGrid({ items, onOpen, selecting = false, picked, pageSize = 48 }) {
  const [limit, setLimit] = useState(pageSize)
  const shown = items.length > limit ? items.slice(0, limit) : items

  return (
    <>
      <div className="item-grid">
        {shown.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onOpen={onOpen}
            selecting={selecting}
            selected={selecting && !!picked?.has(item.id)}
          />
        ))}
      </div>
      {items.length > limit && (
        <button className="btn-quiet" onClick={() => setLimit((n) => n + pageSize)}>
          Show {Math.min(pageSize, items.length - limit)} more ({items.length - limit} left)
        </button>
      )}
    </>
  )
}
