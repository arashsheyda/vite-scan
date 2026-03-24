import { defineRpcFunction } from '@vitejs/devtools-kit'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'
import {
  ACTIVE_STORAGE_KEY,
  CONFIG_STORAGE_KEY,
  DEFAULT_ENABLED,
  DEFAULT_GLOW_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_OUTLINE_OFFSET_PX,
  DEFAULT_OUTLINE_WIDTH_PX,
  DEFAULT_PULSE_DURATION_MS,
  DEFAULT_PULSE_SPREAD_PX,
  SCAN_ACTION_ID,
  SCAN_DOCK_ID,
} from '../shared/constants'
import { createGradientLogoDataUri, createLogoDataUri, sanitizeNumber, sanitizeString } from '../shared/utils'

const DEFAULT_INACTIVE_ICON = createLogoDataUri('#BD34FE', '#9ca3af')
const DEFAULT_ACTIVE_ICON = createGradientLogoDataUri('#41D1FF', '#BD34FE')
const DEFAULT_DISABLED_ICON = createLogoDataUri('#9ca3af', '#9ca3af')
import { createBootstrapScript } from './bootstrap-script'
import type { DevToolsViewAction, DevToolsViewCustomRender, PluginWithDevTools } from '@vitejs/devtools-kit'
import type { ViteScanPluginOptions } from './types'
import type { ViteScanRuntimeConfig } from '../shared/types'

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
 * Normalizes partial runtime config into a fully safe runtime config object.
 */
function sanitizeConfig(config: Partial<ViteScanRuntimeConfig>): ViteScanRuntimeConfig {
  return {
    enabled: config.enabled ?? DEFAULT_ENABLED,
    highlightColor: sanitizeString(config.highlightColor, DEFAULT_HIGHLIGHT_COLOR),
    glowColor: sanitizeString(config.glowColor, DEFAULT_GLOW_COLOR),
    outlineWidthPx: sanitizeNumber(config.outlineWidthPx, DEFAULT_OUTLINE_WIDTH_PX),
    outlineOffsetPx: sanitizeNumber(config.outlineOffsetPx, DEFAULT_OUTLINE_OFFSET_PX),
    pulseDurationMs: sanitizeNumber(config.pulseDurationMs, DEFAULT_PULSE_DURATION_MS, 50),
    pulseSpreadPx: sanitizeNumber(config.pulseSpreadPx, DEFAULT_PULSE_SPREAD_PX),
    inactiveIcon: sanitizeString(config.inactiveIcon, DEFAULT_INACTIVE_ICON),
    activeIcon: sanitizeString(config.activeIcon, DEFAULT_ACTIVE_ICON),
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
    title: isActive ? 'Vite Scan ON' : config.enabled ? 'Vite Scan OFF' : 'Vite Scan Disabled',
    icon: isActive
      ? config.activeIcon
      : config.enabled
        ? config.inactiveIcon
        : DEFAULT_DISABLED_ICON,
    category: 'web',
    isHidden: true,
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
    title: isActive ? 'Vite Scan ON' : config.enabled ? 'Vite Scan OFF' : 'Vite Scan Disabled',
    icon: isActive
      ? config.activeIcon
      : config.enabled
        ? config.inactiveIcon
        : DEFAULT_DISABLED_ICON,
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
  const { enableInProduction = false, ...runtimeOptions } = options
  const initialConfig = sanitizeConfig(runtimeOptions)
  let command: 'serve' | 'build' = 'serve'
  let isActive = false

  return {
    name: 'vite-scan-devtools-plugin',
    apply(_config, env) {
      return env.command === 'serve' || (env.command === 'build' && enableInProduction)
    },
    configResolved(resolvedConfig) {
      command = resolvedConfig.command
    },
    transformIndexHtml() {
      const shouldAutoBootstrap = isActive || (command === 'build' && enableInProduction && initialConfig.enabled)
      return {
        tags: [
          {
            tag: 'script',
            attrs: { type: 'module' },
            injectTo: 'head',
            children: createBootstrapScript(
              shouldAutoBootstrap,
              CONFIG_STORAGE_KEY,
              ACTIVE_STORAGE_KEY,
            ),
          },
        ],
      }
    },
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
