import { DevTools } from '@vitejs/devtools'
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import viteScan from '../src/node'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [
    react(),
    vue(),
    svelte(),
    DevTools({
      builtinDevTools: false,
    }),
    viteScan(),
  ],
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        'react/index': fileURLToPath(new URL('./react/index.html', import.meta.url)),
        'vue/index': fileURLToPath(new URL('./vue/index.html', import.meta.url)),
        'svelte/index': fileURLToPath(new URL('./svelte/index.html', import.meta.url)),
        'vanilla/index': fileURLToPath(new URL('./vanilla/index.html', import.meta.url)),
      },
      devtools: {},
    },
  },
})