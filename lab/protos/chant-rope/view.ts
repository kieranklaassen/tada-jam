// The view: flat shapes from the snapshot, nothing else. Two turners, a rope
// coloured by the beat it is on (slow blue, quick orange), the jumper, and a
// chant bar that says which beat the rope is on. Words are allowed in the lab.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { CHANT, GROUND_Y, JUMPER_X, LEFT_TURNER, MAX_HANG, RIGHT_TURNER } from './sim.ts'
import type { ChantRopeSnapshot } from './sim.ts'

const SLOW = '#3b6fb6'
const QUICK = '#e07a1f'
const HAND_Y = 470

export function draw(ctx: CanvasRenderingContext2D, s: ChantRopeSnapshot): void {
  clear(ctx, '#f3ecdc')
  rect(ctx, 0, GROUND_Y, FIELD_W, FIELD_H - GROUND_Y, '#cdbf9c')
  line(ctx, 0, GROUND_Y, FIELD_W, GROUND_Y, '#8a7f6a', 4)

  drawTurner(ctx, s, LEFT_TURNER.x + LEFT_TURNER.w / 2, s.turners[0], -1)
  drawTurner(ctx, s, RIGHT_TURNER.x + RIGHT_TURNER.w / 2, s.turners[1], 1)

  // The rope: its middle rises to the top of the swing and sweeps the ground at the end of the beat.
  const left = LEFT_TURNER.x + LEFT_TURNER.w / 2 + 40
  const right = RIGHT_TURNER.x + RIGHT_TURNER.w / 2 - 40
  const kind = s.beat >= 2 ? QUICK : SLOW
  const p = s.turning ? s.beatTick / s.beatLen : 0
  const midY = s.turning ? GROUND_Y - 4 - 360 * Math.sin(Math.PI * p) : GROUND_Y - 8
  const tangled = s.jumper.state === 'tangled'
  ctx.beginPath()
  ctx.moveTo(left, HAND_Y)
  // The control point that puts the middle of the curve at midY.
  ctx.quadraticCurveTo((left + right) / 2, midY * 2 - HAND_Y, right, HAND_Y)
  ctx.strokeStyle = s.turning ? kind : tangled ? '#a04040' : '#8a7f6a'
  ctx.lineWidth = 9
  ctx.stroke()

  drawJumper(ctx, s)

  // The chant bar: which beat, and a fill for how far through it.
  CHANT.forEach((name, i) => {
    const x = 330 + i * 130
    const active = s.turning ? s.beat === i : s.demoBeat === i
    roundRect(ctx, x, 40, 120, 56, 14, { fill: active ? (name === 'quick' ? QUICK : SLOW) : '#e4dccb', stroke: '#8a7f6a', width: 3 })
    label(ctx, name, x + 60, 68, { align: 'center', baseline: 'middle', size: 26, color: active ? '#fff' : '#8a7f6a' })
    if (active && s.turning) rect(ctx, x, 96, 120 * (s.beatTick / s.beatLen), 8, '#2b2620')
  })

  const help = !s.turning ? 'hold the jumper, let go to leap' : s.jumper.state === 'coil' ? 'longer hold = longer hang' : ''
  if (help) label(ctx, help, 590, 150, { align: 'center', size: 28, color: '#5d5443' })
  if (s.streak !== null) label(ctx, `in a row ${s.streak}`, 40, 64, { size: 34 })
  if (s.level > 0) label(ctx, `faster x${s.level}`, 40, 104, { size: 26, color: QUICK })
  label(ctx, s.last === 'none' ? '' : s.last, 1140, 64, { align: 'right', size: 26, color: '#5d5443' })

  if (s.hint) {
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 70 + phase * 50, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }
}

function drawTurner(ctx: CanvasRenderingContext2D, s: ChantRopeSnapshot, cx: number, color: string, side: number): void {
  const bob = s.cheer > 0 ? Math.abs(Math.sin(s.cheer / 4)) * 24 : s.wave > 0 ? Math.sin(s.wave) * 6 : 0
  roundRect(ctx, cx - 50, GROUND_Y - 250 - bob, 100, 250, 40, { fill: color, stroke: '#2b2620', width: 4 })
  circle(ctx, cx, GROUND_Y - 290 - bob, 46, { fill: color, stroke: '#2b2620', width: 4 })
  circle(ctx, cx - side * 14, GROUND_Y - 296 - bob, 6, '#2b2620')
  line(ctx, cx - side * 10, GROUND_Y - 190 - bob, cx - side * 40, HAND_Y, '#2b2620', 8)
}

function drawJumper(ctx: CanvasRenderingContext2D, s: ChantRopeSnapshot): void {
  const j = s.jumper
  const squash = j.state === 'coil' ? 1 - 0.4 * j.charge : j.state === 'tangled' ? 0.55 : 1
  const h = 150 * squash
  const y = GROUND_Y - j.lift
  const color = j.state === 'tangled' ? '#b0806a' : '#d0473b'
  roundRect(ctx, JUMPER_X - 40 - (1 - squash) * 20, y - h, 80 + (1 - squash) * 40, h, 30, { fill: color, stroke: '#2b2620', width: 4 })
  circle(ctx, JUMPER_X, y - h - 30, 34, { fill: '#f0c9a0', stroke: '#2b2620', width: 4 })
  if (j.state === 'coil') {
    // How long a leap would hang if let go now.
    rect(ctx, JUMPER_X - 70, GROUND_Y + 30, 140, 14, '#e4dccb')
    rect(ctx, JUMPER_X - 70, GROUND_Y + 30, 140 * (j.predictedHang / MAX_HANG), 14, '#2b2620')
  }
  if (j.state === 'air') circle(ctx, JUMPER_X, GROUND_Y + 10, 28 * (1 - j.lift / 300), 'rgba(43,38,32,0.18)')
}
