# <img src="https://github.com/arashsheyda/vite-scan/blob/main/docs/public/logo.svg" width="30" height="30" align="center" /> Vite Scan

A Vite DevTools plugin that scans runtime UI churn and highlights hot DOM areas, inspired by [react-scan](https://github.com/aidenybai/react-scan).

## Features

- Adds a `Vite Scan` action button to Vite DevTools.
- Watches DOM mutations and briefly highlights updated elements.
- Collects rough runtime signals while scanning:
  - total tracked element updates
  - long task count and duration
  - cumulative layout shift (CLS)
- Emits a ranked summary in the DevTools Logs panel.

## Install

```bash
pnpm add -D vite-scan @vitejs/devtools
# or
npm i -D vite-scan @vitejs/devtools
# or
yarn add -D vite-scan @vitejs/devtools
```

## Usage

```ts
import { defineConfig } from 'vite'
import { DevTools } from '@vitejs/devtools'
import viteScan from 'vite-scan'

export default defineConfig({
  plugins: [
    DevTools(),
    viteScan(),
  ],
})
```

Open Vite DevTools, open the `Vite Scan` dock page, and tweak settings.

Settings are auto-applied at runtime from the dock page (debounced), so you no longer need to edit `vite.config.ts` for every tweak.

## Demo

![Vite Scan demo](docs/public/demo.gif)

## API

```ts
interface ViteScanPluginOptions {
  inactiveIcon?: string // default: ph:scan-duotone
  activeIcon?: string // default: ph:pulse-duotone
}
```

When a scan is active, the dock button switches icon, title, and shows an `ON` badge.

## Local Development

From this directory:

```bash
pnpm i
pnpm build
pnpm play:dev
```

To launch a single hub page with links to all framework demos:

```bash
pnpm play:examples
```

Additional working examples are available for each framework:

```bash
pnpm play:vanilla
pnpm play:react
pnpm play:vue
pnpm play:svelte
```

Each example opens a small high-churn UI so you can run `Vite Scan` from DevTools and compare how React, Vue, Svelte, and vanilla DOM updates show up.

## License

MIT License. See [LICENSE](./LICENSE) for details.