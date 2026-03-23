import { defineRpcFunction } from '@vitejs/devtools-kit'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'
import {
  DEFAULT_ACTIVE_ICON,
  DEFAULT_DISABLED_ICON,
  DEFAULT_ENABLED,
  DEFAULT_GLOW_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_INACTIVE_ICON,
  DEFAULT_OUTLINE_OFFSET_PX,
  DEFAULT_OUTLINE_WIDTH_PX,
  DEFAULT_PULSE_DURATION_MS,
  DEFAULT_PULSE_SPREAD_PX,
  SCAN_ACTION_ID,
  SCAN_DOCK_ID,
} from '../shared/constants'
import type { DevToolsViewAction, DevToolsViewCustomRender, PluginWithDevTools } from '@vitejs/devtools-kit'
import type { ViteScanPluginOptions, ViteScanRuntimeConfig } from './types'

/**
 * Resolves the client script path for both built and source-driven development.
 */
function resolveClientScript(): string | undefined {
  const paths = [
    fileURLToPath(new URL('./client/run-scan.js', import.meta.url)),
    fileURLToPath(new URL('../../dist/client/run-scan.js', import.meta.url)),
    fileURLToPath(new URL('../client/run-scan.ts', import.meta.url)),
  ]
  return paths.find(path => fs.existsSync(path))
}

/**
 * Coerces a value to a finite number and clamps it to a minimum.
 */
function sanitizePositiveNumber(value: number | undefined, fallback: number, minimum = 0): number {
  if (value == null || !Number.isFinite(value))
    return fallback

  return Math.max(minimum, value)
}

/**
 * Returns a trimmed color string or a fallback when empty.
 */
function sanitizeColor(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback
}

/**
 * Returns a trimmed icon name or a fallback when empty.
 */
function sanitizeIcon(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback
}

/**
 * Normalizes partial runtime config into a fully safe runtime config object.
 */
function sanitizeConfig(config: Partial<ViteScanRuntimeConfig>): ViteScanRuntimeConfig {
  return {
    enabled: config.enabled ?? DEFAULT_ENABLED,
    highlightColor: sanitizeColor(config.highlightColor, DEFAULT_HIGHLIGHT_COLOR),
    glowColor: sanitizeColor(config.glowColor, DEFAULT_GLOW_COLOR),
    outlineWidthPx: sanitizePositiveNumber(config.outlineWidthPx, DEFAULT_OUTLINE_WIDTH_PX),
    outlineOffsetPx: sanitizePositiveNumber(config.outlineOffsetPx, DEFAULT_OUTLINE_OFFSET_PX),
    pulseDurationMs: sanitizePositiveNumber(config.pulseDurationMs, DEFAULT_PULSE_DURATION_MS, 50),
    pulseSpreadPx: sanitizePositiveNumber(config.pulseSpreadPx, DEFAULT_PULSE_SPREAD_PX),
    inactiveIcon: sanitizeIcon(config.inactiveIcon, DEFAULT_INACTIVE_ICON),
    activeIcon: sanitizeIcon(config.activeIcon, DEFAULT_ACTIVE_ICON),
  }
}

/**
 * Builds the query string passed to the client script import URL.
 */
function createScanClientQuery(config: ViteScanRuntimeConfig, mode: 'action' | 'panel'): string {
  return new URLSearchParams({
    mode,
    enabled: String(config.enabled),
    highlightColor: config.highlightColor,
    glowColor: config.glowColor,
    outlineWidthPx: String(config.outlineWidthPx),
    outlineOffsetPx: String(config.outlineOffsetPx),
    pulseDurationMs: String(config.pulseDurationMs),
    pulseSpreadPx: String(config.pulseSpreadPx),
  }).toString()
}

/**
 * Creates the action dock entry used to start/stop scanning.
 */
