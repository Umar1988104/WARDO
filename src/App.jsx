import { useEffect, useState } from 'react'
import useData from './useData.js'
import { todayKey } from './lib/dates.js'
import TabBar from './components/TabBar.jsx'
import AddItem from './components/AddItem.jsx'
import ItemDetail from './components/ItemDetail.jsx'
import EditItem from './components/EditItem.jsx'
import ThemeToggle, { isDarkNow } from './components/ThemeToggle.jsx'
import Wardrobe from './screens/Wardrobe.jsx'
import Planner from './screens/Planner.jsx'
import Insights from './screens/Insights.jsx'
import Settings from './screens/Settings.jsx'

function loadTheme() {
  try {
    return localStorage.getItem('wardo-theme') || 'auto'
  } catch {
    return 'auto'
  }
}

export default function App() {
  const [tab, setTab] = useState('wardrobe')
  const [sectionId, setSectionId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [theme, setTheme] = useState(loadTheme)

  const { items, wearInfo, outfitMap, outfits, actions } = useData()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('wardo-theme', theme)
    } catch {
      /* storage can be unavailable; the theme just won't persist */
    }
    // keep the browser / Android status bar colour in sync with the chosen theme
    const colour = isDarkNow(theme) ? '#0c0f1a' : '#eef0fb'
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.removeAttribute('media')
      m.setAttribute('content', colour)
    })
  }, [theme])

  async function handleSaved(section) {
    await actions.refresh()
    setAddOpen(false)
    setTab('wardrobe')
    setSectionId(section)
  }

  async function handleDelete(id) {
    setOpenId(null)
    await actions.deleteItem(id)
  }

  async function handleEdited() {
    setEditId(null)
    await actions.refresh()
  }

  const openItem = items.find((i) => i.id === openId)
  const editItem = items.find((i) => i.id === editId)

  return (
    <div className="app">
      <div className="backdrop-art" aria-hidden="true" />

      {tab === 'wardrobe' && (
        <Wardrobe
          items={items}
          wearInfo={wearInfo}
          outfitMap={outfitMap}
          actions={actions}
          sectionId={sectionId}
          setSectionId={setSectionId}
          onAdd={() => setAddOpen(true)}
          onPlan={() => setTab('planner')}
          onOpenItem={setOpenId}
        />
      )}
      {tab === 'planner' && (
        <Planner items={items} outfitMap={outfitMap} wearInfo={wearInfo} actions={actions} onOpenItem={setOpenId} />
      )}
      {tab === 'insights' && (
        <Insights items={items} wearInfo={wearInfo} outfits={outfits} onOpenItem={setOpenId} />
      )}
      {tab === 'settings' && <Settings theme={theme} setTheme={setTheme} />}

      <ThemeToggle theme={theme} setTheme={setTheme} />
      <TabBar
        tab={tab}
        setTab={(t) => {
          setTab(t)
          if (t === 'wardrobe') setSectionId(null)
        }}
        onAdd={() => setAddOpen(true)}
      />

      {openItem && (
        <ItemDetail
          item={openItem}
          wear={wearInfo[openItem.id]}
          wornToday={!!wearInfo[openItem.id]?.dates.has(todayKey())}
          onToggleWorn={actions.toggleWorn}
          onClose={() => setOpenId(null)}
          onEdit={setEditId}
          onDelete={handleDelete}
        />
      )}
      {editItem && <EditItem item={editItem} onClose={() => setEditId(null)} onSaved={handleEdited} />}
      {addOpen && <AddItem itemCount={items.length} onClose={() => setAddOpen(false)} onSaved={handleSaved} />}
    </div>
  )
}
