import { useState } from 'react'
import { useBackClose } from '../lib/backstack.js'

// Small sheet to name a new folder, or rename / delete an existing one.
// Mounted only while it is needed, so the name box always starts fresh.
export default function FolderSheet({
  title,
  initial = '',
  cta = 'Save',
  takenNames = [],
  noun = 'folder',
  placeholder = 'Jeans, Gym wear, Formal...',
  maxLength = 24,
  onClose,
  onSave,
  onDelete,
}) {
  useBackClose(onClose)
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return setError(`Give the ${noun} a name.`)
    if (clean.toLowerCase() !== initial.toLowerCase() && takenNames.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      return setError(`You already have a ${noun} with this name.`)
    }
    setBusy(true)
    try {
      await onSave(clean)
    } catch (err) {
      console.error(err)
      setError(`Could not save the ${noun}. Try again.`)
      setBusy(false)
    }
  }

  return (
    <>
      <div className="scrim scrim-on scrim-over" onClick={onClose} />
      <section className="sheet sheet-on sheet-over sheet-pop glass" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <h2>{title}</h2>
        <form className="sheet-form" onSubmit={submit}>
          <label className="field">
            <input
              type="text"
              value={name}
              maxLength={maxLength}
              autoFocus
              autoComplete="off"
              placeholder={placeholder}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
            />
          </label>
          {error && <p className="notice">{error}</p>}
          <button className="btn-primary btn-wide" type="submit" disabled={busy}>
            {cta}
          </button>
          {onDelete && (
            <button
              type="button"
              className={'btn-danger' + (confirm ? ' btn-danger-on' : '')}
              onClick={() => (confirm ? onDelete() : setConfirm(true))}
            >
              {confirm ? 'Tap again: delete folder, keep clothes' : 'Delete folder'}
            </button>
          )}
          <button type="button" className="link-btn" onClick={onClose}>
            Cancel
          </button>
        </form>
      </section>
    </>
  )
}
