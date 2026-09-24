// The view: flat shapes from the snapshot, nothing else. Ugly on purpose. It
// forwards no input and holds no state. The streaks lean the way the drops
// fly, and a band along the top swells with each gust, so the gust is visible
// in the sky before it reaches the leaf.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { DROP_VY, GROUND_Y } from './sim.ts'
import type { CreatureView, RainSnapshot } from './sim.ts'

// Straight blend of two #rrggbb colours, t from 0 to 1.
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t)).join(',')})`
}

function creature(ctx: CanvasRenderingContext2D, c: CreatureView, tick: number): void {
  // Damp creatures go blue-grey; a relaxed one glows and settles.
  const body = mix(c.color, '#5a6f86', (1 - c.comfort) * 0.55)
  const bob = c.relaxed ? Math.sin(tick / 12 + c.x) * 3 : 0
  circle(ctx, c.x, c.y + bob, c.r, { fill: body, stroke: c.relaxed ? '#f4d35e' : '#2b2620', width: c.relaxed ? 8 : 4 })
  const eyeY = c.y - c.r * 0.15 + bob
  for (const dx of [-0.35, 0.35]) {
    if (c.relaxed) line(ctx, c.x + dx * c.r - 9, eyeY, c.x + dx * c.r + 9, eyeY, '#2b2620', 4)
    else {
      circle(ctx, c.x + dx * c.r, eyeY, 9, '#ffffff')
      circle(ctx, c.x + dx * c.r + (c.comfort < 0.3 ? 0 : 2), eyeY + (c.comfort < 0.3 ? 3 : 0), 4, '#2b2620')
    }
  }
  if (c.relaxed) label(ctx, 'z', c.x + c.r * 0.7, c.y - c.r * 0.8 + bob, { size: 30, color: '#3d4b3a' })
  // A comfort bar above the creature: the child sees who is drying out.
  rect(ctx, c.x - 40, c.y - c.r - 26, 80, 10, '#d8d8d8')
  rect(ctx, c.x - 40, c.y - c.r - 26, 80 * c.comfort, 10, c.relaxed ? '#e0b800' : c.comfort < 0.3 ? '#c0483a' : '#5aa469')
}

export function draw(ctx: CanvasRenderingContext2D, s: RainSnapshot): void {
  clear(ctx, mix('#9fb1c2', '#f2e6b0', s.sun))
  rect(ctx, 0, GROUND_Y, FIELD_W, FIELD_H - GROUND_Y, '#7c9a6b')

  // The gust band: it swells before the gust reaches the leaf.
  rect(ctx, 0, 0, FIELD_W, 26, `rgba(255,255,255,${0.12 + 0.7 * s.gust})`)
  if (s.gust > 0.15) {
    const arrows = s.day.dir > 0 ? '>>>   >>>   >>>   >>>' : '<<<   <<<   <<<   <<<'
    label(ctx, arrows, FIELD_W / 2, 22, { align: 'center', size: 22, color: `rgba(43,38,32,${s.gust})` })
  }

  for (const c of s.creatures) creature(ctx, c, s.tick)

  // One path for every streak: each is a short line along the drop's flight.
  ctx.beginPath()
  for (const [x, y, vx] of s.drops) {
    ctx.moveTo(x - vx * 1.6, y - DROP_VY * 1.6)
    ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(40,70,120,0.6)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()

  for (const sp of s.splashes) circle(ctx, sp.x, sp.y, 6 + sp.age * 3, { stroke: `rgba(255,255,255,${1 - sp.age / 9})`, width: 3 })

  // The leaf: a green ellipse with a vein; darker outline while held.
  const { x, y, hw, held } = s.leaf
  ctx.beginPath()
  ctx.ellipse(x, y, hw, 26, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#4f9a4a'
  ctx.fill()
  ctx.strokeStyle = held ? '#2b2620' : '#2f6b2c'
  ctx.lineWidth = held ? 6 : 3
  ctx.stroke()
  line(ctx, x - hw + 12, y, x + hw - 12, y, '#2f6b2c', 3)

  if (s.hint) {
    // A ghost leaf over the dampest creature and a ring that pulses on ticks.
    const phase = (s.tick % 30) / 30
    ctx.beginPath()
    ctx.ellipse(s.hint.x, s.hint.y, hw, 26, 0, 0, Math.PI * 2)
    ctx.setLineDash([12, 10])
    ctx.strokeStyle = 'rgba(43,38,32,0.6)'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.setLineDash([])
    const c = s.creatures[s.hint.creature]!
    circle(ctx, c.x, c.y, c.r + 12 + phase * 26, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }

  roundRect(ctx, 16, 36, 470, 44, 12, 'rgba(255,255,255,0.55)')
  label(ctx, 'drag the leaf to keep the rain off', 30, 68, { size: 26 })
  label(ctx, `wind ${s.day.slantClass}   rain ${s.day.rain}`, 30, 108, { size: 22, color: '#3a4550' })
  if (s.rainbows !== null) label(ctx, `rainbows ${s.rainbows}`, FIELD_W - 30, 68, { align: 'right', size: 28 })
}
