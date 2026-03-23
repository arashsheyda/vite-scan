import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app)
  throw new Error('Missing #app root')

app.innerHTML = `
  <main class="page">
    <h1>vite-scan Playground</h1>
    <p>Use the controls below, then run <strong>Vite Scan</strong> from DevTools.</p>
    <div class="controls">
      <button id="shuffle">Shuffle Cards</button>
      <button id="burst">Burst Updates</button>
    </div>
    <section id="grid" class="grid"></section>
  </main>
`

const grid = document.getElementById('grid')
const shuffleButton = document.getElementById('shuffle')
const burstButton = document.getElementById('burst')

if (!grid || !shuffleButton || !burstButton)
  throw new Error('Missing controls or grid')

const safeGrid = grid as HTMLDivElement
const safeShuffleButton = shuffleButton as HTMLButtonElement
const safeBurstButton = burstButton as HTMLButtonElement

let counter = 0

function renderCards() {
  const cards = Array.from({ length: 24 }, (_, index) => {
    const value = Math.sin((index + 1 + counter) * 0.43) * 100
    return `<article class="card"><h3>Card ${index + 1}</h3><p>${value.toFixed(2)}</p></article>`
  })
  safeGrid.innerHTML = cards.join('')
}

safeShuffleButton.addEventListener('click', () => {
  counter += 1
  renderCards()
})

safeBurstButton.addEventListener('click', () => {
  let ticks = 0
  const timer = setInterval(() => {
    counter += 1
    renderCards()
    ticks += 1
    if (ticks > 20)
      clearInterval(timer)
  }, 80)
})

renderCards()
