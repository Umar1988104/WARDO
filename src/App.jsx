import { useEffect, useState } from 'react'
import TabBar from './components/TabBar.jsx'
import AddSheet from './components/AddSheet.jsx'
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
  const [addOpen, setAddOpen] = useState(false)
  const [theme, setTheme] = useState(loadTheme)

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

  const openAdd = () => setAddOpen(true)

  return (
    <div className="app">
      <div className="backdrop-art" aria-hidden="true" />

      {tab === 'wardrobe' && <Wardrobe onAdd={openAdd} onPlan={() => setTab('planner')} />}
      {tab === 'planner' && <Planner />}
      {tab === 'insights' && <Insights />}
      {tab === 'settings' && <Settings theme={theme} setTheme={setTheme} />}

      <ThemeToggle theme={theme} setTheme={setTheme} />
      <TabBar tab={tab} setTab={setTab} onAdd={openAdd} />
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
