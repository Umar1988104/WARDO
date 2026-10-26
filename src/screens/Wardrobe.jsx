import { useMemo, useState } from 'react'
import Screen from '../components/Screen.jsx'
import ItemCard from '../components/ItemCard.jsx'
import ItemGrid from '../components/ItemGrid.jsx'
import BackupNudge from '../components/BackupNudge.jsx'
import SectionScreen from './SectionScreen.jsx'
import TodayCard from '../components/TodayCard.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { SearchIcon, FilterIcon } from '../components/Icons.jsx'
import { SECTIONS, sectionById } from '../sections.js'
import { EMPTY_FILTERS, applyFilters, countActive, sortItems } from '../lib/filter.js'

export default function Wardrobe({ items, folders, wearInfo, outfitMap, actions, sectionId, setSectionId, folderId, setFolderId, onAdd, onPlan, onOpenSettings, onOpenItem }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState('new')
  const [filterOpen, setFilterOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const activeCount = countActive(filters)
  const resultsMode = showAll || query.trim() !== '' || activeCount > 0

  const results = useMemo(() => sortItems(applyFilters(items, query, filters), sort), [items, query, filters, sort])
  const sectionCounts = useMemo(() => {
    const map = {}
    for (const i of items) map[i.section] = (map[i.section] || 0) + 1
    return map
  }, [items])
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items])

  function leaveResults() {
    setShowAll(false)
    setQuery('')
    setFilters(EMPTY_FILTERS)
    setSort('new')
  }

  const section = sectionById(sectionId)

  if (section) {
    return (
      <SectionScreen
        section={section}
        folders={folders}
        folderId={folderId}
        setFolderId={setFolderId}
        items={items}
        actions={actions}
        onBack={() => setSectionId(null)}
        onAdd={onAdd}
        onOpenItem={onOpenItem}
      />
    )
  }

  const recent = items.slice(0, 10)

  return (
    <Screen title={resultsMode ? 'All items' : 'Wardrobe'} back={resultsMode ? { label: 'Wardrobe', onClick: leaveResults } : undefined}>
      <div className="searchrow">
        <label className="search glass">
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder="Search clothes, colors, notes"
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="filter-btn glass" onClick={() => setFilterOpen(true)} aria-label="Filters and sorting">
          <FilterIcon />
          {activeCount > 0 && <b>{activeCount}</b>}
        </button>
      </div>

      {resultsMode ? (
        results.length === 0 ? (
          <div className="empty glass">
            <h2>{items.length === 0 ? 'Your wardrobe is empty' : 'No matches'}</h2>
            <p className="muted">
              {items.length === 0
                ? 'Add your first piece to start building your wardrobe.'
                : 'Try a different word, or clear some filters.'}
            </p>
            {items.length === 0 ? (
              <button className="btn-primary" onClick={onAdd}>
                Add first item
              </button>
            ) : (
              <button className="btn-primary" onClick={leaveResults}>
                Clear search and filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="muted results-count">
              {results.length} {results.length === 1 ? 'item' : 'items'}
            </p>
            <ItemGrid items={results} onOpen={onOpenItem} />
          </>
        )
      ) : (
        <>
          <BackupNudge count={items.length} onOpen={onOpenSettings} />

          <TodayCard
            items={items}
            outfitMap={outfitMap}
            wearInfo={wearInfo}
            actions={actions}
            onPlan={onPlan}
            onOpenItem={onOpenItem}
          />

          <h3 className="section-title">Sections</h3>
          <div className="tiles">
            {SECTIONS.map((s) => {
              const count = sectionCounts[s.id] || 0
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

          <div className="title-row">
            <h3 className="section-title">Recently added</h3>
            {items.length > 0 && (
              <button className="link-btn" onClick={() => setShowAll(true)}>
                See all {items.length}
              </button>
            )}
          </div>
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
        </>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
        categories={categories}
        count={results.length}
      />
    </Screen>
  )
}
