import Chips from './Chips.jsx'
import { CATEGORIES, ALL_CATEGORIES, COLORS, SEASONS, OCCASIONS, TAGS } from '../options.js'

// Optional details shared by the Add and Edit screens.
// value: { category, color, season, occasions[], tags[], notes }
export default function DetailsForm({ section, value, onChange }) {
  const categories = CATEGORIES[section] || ALL_CATEGORIES

  return (
    <div className="details">
      <div className="field">
        <span>Category</span>
        <Chips options={categories} value={value.category} onChange={(v) => onChange({ category: v })} />
      </div>

      <div className="field">
        <span>{value.color ? 'Color: ' + value.color : 'Color'}</span>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c.name}
              className={'sw' + (value.color === c.name ? ' sw-on' : '')}
              style={{ '--sw': c.hex }}
              aria-label={c.name}
              aria-pressed={value.color === c.name}
              onClick={() => onChange({ color: value.color === c.name ? null : c.name })}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <span>Season</span>
        <Chips options={SEASONS} value={value.season} onChange={(v) => onChange({ season: v })} />
      </div>

      <div className="field">
        <span>Occasion</span>
        <Chips multi options={OCCASIONS} value={value.occasions} onChange={(v) => onChange({ occasions: v })} />
      </div>

      <div className="field">
        <span>Fit and condition</span>
        <Chips multi options={TAGS} value={value.tags} onChange={(v) => onChange({ tags: v })} />
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={3}
          maxLength={300}
          value={value.notes}
          placeholder="Slim fit, a bit short, small tear on the left sleeve"
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>
    </div>
  )
}
