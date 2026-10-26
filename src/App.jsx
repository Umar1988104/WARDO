import { useCallback, useEffect, useState } from 'react'
import { db } from './db.js'
import TabBar from './components/TabBar.jsx'
import AddItem from './components/AddItem.jsx'
import ItemDetail from './components/ItemDetail.jsx'
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
  const [items, setItems] = useState([])
  const [theme, setTheme] = useState(loadTheme)

  const refresh = useCallback(async () => {
    try {
      setItems(await db.items.orderBy('createdAt').reverse().toArray())
    } catch (err) {
      console.error('Could not read the wardrobe:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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
    await refresh()
    setAddOpen(false)
    setTab('wardrobe')
    setSectionId(section)
  }

  async function handleDelete(id) {
    await db.items.delete(id)
    setOpenId(null)
    await refresh()
  }

  const openItem = items.find((i) => i.id === openId)

  return (
    <div className="app">
      <div className="backdrop-art" aria-hidden="true" />

      {tab === 'wardrobe' && (
        <Wardrobe
          items={items}
          sectionId={sectionId}
          setSectionId={setSectionId}
          onAdd={() => setAddOpen(true)}
          onPlan={() => setTab('planner')}
          onOpenItem={setOpenId}
        />
      )}
      {tab === 'planner' && <Planner />}
      {tab === 'insights' && <Insights itemCount={items.length} />}
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

      {openItem && <ItemDetail item={openItem} onClose={() => setOpenId(null)} onDelete={handleDelete} />}
      {addOpen && <AddItem itemCount={items.length} onClose={() => setAddOpen(false)} onSaved={handleSaved} />}
    </div>
  )
}
