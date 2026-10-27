// iOS-style on/off switch with a label.
export default function Switch({ label, hint, on, onChange }) {
  return (
    <div className="row switch-row">
      <span>
        {label}
        {hint && <small className="muted switch-hint">{hint}</small>}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={'switch' + (on ? ' switch-on' : '')} onClick={() => onChange(!on)}>
        <i />
      </button>
    </div>
  )
}
