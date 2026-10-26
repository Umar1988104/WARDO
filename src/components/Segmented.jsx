export default function Segmented({ options, value, onChange, scroll = false }) {
  return (
    <div className={'segmented glass' + (scroll ? ' segmented-scroll' : '')} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? 'seg-on' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