function createActionEntry(clientScript: string, config: ViteScanRuntimeConfig, isActive: boolean): DevToolsViewAction {
  return {
    type: 'action',
    id: SCAN_ACTION_ID,
    title: isActive ? 'Stop Vite Scan' : config.enabled ? 'Run Vite Scan' : 'Vite Scan Disabled',
    icon: isActive
      ? config.activeIcon
      : config.enabled
        ? config.inactiveIcon
        : DEFAULT_DISABLED_ICON,
    category: 'web',
    isHidden: true,
    badge: isActive ? 'ON' : config.enabled ? undefined : 'OFF',
    action: {
      importFrom: `/@fs/${normalizePath(clientScript)}?${createScanClientQuery(config, 'action')}`,
    },
  }
}

/**
 * Creates the settings panel dock entry for Vite Scan.
 */
function createPanelEntry(clientScript: string, config: ViteScanRuntimeConfig, isActive: boolean): DevToolsViewCustomRender {
  return {
    type: 'custom-render',
    id: SCAN_DOCK_ID,
    title: 'Vite Scan',
    icon: isActive
      ? config.activeIcon
      : config.enabled
        ? config.inactiveIcon
        : DEFAULT_DISABLED_ICON,
    badge: isActive ? 'ON' : config.enabled ? undefined : 'OFF',
    category: 'web',
    renderer: {
      importFrom: `/@fs/${normalizePath(clientScript)}?${createScanClientQuery(config, 'panel')}`,
    },
    defaultOrder: 10,
  }
}

/**
 * Registers the Vite Scan DevTools plugin, docks, and RPC handlers.
 */
export function createViteScanPlugin(options: ViteScanPluginOptions = {}): PluginWithDevTools {
  const initialConfig = sanitizeConfig({
    inactiveIcon: options.inactiveIcon,
    activeIcon: options.activeIcon,
  })

  return {
    name: 'vite-scan-devtools-plugin',
    devtools: {
      capabilities: {
        dev: {
          rpc: true,
        },
        build: {
          rpc: true,
        },
      },
      setup(context) {
        const scanScript = resolveClientScript()

        if (!scanScript)
          throw new Error('[vite-scan] Client script not found, did you run `pnpm build`?')

        const resolvedScanScript = scanScript

        let config = initialConfig
        let isActive = false
        let actionEntry = createActionEntry(resolvedScanScript, config, isActive)
        let panelEntry = createPanelEntry(resolvedScanScript, config, isActive)

        context.docks.register(actionEntry)
        context.docks.register(panelEntry)

        /**
         * Rebuilds and updates dock entries whenever config or active state changes.
         */
        function refreshEntries(): void {
          actionEntry = createActionEntry(resolvedScanScript, config, isActive)
          panelEntry = createPanelEntry(resolvedScanScript, config, isActive)
          context.docks.update(actionEntry)
          context.docks.update(panelEntry)
        }

        context.rpc.register(defineRpcFunction({
          name: 'vite-scan:set-active',
          type: 'action',
          setup() {
            return {
              handler(active) {
                isActive = active
                refreshEntries()
              },
            }
          },
        }))

        context.rpc.register(defineRpcFunction({
          name: 'vite-scan:get-config',
          type: 'action',
          setup() {
            return {
              handler() {
                return config
              },
            }
          },
        }))

        context.rpc.register(defineRpcFunction({
          name: 'vite-scan:is-active',
          type: 'action',
          setup() {
            return {
              handler() {
                return isActive
              },
            }
          },
        }))

        context.rpc.register(defineRpcFunction({
          name: 'vite-scan:update-config',
          type: 'action',
          setup() {
            return {
              handler(patch) {
                config = sanitizeConfig({
                  ...config,
                  ...patch,
                })
                refreshEntries()
                return config
              },
            }
          },
        }))

        context.logs.add({
          id: 'vite-scan:ready',
          message: 'vite-scan ready. Open "Vite Scan" in docks to configure and run scans.',
          level: 'info',
          category: 'vite-scan',
          autoDismiss: 3000,
          autoDelete: 10000,
        })
      },
    },
  }
}
