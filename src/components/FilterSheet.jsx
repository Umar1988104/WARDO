import Chips from './Chips.jsx'
import { SECTIONS } from '../sections.js'
import { COLORS, SEASONS, OCCASIONS, TAGS, SORTS } from '../options.js'
import { EMPTY_FILTERS } from '../lib/filter.js'

export default function FilterSheet({ open, onClose, filters, setFilters, sort, setSort, categories, count }) {
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))

  return (
    <>
      <div className={'scrim' + (open ? ' scrim-on' : '')} onClick={onClose} />
      <section
        className={'sheet sheet-tall glass' + (open ? ' sheet-on' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        aria-hidden={!open}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>Filters</h2>
          <button
            className="ov-link"
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              setSort('new')
            }}
          >
            Clear all
          </button>
        </div>

        <div className="sheet-scroll">
          <div className="field">
            <span>Sort by</span>
            <Chips options={SORTS} value={sort} onChange={(v) => setSort(v || 'new')} />
          </div>
          <div className="field">
            <span>Section</span>
            <Chips multi options={SECTIONS.map((s) => ({ id: s.id, label: s.label }))} value={filters.section} onChange={set('section')} />
          </div>
          <div className="field">
            <span>Color</span>
            <Chips multi options={COLORS.map((c) => c.name)} value={filters.color} onChange={set('color')} />
          </div>
          {categories.length > 0 && (
            <div className="field">
              <span>Category</span>
              <Chips multi options={categories} value={filters.category} onChange={set('category')} />
            </div>
          )}
          <div className="field">
            <span>Season</span>
            <Chips multi options={SEASONS} value={filters.season} onChange={set('season')} />
          </div>
          <div className="field">
            <span>Occasion</span>
            <Chips multi options={OCCASIONS} value={filters.occasion} onChange={set('occasion')} />
          </div>
          <div className="field">
            <span>Fit and condition</span>
            <Chips multi options={TAGS} value={filters.tags} onChange={set('tags')} />
          </div>
        </div>

        <button className="btn-primary btn-wide" onClick={onClose}>
          Show {count} {count === 1 ? 'item' : 'items'}
        </button>
      </section>
    </>
  )
}
