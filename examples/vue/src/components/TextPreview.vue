<script setup lang="ts">
const text = defineModel<string>({ default: '' })
</script>

<template>
  <section class="input-section">
    <div class="input-wrapper">
      <input type="text" placeholder="Type here to generate more updates" class="input" v-model="text" />
    </div>
    <output class="input-value" :class="{ placeholder: !text }">
      {{ text || 'Your text will appear here...' }}
    </output>
  </section>
</template>
