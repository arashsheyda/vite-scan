/**
 * In-browser state for one active scan session.
 */
export interface ViteScanSession {
  /** True while observers are currently attached. */
  active: boolean
  /** Timestamp when the session started. */
  startedAt: number
  /** Cleanup hook for refresh/unload transitions. */
  pageHideHandler: (() => void) | null
  /** Tracks DOM mutations while scan is active. */
  mutationObserver: MutationObserver | null
  /** Tracks long tasks and layout shifts when supported. */
  performanceObserver: PerformanceObserver | null
  /** Per-element mutation hit counts. */
  updates: Map<Element, number>
  /** Number of long-task entries collected. */
  longTasks: number
  /** Aggregate duration of long tasks. */
  longTaskDuration: number
  /** Cumulative layout shift total. */
  cumulativeLayoutShift: number
}

/**
 * Client-side scan config used by runtime and settings UI.
 */
export interface ViteScanClientConfig {
  /** Enables or disables scan execution. */
  enabled: boolean
  /** Outline color for highlighted mutations. */
  highlightColor: string
  /** Glow color for pulse animation. */
  glowColor: string
  /** Outline width in pixels. */
  outlineWidthPx: number
  /** Outline offset in pixels. */
  outlineOffsetPx: number
  /** Pulse animation duration in milliseconds. */
  pulseDurationMs: number
  /** Pulse spread in pixels. */
  pulseSpreadPx: number
}

/**
 * Runtime config returned by server RPC to the client.
 */
export interface ViteScanRuntimeConfig extends ViteScanClientConfig {
  /** Dock icon used while scan is idle. */
  inactiveIcon: string
  /** Dock icon used while scan is active. */
  activeIcon: string
}
