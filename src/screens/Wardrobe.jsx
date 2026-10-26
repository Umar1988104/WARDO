import { useState } from 'react'
import Screen from '../components/Screen.jsx'
import { SnowIcon, SunIcon, InnerIcon, AccessoryIcon, CalendarIcon } from '../components/Icons.jsx'

const SECTIONS = [
  { id: 'winter', label: 'Winter', hint: 'Jackets, sweaters, hoodies', Icon: SnowIcon, tone: 'blue' },
  { id: 'summer', label: 'Summer', hint: 'Tees, shorts, light layers', Icon: SunIcon, tone: 'amber' },
  { id: 'inner', label: 'Innerwear', hint: 'Basics and thermals', Icon: InnerIcon, tone: 'rose' },
  { id: 'accessories', label: 'Accessories', hint: 'Caps, belts, watches', Icon: AccessoryIcon, tone: 'mint' },
]

export default function Wardrobe({ onAdd, onPlan }) {
  const [sectionId, setSectionId] = useState(null)
  const section = SECTIONS.find((s) => s.id === sectionId)

  if (section) {
    return (
      <Screen title={section.label} back={{ label: 'Wardrobe', onClick: () => setSectionId(null) }}>
        <div className="empty glass">
          <div className={'chip tone-' + section.tone}>
            <section.Icon />
          </div>
          <h2>No {section.label.toLowerCase()} items yet</h2>
          <p className="muted">Photograph a piece and it will appear here as a clean cutout.</p>
          <button className="btn-primary" onClick={onAdd}>
            Add an item
          </button>
        </div>
      </Screen>
    )
  }

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
        {SECTIONS.map((s) => (
          <button key={s.id} className={'tile glass tone-' + s.tone} onClick={() => setSectionId(s.id)}>
            <span className="chip">
              <s.Icon />
            </span>
            <strong>{s.label}</strong>
            <span className="muted tile-hint">{s.hint}</span>
            <span className="tile-count">0 items</span>
          </button>
        ))}
      </div>

      <h3 className="section-title">Recently added</h3>
      <div className="empty empty-slim glass">
        <p className="muted">Nothing here yet. Tap the + button to add your first piece.</p>
        <button className="btn-primary" onClick={onAdd}>
          Add first item
        </button>
      </div>
    </Screen>
  )
}
