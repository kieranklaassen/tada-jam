// Canvas plumbing: letterbox the 1180 by 820 logical field into whatever size
// the element has, map pointer coordinates back, and keep the backing store
// sharp without going past a device pixel ratio of 2.

import { FIELD_H, FIELD_W } from './sim.ts'

export interface Fit {
  scale: number
  offsetX: number
  offsetY: number
}

// The letterbox for a viewport of cssW by cssH CSS pixels, or null while the
// element has no usable size (0 by 0 before layout, a hidden pane, NaN).
export function fitField(cssW: number, cssH: number): Fit | null {
  if (!Number.isFinite(cssW) || !Number.isFinite(cssH) || cssW <= 0 || cssH <= 0) return null
  const scale = Math.min(cssW / FIELD_W, cssH / FIELD_H)
  return {
    scale,
    offsetX: (cssW - FIELD_W * scale) / 2,
    offsetY: (cssH - FIELD_H * scale) / 2,
  }
}

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

export interface LogicalPoint {
  x: number
  y: number
}

// Client coordinates to logical field coordinates. Not clamped: a touch in a
// letterbox bar lands outside 0..FIELD, and the sim's own hit-test decides
// what that means. Null while the element has no size.
export function toLogical(clientX: number, clientY: number, rect: RectLike): LogicalPoint | null {
  const fit = fitField(rect.width, rect.height)
  if (!fit) return null
  return {
    x: (clientX - rect.left - fit.offsetX) / fit.scale,
    y: (clientY - rect.top - fit.offsetY) / fit.scale,
  }
}

export const MAX_DPR = 2

export function cappedDpr(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return 1
  return Math.min(raw, MAX_DPR)
}

export interface MountedCanvas {
  canvas: HTMLCanvasElement
  // Clears the whole backing store, clips to the logical field, and runs the
  // callback with logical coordinates. Returns false (and draws nothing)
  // before the first real measurement.
  drawField(draw: (ctx: CanvasRenderingContext2D) => void): boolean
  dispose(): void
}

// Creates a canvas in `host` that fills it. The canvas watches its OWN element
// with a ResizeObserver and ignores 0 by 0 measurements, so a parked or hidden
// host keeps the last good size.
export function mountCanvas(host: HTMLElement): MountedCanvas {
  const canvas = document.createElement('canvas')
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.touchAction = 'none'
  host.appendChild(canvas)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available')
  const ctx: CanvasRenderingContext2D = context

  let current: Fit | null = null
  let dpr = 1

  const apply = (cssW: number, cssH: number) => {
    const next = fitField(cssW, cssH)
    if (!next) return
    dpr = cappedDpr(window.devicePixelRatio)
    const pixelW = Math.max(1, Math.round(cssW * dpr))
    const pixelH = Math.max(1, Math.round(cssH * dpr))
    // Assigning width or height clears the canvas and resets its transform.
    if (canvas.width !== pixelW) canvas.width = pixelW
    if (canvas.height !== pixelH) canvas.height = pixelH
    current = next
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1]
    if (entry) apply(entry.contentRect.width, entry.contentRect.height)
  })
  observer.observe(canvas)
  apply(canvas.clientWidth, canvas.clientHeight)

  return {
    canvas,
    drawField(draw) {
      const fit = current
      if (!fit) return false
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.setTransform(dpr * fit.scale, 0, 0, dpr * fit.scale, dpr * fit.offsetX, dpr * fit.offsetY)
      ctx.beginPath()
      ctx.rect(0, 0, FIELD_W, FIELD_H)
      ctx.clip()
      try {
        draw(ctx)
      } finally {
        ctx.restore()
      }
      return true
    },
    dispose() {
      observer.disconnect()
      canvas.remove()
    },
  }
}
