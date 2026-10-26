import Screen from '../components/Screen.jsx'

function dayLabel(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return {
    week: d.toLocaleDateString(undefined, { weekday: 'short' }),
    num: d.getDate(),
  }
}

export default function Planner() {
  const days = [0, 1, 2, 3, 4, 5, 6].map(dayLabel)

  return (
    <Screen title="Planner">
      <div className="week glass">
        {days.map((d, i) => (
          <div key={i} className={'week-day' + (i === 1 ? ' week-day-on' : '')}>
            <span>{d.week}</span>
            <strong>{d.num}</strong>
          </div>
        ))}
      </div>

      <div className="empty glass">
        <h2>Nothing planned for tomorrow</h2>
        <p className="muted">Once your wardrobe has clothes, you can pick tomorrow's outfit here.</p>
      </div>
    </Screen>
  )
}
