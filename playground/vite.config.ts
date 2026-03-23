import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'
import viteScan from '../src/node'

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  plugins: [
    DevTools({
      builtinDevTools: false,
    }),
    viteScan(),
  ],
  build: {
    rollupOptions: {
      devtools: {},
    },
  },
})
