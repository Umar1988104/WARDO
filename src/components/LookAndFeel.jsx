import Segmented from './Segmented.jsx'
import Switch from './Switch.jsx'
import { ACCENTS, PACKS, PRESETS, currentPreset, resetLook, setPrefs, usePrefs } from '../lib/prefs.js'

const THEMES = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const SPEEDS = [
  { value: 'fast', label: 'Fast' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'full', label: 'Full' },
]
const MOTION = [
  { value: 'full', label: 'Full' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'off', label: 'Off' },
]
const BLUR = [
  { value: 'full', label: 'Full' },
  { value: 'light', label: 'Light' },
  { value: 'off', label: 'Off' },
]
const COLS = [
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns' },
]
const START = [
  { value: 'home', label: 'Home' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'planner', label: 'Planner' },
]

// The contents of the Profile sections. Profile decides which one is open.

// Name and title, shown in the greeting on Home.
export function YouPanel() {
  const p = usePrefs()
  return (
    <>
      <div className="me-fields">
        <input
          type="text"
          value={p.name}
          maxLength={24}
          placeholder="Your name"
          autoComplete="off"
          aria-label="Your name"
          onChange={(e) => setPrefs({ name: e.target.value })}
        />
        <input
          type="text"
          value={p.title}
          maxLength={32}
          placeholder="Title, like Style curator"
          autoComplete="off"
          aria-label="Your title"
          onChange={(e) => setPrefs({ title: e.target.value })}
        />
      </div>
      <p className="muted group-note">Shown in the greeting on Home.</p>
    </>
  )
}

// Appearance, theme pack and accent colour.
export function LookPanel({ theme, setTheme }) {
  const p = usePrefs()
  return (
    <>
      <div className="row">
        <span>Appearance</span>
      </div>
      <Segmented options={THEMES} value={theme} onChange={setTheme} />

      <div className="row">
        <span>Theme pack</span>
        <span className="muted">{PACKS[p.pack]?.label}</span>
      </div>
      <div className="look-swatches" role="radiogroup" aria-label="Theme pack">
        {Object.entries(PACKS).map(([id, pack]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={p.pack === id}
            aria-label={pack.label}
            className={'swatch' + (p.pack === id ? ' swatch-on' : '')}
            style={{ background: `linear-gradient(135deg, ${pack.blobs[0]}, ${pack.light} 60%, ${pack.blobs[2]})` }}
            onClick={() => setPrefs({ pack: id, accent: null })}
          />
        ))}
      </div>

      <div className="row">
        <span>Accent colour</span>
        <span className="muted">{p.accent ? p.accent : 'Pack colour'}</span>
      </div>
      <div className="look-swatches" role="radiogroup" aria-label="Accent colour">
        {ACCENTS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={p.accent === c}
            aria-label={'Accent ' + c}
            className={'swatch swatch-dot' + (p.accent === c ? ' swatch-on' : '')}
            style={{ background: c }}
            onClick={() => setPrefs({ accent: c })}
          />
        ))}
        <label className="swatch swatch-dot swatch-pick" aria-label="Pick any colour">
          <input type="color" value={p.accent || PACKS[p.pack]?.light || '#23796d'} onChange={(e) => setPrefs({ accent: e.target.value })} />
          <span aria-hidden="true">+</span>
        </label>
      </div>
      <div className="group-buttons">
        {p.accent && (
          <button className="pill" onClick={() => setPrefs({ accent: null })}>
            Use the pack colour
          </button>
        )}
        <button className="pill" onClick={resetLook}>
          Reset look and speed
        </button>
      </div>
    </>
  )
}

// Speed presets and the three switches behind them.
export function SpeedPanel() {
  const p = usePrefs()
  const preset = currentPreset(p)
  return (
    <>
      <div className="row">
        <span>Speed</span>
        <span className="muted">{preset === 'custom' ? 'Custom' : preset[0].toUpperCase() + preset.slice(1)}</span>
      </div>
      <Segmented options={SPEEDS} value={preset} onChange={(v) => setPrefs(PRESETS[v])} />
      <p className="muted group-note">
        If the app feels slow or warm, choose Fast. It switches off most animations and the frosted-glass blur.
      </p>

      <div className="row">
        <span>Animations</span>
      </div>
      <Segmented options={MOTION} value={p.motion} onChange={(v) => setPrefs({ motion: v })} />
      <div className="row">
        <span>Frosted-glass blur</span>
      </div>
      <Segmented options={BLUR} value={p.blur} onChange={(v) => setPrefs({ blur: v })} />
      <Switch label="Moving background" hint="Slow drifting colour clouds" on={p.liveBg} onChange={(v) => setPrefs({ liveBg: v })} />
    </>
  )
}

// Laundry, currency, grid size, start screen and vibration.
export function HabitsPanel() {
  const p = usePrefs()
  return (
    <>
      <Switch
        label="Laundry after wearing"
        hint="Pieces you wear go to the laundry until you mark them clean"
        on={p.autoLaundry}
        onChange={(v) => setPrefs({ autoLaundry: v })}
      />
      <div className="row">
        <span>Currency symbol</span>
        <input
          className="mini-input"
          type="text"
          value={p.currency}
          maxLength={3}
          aria-label="Currency symbol"
          autoComplete="off"
          onChange={(e) => setPrefs({ currency: e.target.value })}
        />
      </div>
      <div className="row">
        <span>Grid</span>
      </div>
      <Segmented options={COLS} value={p.cols} onChange={(v) => setPrefs({ cols: v })} />
      <div className="row">
        <span>Open Wardo on</span>
      </div>
      <Segmented options={START} value={p.startTab} onChange={(v) => setPrefs({ startTab: v })} />
      <Switch label="Tap vibration" hint="A tiny buzz on the tab bar (Android)" on={p.haptics} onChange={(v) => setPrefs({ haptics: v })} />
    </>
  )
}
