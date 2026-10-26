import { HangerIcon, CalendarIcon, PlusIcon, InsightsIcon, SettingsIcon } from './Icons.jsx'

const TABS = [
  { id: 'wardrobe', label: 'Wardrobe', Icon: HangerIcon },
  { id: 'planner', label: 'Planner', Icon: CalendarIcon },
  { id: 'add', label: 'Add', Icon: PlusIcon },
  { id: 'insights', label: 'Insights', Icon: InsightsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function TabBar({ tab, setTab, onAdd }) {
  return (
    <nav className="tabbar glass" aria-label="Main">
      {TABS.map(({ id, label, Icon }) =>
        id === 'add' ? (
          <button key={id} className="tab-add" onClick={onAdd} aria-label="Add clothing item">
            <Icon />
          </button>
        ) : (
          <button
            key={id}
            className={'tab' + (tab === id ? ' tab-active' : '')}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
          </button>
        )
      )}
    </nav>
  )
}
