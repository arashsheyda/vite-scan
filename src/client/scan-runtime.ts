import { ACTIVE_STORAGE_KEY, HIT_ATTR, SESSION_KEY, STYLE_ID } from '../shared/constants'
import { createCanvasOverlay } from './canvas-overlay'
import type { ViteScanClientConfig, ViteScanSession } from './types'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

/** Persists whether scan should auto-resume on full page refresh. */
function setActiveStorage(isActive: boolean): void {
  try {
    if (isActive)
      window.localStorage.setItem(ACTIVE_STORAGE_KEY, '1')
    else
      window.localStorage.removeItem(ACTIVE_STORAGE_KEY)
  }
  catch {
    // Ignore storage failures and continue with in-memory runtime behavior.
  }
}

/** Reads the current scan session from a global window slot. */
function getSession(): ViteScanSession | null {
  return (window as any)[SESSION_KEY] ?? null
}

/** Persists the current scan session to a global window slot. */
function setSession(session: ViteScanSession | null): void {
  ;(window as any)[SESSION_KEY] = session
}

/** Suppresses the CSS-based bootstrap overlay when the canvas overlay takes over. */
function clearBootstrapOverlay(): void {
  document.getElementById(STYLE_ID)?.remove()
  for (const el of document.querySelectorAll(`[${HIT_ATTR}]`))
    el.removeAttribute(HIT_ATTR)
}

/** Mirrors active state to the node-side plugin for dock updates. */
async function setDockActiveState(context: DockClientScriptContext, active: boolean): Promise<void> {
  await context.rpc.callOptional('vite-scan:set-active', active)
}

/** Creates a compact selector-like label for log summaries. */
function getReadableSelector(element: Element): string {
  if (element.id)
    return `#${element.id}`

  const className = element.className
  if (typeof className === 'string' && className.trim()) {
    const first = className.trim().split(/\s+/)[0]
    if (first)
      return `${element.tagName.toLowerCase()}.${first}`
  }

  const parent = element.parentElement
  if (!parent)
    return element.tagName.toLowerCase()

  const sameTagSiblings = Array.from(parent.children).filter(child => child.tagName === element.tagName)
  const index = sameTagSiblings.indexOf(element) + 1
  return `${element.tagName.toLowerCase()}:nth-of-type(${Math.max(index, 1)})`
}

/** Extracts affected elements from mutation records while ignoring self-noise. */
function collectMutationTargets(records: MutationRecord[]): Set<Element> {
  const targets = new Set<Element>()

  for (const record of records) {
    if (record.type === 'attributes') {
      if (record.attributeName === HIT_ATTR)
        continue

      targets.add(record.target as Element)
      continue
    }

    if (record.type === 'characterData' && record.target.parentElement)
      targets.add(record.target.parentElement)

    for (const node of record.addedNodes) {
      if (node instanceof Element)
        targets.add(node)
      else if (node.nodeType === Node.TEXT_NODE && record.target instanceof Element)
        targets.add(record.target as Element)
    }
  }

  return targets
}

