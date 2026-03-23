<script setup lang="ts">
defineProps<{
  card: {
    title: string
    rate: string
    drift: string
  }
}>()
</script>

<template>
  <article class="panel">
    <span class="label">{{ card.title }}</span>
    <strong>{{ card.rate }}%</strong>
    <p>Drift {{ card.drift }}</p>
  </article>
</template>