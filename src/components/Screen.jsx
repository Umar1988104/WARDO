import { useState } from 'react'
import { ChevronLeftIcon } from './Icons.jsx'

// Scrolling page with an iOS-style large title that collapses into a glass nav bar.
export default function Screen({ title, back, children }) {
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
    </main>
  )
}
