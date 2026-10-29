import { describeWeather } from '../lib/weather.js'

// "Weather data by Open-Meteo.com", required by their free terms wherever the data is shown.
export function WeatherCredit() {
  return (
    <a className="weather-credit" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
      Weather data by Open-Meteo.com
    </a>
  )
}

// One day's weather in a small pill, like "⛅ 31°/22° · Rain 70%".
export default function WeatherChip({ w, stale = false }) {
  if (!w) return null
  const d = describeWeather(w.code)
  return (
    <span className="weather-chip" title={d.label}>
      {d.icon} {w.max}°/{w.min}°{w.rain >= 40 ? ` · Rain ${w.rain}%` : ''}
      {stale ? ' · old' : ''}
    </span>
  )
}
