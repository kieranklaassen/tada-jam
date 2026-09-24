// The view: flat shapes from the snapshot, nothing else. It forwards no input
// (the shell maps pointer events to logical coordinates and calls sim.pointer)
// and holds no state, so the same snapshot always draws the same picture.
// Words and numbers are allowed in the lab.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { BalloonSnapshot } from './sim.ts'

const BROWN = '#8a5a3c'
const DARK = '#2b2620'

function drawBear(ctx: CanvasRenderingContext2D, s: BalloonSnapshot): void {
  const { bear } = s
  const bob = bear.pose === 'walk' ? Math.sin(s.tick * 0.5) * 8 : Math.sin(s.tick * 0.08) * 3
  const top = bear.body.y + bob
  // The reach zone: where the bear's paw can get to.
  rect(ctx, bear.reach.x, bear.reach.y, bear.reach.w, bear.reach.h, { fill: 'rgba(138,90,60,0.07)', stroke: 'rgba(138,90,60,0.25)', width: 3 })
  // The arm: up and out when batting, waving when tapped, resting otherwise.
  const up = bear.pose === 'bat' ? 220 + (bear.poseT / 14) * 200 : 40
  const sway = bear.pose === 'wave' ? Math.sin(s.tick * 0.8) * 60 : 0
  line(ctx, bear.x + 90, top + 30, bear.x + 100 + sway, top - up, BROWN, 40)
  circle(ctx, bear.x + 100 + sway, top - up, 34, BROWN)
  roundRect(ctx, bear.body.x, top, bear.body.w, bear.body.h, 60, BROWN)
  circle(ctx, bear.x, top - 30, 70, BROWN)
  circle(ctx, bear.x - 55, top - 90, 26, BROWN)
  circle(ctx, bear.x + 55, top - 90, 26, BROWN)
  circle(ctx, bear.x - 24, top - 40, 8, DARK)
  circle(ctx, bear.x + 24, top - 40, 8, DARK)
  circle(ctx, bear.x, top - 14, 16, '#d9b38c')
}

export function draw(ctx: CanvasRenderingContext2D, s: BalloonSnapshot): void {
  clear(ctx, '#dfeef7')
  rect(ctx, 0, FIELD_H - 24, FIELD_W, 24, '#9fc47a')
  drawBear(ctx, s)

  // A curved trail shows the curl.
  s.trail.forEach((p, i) => circle(ctx, p.x, p.y, 6 + i * 0.4, `rgba(228,87,46,${0.05 + (i / s.trail.length) * 0.3})`))

  const b = s.balloon
  line(ctx, b.x, b.y + b.r, b.x + 8, b.y + b.r + 50, '#8a7f6a', 3)
  const spinning = Math.abs(b.spin) > 0.25
  circle(ctx, b.x, b.y, b.r, { fill: '#e4572e', stroke: spinning ? '#f2b134' : b.cradled ? '#3b82c4' : undefined, width: 4 + Math.abs(b.spin) * 10 })
  // Three spokes turn with the spin, so you can see which way it is going round.
  for (let k = 0; k < 3; k++) {
    const a = b.angle + (k * Math.PI * 2) / 3
    line(ctx, b.x + Math.cos(a) * b.r * 0.25, b.y + Math.sin(a) * b.r * 0.25, b.x + Math.cos(a) * b.r * 0.8, b.y + Math.sin(a) * b.r * 0.8, '#f6d7c9', 10)
  }
  circle(ctx, b.x - b.r * 0.32, b.y - b.r * 0.34, b.r * 0.14, 'rgba(255,255,255,0.55)')
  if (spinning) label(ctx, b.spin > 0 ? '↻ curling right' : '↺ curling left', b.x, b.y - b.r - 16, { align: 'center', size: 26, color: '#a5561f' })
  if (b.cradled) label(ctx, 'cradled', b.x, b.y - b.r - 16, { align: 'center', size: 26, color: '#2f6ea5' })

  for (const f of s.fingers) circle(ctx, f.x, f.y, 26, { fill: 'rgba(43,38,32,0.2)', stroke: 'rgba(43,38,32,0.5)', width: 3 })

  if (s.hint) {
    // Grows and fades on the tick clock, never a wall clock.
    const phase = (s.tick % 30) / 30
    if (s.hint.kind === 'ring') circle(ctx, s.hint.x, s.hint.y, 70 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
    else {
      circle(ctx, s.hint.x, s.hint.y, 30 + phase * 14, { fill: `rgba(242,177,52,${0.8 - phase * 0.5})`, stroke: DARK, width: 3 })
      label(ctx, 'pat the side', s.hint.x, s.hint.y + 70, { align: 'center', size: 24 })
    }
  }

  label(ctx, 'pat the middle: straight up. pat a side: it curls that way. hold a finger under it: it rests.', 40, 44, { size: 24, color: '#5d5443' })
  label(ctx, `bear bats ${s.bats}   rally ${s.rally}   floor ${s.landings}`, 40, 84, { size: 30 })
}
