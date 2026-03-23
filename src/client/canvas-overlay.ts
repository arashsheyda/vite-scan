import { CANVAS_ID } from '../shared/constants'
import type { CanvasOverlay, ViteScanClientConfig } from './types'

/**
 * Creates a canvas-based highlight overlay.
 *
 * Instead of injecting CSS outlines (which trigger layout/paint on every
 * mutation), this composites translucent rectangles on a fixed-position
 * canvas using getBoundingClientRect — significantly cheaper for
 * high-churn pages.
 */
export function createCanvasOverlay(initialConfig: ViteScanClientConfig): CanvasOverlay {
  let config = initialConfig
  const highlights = new Map<Element, number>()
  let rafId: number | null = null

  const canvas = document.createElement('canvas')
  canvas.id = CANVAS_ID
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647'
  document.documentElement.appendChild(canvas)

  const ctx = canvas.getContext('2d')!

  function render(): void {
    const now = Date.now()
    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight

    const targetW = Math.round(width * dpr)
    const targetH = Math.round(height * dpr)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    for (const [element, startedAt] of highlights) {
      const elapsed = now - startedAt
      if (elapsed >= config.pulseDurationMs) {
        highlights.delete(element)
        continue
      }

      const rect = element.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0)
        continue

      const progress = elapsed / config.pulseDurationMs
      const alpha = 1 - progress
      const offset = config.outlineOffsetPx
      const spread = config.pulseSpreadPx * (1 - progress)

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.shadowColor = config.glowColor
      ctx.shadowBlur = spread
      ctx.strokeStyle = config.highlightColor
      ctx.lineWidth = config.outlineWidthPx
      ctx.strokeRect(
        rect.left - offset,
        rect.top - offset,
        rect.width + offset * 2,
        rect.height + offset * 2,
      )
      ctx.restore()
    }

    if (highlights.size > 0)
      rafId = requestAnimationFrame(render)
    else
      rafId = null
  }

  return {
    addHighlight(element: Element): void {
      highlights.set(element, Date.now())
      if (rafId === null)
        rafId = requestAnimationFrame(render)
    },

    updateConfig(newConfig: ViteScanClientConfig): void {
      config = newConfig
    },

    destroy(): void {
      if (rafId !== null)
        cancelAnimationFrame(rafId)
      highlights.clear()
      canvas.remove()
    },
  }
}
