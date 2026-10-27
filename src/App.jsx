import { useEffect, useRef, useState } from 'react'
import { db } from './db.js'
import { readPrivacy, tryPin, removePin } from './lib/lock.js'
import PinPad, { ForgotPin, wrongPinText } from './components/PinPad.jsx'
import BatchAdd from './components/BatchAdd.jsx'
import BatchReview from './components/BatchReview.jsx'
import useData from './useData.js'
import { todayKey } from './lib/dates.js'
import TabBar from './components/TabBar.jsx'
import AddItem from './components/AddItem.jsx'
import ItemDetail from './components/ItemDetail.jsx'
import EditItem from './components/EditItem.jsx'
import ThemeToggle, { isDarkNow } from './components/ThemeToggle.jsx'
import Home from './screens/Home.jsx'
import Welcome from './components/Welcome.jsx'
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
  const [tab, setTab] = useState('home')
  const [sectionId, setSectionId] = useState(null)
  const [folderId, setFolderId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [theme, setTheme] = useState(loadTheme)
  const [privacy, setPrivacy] = useState(readPrivacy)
  const [appLocked, setAppLocked] = useState(() => {
    const p = readPrivacy()
    return p.pin && p.app
  })
  const [innerOpen, setInnerOpen] = useState(false) // innerwear unlocked for now
  const [pinPrompt, setPinPrompt] = useState(null) // { then } while asking for the PIN to open innerwear
  const [batchOpen, setBatchOpen] = useState(false)
  const [reviewIds, setReviewIds] = useState(null)
  const awayAt = useRef(0)
  const [welcome, setWelcome] = useState(() => {
    try {
      return !localStorage.getItem('wardo-welcomed')
    } catch {
      return false
    }
  })

  const innerHidden = privacy.pin && privacy.inner && !innerOpen

  function refreshPrivacy() {
    const next = readPrivacy()
    setPrivacy(next)
    if (!next.pin) {
      setAppLocked(false)
      setInnerOpen(false)
    }
  }

  // lock again after the app has been away for a short while
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        awayAt.current = Date.now()
        return
      }
      if (awayAt.current && Date.now() - awayAt.current > 15000) {
        const p = readPrivacy()
        if (p.pin) {
          setInnerOpen(false)
          if (p.app) setAppLocked(true)
        }
      }
      awayAt.current = 0
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  async function resetEverything() {
    await Promise.all([db.items.clear(), db.wears.clear(), db.outfits.clear(), db.folders.clear()])
    removePin()
    refreshPrivacy()
    setAppLocked(false)
    await actions.refresh()
  }

  function finishWelcome() {
    try {
      localStorage.setItem('wardo-welcomed', '1')
    } catch {
      /* it may show again next time, that is fine */
    }
    setWelcome(false)
  }

  const { items, folders, wearInfo, outfitMap, outfits, actions } = useData()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('wardo-theme', theme)
    } catch {
      /* storage can be unavailable; the theme just won't persist */
    }
    // keep the browser / Android status bar colour in sync with the chosen theme
    const colour = isDarkNow(theme) ? '#111715' : '#f7f3ee'
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.removeAttribute('media')
      m.setAttribute('content', colour)
    })
  }, [theme])

  async function handleSaved(section, folder = null) {
    await actions.refresh()
    setAddOpen(false)
    if (section === 'inner' && innerHidden) {
      setTab('home')
      return
    }
    setTab('wardrobe')
    setSectionId(section)
    setFolderId(folder)
  }

  async function handleDelete(id) {
    setOpenId(null)
    await actions.deleteItem(id)
  }

  async function handleEdited() {
    setEditId(null)
    await actions.refresh()
  }

  // while innerwear is hidden, it is left out of every screen
  const shownItems = innerHidden ? items.filter((i) => i.section !== 'inner') : items

  useEffect(() => {
    if (!innerHidden) return
    if (sectionId === 'inner') {
      setSectionId(null)
      setFolderId(null)
    }
    const hidden = (id) => items.find((i) => i.id === id)?.section === 'inner'
    if (openId != null && hidden(openId)) setOpenId(null)
    if (editId != null && hidden(editId)) setEditId(null)
  }, [innerHidden, sectionId, openId, editId, items])

  // opens a section; innerwear asks for the PIN first while it is hidden
  function openSection(id) {
    if (id === 'inner' && innerHidden) {
      setPinPrompt({
        then: () => {
          setInnerOpen(true)
          setSectionId('inner')
          setFolderId(null)
          setTab('wardrobe')
        },
      })
      return
    }
    setSectionId(id)
    setFolderId(null)
    if (id) setTab('wardrobe')
  }

  async function finishBatch(ids) {
    setBatchOpen(false)
    if (ids.length) setReviewIds(ids)
    else setTab('home')
  }

  const openItem = shownItems.find((i) => i.id === openId)
  const editItem = shownItems.find((i) => i.id === editId)

  return (
    <div className="app">
      <div className="backdrop-art" aria-hidden="true" />

      {tab === 'home' && (
        <Home
          items={shownItems}
          innerHidden={innerHidden}
          onReview={() => setReviewIds(shownItems.filter((i) => i.needsDetails).map((i) => i.id))}
          wearInfo={wearInfo}
          outfitMap={outfitMap}
          actions={actions}
          onAdd={() => setAddOpen(true)}
          onPlan={() => setTab('planner')}
          onInsights={() => setTab('insights')}
          onOpenSettings={() => setTab('settings')}
          onSearch={() => {
            setSectionId(null)
            setFolderId(null)
            setTab('wardrobe')
          }}
          onOpenSection={openSection}
          onOpenItem={setOpenId}
        />
      )}
      {tab === 'wardrobe' && (
        <Wardrobe
          items={shownItems}
          innerHidden={innerHidden}
          folders={folders}
          wearInfo={wearInfo}
          outfitMap={outfitMap}
          actions={actions}
          sectionId={sectionId}
          setSectionId={openSection}
          folderId={folderId}
          setFolderId={setFolderId}
          onAdd={() => setAddOpen(true)}
          onPlan={() => setTab('planner')}
          onOpenSettings={() => setTab('settings')}
          onOpenItem={setOpenId}
        />
      )}
      {tab === 'planner' && (
        <Planner items={shownItems} outfitMap={outfitMap} wearInfo={wearInfo} actions={actions} onOpenItem={setOpenId} />
      )}
      {tab === 'insights' && (
        <Insights items={shownItems} wearInfo={wearInfo} outfits={outfits} onOpenItem={setOpenId} onBack={() => setTab('home')} />
      )}
      {tab === 'settings' && <Settings theme={theme} setTheme={setTheme} itemCount={items.length} actions={actions} privacy={privacy} onPrivacyChange={refreshPrivacy} />}

      <ThemeToggle theme={theme} setTheme={setTheme} />
      <TabBar
        tab={tab}
        setTab={(t) => {
          setTab(t)
          if (t === 'wardrobe') {
            setSectionId(null)
            setFolderId(null)
          }
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
      {editItem && <EditItem item={editItem} folders={folders} actions={actions} onClose={() => setEditId(null)} onSaved={handleEdited} />}
      {welcome && <Welcome onDone={finishWelcome} />}
      {addOpen && (
        <AddItem
          itemCount={items.length}
          folders={folders}
          actions={actions}
          defaultSection={tab === 'wardrobe' ? sectionId : null}
          defaultFolderId={tab === 'wardrobe' ? folderId : null}
          onClose={() => setAddOpen(false)}
          onSaved={handleSaved}
          onBatch={() => {
            setAddOpen(false)
            setBatchOpen(true)
          }}
        />
      )}
      {batchOpen && (
        <BatchAdd
          itemCount={items.length}
          folders={folders}
          actions={actions}
          defaultSection={tab === 'wardrobe' && sectionId !== 'inner' ? sectionId : null}
          defaultFolderId={tab === 'wardrobe' && sectionId !== 'inner' ? folderId : null}
          onClose={() => setBatchOpen(false)}
          onFinished={finishBatch}
        />
      )}
      {reviewIds && reviewIds.length > 0 && <BatchReview ids={reviewIds} items={items} actions={actions} onClose={() => setReviewIds(null)} />}

      {pinPrompt && (
        <PinPad
          title="Innerwear is locked"
          subtitle="Enter your PIN"
          onCancel={() => setPinPrompt(null)}
          onSubmit={async (pin) => {
            const r = await tryPin(pin)
            if (!r.ok) return wrongPinText(r)
            const then = pinPrompt.then
            setPinPrompt(null)
            then()
            return true
          }}
        />
      )}

      {appLocked && (
        <PinPad
          title="Wardo is locked"
          subtitle="Enter your PIN"
          footer={<ForgotPin onReset={resetEverything} />}
          onSubmit={async (pin) => {
            const r = await tryPin(pin)
            if (!r.ok) return wrongPinText(r)
            setAppLocked(false)
            return true
          }}
        />
      )}
    </div>
  )
}
