// The view: flat shapes from the snapshot, nothing else. It forwards no input
// (the shell maps pointer events to logical coordinates and calls sim.pointer)
// and holds no state. Words are allowed in the lab.

import { circle, clear, label, line, rect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { GATE, LANE_Y } from './sim.ts'
import type { AnimalView, Kind, WhoSnapshot } from './sim.ts'

const COLOR: Record<Kind, string> = { mouse: '#9b9b9b', cat: '#e58a2f', elephant: '#6f86b5' }
const LETTER: Record<Kind, string> = { mouse: 'M', cat: 'C', elephant: 'E' }

function crown(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const w = r * 0.9
  ctx.beginPath()
  ctx.moveTo(x - w, y)
  ctx.lineTo(x - w, y - r * 0.6)
  ctx.lineTo(x - w / 2, y - r * 0.3)
  ctx.lineTo(x, y - r * 0.8)
  ctx.lineTo(x + w / 2, y - r * 0.3)
  ctx.lineTo(x + w, y - r * 0.6)
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fillStyle = '#f2c230'
  ctx.fill()
  ctx.strokeStyle = '#8a6d0b'
  ctx.lineWidth = 3
  ctx.stroke()
}

function animal(ctx: CanvasRenderingContext2D, a: AnimalView, patience: [number, number]): void {
  const across = a.phase === 'across'
  const r = across ? a.r * 0.4 : a.r
  circle(ctx, a.x, a.y, r, { fill: COLOR[a.kind], stroke: a.held ? '#2b2620' : a.still ? '#7a3b3b' : '#4a4338', width: a.held || a.still ? 7 : 3 })
  // Ears and a trunk say which is which even before the letter is read.
  if (a.kind === 'mouse') for (const s of [-1, 1]) circle(ctx, a.x + s * r * 0.7, a.y - r * 0.8, r * 0.35, '#c9a0a0')
  if (a.kind === 'cat') for (const s of [-1, 1]) line(ctx, a.x + s * r * 0.5, a.y - r * 0.9, a.x + s * r * 0.85, a.y - r * 1.3, '#4a4338', 6)
  if (a.kind === 'elephant') line(ctx, a.x, a.y + r * 0.2, a.x, a.y + r * 0.95, '#4a4338', 12)
  if (!across) label(ctx, LETTER[a.kind], a.x, a.y + r * 0.15, { align: 'center', baseline: 'middle', size: Math.round(r * 0.9), color: '#fff' })
  if (a.vip && !across) crown(ctx, a.x, a.y - r - 6, r * 0.7)
  if (a.still) label(ctx, 'zzz - will not budge', a.x, a.y - r - 16, { align: 'center', size: 22, color: '#7a3b3b' })
  if (a.phase === 'flee') label(ctx, '!', a.x, a.y - r - 10, { align: 'center', size: 44, color: '#c0392b' })
  if (a.shaken) label(ctx, '~ shaken ~', a.x, a.y - r - 10, { align: 'center', size: 22, color: '#7a3b3b' })
  if (a.head) {
    // The patience bar fills until this animal sets off by itself.
    const frac = patience[a.from]
    rect(ctx, a.x - r, a.y + r + 10, r * 2, 10, '#d7d0c0')
    rect(ctx, a.x - r, a.y + r + 10, r * 2 * frac, 10, frac > 0.75 ? '#c0392b' : '#5b8c5a')
  }
}

export function draw(ctx: CanvasRenderingContext2D, s: WhoSnapshot): void {
  clear(ctx, '#bfe0ec')
  rect(ctx, 0, 0, GATE[0], FIELD_H, '#d8c99a')
  rect(ctx, GATE[1], 0, FIELD_W - GATE[1], FIELD_H, '#d8c99a')
  rect(ctx, GATE[0], LANE_Y - 46, GATE[1] - GATE[0], 92, { fill: '#a0713d', stroke: '#5c3d1c', width: 5 })
  for (let x = GATE[0] + 40; x < GATE[1]; x += 60) line(ctx, x, LANE_Y - 46, x, LANE_Y + 46, '#8a5e2f', 3)

  // Bridge traffic last so nothing hides it.
  const order = (a: AnimalView) => (a.phase === 'walk' || a.phase === 'flee' ? 1 : 0)
  for (const a of [...s.animals].sort((p, q) => order(p) - order(q))) animal(ctx, a, s.patience)

  label(ctx, 'Get the crowned animal across.', 40, 44, { size: 30 })
  label(ctx, 'Tap an animal to send it. Hold your finger on the front one to keep it back.', 40, 80, { size: 22, color: '#4a4338' })
  label(ctx, `round ${s.round + 1}    time ${Math.floor(s.roundTicks / 30)}s    par ${Math.floor(s.par / 30)}s`, FIELD_W / 2, FIELD_H - 24, { align: 'center', size: 24, color: '#4a4338' })

  if (s.last && s.last.age < 90) {
    const said = s.last.kin ? `two ${s.last.winner}s: the one who walked less gives way` : `${s.last.winner} scares ${s.last.loser}`
    label(ctx, said + (s.last.convoy > 0 ? `, and ${s.last.convoy} behind it` : ''), FIELD_W / 2, LANE_Y - 80, { align: 'center', size: 30, color: '#c0392b' })
  }
  if (s.hint) {
    // Idle hint: a ring on the crowned animal and the circle written out.
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 80 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.7})`, width: 6 })
    label(ctx, 'cat scares mouse, mouse scares elephant, elephant scares cat', FIELD_W / 2, LANE_Y + 100, { align: 'center', size: 26, color: '#2b2620' })
  }
  if (s.pause) label(ctx, s.stars === null ? 'Across!' : `Across!  ${'*'.repeat(s.stars)}`, FIELD_W / 2, LANE_Y - 120, { align: 'center', size: 64, color: '#2f7a3b' })
}
