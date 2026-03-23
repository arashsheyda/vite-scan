import {
  DEFAULT_GLOW_COLOR,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_OUTLINE_OFFSET_PX,
  DEFAULT_OUTLINE_WIDTH_PX,
  DEFAULT_PULSE_DURATION_MS,
  DEFAULT_PULSE_SPREAD_PX,
} from '../shared/constants'

/**
 * Creates a page bootstrap script that restores a canvas-based highlight
 * overlay with render count badges after full page reloads.
 *
 * This script is injected as an inline `<script>` into the HTML head.
 * Because it runs before any modules load, it cannot import from the
 * client bundle and must be self-contained.
 */
export function createBootstrapScript(
  isActiveOnServer: boolean,
  configStorageKey: string,
  activeStorageKey: string,
): string {
  const autoFlagKey = '__VITE_SCAN_AUTO_BOOTSTRAP_ACTIVE__'
  const canvasId = '__vite_scan_canvas__'

  return `
(() => {
  try {
    const configStorageKey = ${JSON.stringify(configStorageKey)}
    const activeStorageKey = ${JSON.stringify(activeStorageKey)}
    const isActiveOnServer = ${JSON.stringify(isActiveOnServer)}
    const autoFlagKey = ${JSON.stringify(autoFlagKey)}
    const canvasId = ${JSON.stringify(canvasId)}

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

    const canvas = document.createElement('canvas')
    canvas.id = canvasId
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647'

    const highlights = new Map()
    const counts = new Map()
    const labels = new Map()
    let rafId = null

    const BADGE_FONT = '600 10px ui-sans-serif,-apple-system,BlinkMacSystemFont,sans-serif'

    const getComponentName = (el) => {
      const keys = Object.keys(el)
      for (const key of keys) {
        if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
          let fiber = el[key]
          while (fiber) {
            const t = fiber.type
            if (typeof t === 'function' || typeof t === 'object') {
              const n = typeof t === 'function' ? (t.displayName || t.name) : t?.displayName
              if (n && n !== 'Fragment' && !n.startsWith('_')) return n
            }
            fiber = fiber.return
          }
        }
      }
      const vue = el.__vueParentComponent
      if (vue) {
        let c = vue
        while (c) {
          const n = c.type?.name || c.type?.__name
          if (n) return n
          c = c.parent
        }
      }
      const meta = el.__svelte_meta
      if (meta?.loc?.file) {
        const m = meta.loc.file.match(/([^/\\\\]+)\\.\\w+$/)
        if (m) return m[1]
      }
      const host = el.$$host
      if (host) {
        const n = host.constructor?.name
        if (n && n !== 'Object') return n
      }
      return null
    }

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const now = Date.now()
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      const tw = Math.round(w * dpr)
      const th = Math.round(h * dpr)
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw
        canvas.height = th
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      for (const [target, startedAt] of highlights) {
        const elapsed = now - startedAt
        if (elapsed >= config.pulseDurationMs) {
          highlights.delete(target)
          continue
        }
        let rect
        if (target instanceof Element) {
          rect = target.getBoundingClientRect()
        } else {
          const range = document.createRange()
          range.selectNodeContents(target)
          rect = range.getBoundingClientRect()
          range.detach()
        }
        if (rect.width === 0 && rect.height === 0) continue
        const progress = elapsed / config.pulseDurationMs
        const alpha = 1 - progress
        const off = config.outlineOffsetPx
        const spread = config.pulseSpreadPx * (1 - progress)

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = config.glowColor
        ctx.shadowBlur = spread
        ctx.strokeStyle = config.highlightColor
        ctx.lineWidth = config.outlineWidthPx
        ctx.strokeRect(rect.left - off, rect.top - off, rect.width + off * 2, rect.height + off * 2)
        ctx.restore()

        const countKey = target instanceof Element ? target : target.parentElement || target
        const count = counts.get(countKey) || 1
        const label = labels.get(countKey)
        if (count > 1 || label) {
          const parts = []
          if (label) parts.push('<' + label + '>')
          if (count > 1) parts.push('\\u00D7' + count)
          const text = parts.join(' ')
          ctx.save()
          ctx.globalAlpha = 1
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.font = BADGE_FONT
          const tm = ctx.measureText(text)
          const bw = tm.width + 8
          const bh = 14
          const bx = rect.right + off - bw
          const by = rect.top - off - bh
          ctx.beginPath()
          ctx.roundRect(bx, by, bw, bh, 4)
          ctx.fillStyle = config.highlightColor
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.textBaseline = 'top'
          ctx.fillText(text, bx + 4, by + 2)
          ctx.restore()
        }
      }

      if (highlights.size > 0) rafId = requestAnimationFrame(render)
      else rafId = null
    }

    const observer = new MutationObserver((records) => {
      const targets = new Set()
      for (const record of records) {
        if (record.type === 'attributes') {
          targets.add(record.target)
          continue
        }
        if (record.type === 'characterData' && record.target.nodeType === Node.TEXT_NODE)
          targets.add(record.target)
        for (const node of record.addedNodes) {
          if (node instanceof Element) targets.add(node)
          else if (node.nodeType === Node.TEXT_NODE) targets.add(node)
        }
      }
      for (const target of targets) {
        const now = Date.now()
        const countKey = target instanceof Element ? target : target.parentElement || target
        highlights.set(target, now)
        counts.set(countKey, (counts.get(countKey) || 0) + 1)
        if (!labels.has(countKey)) {
          const el = target instanceof Element ? target : target.parentElement
          if (el) {
            const name = getComponentName(el)
            if (name) labels.set(countKey, name)
          }
        }
        if (rafId === null) rafId = requestAnimationFrame(render)
      }
    })

    const start = () => {
      if (!document.documentElement) return
      document.documentElement.appendChild(canvas)
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      })
    }

    if (document.documentElement) start()
    else window.addEventListener('DOMContentLoaded', start, { once: true })

    window.addEventListener('pagehide', () => {
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
      highlights.clear()
      counts.clear()
      labels.clear()
      canvas.remove()
      window[autoFlagKey] = false
    }, { once: true })
  }
  catch {
    // Keep runtime resilient when localStorage is unavailable or malformed.
  }
})()
  `
}
