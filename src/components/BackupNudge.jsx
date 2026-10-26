import { useState } from 'react'
import { getLastBackup } from '../lib/backup.js'

const DAY = 86400000
const SNOOZE_KEY = 'wardo-nudge-until'

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) > Date.now()
  } catch {
    return false
  }
}

// A gentle reminder: your clothes live only on this phone, so keep a backup file somewhere safe.
export default function BackupNudge({ count, onOpen }) {
  const [hidden, setHidden] = useState(snoozed)
  const last = getLastBackup()
  const stale = !last || Date.now() - last > 30 * DAY

  if (hidden || count < 5 || !stale) return null

  function later() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * DAY))
    } catch {
      /* it will simply show again next time */
    }
    setHidden(true)
  }

  return (
    <section className="nudge glass">
      <div>
        <strong>Back up your wardrobe</strong>
        <p className="muted">
          {last ? 'It has been over a month since your last backup.' : 'Your clothes are stored only on this phone.'} A backup file
          keeps them safe if the phone is lost or reset.
        </p>
      </div>
      <div className="nudge-actions">
        <button className="pill pill-accent" onClick={onOpen}>
          Back up now
        </button>
        <button className="pill pill-quiet" onClick={later}>
          Later
        </button>
      </div>
    </section>
  )
}
