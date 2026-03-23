import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: 'src/node/index.ts',
    },
    clean: true,
    dts: true,
    format: 'esm',
    platform: 'node',
    exports: true,
  },
  {
    entry: {
      'client/run-scan': 'src/client/run-scan.ts',
    },
    format: 'esm',
    platform: 'browser',
    external: ['@vitejs/devtools-kit', '@vitejs/devtools-kit/client'],
  },
])
