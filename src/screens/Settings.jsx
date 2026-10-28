import { useEffect, useRef, useState } from 'react'
import Screen from '../components/Screen.jsx'
import LookAndFeel from '../components/LookAndFeel.jsx'
import Switch from '../components/Switch.jsx'
import { PinFlow } from '../components/PinPad.jsx'
import { setLockApp, setLockInner } from '../lib/lock.js'
import {
  buildBackup,
  backupFileName,
  downloadBlob,
  canShareFile,
  shareBlob,
  getLastBackup,
  readBackup,
  restoreReplace,
  restoreMerge,
} from '../lib/backup.js'

const mb = (bytes) => (bytes / 1048576 >= 10 ? Math.round(bytes / 1048576) : Math.round((bytes / 1048576) * 10) / 10)
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export default function Settings({ theme, setTheme, itemCount, actions, privacy, onPrivacyChange }) {
  const [flow, setFlow] = useState(null) // 'set' | 'change' | 'remove'
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(null) // 'save' | 'share' | 'read' | 'restore'
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null) // data read from a chosen backup file
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [lastBackup, setLastBackup] = useState(getLastBackup)
  const [storage, setStorage] = useState({ usage: null, persisted: null })

  async function loadStorage() {
    try {
      const est = await navigator.storage?.estimate?.()
      const persisted = await navigator.storage?.persisted?.()
      setStorage({ usage: est?.usage ?? null, persisted: persisted ?? null })
    } catch {
      /* storage details are optional */
    }
  }

  useEffect(() => {
    loadStorage()
  }, [])

  function reset() {
    setMessage('')
    setError('')
  }

  async function makeFile() {
    const blob = await buildBackup()
    return { blob, name: backupFileName() }
  }

  async function saveFile() {
    reset()
    setBusy('save')
    try {
      const { blob, name } = await makeFile()
      downloadBlob(blob, name)
      setLastBackup(getLastBackup())
      setMessage(`Saved ${name} (${mb(blob.size)} MB). Keep it somewhere safe, like Google Drive or your computer.`)
    } catch (err) {
      console.error(err)
      setError('Could not create the backup. Your wardrobe is untouched.')
    } finally {
      setBusy(null)
    }
  }

  async function shareFile() {
    reset()
    setBusy('share')
    try {
      const { blob, name } = await makeFile()
      if (!canShareFile(blob, name)) {
        downloadBlob(blob, name)
        setMessage('Sharing is not available here, so the file was saved instead.')
      } else {
        await shareBlob(blob, name)
        setMessage('Backup shared.')
      }
      setLastBackup(getLastBackup())
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error(err)
        setError('Could not share the backup. Try Save backup file instead.')
      }
    } finally {
      setBusy(null)
    }
  }

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    reset()
    setPreview(null)
    setConfirmReplace(false)
    setBusy('read')
    try {
      setPreview(await readBackup(file))
    } catch (err) {
      setError(err?.message || 'Could not read this file.')
    } finally {
      setBusy(null)
    }
  }

  async function restore(mode) {
    if (mode === 'replace' && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setBusy('restore')
    reset()
    try {
      const result = mode === 'replace' ? await restoreReplace(preview) : await restoreMerge(preview)
      await actions.refresh()
      setPreview(null)
      setConfirmReplace(false)
      setMessage(
        mode === 'replace'
          ? `Restored ${result.added} ${result.added === 1 ? 'piece' : 'pieces'}.`
          : `Added ${result.added} new ${result.added === 1 ? 'piece' : 'pieces'}${result.skipped ? ` (${result.skipped} already here)` : ''}.`
      )
      loadStorage()
    } catch (err) {
      console.error(err)
      setError('Could not restore this backup. Nothing was changed.')
    } finally {
      setBusy(null)
    }
  }

  async function protect() {
    try {
      await navigator.storage?.persist?.()
    } finally {
      loadStorage()
    }
  }

  const offline =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? navigator.serviceWorker.controller
        ? 'Ready (cutout model works offline after its first download)'
        : 'Getting ready, reopen the app once'
      : 'Not supported here'

  const canPersist = typeof navigator !== 'undefined' && !!navigator.storage?.persist

  return (
    <Screen
      title="Profile"
      overlays={
          flow && (
            <PinFlow
              mode={flow}
              onClose={() => setFlow(null)}
              onDone={() => {
                setFlow(null)
                onPrivacyChange()
              }}
            />
          )
      }
    >
      <LookAndFeel theme={theme} setTheme={setTheme} />

      <section className="group glass">
        <div className="row">
          <span>Privacy</span>
          <span className="muted">{privacy.pin ? 'PIN is on' : 'No PIN'}</span>
        </div>
        <p className="muted group-note">
          A PIN keeps casual eyes out, and can hide your Innerwear section. Photos on the phone are not encrypted, and backup files are not locked.
        </p>
        {!privacy.pin ? (
          <div className="group-buttons">
            <button className="btn-primary" onClick={() => setFlow('set')}>
              Set a PIN
            </button>
          </div>
        ) : (
          <>
            <Switch
              label="Hide Innerwear until unlocked"
              hint="Also kept out of search, suggestions and insights"
              on={privacy.inner}
              onChange={(v) => {
                setLockInner(v)
                onPrivacyChange()
              }}
            />
            <Switch
              label="Ask for the PIN when Wardo opens"
              on={privacy.app}
              onChange={(v) => {
                setLockApp(v)
                onPrivacyChange()
              }}
            />
            <div className="group-buttons">
              <button className="pill" onClick={() => setFlow('change')}>
                Change PIN
              </button>
              <button className="pill" onClick={() => setFlow('remove')}>
                Remove PIN
              </button>
            </div>
          </>
        )}
      </section>

      <section className="group glass">
        <div className="row">
          <span>Backup and restore</span>
        </div>
        <p className="muted group-note">
          Everything stays on this phone. A backup file holds all your clothes, folders, wear history and outfits.
        </p>
        <div className="row">
          <span>Last backup</span>
          <span className="muted">{lastBackup ? fmtDate(lastBackup) : 'Never'}</span>
        </div>
        <div className="group-buttons">
          <button className="btn-primary" onClick={saveFile} disabled={!!busy || itemCount === 0}>
            {busy === 'save' ? 'Preparing...' : 'Save backup file'}
          </button>
          <button className="pill" onClick={shareFile} disabled={!!busy || itemCount === 0}>
            {busy === 'share' ? 'Preparing...' : 'Share...'}
          </button>
          <button className="pill" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'read' ? 'Reading...' : 'Restore from file'}
          </button>
        </div>
        {itemCount === 0 && <p className="muted group-note">Add a piece first, then you can make a backup.</p>}
        <input ref={fileRef} type="file" hidden onChange={onPick} />

        {message && <p className="notice group-note">{message}</p>}
        {error && <p className="notice group-note">{error}</p>}

        {preview && (
          <div className="restore-box">
            <strong>Backup found</strong>
            <p className="muted">
              {preview.createdAt ? `Made on ${fmtDate(preview.createdAt)}. ` : ''}
              {preview.items.length} {preview.items.length === 1 ? 'piece' : 'pieces'}, {preview.folders.length}{' '}
              {preview.folders.length === 1 ? 'folder' : 'folders'}, {preview.outfits.length}{' '}
              {preview.outfits.length === 1 ? 'outfit' : 'outfits'}.
            </p>
            <div className="group-buttons">
              <button className="btn-primary" disabled={!!busy} onClick={() => restore('merge')}>
                Add to my wardrobe
              </button>
              <button
                className={'btn-danger' + (confirmReplace ? ' btn-danger-on' : '')}
                disabled={!!busy}
                onClick={() => restore('replace')}
              >
                {confirmReplace ? 'Tap again: replace everything' : 'Replace my wardrobe'}
              </button>
              <button
                className="link-btn"
                disabled={!!busy}
                onClick={() => {
                  setPreview(null)
                  setConfirmReplace(false)
                }}
              >
                Cancel
              </button>
            </div>
            <p className="muted small">Add skips pieces that are already here. Replace erases what is on this phone first.</p>
          </div>
        )}
      </section>

      <section className="group glass">
        <div className="row">
          <span>Storage</span>
          <span className="muted">{storage.usage != null ? `${mb(storage.usage)} MB used` : 'Unknown'}</span>
        </div>
        <div className="row">
          <span>Protected from auto-clean</span>
          <span className="muted">{storage.persisted == null ? 'Unknown' : storage.persisted ? 'Yes' : 'Not yet'}</span>
        </div>
        {canPersist && storage.persisted === false && (
          <div className="group-buttons">
            <button className="pill" onClick={protect}>
              Ask the phone to keep my data
            </button>
          </div>
        )}
        <div className="row">
          <span>Offline use</span>
          <span className="muted">{offline}</span>
        </div>
        <div className="row">
          <span>Your data</span>
          <span className="muted">Stays on this phone</span>
        </div>
        <div className="row">
          <span>Version</span>
          <span className="muted">Wardo 0.11.0</span>
        </div>
      </section>
    </Screen>
  )
}
