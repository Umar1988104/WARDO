import { useSyncExternalStore } from 'react'

// Look-and-feel and speed settings. Saved on the phone, applied before the app draws.
const KEY = 'wardo-prefs'

export const PRESETS = {
  fast: { motion: 'off', blur: 'off', liveBg: false },
  balanced: { motion: 'reduced', blur: 'light', liveBg: false },
  full: { motion: 'full', blur: 'full', liveBg: true },
}

// One flat accent colour, like a system accent. `light` and `dark` are the shades for each theme.
// "Black & white" is black on the light theme and white on the dark theme, so it always stays visible.
export const ACCENTS = [
  { id: 'blue', name: 'Blue', light: '#007aff', dark: '#0a84ff' },
  { id: 'purple', name: 'Purple', light: '#af52de', dark: '#bf5af2' },
  { id: 'green', name: 'Green', light: '#34c759', dark: '#30d158' },
  { id: 'orange', name: 'Orange', light: '#ff9500', dark: '#ff9f0a' },
  { id: 'pink', name: 'Pink', light: '#ff2d92', dark: '#ff4fa3' },
  { id: 'teal', name: 'Teal', light: '#30b0c7', dark: '#40c8e0' },
  { id: 'mono', name: 'Black & white', light: '#000000', dark: '#ffffff' },
]

export function accentName(accent) {
  if (!accent) return 'Blue'
  return ACCENTS.find((a) => a.id === accent)?.name || 'Custom'
}

function lowEndPhone() {
  try {
    const cores = navigator.hardwareConcurrency || 8
    const mem = navigator.deviceMemory || 8
    return cores <= 4 || mem <= 3
  } catch {
    return false
  }
}

function defaults() {
  return {
    ...PRESETS[lowEndPhone() ? 'fast' : 'balanced'],
    accent: 'blue', // an id from ACCENTS, or a custom colour (#rrggbb)
    name: '',
    title: '',
    cols: 2,
    startTab: 'home',
    haptics: true,
    currency: '₹',
    view: 'grid', // 'grid' or 'rail' (hanger rails)
    autoLaundry: false, // wearing a piece sends it to the laundry
    weatherOn: false, // off until the person turns it on: it is the only thing that goes online
    place: null, // { name, lat, lon }
  }
}

function load() {
  const base = defaults()
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...base, ...saved, accent: saved.accent || 'blue' } // older installs saved no accent
  } catch {
    /* start from the defaults */
  }
  return base
}

// ---------- colour helpers ----------
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
function rgb(hex) {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}
function hex([r, g, b]) {
  return '#' + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')
}
function mix(a, b, t) {
  const x = rgb(a)
  const y = rgb(b)
  return hex(x.map((v, i) => v + (y[i] - v) * t))
}
const rgba = (c, a) => {
  const [r, g, b] = rgb(c)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const VAR_KEYS = ['--on-accent', '--accent', '--accent-2', '--accent-grad', '--mint']

const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// the accent colour for the current theme: an id from the list, or a custom hex colour
function accentColor(accent, dark) {
  const entry = ACCENTS.find((a) => a.id === accent)
  if (entry) return dark ? entry.dark : entry.light
  if (typeof accent === 'string' && /^#[0-9a-f]{6}$/i.test(accent)) return dark ? mix(accent, '#ffffff', 0.25) : accent
  return dark ? ACCENTS[0].dark : ACCENTS[0].light
}

function storedTheme() {
  try {
    return localStorage.getItem('wardo-theme') || 'auto'
  } catch {
    return 'auto'
  }
}

function isDark() {
  const t = document.documentElement.dataset.theme || storedTheme()
  if (t === 'dark' || t === 'amoled') return true // 'amoled' is an old name for the black dark theme
  if (t === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

let prefs = load()
const listeners = new Set()

// Writes the settings onto the page. Safe to call as often as needed.
export function applyPrefs() {
  const el = document.documentElement
  el.dataset.motion = prefs.motion
  el.dataset.blur = prefs.blur
  el.dataset.bg = prefs.liveBg ? 'on' : 'off'
  el.dataset.cols = String(prefs.cols)
  el.dataset.amoled = 'off' // dark is always pure black now
  el.dataset.mono = 'off'
  for (const k of VAR_KEYS) el.style.removeProperty(k)
  const colour = accentColor(prefs.accent, isDark())
  el.style.setProperty('--accent', colour)
  el.style.setProperty('--accent-2', colour)
  el.style.setProperty('--accent-grad', colour) // flat: no gradients
  el.style.setProperty('--mint', colour)
  el.style.setProperty('--on-accent', luminance(colour) > 0.6 ? '#000000' : '#ffffff') // readable text on the accent
}

export function getPrefs() {
  return prefs
}

export function setPrefs(patch) {
  prefs = { ...prefs, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* it just will not be remembered */
  }
  applyPrefs()
  listeners.forEach((l) => l())
}

export function resetLook() {
  const d = defaults()
  setPrefs({ accent: 'blue', motion: d.motion, blur: d.blur, liveBg: d.liveBg, cols: 2 })
}

// which speed preset the current settings match, or 'custom'
export function currentPreset(p) {
  for (const [name, v] of Object.entries(PRESETS)) {
    if (p.motion === v.motion && p.blur === v.blur && p.liveBg === v.liveBg) return name
  }
  return 'custom'
}

export function usePrefs() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getPrefs
  )
}

// a tiny tap buzz on Android, if switched on
export function buzz(ms = 8) {
  if (prefs.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(ms)
}

// follow the phone when the theme is "Auto"
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs)
} catch {
  /* older browsers: the colours refresh on the next change */
}

applyPrefs()
