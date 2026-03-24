import { ROOT_ID, SCAN_ACTION_ID } from '../shared/constants'
import { getRuntimeConfig, persistClientConfig } from './config'
import { PANEL_CSS } from './panel-styles'
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

/** Inline SVG logo built from shared path data. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="26 26 204 204" fill="none"><defs><linearGradient id="vg" x1="48" y1="48" x2="208" y2="208" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#41D1FF"/><stop offset="1" stop-color="#BD34FE"/></linearGradient></defs><g fill="url(#vg)"><path d="M224 40v40a8 8 0 0 1-16 0V48h-32a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8M80 208H48v-32a8 8 0 0 0-16 0v40a8 8 0 0 0 8 8h40a8 8 0 0 0 0-16m136-40a8 8 0 0 0-8 8v32h-32a8 8 0 0 0 0 16h40a8 8 0 0 0 8-8v-40a8 8 0 0 0-8-8M40 88a8 8 0 0 0 8-8V48h32a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v40a8 8 0 0 0 8 8"/></g><path d="M25.9456 44.9383C25.2821 45.7827 23.925 45.3131 23.925 44.2403V33.9369C23.925 32.6875 22.9126 31.6751 21.6631 31.6751H10.287C9.36714 31.6751 8.83075 30.6346 9.36713 29.8871L16.8464 19.4157C17.917 17.9185 16.8464 15.8376 15.0046 15.8376H1.23731C0.317479 15.8376 -0.218913 14.7972 0.317475 14.0497L10.0134 0.4741C10.2266 0.176825 10.5692 0.000183105 10.9332 0.000183105H39.8271C40.7469 0.000183105 41.2833 1.04065 40.7469 1.78814L33.2676 12.2595C32.197 13.7567 33.2676 15.8376 35.1094 15.8376H46.4856C47.4291 15.8376 47.959 16.9255 47.3753 17.6687L25.9478 44.9404L25.9456 44.9383Z" transform="translate(68 75) scale(2.5)" fill="url(#vg)"/></svg>`

/** Renders settings panel HTML for the current config. */
function renderSettings(config: ViteScanClientConfig): string {
  return `
    <style>${PANEL_CSS}</style>

    <div id="${ROOT_ID}">
      <div class="vs-card">
        <div class="vs-card-inner">
          <div class="vs-header">
            <span class="vs-logo">${LOGO_SVG}</span>
            <h2 class="vs-title">Vite Scan</h2>
          </div>
          <p class="vs-sub">Runtime re-render detection &amp; visualization</p>

          <div class="vs-toggle-row">
            <span class="vs-toggle-label">Enable scanning</span>
            <input id="vite-scan-enabled" type="checkbox" class="vs-toggle" ${config.enabled ? 'checked' : ''} />
          </div>

          <div class="vs-section">
            <div class="vs-section-title">Colors</div>
            <div class="vs-fields">
              <div class="vs-field">
                <label for="vite-scan-highlight">Highlight</label>
                <input id="vite-scan-highlight" type="text" value="${escapeHtml(config.highlightColor)}" />
              </div>
              <div class="vs-field">
                <label for="vite-scan-glow">Glow</label>
                <input id="vite-scan-glow" type="text" value="${escapeHtml(config.glowColor)}" />
              </div>
              <div class="vs-field full">
                <label>Presets</label>
                <div class="vs-presets">
                  <span class="vs-chip" data-vs-highlight="#A78BFA" data-vs-glow="rgba(167, 139, 250, 0.45)"><span class="vs-chip-dot" style="background:linear-gradient(135deg,#41D1FF,#BD34FE)"></span>Vite</span>
                  <span class="vs-chip" data-vs-highlight="#00c7c7" data-vs-glow="rgba(0, 199, 199, 0.35)"><span class="vs-chip-dot" style="background:#00c7c7"></span>Cyan</span>
                  <span class="vs-chip" data-vs-highlight="#f97316" data-vs-glow="rgba(249, 115, 22, 0.35)"><span class="vs-chip-dot" style="background:#f97316"></span>Orange</span>
                  <span class="vs-chip" data-vs-highlight="#22c55e" data-vs-glow="rgba(34, 197, 94, 0.35)"><span class="vs-chip-dot" style="background:#22c55e"></span>Green</span>
                  <span class="vs-chip" data-vs-highlight="#f43f5e" data-vs-glow="rgba(244, 63, 94, 0.35)"><span class="vs-chip-dot" style="background:#f43f5e"></span>Rose</span>
                </div>
              </div>
            </div>
          </div>

          <hr class="vs-divider" />

          <div class="vs-section">
            <div class="vs-section-title">Outline</div>
            <div class="vs-fields">
              <div class="vs-field">
                <label for="vite-scan-outline-width">Width (px)</label>
                <input id="vite-scan-outline-width" type="number" min="0" value="${config.outlineWidthPx}" />
              </div>
              <div class="vs-field">
                <label for="vite-scan-outline-offset">Offset (px)</label>
                <input id="vite-scan-outline-offset" type="number" min="0" value="${config.outlineOffsetPx}" />
              </div>
            </div>
          </div>

          <hr class="vs-divider" />

          <div class="vs-section">
            <div class="vs-section-title">Pulse Animation</div>
            <div class="vs-fields">
              <div class="vs-field">
                <label for="vite-scan-pulse-duration">Duration (ms)</label>
                <input id="vite-scan-pulse-duration" type="number" min="50" value="${config.pulseDurationMs}" />
              </div>
              <div class="vs-field">
                <label for="vite-scan-pulse-spread">Spread (px)</label>
                <input id="vite-scan-pulse-spread" type="number" min="0" value="${config.pulseSpreadPx}" />
              </div>
            </div>
          </div>

          <div id="vite-scan-status" class="vs-status">
            <span class="vs-status-dot"></span>
            <span class="vs-status-text"></span>
          </div>
        </div>
      </div>
    </div>
  `
}

/** Parses numeric input while preserving fallback when invalid. */
function parseNumberInput(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value)
  return Number.isFinite(value) ? value : fallback
}

/** Updates the settings status text and dot indicator in the panel. */
function setSettingsStatus(root: HTMLElement, message: string): void {
  const status = root.querySelector<HTMLDivElement>('#vite-scan-status')
  if (!status)
    return

  const dot = status.querySelector<HTMLSpanElement>('.vs-status-dot')
  const text = status.querySelector<HTMLSpanElement>('.vs-status-text')

  if (dot) {
    dot.classList.remove('active', 'disabled')
    if (message.includes('running'))
      dot.classList.add('active')
    else if (message.includes('Disabled'))
      dot.classList.add('disabled')
  }
  if (text)
    text.textContent = message
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
