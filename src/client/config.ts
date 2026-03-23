import {
  CONFIG_STORAGE_KEY,
  DEFAULT_GLOW_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_OUTLINE_OFFSET_PX,
  DEFAULT_OUTLINE_WIDTH_PX,
  DEFAULT_PULSE_DURATION_MS,
  DEFAULT_PULSE_SPREAD_PX,
} from '../shared/constants'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import type { ViteScanClientConfig, ViteScanRuntimeConfig } from './types'

/** Coerces a value to a finite number, clamped to a minimum. Works with strings, numbers, null, and undefined. */
function sanitizeNumber(value: unknown, fallback: number, minimum = 0): number {
  if (value == null)
    return fallback

  const num = Number(value)
  return Number.isFinite(num) ? Math.max(minimum, num) : fallback
}

/** Returns a trimmed string value, falling back when empty or non-string. */
function sanitizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

/** Parses a boolean from a string (`true`/`false`) with fallback support. */
function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === 'true')
    return true

  if (value === 'false')
    return false

  return fallback
}

/** Returns true when localStorage is available. */
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/** Resolves the script mode from import URL query params. */
export function getModeFromImportMetaUrl(): 'action' | 'panel' {
  const mode = new URL(import.meta.url).searchParams.get('mode')
  return mode === 'panel' ? 'panel' : 'action'
}

/** Builds client config from import URL query params as a no-RPC fallback. */
function getConfigFromImportMetaUrl(): ViteScanClientConfig {
  const params = new URL(import.meta.url).searchParams

  return {
    enabled: parseBoolean(params.get('enabled'), true),
    highlightColor: sanitizeString(params.get('highlightColor'), DEFAULT_HIGHLIGHT_COLOR),
    glowColor: sanitizeString(params.get('glowColor'), DEFAULT_GLOW_COLOR),
    outlineWidthPx: sanitizeNumber(params.get('outlineWidthPx'), DEFAULT_OUTLINE_WIDTH_PX),
    outlineOffsetPx: sanitizeNumber(params.get('outlineOffsetPx'), DEFAULT_OUTLINE_OFFSET_PX),
    pulseDurationMs: sanitizeNumber(params.get('pulseDurationMs'), DEFAULT_PULSE_DURATION_MS, 50),
    pulseSpreadPx: sanitizeNumber(params.get('pulseSpreadPx'), DEFAULT_PULSE_SPREAD_PX),
  }
}

/** Reads persisted client config from localStorage, returning null when unavailable or invalid. */
function readPersistedConfig(): Partial<ViteScanClientConfig> | null {
  if (!canUseStorage())
    return null

  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw)
      return null

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  }
  catch {
    return null
  }
}

/** Merges persisted config over a fallback baseline, re-sanitizing every value. */
function mergePersistedConfig(fallback: ViteScanClientConfig): ViteScanClientConfig {
  const persisted = readPersistedConfig()
  if (!persisted)
    return fallback

  return {
    enabled: typeof persisted.enabled === 'boolean' ? persisted.enabled : fallback.enabled,
    highlightColor: sanitizeString(persisted.highlightColor, fallback.highlightColor),
    glowColor: sanitizeString(persisted.glowColor, fallback.glowColor),
    outlineWidthPx: sanitizeNumber(persisted.outlineWidthPx, fallback.outlineWidthPx),
    outlineOffsetPx: sanitizeNumber(persisted.outlineOffsetPx, fallback.outlineOffsetPx),
    pulseDurationMs: sanitizeNumber(persisted.pulseDurationMs, fallback.pulseDurationMs, 50),
    pulseSpreadPx: sanitizeNumber(persisted.pulseSpreadPx, fallback.pulseSpreadPx),
  }
}

/** Persists client config to localStorage so settings survive reloads. */
export function persistClientConfig(config: ViteScanClientConfig): void {
  if (!canUseStorage())
    return

  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  }
  catch {
    // Ignore storage failures (private mode / quota).
  }
}

/** Resolves config from server RPC merged with persisted overrides. */
export async function getRuntimeConfig(context: DockClientScriptContext): Promise<ViteScanClientConfig> {
  const fallback = mergePersistedConfig(getConfigFromImportMetaUrl())
  const config = await context.rpc.callOptional('vite-scan:get-config') as ViteScanRuntimeConfig | undefined

  const merged = config ? mergePersistedConfig(config) : fallback
  persistClientConfig(merged)
  return merged
}
