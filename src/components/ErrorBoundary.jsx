import { Component } from 'react'

// If something unexpected breaks the screen, show a calm message instead of a blank page.
// The photos and data are stored separately on the phone, so reloading never loses them.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Wardo crashed:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="crash">
        <h1>Something went wrong</h1>
        <p>Your clothes and photos are safe on this phone. Reload Wardo to carry on.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Reload Wardo
        </button>
      </div>
    )
  }
}
