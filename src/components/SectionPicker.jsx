import { SECTIONS } from '../sections.js'

export default function SectionPicker({ value, onChange }) {
  return (
    <div className="picks">
      {SECTIONS.map((s) => (
        <button
          type="button"
          key={s.id}
          className={'pick tone-' + s.tone + (value === s.id ? ' pick-on' : '')}
          aria-pressed={value === s.id}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
