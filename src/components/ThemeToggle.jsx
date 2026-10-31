import { SunIcon, MoonIcon } from './Icons.jsx'

export function isDarkNow(theme) {
  if (theme === 'dark' || theme === 'amoled') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Always-visible quick switch between light and dark. Settings also offers Auto.
export default function ThemeToggle({ theme, setTheme }) {
  const dark = isDarkNow(theme)
  return (
    <button
      className="theme-toggle glass"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
