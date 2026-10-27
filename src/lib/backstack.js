import { useEffect, useRef } from 'react'

// Makes the phone's Back button (and the back swipe) behave like a real app:
//   1. it closes the top-most open layer first (a sheet, a photo, a form...)
//   2. then it steps back through the screens (folder -> section -> tab -> Home)
//   3. only on the Home screen does it leave the app
//
// How: every open layer adds one browser-history entry, and a "base" entry sits under the
// app so that the first Back press lands on it instead of closing the app straight away.

const layers = [] // open layers, the last one is on top
let pushed = 0 // history entries added for the layers
let traveling = false // we asked the browser to go back and are waiting for it
let timer = null
let started = false
let rootHandler = () => false

function sync() {
  timer = null
  if (traveling) return
  if (pushed > layers.length) {
    const n = pushed - layers.length
    pushed = layers.length
    traveling = true
    // safety: never stay stuck if the browser does not report back
    setTimeout(() => {
      if (traveling) {
        traveling = false
        schedule()
      }
    }, 500)
    history.go(-n)
    return
  }
  while (pushed < layers.length) {
    history.pushState({ wardo: 'layer' }, '')
    pushed += 1
  }
}

function schedule() {
  if (!timer) timer = setTimeout(sync, 0)
}

function onPop() {
  if (traveling) {
    traveling = false
    schedule()
    return
  }
  if (layers.length > 0) {
    pushed = Math.max(0, pushed - 1)
    const top = layers.pop()
    top.close()
    return
  }
  // nothing is open, so we are standing on the base entry
  pushed = 0
  if (rootHandler()) {
    // a screen stepped back: put the app entry back so the next Back works again
    history.pushState({ wardo: 'app' }, '')
  } else {
    // already on Home: let the phone close the app
    history.back()
  }
}

// Call once. `handler` steps back one screen and returns true, or returns false when already on Home.
export function initBackStack(handler) {
  rootHandler = handler
  if (started) return
  started = true
  try {
    history.replaceState({ wardo: 'base' }, '')
    history.pushState({ wardo: 'app' }, '')
  } catch {
    /* history can be locked in some embedded browsers; Back then just behaves as before */
  }
  window.addEventListener('popstate', onPop)
}

function openLayer(close) {
  const layer = { close }
  layers.push(layer)
  schedule()
  return () => {
    const i = layers.indexOf(layer)
    if (i === -1) return // it was already closed by the Back button
    layers.splice(i, 1)
    schedule()
  }
}

// Put this in any sheet, popup or full-screen panel: Back will call onClose.
// Use `active` for panels that stay mounted and only slide in and out.
export function useBackClose(onClose, active = true) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!active) return undefined
    return openLayer(() => {
      if (ref.current) ref.current()
    })
  }, [active])
}
