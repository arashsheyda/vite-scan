# <img src="https://github.com/arashsheyda/vite-scan/blob/main/docs/public/logo.svg" width="30" height="30" align="center" /> Vite Scan

A Vite DevTools plugin that scans runtime UI churn and highlights hot DOM areas, inspired by [react-scan](https://github.com/aidenybai/react-scan).

## Features

- Adds a `Vite Scan` action button and settings panel to Vite DevTools.
- Watches DOM mutations and briefly highlights updated elements with a configurable outline and pulse animation.
- **Persistent state** — scan toggle and settings survive page refreshes and dev-server restarts via `localStorage`. No need to re-enable after every reload.
- **Auto-bootstrap** — when scan was active before a refresh, highlighting resumes immediately on page load without opening the DevTools panel.
- **Live settings panel** — adjust highlight color, glow color, outline width/offset, pulse duration, and spread at runtime. Changes auto-apply with a short debounce.
- **Color presets** — one-click Cyan, Orange, and Green presets in the settings panel.
- Collects rough runtime signals while scanning:
  - total tracked element updates
  - long task count and duration
  - cumulative layout shift (CLS)
- Emits a ranked summary of the hottest elements in the DevTools Logs panel when scan stops.

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

Open Vite DevTools, click the `Vite Scan` action to start scanning, or open the `Vite Scan` dock page to tweak settings.

Settings are auto-applied at runtime from the dock page (debounced), so you no longer need to edit `vite.config.ts` for every tweak.

## Demo

![Vite Scan demo](docs/public/demo.gif)

## API

### Plugin Options

```ts
interface ViteScanPluginOptions {
  inactiveIcon?: string // default: 'ph:scan'
  activeIcon?: string   // default: 'ph:scan-duotone'
}
```

### Runtime Settings

The following settings can be configured live from the DevTools settings panel:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enables or disables scan execution |
| `highlightColor` | `string` | `#A78BFA` | Outline color for highlighted mutations |
| `glowColor` | `string` | `rgba(167, 139, 250, 0.50)` | Glow color for the pulse animation |
| `outlineWidthPx` | `number` | `2` | Outline width in pixels |
| `outlineOffsetPx` | `number` | `1` | Outline offset in pixels |
| `pulseDurationMs` | `number` | `420` | Pulse animation duration in milliseconds |
| `pulseSpreadPx` | `number` | `10` | Pulse spread in pixels |

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