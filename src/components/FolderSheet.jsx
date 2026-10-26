import { useState } from 'react'

// Small sheet to name a new folder, or rename / delete an existing one.
// Mounted only while it is needed, so the name box always starts fresh.
export default function FolderSheet({ title, initial = '', cta = 'Save', takenNames = [], onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return setError('Give the folder a name.')
    if (clean.toLowerCase() !== initial.toLowerCase() && takenNames.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      return setError('You already have a folder with this name here.')
    }
    setBusy(true)
    try {
      await onSave(clean)
    } catch (err) {
      console.error(err)
      setError('Could not save the folder. Try again.')
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
              maxLength={24}
              autoFocus
              autoComplete="off"
              placeholder="Jeans, Gym wear, Formal..."
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
