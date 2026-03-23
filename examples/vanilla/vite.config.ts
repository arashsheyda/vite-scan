import { DevTools } from '@vitejs/devtools'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import viteScan from '../../src/node'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
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
