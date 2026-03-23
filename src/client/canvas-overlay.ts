import { CANVAS_ID } from '../shared/constants'
import { getComponentName } from './component-name'
import type { CanvasOverlay, HighlightTarget } from './types'
import type { ViteScanClientConfig } from '../shared/types'

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
  const highlights = new Map<HighlightTarget, number>()
  const counts = new Map<HighlightTarget, number>()
  const labels = new Map<HighlightTarget, string>()
  let rafId: number | null = null

  const canvas = document.createElement('canvas')
  canvas.id = CANVAS_ID
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647'
  document.documentElement.appendChild(canvas)

  const ctx = canvas.getContext('2d')!

  const BADGE_FONT = '600 10px ui-sans-serif,-apple-system,BlinkMacSystemFont,sans-serif'
  const BADGE_PAD_X = 4
  const BADGE_PAD_Y = 2
  const BADGE_RADIUS = 4

  function drawBadge(x: number, y: number, text: string, color: string): void {
    ctx.font = BADGE_FONT
    const metrics = ctx.measureText(text)
    const textW = metrics.width
    const textH = 10
    const bw = textW + BADGE_PAD_X * 2
    const bh = textH + BADGE_PAD_Y * 2

    const bx = x - bw
    const by = y - bh

    ctx.save()
    ctx.globalAlpha = 1
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, BADGE_RADIUS)
    ctx.fillStyle = color
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = BADGE_FONT
    ctx.textBaseline = 'top'
    ctx.fillText(text, bx + BADGE_PAD_X, by + BADGE_PAD_Y)
    ctx.restore()
  }

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

    for (const [target, startedAt] of highlights) {
      const elapsed = now - startedAt
      if (elapsed >= config.pulseDurationMs) {
        highlights.delete(target)
        continue
      }

      let rect: DOMRect
      if (target instanceof Element) {
        rect = target.getBoundingClientRect()
      }
      else {
        const range = document.createRange()
        range.selectNodeContents(target)
        rect = range.getBoundingClientRect()
        range.detach()
      }
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

      const countKey = target instanceof Element ? target : target.parentElement ?? target
      const count = counts.get(countKey) ?? 1
      const label = labels.get(countKey)
      if (count > 1 || label) {
        const parts: string[] = []
        if (label)
          parts.push(`<${label}>`)
        if (count > 1)
          parts.push(`\u00D7${count}`)
        drawBadge(rect.right + offset, rect.top - offset, parts.join(' '), config.highlightColor)
      }
    }

    if (highlights.size > 0)
      rafId = requestAnimationFrame(render)
    else
      rafId = null
  }

  return {
    addHighlight(target: HighlightTarget, count: number): void {
      highlights.set(target, Date.now())
      const countKey = target instanceof Element ? target : target.parentElement ?? target
      counts.set(countKey, count)
      if (!labels.has(countKey)) {
        const el = target instanceof Element ? target : target.parentElement
        const name = el ? getComponentName(el) : null
        if (name)
          labels.set(countKey, name)
      }
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
      counts.clear()
      labels.clear()
      canvas.remove()
    },
  }
}
