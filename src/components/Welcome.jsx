import { HangerIcon } from './Icons.jsx'

// Shown once, the first time the app opens.
export default function Welcome({ onDone }) {
  return (
    <div className="welcome">
      <div className="welcome-hanger">
        <HangerIcon />
      </div>
      <h1>Wardo</h1>
      <p className="welcome-sub">Your wardrobe, smarter.</p>
      <p className="welcome-steps">Capture &nbsp;&bull;&nbsp; Organize &nbsp;&bull;&nbsp; Wear more</p>
      <button className="welcome-go" onClick={onDone}>
        Get started
      </button>
      <button className="welcome-skip" onClick={onDone}>
        I already use Wardo
      </button>
    </div>
  )
}
