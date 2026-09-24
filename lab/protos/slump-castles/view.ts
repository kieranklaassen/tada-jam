// The view: the sand as flat contour bands (one band per height unit), darker
// where damp, grey-blue where soaked, with a line wherever the band changes
// (many lines close together is a steep wall). Holds no state.

import { circle, clear, label, rect, roundRect } from '../../kit/draw.ts'
import { BOX, BUCKET_BTN, CELL, COLS, ROWS, SHOVEL_BTN } from './sim.ts'
import type { SandSnapshot } from './sim.ts'

type Rgb = readonly [number, number, number]
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: Rgb) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
const t01 = (n: number) => Math.min(1, Math.max(0, n))

const DRY_LOW: Rgb = [246, 233, 188]
const DRY_HIGH: Rgb = [212, 186, 116]
const DAMP_LOW: Rgb = [178, 140, 88]
const DAMP_HIGH: Rgb = [112, 80, 46]
const SOUP: Rgb = [128, 150, 164]
const GROUND: Rgb = [122, 92, 62]

function cellColour(h: number, d: number, sog: number): Rgb {
  if (h < 0.3) return GROUND
  const up = t01(Math.floor(h) / 12)
  const damp = t01(1 - d / h)
  const c = mix(mix(DRY_LOW, DRY_HIGH, up), mix(DAMP_LOW, DAMP_HIGH, up), damp)
  return sog > 0.3 ? mix(c, SOUP, t01((sog - 0.3) / 0.4)) : c
}

export function draw(ctx: CanvasRenderingContext2D, s: SandSnapshot): void {
  clear(ctx, '#dcd3bd')
  rect(ctx, BOX.x - 8, BOX.y - 8, BOX.w + 16, BOX.h + 16, '#8a6f4a')
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      rect(ctx, BOX.x + c * CELL, BOX.y + r * CELL, CELL, CELL, css(cellColour(s.h[i]!, s.d[i]!, s.sog[i]!)))
    }
  }
  // Contour lines along every edge where the height band changes.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c
      const band = Math.floor(s.h[i]!)
      const x = BOX.x + c * CELL
      const y = BOX.y + r * CELL
      if (c + 1 < COLS) {
        const step = Math.abs(band - Math.floor(s.h[i + 1]!))
        if (step > 0) rect(ctx, x + CELL - 1, y, step > 1 ? 4 : 2, CELL, 'rgba(60,40,20,0.55)')
      }
      if (r + 1 < ROWS) {
        const step = Math.abs(band - Math.floor(s.h[i + COLS]!))
        if (step > 0) rect(ctx, x, y + CELL - 1, CELL, step > 1 ? 4 : 2, 'rgba(60,40,20,0.55)')
      }
    }
  }

  for (const f of s.fingers) {
    circle(ctx, f.x, f.y, 22 + f.load * 0.35, { stroke: f.tool === 'shovel' ? '#3b2a14' : '#1f6fb0', width: 5 })
    if (f.load > 0) label(ctx, `${Math.round(f.load)}`, f.x, f.y - 34 - f.load * 0.35, { align: 'center', size: 26 })
  }
  if (s.hint) {
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 50 + phase * 40, { stroke: `rgba(30,30,30,${(1 - phase) * 0.7})`, width: 6 })
  }

  for (const [btn, tool, text] of [
    [SHOVEL_BTN, 'shovel', 'shovel'],
    [BUCKET_BTN, 'bucket', 'bucket'],
  ] as const) {
    const on = s.tool === tool
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 22, { fill: on ? '#f3e7c4' : '#c9bfa6', stroke: on ? '#2b2620' : '#8a7f6a', width: on ? 7 : 3 })
    label(ctx, text, btn.x + btn.w / 2, btn.y + btn.h / 2, { align: 'center', baseline: 'middle', size: 34 })
  }
  label(ctx, tellMe(s), 520, 726, { size: 26, color: '#4a4030' })
  label(ctx, `${s.form}, ${s.state}, ${s.weather} day, tallest ${s.peak.toFixed(1)}`, 520, 772, { size: 24, color: '#6a5f48' })
}

function tellMe(s: SandSnapshot): string {
  return s.tool === 'shovel' ? 'shovel: drag to scoop, stop or lift to pour' : 'bucket: hold or drag to sprinkle water'
}
