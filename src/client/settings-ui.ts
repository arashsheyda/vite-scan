import { ROOT_ID, SCAN_ACTION_ID } from '../shared/constants'
import { getRuntimeConfig, persistClientConfig } from './config'
import { updateActiveOverlayConfig } from './scan-runtime'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import type { ViteScanClientConfig } from '../shared/types'

const AUTO_APPLY_DELAY_MS = 280
const RECONCILE_RETRY_DELAY_MS = 320

/** Escapes user-facing text for safe HTML interpolation. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Renders settings panel HTML for the current config. */
function renderSettings(config: ViteScanClientConfig): string {
  return `
    <style>
      #${ROOT_ID} {
        color-scheme: light dark;
        container-type: inline-size;
        --vs-bg: #0f1116;
        --vs-bg-soft: #141824;
        --vs-border: #2b3245;
        --vs-muted: #98a2b3;
        --vs-accent: #5bb6ff;
        --vs-text: #e7ecf3;
        padding: 14px;
        color: var(--vs-text);
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      @media (prefers-color-scheme: light) {
        #${ROOT_ID} {
          --vs-bg: #f8fafc;
          --vs-bg-soft: #ffffff;
          --vs-border: #d9e0ea;
          --vs-muted: #5f6b7d;
          --vs-accent: #0f76d8;
          --vs-text: #0f172a;
        }
      }
      :root.dark #${ROOT_ID},
      .dark #${ROOT_ID} {
        --vs-bg: #0f1116;
        --vs-bg-soft: #141824;
        --vs-border: #2b3245;
        --vs-muted: #98a2b3;
        --vs-accent: #5bb6ff;
        --vs-text: #e7ecf3;
      }
      #${ROOT_ID} .vs-card {
        border: 1px solid var(--vs-border);
        border-radius: 12px;
        background: var(--vs-bg);
        padding: 12px;
      }
      #${ROOT_ID} .vs-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }
      #${ROOT_ID} .vs-sub {
        margin: 4px 0 0;
        color: var(--vs-muted);
        font-size: 12px;
      }
      #${ROOT_ID} .vs-grid {
        display: grid;
        grid-template-columns: 170px 1fr;
        gap: 10px 12px;
        align-items: center;
        margin-top: 12px;
      }
      #${ROOT_ID} label {
        font-size: 12px;
        color: var(--vs-muted);
      }
      #${ROOT_ID} input[type="text"],
      #${ROOT_ID} input[type="number"] {
        width: 100%;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid var(--vs-border);
        background: var(--vs-bg-soft);
        color: var(--vs-text);
        padding: 8px 10px;
        font-size: 12px;
      }
      #${ROOT_ID} input[type="text"]:focus,
      #${ROOT_ID} input[type="number"]:focus,
      #${ROOT_ID} input[type="checkbox"]:focus {
        outline: 2px solid color-mix(in oklab, var(--vs-accent) 70%, transparent);
        outline-offset: 1px;
      }
      #${ROOT_ID} .vs-status {
        margin-top: 12px;
        font-size: 12px;
        color: var(--vs-muted);
      }
      #${ROOT_ID} .vs-colors {
        display: flex;
        gap: 6px;
      }
      #${ROOT_ID} .vs-chip {
        border: 1px solid var(--vs-border);
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        color: var(--vs-muted);
        user-select: none;
      }
      #${ROOT_ID} .vs-chip:hover {
        color: var(--vs-text);
        border-color: color-mix(in oklab, var(--vs-accent) 35%, var(--vs-border));
      }
      @container (max-width: 560px) {
        #${ROOT_ID} .vs-grid {
          grid-template-columns: 1fr;
          gap: 6px;
        }
      }
    </style>

    <div id="${ROOT_ID}">
      <div class="vs-card">
        <h2 class="vs-title">Vite Scan</h2>
        <p class="vs-sub">Runtime controls auto-apply while you edit.</p>

        <div class="vs-grid">
          <label for="vite-scan-enabled">Enabled</label>
          <input id="vite-scan-enabled" type="checkbox" ${config.enabled ? 'checked' : ''} />

          <label for="vite-scan-highlight">Highlight color</label>
          <input id="vite-scan-highlight" type="text" value="${escapeHtml(config.highlightColor)}" />

          <label for="vite-scan-glow">Glow color</label>
          <input id="vite-scan-glow" type="text" value="${escapeHtml(config.glowColor)}" />

          <label>Color presets</label>
          <div class="vs-colors">
            <span class="vs-chip" data-vs-highlight="#00c7c7" data-vs-glow="rgba(0, 199, 199, 0.35)">Cyan</span>
            <span class="vs-chip" data-vs-highlight="#f97316" data-vs-glow="rgba(249, 115, 22, 0.35)">Orange</span>
            <span class="vs-chip" data-vs-highlight="#22c55e" data-vs-glow="rgba(34, 197, 94, 0.35)">Green</span>
          </div>

          <label for="vite-scan-outline-width">Outline width (px)</label>
          <input id="vite-scan-outline-width" type="number" min="0" value="${config.outlineWidthPx}" />

          <label for="vite-scan-outline-offset">Outline offset (px)</label>
          <input id="vite-scan-outline-offset" type="number" min="0" value="${config.outlineOffsetPx}" />

          <label for="vite-scan-pulse-duration">Pulse duration (ms)</label>
          <input id="vite-scan-pulse-duration" type="number" min="50" value="${config.pulseDurationMs}" />

          <label for="vite-scan-pulse-spread">Pulse spread (px)</label>
          <input id="vite-scan-pulse-spread" type="number" min="0" value="${config.pulseSpreadPx}" />
        </div>

        <div id="vite-scan-status" class="vs-status"></div>
      </div>
    </div>
  `
}

