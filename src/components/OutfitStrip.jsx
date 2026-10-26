import ItemImage from './ItemImage.jsx'

// A row of small cutout thumbnails for an outfit.
export default function OutfitStrip({ items, onOpen }) {
  return (
    <div className="ostrip">
      {items.map((item) => (
        <button key={item.id} className="othumb" onClick={() => onOpen?.(item.id)} aria-label={item.name}>
          <ItemImage blob={item.thumb || item.front} alt={item.name} />
        </button>
      ))}
    </div>
  )
}
