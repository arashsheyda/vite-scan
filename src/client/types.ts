export type { ViteScanClientConfig, ViteScanRuntimeConfig } from '../shared/types'

/** In-browser state for one active scan session. */
export interface ViteScanSession {
  active: boolean
  startedAt: number
  pageHideHandler: (() => void) | null
  mutationObserver: MutationObserver | null
  performanceObserver: PerformanceObserver | null
  updates: Map<Element, number>
  longTasks: number
  longTaskDuration: number
  cumulativeLayoutShift: number
}
