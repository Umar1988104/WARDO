// A row of tappable options. Single-choice by default, or multi-choice with `multi`.
export default function Chips({ options, value, onChange, multi = false, tone }) {
  const selected = multi ? value || [] : value

  function toggle(id) {
    if (multi) onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
    else onChange(selected === id ? null : id)
  }

  return (
    <div className="picks">
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id
        const label = typeof o === 'string' ? o : o.label
        const on = multi ? selected.includes(id) : selected === id
        return (
          <button
            type="button"
            key={id}
            className={'pick' + (tone ? ' tone-' + tone : '') + (on ? ' pick-on' : '')}
            aria-pressed={on}
            onClick={() => toggle(id)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
