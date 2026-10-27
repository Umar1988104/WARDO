import { useEffect, useRef, useState } from 'react'
import { LockIcon } from './Icons.jsx'
import { tryPin, setPin, removePin } from '../lib/lock.js'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

// Full-screen number pad. onSubmit(pin) returns true (accepted), or text to show as the error.
export default function PinPad({ title, subtitle, onSubmit, onCancel, footer, length = 4 }) {
  const [digits, setDigits] = useState('')
  const [msg, setMsg] = useState('')
  const [shake, setShake] = useState(false)
  const busy = useRef(false)
  const digitsRef = useRef('')
  digitsRef.current = digits

  async function press(d) {
    if (busy.current || digitsRef.current.length >= length) return
    setMsg('')
    const next = digitsRef.current + d
    setDigits(next)
    if (next.length < length) return
    busy.current = true
    let res
    try {
      res = await onSubmit(next)
    } finally {
      busy.current = false
    }
    if (res === true) {
      setDigits('')
      return
    }
    setMsg(typeof res === 'string' ? res : 'Wrong PIN')
    setShake(true)
    setTimeout(() => {
      setShake(false)
      setDigits('')
    }, 450)
  }

  function del() {
    if (!busy.current) setDigits((d) => d.slice(0, -1))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') del()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pinpad" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pin-top">
        <div className="pin-lock">
          <LockIcon />
        </div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        <div className={'pin-dots' + (shake ? ' shake' : '')} aria-hidden="true">
          {Array.from({ length }).map((_, i) => (
            <i key={i} className={i < digits.length ? 'on' : ''} />
          ))}
        </div>
        <p className="pin-msg" aria-live="polite">
          {msg}
        </p>
      </div>
      <div className="pin-keys">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button key={i} type="button" className="pin-key" aria-label={k === 'del' ? 'Delete' : k} onClick={() => (k === 'del' ? del() : press(k))}>
              {k === 'del' ? '\u232B' : k}
            </button>
          )
        )}
      </div>
      <div className="pin-foot">
        {onCancel && (
          <button type="button" className="link-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        {footer}
      </div>
    </div>
  )
}

export const wrongPinText = (r) => (r.wait ? `Too many tries. Wait ${r.wait} seconds.` : 'Wrong PIN')

// "Forgot PIN?" can only erase everything, because the PIN cannot be recovered.
export function ForgotPin({ onReset }) {
  const [step, setStep] = useState(0)
  if (step === 0) {
    return (
      <button type="button" className="link-btn" onClick={() => setStep(1)}>
        Forgot PIN?
      </button>
    )
  }
  return (
    <div className="pin-forgot">
      <p className="muted">
        A forgotten PIN cannot be recovered. You can erase Wardo on this phone and then restore a backup file.
      </p>
      <button type="button" className={'btn-danger' + (step === 2 ? ' btn-danger-on' : '')} onClick={() => (step === 1 ? setStep(2) : onReset())}>
        {step === 1 ? 'Erase everything and reset' : 'Tap again: erase my wardrobe'}
      </button>
    </div>
  )
}

// Set, change or remove the PIN. mode: 'set' | 'change' | 'remove'
export function PinFlow({ mode, onClose, onDone }) {
  const [stage, setStage] = useState(mode === 'set' ? 'new' : 'old')
  const [first, setFirst] = useState('')
  const [note, setNote] = useState('')

  const titles = {
    old: ['Enter your PIN', mode === 'remove' ? 'To remove the PIN' : 'To change the PIN'],
    new: ['Choose a PIN', '4 digits'],
    confirm: ['Enter it again', 'To make sure it is right'],
  }

  async function submit(pin) {
    if (stage === 'old') {
      const r = await tryPin(pin)
      if (!r.ok) return wrongPinText(r)
      if (mode === 'remove') {
        removePin()
        onDone()
        return true
      }
      setStage('new')
      return true
    }
    if (stage === 'new') {
      setNote('')
      setFirst(pin)
      setStage('confirm')
      return true
    }
    if (pin !== first) {
      setNote('The PINs did not match. Try again.')
      setStage('new')
      return true
    }
    await setPin(pin)
    onDone()
    return true
  }

  return <PinPad key={stage} title={titles[stage][0]} subtitle={stage === 'new' && note ? note : titles[stage][1]} onSubmit={submit} onCancel={onClose} />
}
