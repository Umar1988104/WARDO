// Small white icons for the coloured squares in Profile.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const PaletteIcon = () => (
  <svg {...base}>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1" fill="currentColor" />
    <circle cx="10" cy="7" r="1" fill="currentColor" />
    <circle cx="15" cy="7.5" r="1" fill="currentColor" />
  </svg>
)

export const BoltIcon = () => (
  <svg {...base}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
)

export const CloudIcon = () => (
  <svg {...base}>
    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5a3.75 3.75 0 0 1-.5 7.5H7z" />
  </svg>
)

export const HangerIcon = () => (
  <svg {...base}>
    <path d="M12 7.5a2.2 2.2 0 1 0-2.2-2.2M12 7.5v2.2M12 9.7 3 16.5a1.3 1.3 0 0 0 .8 2.3h16.4a1.3 1.3 0 0 0 .8-2.3L12 9.7z" />
  </svg>
)

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const ArchiveIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="5" rx="1.5" />
    <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
  </svg>
)

export const InfoIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
  </svg>
)

export const PencilIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3zM14 7l3 3" />
  </svg>
)
