/**
 * Optional plugin options provided in vite.config.ts.
 */
export interface ViteScanPluginOptions {
  /**
   * Dock icon when idle.
   * Uses an Iconify icon name.
   */
  inactiveIcon?: string

  /**
   * Dock icon while a scan is active.
   * Uses an Iconify icon name.
   */
  activeIcon?: string
}

/**
 * Runtime config shared with the client script.
 */
export interface ViteScanRuntimeConfig {
  /** Enables or disables scan execution. */
  enabled: boolean
  /** Outline color for highlighted mutations. */
  highlightColor: string
  /** Glow color for the pulse animation. */
  glowColor: string
  /** Outline width in pixels. */
  outlineWidthPx: number
  /** Outline offset in pixels. */
  outlineOffsetPx: number
  /** Pulse animation duration in milliseconds. */
  pulseDurationMs: number
  /** Pulse spread in pixels. */
  pulseSpreadPx: number
  /** Dock icon used while scan is idle. */
  inactiveIcon: string
  /** Dock icon used while scan is active. */
  activeIcon: string
}

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    /** Sets server-side active state for dock badge/icon updates. */
    'vite-scan:set-active': (active: boolean) => void
    /** Returns current sanitized runtime config. */
    'vite-scan:get-config': () => ViteScanRuntimeConfig
    /** Returns whether scan is currently active. */
    'vite-scan:is-active': () => boolean
    /** Applies a partial runtime config patch and returns full config. */
    'vite-scan:update-config': (patch: Partial<ViteScanRuntimeConfig>) => ViteScanRuntimeConfig
  }
}
