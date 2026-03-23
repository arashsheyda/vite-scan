export type { ViteScanClientConfig, ViteScanRuntimeConfig } from '../shared/types'

/** Canvas-based highlight overlay that replaces CSS outline rendering. */
export interface CanvasOverlay {
  addHighlight(element: Element): void
  updateConfig(config: ViteScanClientConfig): void
  destroy(): void
}

/** In-browser state for one active scan session. */
export interface ViteScanSession {
  active: boolean
  startedAt: number
  pageHideHandler: (() => void) | null
  canvasOverlay: CanvasOverlay | null
  mutationObserver: MutationObserver | null
  performanceObserver: PerformanceObserver | null
  updates: Map<Element, number>
  longTasks: number
  longTaskDuration: number
  cumulativeLayoutShift: number
}
