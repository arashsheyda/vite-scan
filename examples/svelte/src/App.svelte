<script lang="ts">
  let seed = 0
  let autopilot = false
  let autopilotTimer: number | undefined

  $: cards = Array.from({ length: 20 }, (_, index) => {
    const tempo = Math.abs(Math.sin((index + 1 + seed) * 0.31)) * 100
    const delta = Math.cos((seed + index) * 0.41)
    return {
      id: index + 1,
      title: `Block ${index + 1}`,
      tempo: tempo.toFixed(1),
      delta: delta.toFixed(3),
    }
  })

  function shuffle() {
    seed += 1
  }

  function burst() {
    let ticks = 0
    const timer = window.setInterval(() => {
      seed += 1
      ticks += 1
      if (ticks >= 22)
        window.clearInterval(timer)
    }, 65)
  }

  function toggleAutopilot() {
    autopilot = !autopilot

    if (!autopilot) {
      if (autopilotTimer != null)
        window.clearInterval(autopilotTimer)
      autopilotTimer = undefined
      return
    }

    autopilotTimer = window.setInterval(() => {
      seed += 1
    }, 210)
  }
</script>

<svelte:head>
  <title>vite-scan Svelte Example</title>
</svelte:head>

<svelte:window
  on:beforeunload={() => {
    if (autopilotTimer != null)
      window.clearInterval(autopilotTimer)
  }}
/>

<main class="page">
  <header class="hero">
    <p class="eyebrow">Svelte example</p>
    <h1>Stress test fine-grained updates</h1>
    <p class="copy">
      Trigger reactive changes and inspect which DOM islands churn under <strong>Vite Scan</strong>.
    </p>
  </header>

  <section class="toolbar">
    <button type="button" on:click={shuffle}>Shuffle blocks</button>
    <button type="button" on:click={burst}>Burst updates</button>
    <button type="button" class:active={autopilot} class="secondary" on:click={toggleAutopilot}>
      {autopilot ? 'Stop autopilot' : 'Start autopilot'}
    </button>
  </section>

  <section class="grid">
    {#each cards as card (card.id)}
      <article class="tile">
        <span class="badge">{card.title}</span>
        <strong>{card.tempo}%</strong>
        <p>Delta {card.delta}</p>
      </article>
    {/each}
  </section>
</main>