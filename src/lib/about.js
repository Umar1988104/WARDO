// Where the source code lives. On GitHub Pages the address itself tells us the repository,
// so nothing has to be typed in. Anywhere else there is no link.
export function sourceUrl() {
  try {
    const host = window.location.hostname
    if (!host.endsWith('.github.io')) return null
    const user = host.split('.')[0]
    const repo = window.location.pathname.split('/').filter(Boolean)[0]
    return user && repo ? `https://github.com/${user}/${repo}` : null
  } catch {
    return null
  }
}

export const APP_VERSION = '1.1.1'

// open-source parts, shown in Profile > Storage and about
export const CREDITS = [
  { name: 'React', licence: 'MIT', url: 'https://react.dev' },
  { name: 'Dexie', licence: 'Apache-2.0', url: 'https://dexie.org' },
  { name: '@imgly/background-removal', licence: 'AGPL-3.0', url: 'https://github.com/imgly/background-removal-js' },
  { name: 'Vite and vite-plugin-pwa', licence: 'MIT', url: 'https://vite.dev' },
]
