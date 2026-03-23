<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import Card from './components/Card.vue'
import TextPreview from './components/TextPreview.vue'

const seed = ref(0)
const autopilot = ref(false)
let autopilotTimer: number | undefined

const cards = computed(() => {
  return Array.from({ length: 16 }, (_, index) => {
    const rate = Math.abs(Math.sin((index + 1 + seed.value) * 0.37)) * 100
    const drift = Math.cos((seed.value + index) * 0.29)
    return {
      id: index + 1,
      title: `Signal ${index + 1}`,
      rate: rate.toFixed(1),
      drift: drift.toFixed(3),
    }
  })
})

function shuffle() {
  seed.value += 1
}

function burst() {
  let ticks = 0
  const timer = window.setInterval(() => {
    seed.value += 1
    ticks += 1
    if (ticks >= 18)
      window.clearInterval(timer)
  }, 75)
}

function toggleAutopilot() {
  autopilot.value = !autopilot.value

  if (!autopilot.value) {
    if (autopilotTimer != null)
      window.clearInterval(autopilotTimer)
    autopilotTimer = undefined
    return
  }

  autopilotTimer = window.setInterval(() => {
    seed.value += 1
  }, 240)
}

onBeforeUnmount(() => {
  if (autopilotTimer != null)
    window.clearInterval(autopilotTimer)
})
</script>

<template>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">Vue example</p>
      <h1>Watch reactive updates ripple</h1>
      <p class="copy">
        This view leans on computed state so Vue produces a steady stream of DOM updates for
        <strong>Vite Scan</strong> to highlight.
      </p>
    </header>
    <TextPreview />

    <section class="toolbar">
      <button type="button" @click="shuffle">
        Shuffle signals
      </button>
      <button type="button" @click="burst">
        Burst updates
      </button>
      <button type="button" :class="['secondary', { active: autopilot }]" @click="toggleAutopilot">
        {{ autopilot ? 'Stop autopilot' : 'Start autopilot' }}
      </button>
    </section>

    <section class="stack">
      <Card v-for="card in cards" :key="card.id" :card="card" class="panel" />
    </section>
  </main>
</template>