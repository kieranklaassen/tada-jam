// The view: flat shapes from the snapshot, nothing else. Weight is size and
// number; a level bar goes green and, once settled, the whole mobile turns.

import { circle, clear, label, line, rect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { HOOK } from './sim.ts'
import type { SwaySnapshot } from './sim.ts'

const MASS_COLORS = ['#f4d35e', '#f79256', '#ee6c4d', '#7d5ba6', '#3d5a80']
const STATUS_COLORS = { empty: '#a99f8e', tipped: '#b5651d', balanced: '#3f9a5a' }

function shapePath(ctx: CanvasRenderingContext2D, form: number, x: number, y: number, r: number): void {
  ctx.beginPath()
  if (form === 0) ctx.arc(x, y, r, 0, Math.PI * 2)
  else if (form === 1) ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8)
  else {
    ctx.moveTo(x, y - r)
    ctx.lineTo(x + r * 1.05, y + r * 0.85)
    ctx.lineTo(x - r * 1.05, y + r * 0.85)
    ctx.closePath()
  }
}

export function draw(ctx: CanvasRenderingContext2D, snapshot: SwaySnapshot): void {
  clear(ctx, snapshot.complete ? '#f3f0d9' : '#f6f0e4')
  rect(ctx, 0, 610, FIELD_W, FIELD_H - 610, '#e6dcc6')

  // The hook and a faint level line through the root pivot.
  const root = snapshot.bars.find((b) => b.root)!
  line(ctx, 0, root.y, FIELD_W, root.y, 'rgba(63,154,90,0.18)', 3)
  line(ctx, HOOK.x, HOOK.y, root.x, root.y, '#6b6252', 4)
  circle(ctx, HOOK.x, HOOK.y, 16, { fill: snapshot.complete ? '#f2b134' : '#6b6252' })

  for (const r of snapshot.ropes) line(ctx, r.x1, r.y1, r.x2, r.y2, '#8a7f6a', 3)

  // Slots: free ones as rings, and the one a held piece would take in yellow.
  for (const s of snapshot.slots) if (s.free) circle(ctx, s.x, s.y, 9, { fill: '#fffaf0', stroke: '#8a7f6a', width: 3 })
  if (snapshot.target) circle(ctx, snapshot.target.x, snapshot.target.y, 24, { stroke: '#f2b134', width: 6 })

  const ordered = [...snapshot.bars].sort((a, b) => Number(a.held) - Number(b.held))
  for (const b of ordered) {
    const dx = b.half * b.gap * Math.cos(b.angle) * b.scale
    const dy = b.half * b.gap * Math.sin(b.angle)
    const color = b.tray ? STATUS_COLORS.empty : STATUS_COLORS[b.status]
    line(ctx, b.x - dx, b.y - dy, b.x + dx, b.y + dy, color, b.tray ? 8 : 12)
    circle(ctx, b.x, b.y, b.turning ? 20 : 14, { fill: b.turning ? '#f2b134' : '#fffaf0', stroke: '#6b6252', width: 4 })
    if (!b.tray && !b.root) label(ctx, b.total, b.x, b.y - 26, { align: 'center', size: 20, color: '#6b6252' })
  }

  const shapes = [...snapshot.shapes].sort((a, b) => Number(a.held) - Number(b.held))
  for (const s of shapes) {
    shapePath(ctx, s.form, s.x, s.y, s.r)
    ctx.fillStyle = MASS_COLORS[s.mass - 1] ?? '#999'
    ctx.fill()
    ctx.strokeStyle = s.held ? '#2b2620' : '#6b6252'
    ctx.lineWidth = s.held ? 6 : 3
    ctx.stroke()
    label(ctx, s.mass, s.x, s.y + 2, { align: 'center', baseline: 'middle', size: 26, color: s.mass >= 3 ? '#fffaf0' : '#2b2620' })
  }

  // Idle guidance: pulse the next piece, show where it goes.
  if (snapshot.hint) {
    const phase = (snapshot.tick % 30) / 30
    const { from, to } = snapshot.hint
    circle(ctx, from.x, from.y, 50 + phase * 30, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
    line(ctx, from.x, from.y, to.x, to.y, 'rgba(43,38,32,0.25)', 5)
    circle(ctx, to.x, to.y, 30 + phase * 20, { stroke: `rgba(242,177,52,${1 - phase})`, width: 6 })
  }

  label(ctx, 'hang every piece so every bar sits level', 24, 44, { size: 26, color: '#6b6252' })
  label(ctx, snapshot.complete ? 'level, and the whole mobile turns' : snapshot.state, 24, 78, { size: 24, color: snapshot.complete ? '#3f9a5a' : '#8a7f6a' })
}
