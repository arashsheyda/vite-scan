import { defineRpcFunction } from '@vitejs/devtools-kit'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath } from 'vite'
import {
  ACTIVE_STORAGE_KEY,
  CONFIG_STORAGE_KEY,
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
  HIT_ATTR,
  SCAN_ACTION_ID,
  SCAN_DOCK_ID,
  STYLE_ID,
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

const num = (v: any, d: number, min = 0) => Number.isFinite(v) ? Math.max(min, v) : d

const str = (v: any, d: string) => typeof v === 'string' && v.trim() ? v.trim() : d

/**
 * Normalizes partial runtime config into a fully safe runtime config object.
 */
function sanitizeConfig(config: Partial<ViteScanRuntimeConfig>): ViteScanRuntimeConfig {
  return {
    enabled: config.enabled ?? DEFAULT_ENABLED,
    highlightColor: str(config.highlightColor, DEFAULT_HIGHLIGHT_COLOR),
    glowColor: str(config.glowColor, DEFAULT_GLOW_COLOR),
    outlineWidthPx: num(config.outlineWidthPx, DEFAULT_OUTLINE_WIDTH_PX),
    outlineOffsetPx: num(config.outlineOffsetPx, DEFAULT_OUTLINE_OFFSET_PX),
    pulseDurationMs: num(config.pulseDurationMs, DEFAULT_PULSE_DURATION_MS, 50),
    pulseSpreadPx: num(config.pulseSpreadPx, DEFAULT_PULSE_SPREAD_PX),
    inactiveIcon: str(config.inactiveIcon, DEFAULT_INACTIVE_ICON),
    activeIcon: str(config.activeIcon, DEFAULT_ACTIVE_ICON),
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
 * Creates a tiny page bootstrap script that restores highlight observers
 * from persisted client config after full page reloads.
 */
function createAutoBootstrapScript(isActiveOnServer: boolean): string {
  const autoFlagKey = '__VITE_SCAN_AUTO_BOOTSTRAP_ACTIVE__'

  return `
(() => {
  try {
    const configStorageKey = ${JSON.stringify(CONFIG_STORAGE_KEY)}
    const activeStorageKey = ${JSON.stringify(ACTIVE_STORAGE_KEY)}
    const isActiveOnServer = ${JSON.stringify(isActiveOnServer)}
    const autoFlagKey = ${JSON.stringify(autoFlagKey)}
    const styleId = ${JSON.stringify(STYLE_ID)}
    const hitAttr = ${JSON.stringify(HIT_ATTR)}

    const parseNumber = (value, fallback, minimum = 0) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback
    }

    const parseString = (value, fallback) => {
      return typeof value === 'string' && value.trim() ? value.trim() : fallback
    }

    const isActiveInStorage = window.localStorage.getItem(activeStorageKey) === '1'
    if (!isActiveOnServer && !isActiveInStorage)
      return

    let persisted = null
    try {
      const raw = window.localStorage.getItem(configStorageKey)
      persisted = raw ? JSON.parse(raw) : null
    }
    catch {}

    if (window[autoFlagKey])
      return
    window[autoFlagKey] = true

    const config = {
        highlightColor: parseString(persisted?.highlightColor, ${JSON.stringify(DEFAULT_HIGHLIGHT_COLOR)}),
        glowColor: parseString(persisted?.glowColor, ${JSON.stringify(DEFAULT_GLOW_COLOR)}),
        outlineWidthPx: parseNumber(persisted?.outlineWidthPx, ${DEFAULT_OUTLINE_WIDTH_PX}),
        outlineOffsetPx: parseNumber(persisted?.outlineOffsetPx, ${DEFAULT_OUTLINE_OFFSET_PX}),
        pulseDurationMs: parseNumber(persisted?.pulseDurationMs, ${DEFAULT_PULSE_DURATION_MS}, 50),
        pulseSpreadPx: parseNumber(persisted?.pulseSpreadPx, ${DEFAULT_PULSE_SPREAD_PX}),
    }

    const styles = [
      '[' + hitAttr + '] {',
      '  outline: ' + config.outlineWidthPx + 'px solid ' + config.highlightColor + ' !important;',
      '  outline-offset: ' + config.outlineOffsetPx + 'px;',
      '  animation: vite-scan-pulse ' + config.pulseDurationMs + 'ms ease-out;',
      '}',
      '@keyframes vite-scan-pulse {',
      '  0% { box-shadow: 0 0 0 0 ' + config.glowColor + '; }',
      '  100% { box-shadow: 0 0 0 ' + config.pulseSpreadPx + 'px transparent; }',
      '}',
    ].join('\\n')

    let style = document.getElementById(styleId)
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      ;(document.head || document.documentElement).appendChild(style)
    }
    style.textContent = styles

    const markHit = (element) => {
      element.setAttribute(hitAttr, '')
      window.setTimeout(() => {
        element.removeAttribute(hitAttr)
      }, config.pulseDurationMs)
    }

    const observer = new MutationObserver((records) => {
      const targets = new Set()

      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.attributeName === hitAttr)
            continue

          targets.add(record.target)
          continue
        }

        if (record.type === 'characterData' && record.target.parentElement)
          targets.add(record.target.parentElement)

        for (const node of record.addedNodes) {
          if (node instanceof Element)
            targets.add(node)
          else if (node.nodeType === Node.TEXT_NODE && record.target instanceof Element)
            targets.add(record.target)
        }
      }

      for (const element of targets) {
        if (element instanceof Element)
          markHit(element)
      }
    })

    const start = () => {
      if (!document.documentElement)
        return

      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      })
    }

    if (document.documentElement)
      start()
    else
      window.addEventListener('DOMContentLoaded', start, { once: true })

    window.addEventListener('pagehide', () => {
      observer.disconnect()
      for (const element of document.querySelectorAll('[' + hitAttr + ']'))
        element.removeAttribute(hitAttr)

      window[autoFlagKey] = false
    }, { once: true })
  }
  catch {
    // Keep runtime resilient when localStorage is unavailable or malformed.
  }
})()
  `
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
  const initialConfig = sanitizeConfig(options)
  let isActive = false

  return {
    name: 'vite-scan-devtools-plugin',
    apply: 'serve',
    transformIndexHtml() {
      return {
        tags: [
          {
            tag: 'script',
            attrs: { type: 'module' },
            injectTo: 'head',
            children: createAutoBootstrapScript(isActive),
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
