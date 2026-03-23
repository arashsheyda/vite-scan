import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app)
  throw new Error('Missing #app root')

app.innerHTML = `
  <main class="page">
    <header class="hero">
      <p class="eyebrow">Vanilla example</p>
      <h1>Baseline raw DOM churn</h1>
      <p class="copy">
        No framework — just direct <code>innerHTML</code> updates so you can see how
        <strong>Vite Scan</strong> behaves without any virtual DOM in the way.
      </p>
    </header>

    <section class="toolbar">
      <button id="shuffle" type="button">Shuffle cards</button>
      <button id="burst" type="button">Burst updates</button>
      <button id="autopilot" type="button" class="secondary">Start autopilot</button>
    </section>

    <section id="grid" class="stack"></section>
  </main>
`

const grid = document.getElementById('grid') as HTMLDivElement
const shuffleButton = document.getElementById('shuffle') as HTMLButtonElement
const burstButton = document.getElementById('burst') as HTMLButtonElement
const autopilotButton = document.getElementById('autopilot') as HTMLButtonElement

let counter = 0
let autopilotTimer: number | undefined

function renderCards(): void {
  const cards = Array.from({ length: 18 }, (_, index) => {
    const rate = Math.abs(Math.sin((index + 1 + counter) * 0.43)) * 100
    const drift = Math.cos((counter + index) * 0.31)
    return `<article class="panel"><span class="label">Node ${index + 1}</span><strong>${rate.toFixed(1)}%</strong><p>Drift ${drift.toFixed(3)}</p></article>`
  })
  grid.innerHTML = cards.join('')
}

shuffleButton.addEventListener('click', () => {
  counter += 1
  renderCards()
})

burstButton.addEventListener('click', () => {
  let ticks = 0
  const timer = window.setInterval(() => {
    counter += 1
    renderCards()
    ticks += 1
    if (ticks >= 20)
      window.clearInterval(timer)
  }, 75)
})

autopilotButton.addEventListener('click', () => {
  if (autopilotTimer != null) {
    window.clearInterval(autopilotTimer)
    autopilotTimer = undefined
    autopilotButton.textContent = 'Start autopilot'
    autopilotButton.classList.remove('active')
  }
  else {
    autopilotTimer = window.setInterval(() => {
      counter += 1
      renderCards()
    }, 230)
    autopilotButton.textContent = 'Stop autopilot'
    autopilotButton.classList.add('active')
  }
})

window.addEventListener('pagehide', () => {
  if (autopilotTimer != null)
    window.clearInterval(autopilotTimer)
})

renderCards()
