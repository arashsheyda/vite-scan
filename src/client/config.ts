import {
  DEFAULT_GLOW_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_OUTLINE_OFFSET_PX,
  DEFAULT_OUTLINE_WIDTH_PX,
  DEFAULT_PULSE_DURATION_MS,
  DEFAULT_PULSE_SPREAD_PX,
} from '../shared/constants'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import type { ViteScanClientConfig, ViteScanRuntimeConfig } from './types'

/** Parses a finite number from query params and clamps it to a minimum value. */
function parsePositiveNumber(value: string | null, fallback: number, minimum = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback
}

/** Returns a trimmed string value, falling back when empty. */
function parseString(value: string | null, fallback: string): string {
  return value?.trim() || fallback
}

/** Parses a boolean from query params (`true`/`false`) with fallback support. */
function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value == null)
    return fallback

  if (value === 'true')
    return true

  if (value === 'false')
    return false

  return fallback
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
    highlightColor: parseString(params.get('highlightColor'), DEFAULT_HIGHLIGHT_COLOR),
    glowColor: parseString(params.get('glowColor'), DEFAULT_GLOW_COLOR),
    outlineWidthPx: parsePositiveNumber(params.get('outlineWidthPx'), DEFAULT_OUTLINE_WIDTH_PX),
    outlineOffsetPx: parsePositiveNumber(params.get('outlineOffsetPx'), DEFAULT_OUTLINE_OFFSET_PX),
    pulseDurationMs: parsePositiveNumber(params.get('pulseDurationMs'), DEFAULT_PULSE_DURATION_MS, 50),
    pulseSpreadPx: parsePositiveNumber(params.get('pulseSpreadPx'), DEFAULT_PULSE_SPREAD_PX),
  }
}

/**
 * Gets runtime config from server RPC, falling back to import URL params.
 */
export async function getRuntimeConfig(context: DockClientScriptContext): Promise<ViteScanClientConfig> {
  const fallback = getConfigFromImportMetaUrl()
  const config = await context.rpc.callOptional('vite-scan:get-config') as ViteScanRuntimeConfig | undefined
  if (!config)
    return fallback

  return {
    enabled: config.enabled,
    highlightColor: config.highlightColor,
    glowColor: config.glowColor,
    outlineWidthPx: config.outlineWidthPx,
    outlineOffsetPx: config.outlineOffsetPx,
    pulseDurationMs: config.pulseDurationMs,
    pulseSpreadPx: config.pulseSpreadPx,
  }
}
