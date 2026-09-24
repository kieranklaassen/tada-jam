// Flat shapes from the snapshot, nothing else. Words are allowed in the lab.

import { circle, clear, label, roundRect } from '../../kit/draw.ts'
import type { LampSnapshot } from './sim.ts'

const COLORS = ['#d9534f', '#3b82c4', '#f0b429', '#3fa66b']
const CHIP_FILL = { open: '#f3e6c4', locked: '#e6e1d6', wrong: '#d9d4c8', right: '#bfe3c6', off: '#e6e1d6' }
const CHIP_INK = { open: '#2b2620', locked: '#a39b8a', wrong: '#b9b1a1', right: '#1f5a30', off: '#b9b1a1' }

function shape(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, r: number, fill: string, ring: boolean): void {
  ctx.beginPath()
  if (kind === 0) ctx.arc(x, y, r, 0, Math.PI * 2)
  else if (kind === 1) ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76)
  else {
    ctx.moveTo(x, y - r)
    ctx.lineTo(x + r * 0.95, y + r * 0.72)
    ctx.lineTo(x - r * 0.95, y + r * 0.72)
    ctx.closePath()
  }
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = ring ? '#2b2620' : 'rgba(43,38,32,0.35)'
  ctx.lineWidth = ring ? 6 : 3
  ctx.stroke()
}

export function draw(ctx: CanvasRenderingContext2D, s: LampSnapshot): void {
  clear(ctx, '#2a2733')

  // The lamp: a hood, a bulb, and a halo that follows the sim's eased level.
  const lx = 590
  const ly = 95
  const glow = Math.max(0, Math.min(1.3, s.level))
  const wobble = s.shrug > 0 ? Math.sin(s.tick * 1.7) * 5 : 0
  circle(ctx, lx + wobble, ly, 60 + glow * 90, `rgba(255,190,80,${0.22 * glow})`)
  circle(ctx, lx + wobble, ly, 60 + glow * 45, `rgba(255,200,90,${0.3 * glow})`)
  roundRect(ctx, lx - 70 + wobble, ly - 62, 140, 46, 20, { fill: '#4b4658', stroke: '#6f6a80', width: 4 })
  circle(ctx, lx + wobble, ly + 8, 32, { fill: `rgb(${70 + glow * 185},${62 + glow * 138},${58 + glow * 40})`, stroke: '#6f6a80', width: 4 })
  label(ctx, s.lamp === 'waiting' ? 'add two shapes' : s.lamp === 'warm' ? 'warm' : s.lamp === 'glow' ? 'getting warmer' : 'sulking', lx, 176, {
    align: 'center', size: 22, color: '#cfc8dc',
  })

  for (const c of s.chips) {
    roundRect(ctx, c.x, c.y, c.w, c.h, 16, { fill: CHIP_FILL[c.state], stroke: c.state === 'right' ? '#2f7a45' : '#8a7f6a', width: 3 })
    label(ctx, c.label, c.x + c.w / 2, c.y + c.h / 2, { align: 'center', baseline: 'middle', size: 24, color: CHIP_INK[c.state] })
  }

  roundRect(ctx, 60, 200, 1060, 400, 24, { fill: '#3b3748', stroke: '#6f6a80', width: 4 })
  roundRect(ctx, 60, 630, 1060, 170, 24, { fill: '#2f2c3a', stroke: '#524d63', width: 3 })
  label(ctx, 'stage', 84, 232, { size: 22, color: '#8a84a0' })
  label(ctx, 'tray', 84, 660, { size: 22, color: '#8a84a0' })

  for (const id of s.order) {
    const p = s.pieces[id]!
    shape(ctx, p.kind, p.x, p.y, p.r, COLORS[p.color]!, p.held)
    if (id === s.flipPiece) circle(ctx, p.x, p.y, p.r + 12, { stroke: '#ffe28a', width: 5 })
  }

  if (s.hint) {
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 60 + phase * 40, { stroke: `rgba(255,226,138,${(1 - phase) * 0.7})`, width: 5 })
  }

  if (s.reveal) {
    roundRect(ctx, 290, 340, 600, 120, 24, { fill: 'rgba(20,18,28,0.88)', stroke: '#ffe28a', width: 4 })
    label(ctx, s.phase === 'solved' ? 'yes, the lamp says' : 'the lamp tells you', 590, 385, { align: 'center', size: 24, color: '#ffe28a' })
    label(ctx, s.reveal, 590, 428, { align: 'center', size: 32, color: '#ffffff' })
  }

  const hearts = Array.from({ length: 2 }, (_, i) => (i < s.guessesLeft ? 'o' : 'x')).join(' ')
  label(ctx, `guesses ${hearts}   rules named ${s.solved}`, 1120, 232, { align: 'right', size: 22, color: '#8a84a0' })
  if (s.skipReady) label(ctx, 'stuck? tap the lamp', 1120, 660, { align: 'right', size: 22, color: '#8a84a0' })
  else label(ctx, 'drag shapes to the stage; find what the lamp likes, then name it', 1120, 660, { align: 'right', size: 20, color: '#8a84a0' })
}
