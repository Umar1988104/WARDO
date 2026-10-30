import { useSyncExternalStore } from 'react'

// Look-and-feel and speed settings. Saved on the phone, applied before the app draws.
const KEY = 'wardo-prefs'

export const PRESETS = {
  fast: { motion: 'off', blur: 'off', liveBg: false },
  balanced: { motion: 'reduced', blur: 'light', liveBg: false },
  full: { motion: 'full', blur: 'full', liveBg: true },
}

// Theme packs: `light` is the accent in light mode, `dark` the brighter version for dark mode,
// `blobs` are the three soft colour clouds behind the app.
export const PACKS = {
  closetly: { label: 'Closetly', light: '#23796d', dark: '#6fd0bd', blobs: ['#ffb782', '#78dcc4', '#bea8ff'] },
  rose: { label: 'Rose', light: '#c2477a', dark: '#f08fb8', blobs: ['#ffc4a8', '#f2a6c8', '#c9b4ff'] },
  ocean: { label: 'Ocean', light: '#2b6cb0', dark: '#7ab8f5', blobs: ['#a8d8ff', '#8fe3e8', '#b8b4ff'] },
  sunset: { label: 'Sunset', light: '#d0561f', dark: '#ffa070', blobs: ['#ffd08a', '#ff9f8a', '#e9a8ff'] },
  lavender: { label: 'Lavender', light: '#7156c8', dark: '#b7a2ff', blobs: ['#d6c4ff', '#a8d8ff', '#ffc4e1'] },
  mono: { label: 'Black & White', light: '#111111', dark: '#ffffff', blobs: ['#d9d9d9', '#bdbdbd', '#ececec'] },
  graphite: { label: 'Graphite', light: '#3d4a52', dark: '#b8c4cc', blobs: ['#d8dde0', '#c4ccd2', '#e2d8d0'] },
}

export const ACCENTS = ['#0a0a0a', '#ffffff', '#23796d', '#c2477a', '#2b6cb0', '#d0561f', '#7156c8', '#b8860b', '#2f855a', '#3d4a52']

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
    pack: 'closetly',
    accent: null, // a custom colour (#rrggbb) or null for the pack colour
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
    if (saved && typeof saved === 'object') return { ...base, ...saved }
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

const VAR_KEYS = ['--on-accent', '--accent', '--accent-2', '--accent-grad', '--accent-deep', '--mint', '--hero-grad', '--blob-a', '--blob-b', '--blob-c', '--mesh']

const BLACK = '#0a0a0a'
const WHITE = '#ffffff'

// AMOLED has its own look: black and white. Choosing another pack or a custom accent still wins.
function effectivePack(p, amoled) {
  const pack = PACKS[p.pack] || PACKS.closetly
  return amoled && pack === PACKS.closetly && !p.accent ? PACKS.mono : pack
}

// Black and white themes need dark text on white buttons and white text on black ones.
export function isMono(p, amoled) {
  return effectivePack(p, amoled) === PACKS.mono || p.accent === BLACK || p.accent === WHITE
}

const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function themeVars(p, dark, amoled) {
  const pack = effectivePack(p, amoled)
  if (pack === PACKS.closetly && !p.accent && !amoled) return null // the stylesheet already has these

  // base for gradients. Same in light and dark like the original, except black & white, which flips so buttons stay visible
  let gb = p.accent || (pack === PACKS.mono && dark ? pack.dark : pack.light)
  if (dark && p.accent === BLACK) gb = '#2b2b2b' // a black accent on a dark page: charcoal with a light edge
  const base = dark ? (p.accent === BLACK ? '#c4c4c4' : p.accent ? mix(p.accent, '#ffffff', 0.35) : pack.dark) : gb
  const blobs = [...pack.blobs]
  if (p.accent) blobs[1] = mix(p.accent, '#ffffff', 0.5)
  const blob = (c, i) => (dark ? rgba(mix(c, '#000000', 0.35), [0.35, 0.4, 0.35][i]) : rgba(c, [0.65, 0.6, 0.5][i]))

  // AMOLED: no moving colour clouds, just a faint glow of the accent on pure black
  const glow = amoled
    ? { '--blob-a': rgba(base, 0.1), '--blob-b': rgba(mix(base, '#ffffff', 0.3), 0.05), '--blob-c': 'rgba(0, 0, 0, 0)' }
    : {}

  return {
    '--on-accent': luminance(gb) > 0.6 ? '#0a0a0a' : '#ffffff', // readable text on the accent colour
    '--accent': base,
    '--accent-2': mix(base, '#ffffff', 0.25),
    '--accent-grad': `linear-gradient(135deg, ${mix(gb, '#000000', 0.3)} 0%, ${gb} 55%, ${mix(gb, '#ffffff', 0.35)} 100%)`,
    '--accent-deep': mix(gb, '#000000', 0.3),
    '--mint': `linear-gradient(135deg, ${mix(gb, '#ffffff', 0.65)}, ${mix(gb, '#ffffff', 0.4)})`,
    '--hero-grad': `linear-gradient(120deg, ${mix(gb, '#000000', 0.5)}, ${gb}, ${mix(gb, '#ffffff', 0.35)}, ${gb})`,
    '--blob-a': blob(blobs[0], 0),
    '--blob-b': blob(blobs[1], 1),
    '--blob-c': blob(blobs[2], 2),
    '--mesh': dark
      ? 'none'
      : `radial-gradient(60% 40% at 0% 0%, ${rgba(blobs[0], 0.55)}, transparent 70%), radial-gradient(55% 38% at 100% 22%, ${rgba(blobs[1], 0.55)}, transparent 70%), radial-gradient(60% 42% at 20% 100%, ${rgba(blobs[2], 0.45)}, transparent 70%)`,
    ...glow,
  }
}

function storedTheme() {
  try {
    return localStorage.getItem('wardo-theme') || 'auto'
  } catch {
    return 'auto'
  }
}

// 'amoled' is a dark theme with pure black; the page gets data-theme="dark" plus data-amoled="on"
function isAmoled() {
  const el = document.documentElement
  return el.dataset.amoled ? el.dataset.amoled === 'on' : storedTheme() === 'amoled'
}

function isDark() {
  const t = document.documentElement.dataset.theme || storedTheme()
  if (t === 'dark' || t === 'amoled') return true
  if (t === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

let prefs = load()
const listeners = new Set()

// Writes the settings onto the page. Safe to call as often as needed.
export function applyPrefs() {
  const el = document.documentElement
  // first paint: apply the saved AMOLED look before the app has started, so there is no flash of another theme
  if (!el.dataset.amoled && storedTheme() === 'amoled') {
    el.dataset.amoled = 'on'
    el.dataset.theme = 'dark'
  }
  el.dataset.motion = prefs.motion
  el.dataset.blur = prefs.blur
  el.dataset.bg = prefs.liveBg ? 'on' : 'off'
  el.dataset.cols = String(prefs.cols)
  for (const k of VAR_KEYS) el.style.removeProperty(k)
  el.dataset.mono = isMono(prefs, isAmoled()) ? 'on' : 'off'
  const vars = themeVars(prefs, isDark(), isAmoled())
  if (vars) for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
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
  setPrefs({ pack: 'closetly', accent: null, motion: d.motion, blur: d.blur, liveBg: d.liveBg, cols: 2 })
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
