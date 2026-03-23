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

/** Inline SVG logo built from shared path data. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="26 26 204 204" fill="none">
  <defs>
    <linearGradient id="vsLogoFrame" x1="48" y1="48" x2="208" y2="208" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#41D1FF"/><stop offset="1" stop-color="#BD34FE"/>
    </linearGradient>
    <linearGradient id="vsLogoBolt" x1="9" y1="0" x2="39" y2="45" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#41D1FF"/><stop offset="1" stop-color="#BD34FE"/>
    </linearGradient>
  </defs>
  <g fill="url(#vsLogoFrame)"><path d="M224 40v40a8 8 0 0 1-16 0V48h-32a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8M80 208H48v-32a8 8 0 0 0-16 0v40a8 8 0 0 0 8 8h40a8 8 0 0 0 0-16m136-40a8 8 0 0 0-8 8v32h-32a8 8 0 0 0 0 16h40a8 8 0 0 0 8-8v-40a8 8 0 0 0-8-8M40 88a8 8 0 0 0 8-8V48h32a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v40a8 8 0 0 0 8 8"/></g>
  <path d="M25.9456 44.9383C25.2821 45.7827 23.925 45.3131 23.925 44.2403V33.9369C23.925 32.6875 22.9126 31.6751 21.6631 31.6751H10.287C9.36714 31.6751 8.83075 30.6346 9.36713 29.8871L16.8464 19.4157C17.917 17.9185 16.8464 15.8376 15.0046 15.8376H1.23731C0.317479 15.8376 -0.218913 14.7972 0.317475 14.0497L10.0134 0.4741C10.2266 0.176825 10.5692 0.000183105 10.9332 0.000183105H39.8271C40.7469 0.000183105 41.2833 1.04065 40.7469 1.78814L33.2676 12.2595C32.197 13.7567 33.2676 15.8376 35.1094 15.8376H46.4856C47.4291 15.8376 47.959 16.9255 47.3753 17.6687L25.9478 44.9404L25.9456 44.9383Z" transform="translate(68 75) scale(2.5)" fill="url(#vsLogoBolt)"/>
</svg>`

/** Renders settings panel HTML for the current config. */
function renderSettings(config: ViteScanClientConfig): string {
  return `
    <style>
      #${ROOT_ID} {
        color-scheme: light dark;
        container-type: inline-size;
        --vs-bg: #0c0e14;
        --vs-bg-card: #12141e;
        --vs-bg-input: #181c28;
        --vs-border: #232840;
        --vs-border-subtle: #1c2035;
        --vs-muted: #8892a8;
        --vs-text: #e8ecf4;
        --vs-gradient-start: #41D1FF;
        --vs-gradient-end: #BD34FE;
        --vs-accent: #9b6dff;
        padding: 16px;
        color: var(--vs-text);
        font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        line-height: 1.5;
      }
      @media (prefers-color-scheme: light) {
        #${ROOT_ID} {
          --vs-bg: #f5f7fa;
          --vs-bg-card: #ffffff;
          --vs-bg-input: #f0f2f7;
          --vs-border: #dde1ea;
          --vs-border-subtle: #e8ecf2;
          --vs-muted: #6b7588;
          --vs-text: #0f172a;
          --vs-accent: #7c3aed;
        }
      }
      :root.dark #${ROOT_ID},
      .dark #${ROOT_ID} {
        --vs-bg: #0c0e14;
        --vs-bg-card: #12141e;
        --vs-bg-input: #181c28;
        --vs-border: #232840;
        --vs-border-subtle: #1c2035;
        --vs-muted: #8892a8;
        --vs-text: #e8ecf4;
        --vs-accent: #9b6dff;
      }

      /* --- Card --- */
      #${ROOT_ID} .vs-card {
        position: relative;
        border-radius: 14px;
        background: var(--vs-bg-card);
        padding: 1px;
        overflow: hidden;
      }
      #${ROOT_ID} .vs-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 14px;
        padding: 1px;
        background: linear-gradient(135deg, var(--vs-gradient-start), var(--vs-gradient-end));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        opacity: 0.45;
      }
      #${ROOT_ID} .vs-card-inner {
        background: var(--vs-bg-card);
        border-radius: 13px;
        padding: 20px;
      }

      /* --- Header --- */
      #${ROOT_ID} .vs-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
      }
      #${ROOT_ID} .vs-logo {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }
      #${ROOT_ID} .vs-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--vs-gradient-start), var(--vs-gradient-end));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      #${ROOT_ID} .vs-sub {
        margin: 0 0 16px;
        color: var(--vs-muted);
        font-size: 12px;
      }

      /* --- Toggle --- */
      #${ROOT_ID} .vs-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: 10px;
        background: var(--vs-bg-input);
        border: 1px solid var(--vs-border-subtle);
        margin-bottom: 16px;
      }
      #${ROOT_ID} .vs-toggle-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--vs-text);
      }
      #${ROOT_ID} .vs-toggle {
        position: relative;
        width: 40px;
        height: 22px;
        appearance: none;
        -webkit-appearance: none;
        background: var(--vs-border);
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.2s;
        border: none;
        outline: none;
        flex-shrink: 0;
      }
      #${ROOT_ID} .vs-toggle::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      #${ROOT_ID} .vs-toggle:checked {
        background: linear-gradient(135deg, var(--vs-gradient-start), var(--vs-gradient-end));
      }
      #${ROOT_ID} .vs-toggle:checked::after {
        transform: translateX(18px);
      }
      #${ROOT_ID} .vs-toggle:focus-visible {
        box-shadow: 0 0 0 2px var(--vs-bg-card), 0 0 0 4px var(--vs-accent);
      }

      /* --- Section --- */
      #${ROOT_ID} .vs-section {
        margin-bottom: 16px;
      }
      #${ROOT_ID} .vs-section:last-child {
        margin-bottom: 0;
      }
      #${ROOT_ID} .vs-section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--vs-muted);
        margin: 0 0 8px 2px;
      }

      /* --- Field grid --- */
      #${ROOT_ID} .vs-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      #${ROOT_ID} .vs-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #${ROOT_ID} .vs-field.full {
        grid-column: 1 / -1;
      }
      #${ROOT_ID} .vs-field label {
        font-size: 11px;
        font-weight: 500;
        color: var(--vs-muted);
        padding-left: 2px;
      }
      #${ROOT_ID} input[type="text"],
      #${ROOT_ID} input[type="number"] {
        width: 100%;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid var(--vs-border-subtle);
        background: var(--vs-bg-input);
        color: var(--vs-text);
        padding: 7px 10px;
        font-size: 12px;
        font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      #${ROOT_ID} input[type="text"]:hover,
      #${ROOT_ID} input[type="number"]:hover {
        border-color: var(--vs-border);
      }
      #${ROOT_ID} input[type="text"]:focus,
      #${ROOT_ID} input[type="number"]:focus {
        outline: none;
        border-color: var(--vs-accent);
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--vs-accent) 20%, transparent);
      }

      /* --- Presets --- */
      #${ROOT_ID} .vs-presets {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      #${ROOT_ID} .vs-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid var(--vs-border-subtle);
        border-radius: 999px;
        padding: 4px 10px 4px 6px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        color: var(--vs-muted);
        user-select: none;
        transition: all 0.15s;
        background: var(--vs-bg-input);
      }
      #${ROOT_ID} .vs-chip:hover {
        color: var(--vs-text);
        border-color: var(--vs-accent);
        background: color-mix(in oklab, var(--vs-accent) 8%, var(--vs-bg-input));
      }
      #${ROOT_ID} .vs-chip-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* --- Divider --- */
      #${ROOT_ID} .vs-divider {
        height: 1px;
        background: var(--vs-border-subtle);
        margin: 16px 0;
        border: none;
      }

      /* --- Status --- */
      #${ROOT_ID} .vs-status {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 16px;
        font-size: 11px;
        color: var(--vs-muted);
      }
      #${ROOT_ID} .vs-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--vs-muted);
        flex-shrink: 0;
      }
      #${ROOT_ID} .vs-status-dot.active {
        background: #34d399;
        box-shadow: 0 0 6px rgba(52, 211, 153, 0.5);
      }
      #${ROOT_ID} .vs-status-dot.disabled {
        background: #f87171;
      }

      @container (max-width: 400px) {
        #${ROOT_ID} .vs-fields {
          grid-template-columns: 1fr;
        }
      }
    </style>

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
