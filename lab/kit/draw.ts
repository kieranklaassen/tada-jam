// Small flat-shape helpers for prototype views. Coordinates are the logical
// 1180 by 820 field (the shell has already scaled the context). Words and
// numbers are allowed in the lab, so `label` is here on purpose.

import { FIELD_H, FIELD_W } from './sim.ts'

// A colour string fills the shape; an object can also stroke it.
export type Paint = string | { fill?: string; stroke?: string; width?: number }

function paint(ctx: CanvasRenderingContext2D, style: Paint): void {
  if (typeof style === 'string') {
    ctx.fillStyle = style
    ctx.fill()
    return
  }
  if (style.fill) {
    ctx.fillStyle = style.fill
    ctx.fill()
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke
    ctx.lineWidth = style.width ?? 4
    ctx.stroke()
  }
}

// Fill the whole logical field.
export function clear(ctx: CanvasRenderingContext2D, color = '#f4efe6'): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, FIELD_W, FIELD_H)
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: Paint): void {
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  paint(ctx, style)
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  style: Paint,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  paint(ctx, style)
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, style: Paint): void {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2)
  paint(ctx, style)
}

export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 4,
): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

export interface LabelOptions {
  size?: number
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  weight?: string
}

// Text on the field, system fonts only.
export function label(
  ctx: CanvasRenderingContext2D,
  text: string | number,
  x: number,
  y: number,
  options: LabelOptions = {},
): void {
  const { size = 28, color = '#2b2620', align = 'left', baseline = 'alphabetic', weight = '600' } = options
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(String(text), x, y)
}