/** Stops the current session, emits summary logs, and clears state/overlays. */
async function stopSession(context: DockClientScriptContext): Promise<void> {
  const session = getSession()
  if (!session || !session.active)
    return

  session.active = false

  if (session.pageHideHandler) {
    window.removeEventListener('pagehide', session.pageHideHandler)
    session.pageHideHandler = null
  }

  session.mutationObserver?.disconnect()
  session.performanceObserver?.disconnect()
  session.canvasOverlay?.destroy()
  setActiveStorage(false)
  await setDockActiveState(context, false)

  const elapsed = Date.now() - session.startedAt
  const hottestElements = Array.from(session.updates.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const topLines = hottestElements.length > 0
    ? hottestElements.map(([element, updates], index) => `${index + 1}. ${getReadableSelector(element)} - ${updates} updates`).join('\n')
    : 'No significant DOM mutations were observed.'

  const totalUpdates = Array.from(session.updates.values()).reduce((sum, count) => sum + count, 0)

  await context.logs.add({
    id: 'vite-scan:summary',
    message: 'vite-scan stopped',
    level: totalUpdates > 0 ? 'warn' : 'success',
    category: 'vite-scan',
    notify: true,
    description: [
      `Duration: ${Math.round(elapsed)}ms`,
      `Total tracked element updates: ${totalUpdates}`,
      `Long tasks: ${session.longTasks} (${Math.round(session.longTaskDuration)}ms total)`,
      `Cumulative layout shift: ${session.cumulativeLayoutShift.toFixed(3)}`,
      '',
      'Top hot elements:',
      topLines,
    ].join('\n'),
  })

  setSession(null)
}

/**
 * Reconciles scan behavior with current config when the action entry is invoked.
 */
export async function runScanAction(context: DockClientScriptContext, config: ViteScanClientConfig): Promise<void> {
  const existing = getSession()
  if (existing?.active) {
    if (!config.enabled)
      await stopSession(context)

    return
  }

  if (!config.enabled) {
    setActiveStorage(false)
    await context.logs.add({
      id: 'vite-scan:disabled',
      message: 'vite-scan is disabled',
      level: 'warn',
      category: 'vite-scan',
      notify: true,
      description: 'Enable it from the "Vite Scan" settings page.',
    })
    return
  }

  clearBootstrapOverlay()
  const overlay = createCanvasOverlay(config)

  const session: ViteScanSession = {
    active: true,
    startedAt: Date.now(),
    pageHideHandler: null,
    canvasOverlay: overlay,
    mutationObserver: null,
    performanceObserver: null,
    updates: new Map(),
    longTasks: 0,
    longTaskDuration: 0,
    cumulativeLayoutShift: 0,
  }

  session.mutationObserver = new MutationObserver((records) => {
    const targets = collectMutationTargets(records)

    for (const element of targets) {
      overlay.addHighlight(element)
      session.updates.set(element, (session.updates.get(element) ?? 0) + 1)
    }
  })

  session.mutationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })

  if ('PerformanceObserver' in window) {
    const supported = PerformanceObserver.supportedEntryTypes ?? []

    if (supported.includes('longtask') || supported.includes('layout-shift')) {
      session.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            session.longTasks += 1
            session.longTaskDuration += entry.duration
          }

          if (entry.entryType === 'layout-shift') {
            const value = (entry as PerformanceEntry & { value?: number, hadRecentInput?: boolean }).value ?? 0
            const hadRecentInput = (entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput ?? false
            if (!hadRecentInput)
              session.cumulativeLayoutShift += value
          }
        }
      })

      const observedTypes = supported.includes('layout-shift')
        ? ['longtask', 'layout-shift']
        : ['longtask']

      for (const type of observedTypes) {
        if (supported.includes(type)) {
          session.performanceObserver.observe({
            type,
            buffered: true,
          })
        }
      }
    }
  }

  session.pageHideHandler = () => {
    const activeSession = getSession()
    if (!activeSession?.active)
      return

    activeSession.active = false
    activeSession.mutationObserver?.disconnect()
    activeSession.performanceObserver?.disconnect()
    activeSession.canvasOverlay?.destroy()
    // Preserve active intent across refresh; panel reconcile will restart observers if needed.
    setSession(null)
  }
  window.addEventListener('pagehide', session.pageHideHandler)

  setSession(session)
  setActiveStorage(true)
  await setDockActiveState(context, true)

  await context.logs.add({
    id: 'vite-scan:running',
    message: 'vite-scan running',
    level: 'info',
    category: 'vite-scan',
    notify: true,
    description: [
      'Interact with your app now. Trigger Vite Scan again to stop early.',
      '',
      `Highlight color: ${config.highlightColor}`,
      `Pulse duration: ${config.pulseDurationMs}ms`,
    ].join('\n'),
  })
}

/** Forwards a config update to the active canvas overlay, if one exists. */
export function updateActiveOverlayConfig(config: ViteScanClientConfig): void {
  getSession()?.canvasOverlay?.updateConfig(config)
}
