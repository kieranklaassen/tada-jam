// The view: flat shapes from the snapshot, nothing else. The water is one small
// image scaled up (one cell, one pixel), so a whole pond costs one draw. It
// forwards no input and holds no state beyond a scratch canvas.

import { circle, clear, label } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { HEIGHT_SCALE } from './sim.ts'
import type { PondSnapshot } from './sim.ts'

let scratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; image: ImageData } | null = null

function scratchFor(cols: number, rows: number) {
  if (scratch && scratch.canvas.width === cols && scratch.canvas.height === rows) return scratch
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  scratch = { canvas, ctx, image: ctx.createImageData(cols, rows) }
  return scratch
}

// Water: mid blue, crests pale, troughs deep; dead-still water under live
// water is tinted green so the still lines can be seen even in a screenshot.
function paintWater(ctx: CanvasRenderingContext2D, snap: PondSnapshot): void {
  const buffer = scratchFor(snap.cols, snap.rows)
  if (!buffer) return
  const data = buffer.image.data
  for (let k = 0; k < snap.cols * snap.rows; k++) {
    const v = Math.max(-1, Math.min(1, snap.h[k]! / HEIGHT_SCALE))
    let r = 88 + v * 110
    let g = 148 + v * 80
    let b = 196 + v * 50
    if (snap.calm[k]) {
      r = r * 0.55 + 70 * 0.45
      g = g * 0.55 + 200 * 0.45
      b = b * 0.55 + 120 * 0.45
    }
    data[k * 4] = r
    data[k * 4 + 1] = g
    data[k * 4 + 2] = b
    data[k * 4 + 3] = 255
  }
  buffer.ctx.putImageData(buffer.image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(buffer.canvas, 0, 0, snap.cols * snap.cell, snap.rows * snap.cell)
}

export function draw(ctx: CanvasRenderingContext2D, snap: PondSnapshot): void {
  clear(ctx, '#2f5673')
  paintWater(ctx, snap)

  for (const s of snap.sources) {
    const pulse = (snap.tick % 14) / 14
    circle(ctx, s.x, s.y, 16 + pulse * 10 * s.strength, { stroke: `rgba(255,255,255,${0.7 * s.strength})`, width: 4 })
    circle(ctx, s.x, s.y, 9, { fill: s.steady ? '#1d3f5c' : '#dbe9f3', stroke: s.held ? '#fff' : undefined, width: 4 })
  }

  for (const c of snap.corks) {
    // A cork rides the water: it swells on a crest and shrinks in a trough.
    const scale = 1 + Math.max(-0.5, Math.min(0.5, c.bob)) * 0.5
    if (c.parked) circle(ctx, c.x, c.y, c.r * 1.55, { stroke: '#7be39a', width: 6 })
    circle(ctx, c.x + 3, c.y + 5, c.r * scale, 'rgba(0,0,0,0.22)')
    circle(ctx, c.x, c.y, c.r * scale, { fill: c.colour, stroke: c.held ? '#fff' : '#6b4423', width: c.held ? 6 : 4 })
    circle(ctx, c.x - c.r * 0.28, c.y - c.r * 0.3, c.r * 0.22 * scale, 'rgba(255,240,210,0.6)')
  }

  if (snap.hint) {
    const phase = (snap.tick % 30) / 30
    circle(ctx, snap.hint.x, snap.hint.y, 60 + phase * 50, { stroke: `rgba(255,255,255,${(1 - phase) * 0.8})`, width: 6 })
  }

  label(ctx, 'tap the water for a ring. hold it to keep it rippling.', 36, 52, { size: 28, color: '#f2f7fb' })
  label(ctx, 'two holds make lines of still water: park a cork on one.', 36, 88, { size: 28, color: '#f2f7fb' })
  const resting = `corks resting: ${snap.parked} of ${snap.corks.length}`
  label(ctx, snap.lines !== null ? `${resting}   still lines: ${snap.lines}` : resting, 36, FIELD_H - 34, { size: 30, color: '#f2f7fb' })
  label(ctx, `ripple width ${snap.wavelength}`, FIELD_W - 36, FIELD_H - 34, { size: 24, color: '#b9d0e0', align: 'right' })
}
