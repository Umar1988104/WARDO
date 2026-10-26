import Screen from '../components/Screen.jsx'
import ItemImage from '../components/ItemImage.jsx'
import { CalendarIcon } from '../components/Icons.jsx'
import { SECTIONS, sectionById } from '../sections.js'

function ItemCard({ item, onOpen, small }) {
  const tone = sectionById(item.section)?.tone || 'blue'
  return (
    <button className={'item-card tone-' + tone + (small ? ' item-card-small' : '')} onClick={() => onOpen(item.id)}>
      <span className="item-thumb">
        <ItemImage blob={item.front} alt={item.name} />
      </span>
      <span className="item-name">{item.name}</span>
    </button>
  )
}

export default function Wardrobe({ items, sectionId, setSectionId, onAdd, onPlan, onOpenItem }) {
  const section = sectionById(sectionId)

  if (section) {
    const inSection = items.filter((i) => i.section === section.id)
    return (
      <Screen title={section.label} back={{ label: 'Wardrobe', onClick: () => setSectionId(null) }}>
        {inSection.length === 0 ? (
          <div className={'empty glass tone-' + section.tone}>
            <div className="chip">
              <section.Icon />
            </div>
            <h2>No {section.label.toLowerCase()} items yet</h2>
            <p className="muted">Photograph a piece and it will appear here as a clean cutout.</p>
            <button className="btn-primary" onClick={onAdd}>
              Add an item
            </button>
          </div>
        ) : (
          <div className="item-grid">
            {inSection.map((item) => (
              <ItemCard key={item.id} item={item} onOpen={onOpenItem} />
            ))}
          </div>
        )}
      </Screen>
    )
  }

  const recent = items.slice(0, 10)

  return (
    <Screen title="Wardrobe">
      <section className="hero">
        <div className="hero-text">
          <h2>What are you wearing tomorrow?</h2>
          <p>Add a few clothes, then plan your outfit in one tap.</p>
        </div>
        <button className="hero-btn" onClick={onPlan}>
          <CalendarIcon />
          Plan outfit
        </button>
      </section>

      <h3 className="section-title">Sections</h3>
      <div className="tiles">
        {SECTIONS.map((s) => {
          const count = items.filter((i) => i.section === s.id).length
          return (
            <button key={s.id} className={'tile glass tone-' + s.tone} onClick={() => setSectionId(s.id)}>
              <span className="chip">
                <s.Icon />
              </span>
              <strong>{s.label}</strong>
              <span className="muted tile-hint">{s.hint}</span>
              <span className="tile-count">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            </button>
          )
        })}
      </div>

      <h3 className="section-title">Recently added</h3>
      {recent.length === 0 ? (
        <div className="empty empty-slim glass">
          <p className="muted">Nothing here yet. Tap the + button to add your first piece.</p>
          <button className="btn-primary" onClick={onAdd}>
            Add first item
          </button>
        </div>
      ) : (
        <div className="recent-row">
          {recent.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={onOpenItem} small />
          ))}
        </div>
      )}
    </Screen>
  )
}
