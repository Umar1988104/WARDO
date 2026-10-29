import { useMemo, useState } from 'react'
import Screen from '../components/Screen.jsx'
import ItemCard from '../components/ItemCard.jsx'
import ItemGrid from '../components/ItemGrid.jsx'
import SectionScreen from './SectionScreen.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { SearchIcon, FilterIcon, LockIcon } from '../components/Icons.jsx'
import { SECTIONS, sectionById } from '../sections.js'
import { useBackClose } from '../lib/backstack.js'
import { EMPTY_FILTERS, applyFilters, countActive, sortItems } from '../lib/filter.js'

export default function Wardrobe({ items, innerHidden = false, folders, wearInfo, outfitMap, actions, sectionId, setSectionId, folderId, setFolderId, letGo = null, onOpenLetGo, onAdd, onPlan, onOpenSettings, onOpenItem }) {
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
  const dirtyCount = useMemo(() => items.filter((i) => i.laundry === 'dirty').length, [items])
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items])

  function leaveResults() {
    setShowAll(false)
    setQuery('')
    setFilters(EMPTY_FILTERS)
    setSort('new')
  }

  const section = sectionById(sectionId)
  // Back leaves the search results before it leaves the Wardrobe
  useBackClose(leaveResults, resultsMode && !section)

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
    <Screen
      title={resultsMode ? 'All items' : 'My Wardrobe'}
      back={resultsMode ? { label: 'Wardrobe', onClick: leaveResults } : undefined}
      overlays={
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
      }
    >
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
            <div className="results-row">
              <p className="muted results-count">
                {results.length} {results.length === 1 ? 'item' : 'items'}
              </p>
              {filters.laundry.length === 1 && filters.laundry[0] === 'In laundry' && (
                <button className="pill pill-accent" onClick={() => actions.washAll()}>
                  All washed
                </button>
              )}
            </div>
            <ItemGrid items={results} onOpen={onOpenItem} viewToggle />
          </>
        )
      ) : (
        <>
          {dirtyCount > 0 && (
            <div className="laundry-card glass">
              <div>
                <strong>{dirtyCount} in laundry</strong>
                <span className="muted">Left out of outfit suggestions</span>
              </div>
              <div className="laundry-actions">
                <button className="pill" onClick={() => setFilters({ ...EMPTY_FILTERS, laundry: ['In laundry'] })}>
                  View
                </button>
                <button className="pill pill-accent" onClick={() => actions.washAll()}>
                  All washed
                </button>
              </div>
            </div>
          )}
          {letGo && letGo.donate + letGo.sell + letGo.history > 0 && (
            <div className="laundry-card glass">
              <div>
                <strong>Let go</strong>
                <span className="muted">
                  {letGo.donate} to donate · {letGo.sell} to sell · {letGo.history} gone
                </span>
              </div>
              <button className="pill" onClick={onOpenLetGo}>
                Open
              </button>
            </div>
          )}
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
                    {s.id === 'inner' && innerHidden ? (
                      <span className="tile-lock">
                        <LockIcon /> Locked
                      </span>
                    ) : (
                      <>
                        {count} {count === 1 ? 'item' : 'items'}
                      </>
                    )}
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

    </Screen>
  )
}
