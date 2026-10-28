import Chips from './Chips.jsx'
import { usePrefs } from '../lib/prefs.js'
import { CATEGORIES, ALL_CATEGORIES, COLORS, SEASONS, OCCASIONS, TAGS } from '../options.js'

// Optional details shared by the Add and Edit screens.
// value: { category, color, season, occasions[], tags[], notes, price }
export default function DetailsForm({ section, value, onChange, similar = 0 }) {
  const categories = CATEGORIES[section] || ALL_CATEGORIES
  const { currency } = usePrefs()

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

      {similar >= 2 && (
        <p className="notice notice-soft">
          You already have {similar} {value.color.toLowerCase()} {value.category.toLowerCase()} {similar === 1 ? 'piece' : 'pieces'}. Make sure you need another one.
        </p>
      )}

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
        <span>Price (optional, to see cost per wear)</span>
        <div className="price-input">
          <i aria-hidden="true">{currency}</i>
          <input
            type="text"
            inputMode="decimal"
            maxLength={9}
            value={value.price ?? ''}
            placeholder="0"
            autoComplete="off"
            onChange={(e) => onChange({ price: e.target.value.replace(/[^0-9.]/g, '') })}
          />
        </div>
      </label>

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
