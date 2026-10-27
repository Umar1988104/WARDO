import { HomeIcon, HangerIcon, CalendarIcon, PlusIcon, UserIcon } from './Icons.jsx'

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'wardrobe', label: 'Wardrobe', Icon: HangerIcon },
  { id: 'add', label: 'Add', Icon: PlusIcon },
  { id: 'planner', label: 'Planner', Icon: CalendarIcon },
  { id: 'settings', label: 'Profile', Icon: UserIcon },
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
            className={'tab' + ((tab === id || (tab === 'insights' && id === 'home')) ? ' tab-active' : '')}
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
