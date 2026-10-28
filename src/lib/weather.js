import { useEffect, useState } from 'react'
import { usePrefs } from './prefs.js'

// Optional weather from Open-Meteo (free, no account). It is OFF until the person turns it on in
// Profile, and then it sends only the chosen place's coordinates. The forecast is cached on the
// phone, so the app still shows the last forecast when offline.

const CACHE_KEY = 'wardo-weather'
const MAX_AGE = 3 * 60 * 60 * 1000 // refresh after 3 hours

export async function searchPlace(query) {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Search failed')
  const data = await res.json()
  return (data.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }))
}

async function fetchDays(place) {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '16',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Forecast failed')
  const d = (await res.json()).daily
  const days = {}
  d.time.forEach((date, i) => {
    days[date] = {
      max: Math.round(d.temperature_2m_max[i]),
      min: Math.round(d.temperature_2m_min[i]),
      rain: d.precipitation_probability_max?.[i] ?? 0,
      code: d.weather_code[i],
    }
  })
  return days
}

function readCache(place) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (c && c.lat === place.lat && c.lon === place.lon && c.days) return c
  } catch {
    /* no cache */
  }
  return null
}

// WMO weather code -> a small icon and a plain word
export function describeWeather(code) {
  if (code === 0) return { icon: '☀️', label: 'Clear' }
  if (code <= 2) return { icon: '⛅', label: 'Partly cloudy' }
  if (code === 3) return { icon: '☁️', label: 'Cloudy' }
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Fog' }
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Drizzle' }
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Rain' }
  if (code >= 71 && code <= 77) return { icon: '❄️', label: 'Snow' }
  if (code >= 80 && code <= 82) return { icon: '🌦️', label: 'Showers' }
  if (code >= 85 && code <= 86) return { icon: '❄️', label: 'Snow showers' }
  if (code >= 95) return { icon: '⛈️', label: 'Thunderstorm' }
  return { icon: '🌡️', label: '' }
}

// Returns { days: { 'YYYY-MM-DD': {max, min, rain, code} }, place, stale } or null when weather is off.
export function useWeather() {
  const { weatherOn, place } = usePrefs()
  const [state, setState] = useState(null)
  const lat = place?.lat
  const lon = place?.lon

  useEffect(() => {
    if (!weatherOn || lat == null || lon == null) {
      setState(null)
      return undefined
    }
    const p = { name: place.name, lat, lon }
    let alive = true

    async function load() {
      const cached = readCache(p)
      if (cached && alive) setState({ days: cached.days, place: p, stale: Date.now() - cached.at > MAX_AGE })
      if (cached && Date.now() - cached.at < MAX_AGE) return
      try {
        const days = await fetchDays(p)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, at: Date.now(), days }))
        } catch {
          /* it just will not be kept for offline */
        }
        if (alive) setState({ days, place: p, stale: false })
      } catch {
        // offline or the service is down: keep showing the last forecast, marked as old
        if (alive && !cached) setState({ days: {}, place: p, stale: true })
      }
    }

    load()
    const onShow = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [weatherOn, lat, lon, place?.name])

  return state
}
