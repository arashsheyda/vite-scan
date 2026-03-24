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
    minify: true,
    deps: {
      neverBundle: [
        '@vitejs/devtools-kit',
        '@vitejs/devtools-rpc',
        'vite',
        'immer',
        'birpc',
        'valibot',
      ],
    },
  },
  {
    entry: {
      'client/run-scan': 'src/client/run-scan.ts',
    },
    format: 'esm',
    platform: 'browser',
    minify: true,
    deps: {
      neverBundle: ['@vitejs/devtools-kit', '@vitejs/devtools-kit/client'],
    },
  },
])
