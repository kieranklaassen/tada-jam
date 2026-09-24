// The view: flat shapes from the snapshot. No state, no input. Words and
// numbers are allowed in the lab.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { PIVOT_Y } from './sim.ts'
import type { BroomSnapshot } from './sim.ts'

const BROOM_COLORS = ['#3b82c4', '#3fa66b', '#e4572e']
const INK = '#2b2620'

export function draw(ctx: CanvasRenderingContext2D, s: BroomSnapshot): void {
  clear(ctx, '#f6f0e4')

  // The rail the fingertip slides along.
  rect(ctx, 60, PIVOT_Y - 3, 1060, 6, '#d9cfba')

  if (s.flag) {
    const f = s.flag
    rect(ctx, f.x - 70, PIVOT_Y - 70, 140, 140, { fill: f.flash ? '#bfe3c7' : '#efe6d0', stroke: '#8a7f6a', width: 3 })
    line(ctx, f.x, PIVOT_Y + 60, f.x, PIVOT_Y - 150, '#8a7f6a', 6)
    ctx.beginPath()
    ctx.moveTo(f.x, PIVOT_Y - 150)
    ctx.lineTo(f.x + 70, PIVOT_Y - 125)
    ctx.lineTo(f.x, PIVOT_Y - 100)
    ctx.closePath()
    ctx.fillStyle = '#e4572e'
    ctx.fill()
    if (f.progress > 0) circle(ctx, f.x, PIVOT_Y, 40 + 30 * f.progress, { stroke: '#3fa66b', width: 8 })
  }

  // Rack of brooms: tap one to stand a fresh broom of that size at home.
  s.rack.forEach((r, i) => {
    roundRect(ctx, r.x, r.y, r.w, r.h, 16, { fill: i === s.broom ? '#ead7b5' : '#e4dccb', stroke: '#8a7f6a', width: 4 })
    const h = [70, 52, 34][i]!
    line(ctx, r.x + r.w / 2, r.y + r.h - 8, r.x + r.w / 2, r.y + r.h - 8 - h, BROOM_COLORS[i]!, 8)
  })

  // The broom: a rod from the fingertip to a head at the far end.
  const color = BROOM_COLORS[s.broom]!
  line(ctx, s.pivot.x, s.pivot.y, s.tip.x, s.tip.y, INK, 8)
  const ux = Math.sin(s.theta)
  const uy = -Math.cos(s.theta)
  const hx = s.tip.x + ux * 20
  const hy = s.tip.y + uy * 20
  line(ctx, s.tip.x - uy * 34, s.tip.y + ux * 34, s.tip.x + uy * 34, s.tip.y - ux * 34, color, 18)
  circle(ctx, hx, hy, 6, INK)

  // The fingertip point.
  circle(ctx, s.pivot.x, s.pivot.y, 30, { fill: s.held ? '#f2b134' : '#ffd97a', stroke: INK, width: 5 })

  if (s.hint) {
    const h = s.hint
    const wobble = Math.sin(s.tick / 5) * 30
    if (h.kind === 'lean') line(ctx, h.x, h.y + 70, h.x + h.dir * (60 + Math.abs(wobble)), h.y + 70, '#e4572e', 10)
    else if (h.kind === 'shake') line(ctx, h.x - 80 + wobble, h.y + 70, h.x + 80 + wobble, h.y + 70, '#8a7f6a', 6)
    else circle(ctx, h.x, h.y, 60 + ((s.tick % 30) / 30) * 40, { stroke: 'rgba(43,38,32,0.5)', width: 5 })
  }

  label(ctx, 'drag the dot under the broom to keep it up', 40, 56, { size: 30, color: '#5d5443' })
  if (s.flag) label(ctx, `flags planted ${s.planted}`, 40, 98, { size: 28, color: '#5d5443' })
  if (s.best) label(ctx, `upright ${s.best.run.toFixed(1)}s   best ${s.best.best.toFixed(1)}s`, 40, 138, { size: 28, color: '#5d5443' })
}
