import Screen from '../components/Screen.jsx'
import Segmented from '../components/Segmented.jsx'

const THEMES = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function Settings({ theme, setTheme }) {
  return (
    <Screen title="Settings">
      <section className="group glass">
        <div className="row">
          <span>Appearance</span>
        </div>
        <Segmented options={THEMES} value={theme} onChange={setTheme} />
      </section>

      <section className="group glass">
        <div className="row">
          <span>Your data</span>
          <span className="muted">Stays on this phone</span>
        </div>
        <div className="row">
          <span>Version</span>
          <span className="muted">Wardo 0.7.0</span>
        </div>
      </section>
    </Screen>
  )
}
