import Screen from '../components/Screen.jsx'

export default function Insights({ itemCount = 0 }) {
  const stats = [
    { label: 'Items', value: itemCount },
    { label: 'Outfits planned', value: 0 },
    { label: 'Not worn lately', value: 0 },
  ]

  return (
    <Screen title="Insights">
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat glass">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="empty glass">
        <h2>Forgotten clothes will show up here</h2>
        <p className="muted">
          Wardo tracks what you wear, so you can rediscover the pieces you haven't touched in weeks.
        </p>
      </div>
    </Screen>
  )
}
