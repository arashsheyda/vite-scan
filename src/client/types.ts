import type { ViteScanClientConfig } from '../shared/types'
export type { ViteScanClientConfig } from '../shared/types'

/** A highlight target — either a full Element or an individual Text node. */
export type HighlightTarget = Element | Text

/** Canvas-based highlight overlay that replaces CSS outline rendering. */
export interface CanvasOverlay {
  addHighlight(target: HighlightTarget, count: number): void
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
  updates: Map<HighlightTarget, number>
  longTasks: number
  longTaskDuration: number
  cumulativeLayoutShift: number
}
