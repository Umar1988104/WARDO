// PIN lock. The PIN never leaves the phone and is stored only as a salted hash.
// This is a privacy screen against casual eyes, not encryption of the photos.

const PIN_KEY = 'wardo-pin'
const APP_KEY = 'wardo-lock-app'
const INNER_KEY = 'wardo-lock-inner'
const FAIL_KEY = 'wardo-pin-fails'

const get = (k) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const put = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* storage can be unavailable */
  }
}
const drop = (k) => {
  try {
    localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

// small non-crypto hash, only used when the browser has no crypto.subtle (plain http on a LAN)
function cyrb(str) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

async function hashPin(pin, salt, alg) {
  const text = salt + ':' + pin
  if (alg === 'sha256' && globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return cyrb(text)
}

export const hasPin = () => !!get(PIN_KEY)
export const getLockApp = () => get(APP_KEY) === '1'
export const getLockInner = () => get(INNER_KEY) === '1'
export const setLockApp = (on) => put(APP_KEY, on ? '1' : '0')
export const setLockInner = (on) => put(INNER_KEY, on ? '1' : '0')

export const readPrivacy = () => ({ pin: hasPin(), app: getLockApp(), inner: getLockInner() })

export async function setPin(pin) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const alg = globalThis.crypto?.subtle ? 'sha256' : 'cyrb'
  put(PIN_KEY, JSON.stringify({ salt, alg, hash: await hashPin(pin, salt, alg) }))
  drop(FAIL_KEY)
  if (get(INNER_KEY) === null) put(INNER_KEY, '1') // innerwear is hidden by default once a PIN exists
  if (get(APP_KEY) === null) put(APP_KEY, '0')
}

export function removePin() {
  ;[PIN_KEY, APP_KEY, INNER_KEY, FAIL_KEY].forEach(drop)
}

function readFails() {
  try {
    return { n: 0, until: 0, ...JSON.parse(get(FAIL_KEY) || '{}') }
  } catch {
    return { n: 0, until: 0 }
  }
}

// { ok } or { ok:false, wait } where wait > 0 means "too many tries, wait this many seconds"
export async function tryPin(pin) {
  const now = Date.now()
  const f = readFails()
  if (f.until > now) return { ok: false, wait: Math.ceil((f.until - now) / 1000) }
  let rec = null
  try {
    rec = JSON.parse(get(PIN_KEY) || 'null')
  } catch {
    rec = null
  }
  if (!rec) return { ok: true }
  if ((await hashPin(pin, rec.salt, rec.alg)) === rec.hash) {
    put(FAIL_KEY, JSON.stringify({ n: 0, until: 0 }))
    return { ok: true }
  }
  const n = f.n + 1
  const until = n >= 5 ? now + 30000 * Math.pow(2, Math.min(n - 5, 5)) : 0
  put(FAIL_KEY, JSON.stringify({ n, until }))
  return { ok: false, wait: until ? Math.ceil((until - now) / 1000) : 0 }
}
