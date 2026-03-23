import { HIT_ATTR } from './constants'
import type { ViteScanClientConfig } from './types'

/** Generates overlay CSS for highlight and pulse effects. */
export function createOverlayCSS(config: ViteScanClientConfig): string {
  return `
    [${HIT_ATTR}] {
      outline: ${config.outlineWidthPx}px solid ${config.highlightColor} !important;
      outline-offset: ${config.outlineOffsetPx}px;
      animation: vite-scan-pulse ${config.pulseDurationMs}ms ease-out;
    }

    @keyframes vite-scan-pulse {
      0% { box-shadow: 0 0 0 0 ${config.glowColor}; }
      100% { box-shadow: 0 0 0 ${config.pulseSpreadPx}px transparent; }
    }
  `
}
