/** Client-side scan config used by runtime and settings UI. */
export interface ViteScanClientConfig {
  enabled: boolean
  highlightColor: string
  glowColor: string
  outlineWidthPx: number
  outlineOffsetPx: number
  pulseDurationMs: number
  pulseSpreadPx: number
}

/** Full runtime config including server-only icon fields. */
export interface ViteScanRuntimeConfig extends ViteScanClientConfig {
  inactiveIcon: string
  activeIcon: string
}
