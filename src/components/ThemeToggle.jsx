import { SunIcon, MoonIcon } from './Icons.jsx'

export function isDarkNow(theme) {
  if (theme === 'dark' || theme === 'amoled') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Always-visible quick switch. Settings still offers Auto / Light / Dark / AMOLED.
// From light it goes back to whichever dark style you used last.
export default function ThemeToggle({ theme, setTheme }) {
  const dark = isDarkNow(theme)
  return (
    <button
      className="theme-toggle glass"
      onClick={() => {
        let last = 'dark'
        try {
          last = localStorage.getItem('wardo-last-dark') === 'amoled' ? 'amoled' : 'dark'
        } catch {
          /* default dark */
        }
        setTheme(dark ? 'light' : last)
      }}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
