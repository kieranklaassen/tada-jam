// The view: flat shapes from the snapshot, nothing else. No input, no state.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { FIELD_W } from '../../kit/sim.ts'
import { FLOOR_TOP, SPEC } from './sim.ts'
import type { ScrapSnapshot } from './sim.ts'

const COLOR = { ramp: '#b98a52', spring: '#3fa66b', sponge: '#e8c84a', bumper: '#e4572e', fan: '#5b8fd6' }
const HALF = { ramp: SPEC.ramp.half, spring: SPEC.spring.half, sponge: SPEC.sponge.half }
const THICK = { ramp: SPEC.ramp.r * 2, spring: SPEC.spring.r * 2, sponge: SPEC.sponge.r * 2 }
const NAME = { ramp: 'plank', spring: 'spring', fan: 'fan', sponge: 'sponge', bumper: 'bumper' }

type Tool = ScrapSnapshot['tools'][number]

function drawTool(ctx: CanvasRenderingContext2D, t: Tool, tick: number, alpha = 1): void {
  ctx.globalAlpha = alpha
  const dx = Math.cos(t.angle)
  const dy = Math.sin(t.angle)
  if (t.kind === 'bumper') {
    circle(ctx, t.x, t.y, SPEC.bumper.r, { fill: COLOR.bumper, stroke: '#2b2620', width: 5 })
    circle(ctx, t.x, t.y, 16, '#fff3d6')
  } else if (t.kind === 'fan') {
    if (t.placed) {
      // The air: a trapezoid that widens toward the tip, with moving dashes.
      const L = SPEC.fan.reach
      const px = -dy * SPEC.fan.half
      const py = dx * SPEC.fan.half
      ctx.beginPath()
      ctx.moveTo(t.x + px * 0.4, t.y + py * 0.4)
      ctx.lineTo(t.x + dx * L + px, t.y + dy * L + py)
      ctx.lineTo(t.x + dx * L - px, t.y + dy * L - py)
      ctx.lineTo(t.x - px * 0.4, t.y - py * 0.4)
      ctx.closePath()
      ctx.fillStyle = 'rgba(91,143,214,0.14)'
      ctx.fill()
      for (let i = 0; i < 4; i++) {
        const s = (tick * 6 + i * 75) % L
        line(ctx, t.x + dx * s, t.y + dy * s, t.x + dx * (s + 24), t.y + dy * (s + 24), 'rgba(91,143,214,0.5)', 5)
      }
    }
    circle(ctx, t.x, t.y, SPEC.fan.body, { fill: COLOR.fan, stroke: '#2b2620', width: 5 })
    line(ctx, t.x, t.y, t.x + dx * 28, t.y + dy * 28, '#fff', 8)
  } else {
    const h = HALF[t.kind]
    line(ctx, t.x - dx * h, t.y - dy * h, t.x + dx * h, t.y + dy * h, '#2b2620', THICK[t.kind] + 6)
    line(ctx, t.x - dx * h, t.y - dy * h, t.x + dx * h, t.y + dy * h, COLOR[t.kind], THICK[t.kind])
  }
  ctx.globalAlpha = 1
  if (!t.placed && !t.held) label(ctx, NAME[t.kind], t.x, t.y + 52, { align: 'center', size: 22, color: '#5d5443' })
}

export function draw(ctx: CanvasRenderingContext2D, s: ScrapSnapshot): void {
  clear(ctx, '#efe7d6')
  // Ground and the tray strip beneath it.
  rect(ctx, 0, FLOOR_TOP, FIELD_W, 140, '#c9bfa8')
  rect(ctx, 0, 700, FIELD_W, 120, '#d9d0bb')
  for (const c of s.statics) {
    const color = c.role === 'pillar' ? '#8a7f6a' : c.role === 'tray' ? '#a67c52' : '#7d746a'
    line(ctx, c.ax, c.ay, c.bx, c.by, color, c.r * 2)
  }
  const chute = s.chuteBox
  label(ctx, 'chute', chute.x + 30, chute.y + 14, { size: 22, color: '#8a7f6a' })

  // The cat: asleep with zz, awake with a ring.
  const cat = s.cat
  circle(ctx, cat.x, cat.y - 32, 30, { fill: cat.awake ? '#f2b134' : '#b5a58c', stroke: '#2b2620', width: 5 })
  circle(ctx, cat.x - 16, cat.y - 62, 10, '#b5a58c')
  circle(ctx, cat.x + 16, cat.y - 62, 10, '#b5a58c')
  label(ctx, cat.awake ? '^ ^' : cat.near ? '- o' : '- -', cat.x, cat.y - 28, { align: 'center', size: 24 })
  if (!cat.awake) label(ctx, 'zz', cat.x + 40, cat.y - 76, { size: 28, color: '#8a7f6a' })
  if (cat.awake) circle(ctx, cat.x, cat.y - 40, 80 + (s.tick % 30), { stroke: 'rgba(242,177,52,0.5)', width: 6 })

  // Where the last try went.
  for (const p of s.trail) circle(ctx, p.x, p.y, 4, 'rgba(43,38,32,0.35)')

  for (const t of s.tools) if (t.placed || t.held) drawTool(ctx, t, s.tick, t.held ? 0.7 : 1)
  for (const t of s.tools) if (!t.placed && !t.held) drawTool(ctx, t, s.tick)
  for (const t of s.tools) if (t.knob) circle(ctx, t.knob.x, t.knob.y, 17, { fill: '#fff', stroke: '#2b2620', width: 4 })

  circle(ctx, s.ball.x, s.ball.y, s.ball.r, { fill: '#2b2620' })
  circle(ctx, s.ball.x - 6, s.ball.y - 6, 5, 'rgba(255,255,255,0.6)')

  if (s.hint) {
    const pulse = (s.tick % 30) / 30
    drawTool(ctx, { ...s.hint, placed: true, held: false, knob: null }, s.tick, 0.3)
    circle(ctx, s.hint.x, s.hint.y, 60 + pulse * 40, { stroke: `rgba(43,38,32,${(1 - pulse) * 0.6})`, width: 5 })
  }

  if (s.phase === 'rigging' || s.phase === 'missed') roundRect(ctx, chute.x, chute.y, chute.w, chute.h, 24, { stroke: 'rgba(43,38,32,0.35)', width: 4 })
  if (s.dayBox) {
    roundRect(ctx, s.dayBox.x, s.dayBox.y, s.dayBox.w, s.dayBox.h, 24, { fill: '#f2b134', stroke: '#2b2620', width: 5 })
    label(ctx, 'next day', s.dayBox.x + s.dayBox.w / 2, s.dayBox.y + s.dayBox.h / 2, { align: 'center', baseline: 'middle', size: 30 })
  }
  const line1 = s.phase === 'reached' ? 'the cat is awake' : s.phase === 'rolling' ? 'watch the ball' : 'drag the tools in, tap the chute'
  label(ctx, `day ${s.day + 1}   cats woken ${s.woken}   tries ${s.attempts}`, 40, 44, { size: 28 })
  label(ctx, line1, 40, 80, { size: 24, color: '#8a7f6a' })
  label(ctx, 'tray', 40, 740, { size: 22, color: '#8a7f6a' })
}
