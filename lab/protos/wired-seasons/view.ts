// The view: flat shapes from the snapshot, nothing else. It forwards no input
// (the shell maps pointer events to logical coordinates and calls sim.pointer)
// and holds no state.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { FALL_TICKS, GROUND_Y } from './sim.ts'
import type { WiredSnapshot } from './sim.ts'

export function draw(ctx: CanvasRenderingContext2D, snapshot: WiredSnapshot): void {
  clear(ctx, '#eef3e6')
  rect(ctx, 0, GROUND_Y, FIELD_W, FIELD_H - GROUND_Y, '#c9b48f')

  // The picture the child is growing toward, when that hook is on.
  const pic = snapshot.picture
  if (pic) {
    for (const b of pic.blobs) {
      ctx.beginPath()
      ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(120,150,200,0.16)'
      ctx.fill()
      ctx.setLineDash([12, 10])
      ctx.strokeStyle = 'rgba(80,110,170,0.55)'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.setLineDash([])
    }
    label(ctx, `picture: ${pic.name}   matched ${pic.matches}`, 40, 110, { size: 24, color: '#5c76a8' })
  }

  // Limbs already dropped fall and fade.
  for (const f of snapshot.fallen) {
    const t = f.age / FALL_TICKS
    ctx.globalAlpha = 1 - t
    line(ctx, f.x1, f.y1 + t * 90, f.x2, f.y2 + t * 90, '#8a6a44', 6)
  }
  ctx.globalAlpha = 1

  // Parents come first in the list, so thick trunks are covered by their kids' joints.
  for (const l of snapshot.limbs) {
    line(ctx, l.x1, l.y1, l.x2, l.y2, l.dim > 0 ? '#8c6a3a' : '#5b4630', l.w)
    if (l.wired) line(ctx, l.x1, l.y1, l.x2, l.y2, '#c9a227', 3)
  }
  for (const l of snapshot.limbs) {
    const leaf = l.tip ? 36 : 18
    const colour = l.dim > 0 ? 'rgba(170,140,60,0.75)' : l.shaded ? 'rgba(90,140,90,0.55)' : 'rgba(70,170,90,0.7)'
    circle(ctx, l.x2, l.y2, leaf, colour)
    if (l.cut) {
      circle(ctx, l.x2 - 9, l.y2 - 6, 7, '#d9483b')
      circle(ctx, l.x2 + 9, l.y2 - 6, 7, '#d9483b')
    }
  }

  if (snapshot.hint) {
    const phase = (snapshot.tick % 30) / 30
    circle(ctx, snapshot.hint.x, snapshot.hint.y, 50 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }

  const b = snapshot.button
  roundRect(ctx, b.x, b.y, b.w, b.h, 22, { fill: '#e9b949', stroke: '#8a6b1c', width: 4 })
  label(ctx, 'next season', b.x + b.w / 2, b.y + b.h / 2, { align: 'center', baseline: 'middle', size: 28, color: '#3b2f0f' })
  label(ctx, `year ${snapshot.year}   lost ${snapshot.lost}`, 40, 64, { size: 34 })
  label(ctx, 'tap a limb to snip   drag a limb to wire   brown limbs are starving', 40, 790, { size: 22, color: '#5d5443' })
}
