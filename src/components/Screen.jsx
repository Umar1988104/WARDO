import { useState } from 'react'
import { ChevronLeftIcon } from './Icons.jsx'

// Scrolling page with an iOS-style large title that collapses into a glass nav bar.
// `overlays` (sheets, pickers) are drawn outside the animated body, so the page's entrance
// animation can never force a closed sheet open.
export default function Screen({ title, back, children, overlays = null }) {
  const [scrolled, setScrolled] = useState(false)

  return (
    <main className="screen" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 36)}>
      <header className={'navbar glass' + (scrolled ? ' navbar-on' : '')}>
        <span>{title}</span>
      </header>
      <div className="top-row">
        {back && (
          <button className="back glass" onClick={back.onClick}>
            <ChevronLeftIcon />
            {back.label}
          </button>
        )}
      </div>
      <h1 className="large-title">{title}</h1>
      <div className="screen-body">{children}</div>
      {overlays}
    </main>
  )
}