/** Parses numeric input while preserving fallback when invalid. */
function parseNumberInput(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value)
  return Number.isFinite(value) ? value : fallback
}

/** Updates the settings status text in the panel. */
function setSettingsStatus(root: HTMLElement, message: string): void {
  const status = root.querySelector<HTMLDivElement>('#vite-scan-status')
  if (status)
    status.textContent = message
}

/** Starts or stops scan action based on desired enabled state. */
async function syncEnabledState(
  context: DockClientScriptContext,
  nextEnabled: boolean,
  forceRestartWhenActive = false,
): Promise<void> {
  const active = await context.rpc.callOptional('vite-scan:is-active') as boolean | undefined

  if (nextEnabled) {
    if (active && forceRestartWhenActive) {
      await context.docks.toggleEntry(SCAN_ACTION_ID)
      await context.docks.toggleEntry(SCAN_ACTION_ID)
      return
    }

    if (!active)
      await context.docks.toggleEntry(SCAN_ACTION_ID)

    return
  }

  if (active)
    await context.docks.toggleEntry(SCAN_ACTION_ID)
}

/** Mounts interactive settings controls into the current panel element. */
async function mountSettings(context: DockClientScriptContext, panel: HTMLDivElement): Promise<void> {
  const config = await getRuntimeConfig(context)
  await context.rpc.call('vite-scan:update-config', config)
  panel.innerHTML = renderSettings(config)

  const root = panel.querySelector<HTMLElement>(`#${ROOT_ID}`)
  if (!root)
    return

  const enabled = root.querySelector<HTMLInputElement>('#vite-scan-enabled')
  const highlightColor = root.querySelector<HTMLInputElement>('#vite-scan-highlight')
  const glowColor = root.querySelector<HTMLInputElement>('#vite-scan-glow')
  const outlineWidthPx = root.querySelector<HTMLInputElement>('#vite-scan-outline-width')
  const outlineOffsetPx = root.querySelector<HTMLInputElement>('#vite-scan-outline-offset')
  const pulseDurationMs = root.querySelector<HTMLInputElement>('#vite-scan-pulse-duration')
  const pulseSpreadPx = root.querySelector<HTMLInputElement>('#vite-scan-pulse-spread')
  const presets = root.querySelectorAll<HTMLElement>('.vs-chip')

  if (!enabled || !highlightColor || !glowColor || !outlineWidthPx || !outlineOffsetPx || !pulseDurationMs || !pulseSpreadPx)
    return

  let applyTimeout: ReturnType<typeof setTimeout> | null = null

  const refreshStatus = async (): Promise<void> => {
    const active = await context.rpc.callOptional('vite-scan:is-active') as boolean | undefined
    setSettingsStatus(root, enabled.checked ? (active ? 'Enabled and running' : 'Enabled and idle') : 'Disabled')
  }

  const applyChanges = async (): Promise<void> => {
    setSettingsStatus(root, 'Updating...')

    const next = await context.rpc.call('vite-scan:update-config', {
      enabled: enabled.checked,
      highlightColor: highlightColor.value,
      glowColor: glowColor.value,
      outlineWidthPx: parseNumberInput(outlineWidthPx, config.outlineWidthPx),
      outlineOffsetPx: parseNumberInput(outlineOffsetPx, config.outlineOffsetPx),
      pulseDurationMs: parseNumberInput(pulseDurationMs, config.pulseDurationMs),
      pulseSpreadPx: parseNumberInput(pulseSpreadPx, config.pulseSpreadPx),
    }) as ViteScanClientConfig

    persistClientConfig(next)

    outlineWidthPx.value = String(next.outlineWidthPx)
    outlineOffsetPx.value = String(next.outlineOffsetPx)
    pulseDurationMs.value = String(next.pulseDurationMs)
    pulseSpreadPx.value = String(next.pulseSpreadPx)
    enabled.checked = next.enabled

    updateActiveOverlayConfig(next)
    await syncEnabledState(context, next.enabled)
    await refreshStatus()
  }

  const scheduleApply = (): void => {
    if (applyTimeout)
      clearTimeout(applyTimeout)

    applyTimeout = setTimeout(() => {
      void applyChanges()
    }, AUTO_APPLY_DELAY_MS)
  }

  enabled.addEventListener('change', scheduleApply)
  highlightColor.addEventListener('input', scheduleApply)
  glowColor.addEventListener('input', scheduleApply)
  outlineWidthPx.addEventListener('input', scheduleApply)
  outlineOffsetPx.addEventListener('input', scheduleApply)
  pulseDurationMs.addEventListener('input', scheduleApply)
  pulseSpreadPx.addEventListener('input', scheduleApply)

  for (const preset of presets) {
    preset.addEventListener('click', () => {
      const nextHighlight = preset.getAttribute('data-vs-highlight')
      const nextGlow = preset.getAttribute('data-vs-glow')
      if (nextHighlight)
        highlightColor.value = nextHighlight
      if (nextGlow)
        glowColor.value = nextGlow

      scheduleApply()
    })
  }

  await syncEnabledState(context, config.enabled, true)
  window.setTimeout(() => {
    void syncEnabledState(context, enabled.checked, true)
  }, RECONCILE_RETRY_DELAY_MS)
  await refreshStatus()
}

/** Entry point for settings panel mode; mounts now and on future remounts. */
export async function runSettingsPanel(context: DockClientScriptContext): Promise<void> {
  const panel = context.current.domElements.panel
  if (panel)
    await mountSettings(context, panel)

  context.current.events.on('dom:panel:mounted', async (mountedPanel) => {
    await mountSettings(context, mountedPanel)
  })
}
