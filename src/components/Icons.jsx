const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const HangerIcon = () => (
  <svg {...base}>
    <path d="M12 8.5V10M12 10 3.6 15.4a1.2 1.2 0 0 0 .7 2.2h15.4a1.2 1.2 0 0 0 .7-2.2L12 10Z" />
    <path d="M12 8.5a2.2 2.2 0 1 0-2.2-2.2" />
  </svg>
)

export const CalendarIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

export const PlusIcon = () => (
  <svg {...base} strokeWidth={2.4}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const InsightsIcon = () => (
  <svg {...base}>
    <path d="M5 20V12M12 20V5M19 20v-5" />
  </svg>
)

export const SettingsIcon = () => (
  <svg {...base}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
)

export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
  </svg>
)

export const MoonIcon = () => (
  <svg {...base}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
)

export const SnowIcon = () => (
  <svg {...base}>
    <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
    <path d="M9.5 4.5 12 6.5l2.5-2M9.5 19.5 12 17.5l2.5 2" />
  </svg>
)

export const InnerIcon = () => (
  <svg {...base}>
    <path d="M8 4 3.5 7l2 3.5L8 9.5V20h8V9.5l2.5 1 2-3.5L16 4a4 4 0 0 1-8 0Z" />
  </svg>
)

export const AccessoryIcon = () => (
  <svg {...base}>
    <circle cx="7" cy="14" r="3.5" />
    <circle cx="17" cy="14" r="3.5" />
    <path d="M10.5 14h3M3.5 14 5 8M20.5 14 19 8" />
  </svg>
)

export const ChevronLeftIcon = () => (
  <svg {...base} width={20} height={20} strokeWidth={2.2}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const SearchIcon = () => (
  <svg {...base} width={20} height={20}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4-4" />
  </svg>
)

export const FilterIcon = () => (
  <svg {...base} width={22} height={22}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
)

export const FolderIcon = () => (
  <svg {...base}>
    <path d="M3.5 7.5a2.5 2.5 0 0 1 2.5-2.5h3.2c.7 0 1.3.3 1.7.8l.9 1.2h5.7a2.5 2.5 0 0 1 2.5 2.5v7.5A2.5 2.5 0 0 1 17.5 19H6a2.5 2.5 0 0 1-2.5-2.5Z" />
  </svg>
)

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M4 11 12 4l8 7v8a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19v-8Z" />
  </svg>
)

export const UserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.9-3.6 4-5.4 7.5-5.4s6.6 1.8 7.5 5.4" />
  </svg>
)

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
)
