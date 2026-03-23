import { DevTools } from '@vitejs/devtools'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import viteScan from '../../src/node'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    react(),
    DevTools({
      builtinDevTools: false,
    }),
    viteScan({
      enableInProduction: true,
    }),
  ],
  build: {
    rollupOptions: {
      devtools: {},
    },
  },
})