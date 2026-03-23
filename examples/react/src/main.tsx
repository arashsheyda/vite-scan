import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function createCards(seed: number) {
  return Array.from({ length: 18 }, (_, index) => {
    const wave = Math.sin((index + 1 + seed) * 0.42)
    const load = Math.abs(Math.cos((seed + index) * 0.33)) * 100
    return {
      id: index + 1,
      label: `Component ${index + 1}`,
      wave,
      load: load.toFixed(1),
    }
  })
}

function App() {
  const [seed, setSeed] = useState(0)
  const [autopilot, setAutopilot] = useState(false)
  const cards = createCards(seed)

  useEffect(() => {
    if (!autopilot)
      return

    const timer = window.setInterval(() => {
      setSeed(current => current + 1)
    }, 220)

    return () => window.clearInterval(timer)
  }, [autopilot])

  function burstUpdates() {
    let ticks = 0
    const timer = window.setInterval(() => {
      setSeed(current => current + 1)
      ticks += 1
      if (ticks >= 20)
        window.clearInterval(timer)
    }, 70)
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">React example</p>
        <h1>Track fast component churn</h1>
        <p className="copy">
          Toggle steady rerenders or fire a burst, then run <strong>Vite Scan</strong> from DevTools.
        </p>
      </header>

      <section className="toolbar">
        <button type="button" onClick={() => setSeed(current => current + 1)}>
          Shuffle state
        </button>
        <button type="button" onClick={burstUpdates}>
          Burst updates
        </button>
        <button type="button" className={autopilot ? 'secondary active' : 'secondary'} onClick={() => setAutopilot(value => !value)}>
          {autopilot ? 'Stop autopilot' : 'Start autopilot'}
        </button>
      </section>

      <section className="grid">
        {cards.map(card => (
          <article key={card.id} className="card">
            <span className="chip">{card.label}</span>
            <strong>{card.load}%</strong>
            <p>Wave {card.wave.toFixed(3)}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

const container = document.getElementById('app')

if (!container)
  throw new Error('Missing #app root')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)