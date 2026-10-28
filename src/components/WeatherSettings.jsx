import { useState } from 'react'
import Switch from './Switch.jsx'
import { setPrefs, usePrefs } from '../lib/prefs.js'
import { searchPlace } from '../lib/weather.js'

// Profile group for the optional weather. Off until switched on, because it is the one thing that goes online.
export default function WeatherSettings() {
  const p = usePrefs()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function find(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const found = await searchPlace(query)
      setResults(found)
      if (found.length === 0) setMsg('No place found. Try the city name only.')
    } catch {
      setMsg('Could not search. Check your internet and try again.')
    }
    setBusy(false)
  }

  function choose(place) {
    setPrefs({ place })
    setResults(null)
    setQuery('')
    setMsg('')
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg('Location is not available on this phone.')
    setBusy(true)
    setMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // rounded, so only the area is stored, not an exact spot
        choose({ name: 'My location', lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 })
        setBusy(false)
      },
      () => {
        setMsg('Could not get your location. You can search for your city instead.')
        setBusy(false)
      },
      { timeout: 10000, maximumAge: 600000 }
    )
  }

  return (
    <>
      <Switch
        label="Weather suggestions"
        hint="Picks warmer or lighter pieces from the forecast"
        on={p.weatherOn}
        onChange={(v) => setPrefs({ weatherOn: v })}
      />
      <p className="muted group-note">
        Needs internet. When on, only your city's coordinates go to Open-Meteo, a free weather service with no account. Your clothes and photos never leave your phone.
      </p>

      {p.weatherOn && (
        <>
          <div className="row">
            <span>Place</span>
            <span className="muted">{p.place?.name || 'Not set'}</span>
          </div>
          <form className="weather-search" onSubmit={find}>
            <input
              type="text"
              value={query}
              placeholder="Search your city"
              aria-label="Search your city"
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="pill pill-accent" type="submit" disabled={busy || query.trim().length < 2}>
              Search
            </button>
          </form>
          <div className="group-buttons">
            <button className="pill" type="button" onClick={useMyLocation} disabled={busy}>
              Use my location
            </button>
          </div>
          {msg && <p className="notice">{msg}</p>}
          {results && results.length > 0 && (
            <div className="weather-results">
              {results.map((r) => (
                <button key={`${r.lat},${r.lon}`} className="move-row" onClick={() => choose(r)}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
