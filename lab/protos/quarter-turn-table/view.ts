// Flat shapes from the snapshot, nothing else. Ugly on purpose; words and
// numbers are allowed in the lab. No input is forwarded: the shell maps
// pointer events to logical coordinates and calls sim.pointer().

import { circle, clear, label, line, rect } from '../../kit/draw.ts'
import { FIELD_H } from '../../kit/sim.ts'
import type { TableSnapshot } from './sim.ts'

const GOLD = '#ffd166'

// The arrow: a pointed nose the ball is slung out of, and a flat back.
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(r * 0.92, 0)
  ctx.lineTo(-r * 0.1, -r * 0.55)
  ctx.lineTo(-r * 0.1, r * 0.55)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.fillStyle = '#7d8bb0'
  ctx.fillRect(-r * 0.7, -r * 0.45, r * 0.3, r * 0.9)
  ctx.restore()
}

export function draw(ctx: CanvasRenderingContext2D, snap: TableSnapshot): void {
  clear(ctx, '#151a28')
  const { walls } = snap
  rect(ctx, walls.left, walls.top, walls.right - walls.left, FIELD_H - walls.top, { fill: '#232c44', stroke: '#8fa0c8', width: 6 })
  for (const g of snap.guides) line(ctx, g.x1, g.y1, g.x2, g.y2, '#8fa0c8', 12)

  for (const b of snap.bumpers) {
    circle(ctx, b.x, b.y, b.r, { fill: b.flash > 0 ? '#5d7bd0' : '#3b4a72', stroke: b.inLoop ? GOLD : '#8fa0c8', width: b.inLoop ? 8 : 4 })
    arrow(ctx, b.x, b.y, b.r, b.angle, b.inLoop ? GOLD : '#e9ecf5')
  }

  for (const f of snap.flippers) line(ctx, f.px, f.py, f.tx, f.ty, f.up ? GOLD : '#e8e2d0', 28)

  for (const b of snap.balls) {
    if (b.held) continue
    if (b.trapped) circle(ctx, b.x, b.y, b.r + 9, { stroke: GOLD, width: 4 })
    circle(ctx, b.x, b.y, b.r, '#ffffff')
  }

  if (snap.hint) {
    const phase = (snap.tick % 30) / 30
    circle(ctx, snap.hint.x, snap.hint.y, 50 + phase * 40, { stroke: `rgba(255,209,102,${(1 - phase) * 0.8})`, width: 5 })
  }

  label(ctx, 'Quarter-Turn Table', 46, 76, { size: 30, color: '#e9ecf5' })
  const help = ['hold the left or right half to flip', 'hit an arrow on its nose: it turns', 'hit its side or back: it slings the ball', 'close four arrows in a loop to trap the ball']
  help.forEach((text, i) => label(ctx, text, 46, 116 + i * 30, { size: 20, color: '#aab6d6' }))
  label(ctx, `table: ${snap.table}`, 46, 300, { size: 24, color: snap.table === 'scatter' || snap.table === 'trail' || snap.table === 'long' ? '#aab6d6' : GOLD })
  label(ctx, `ball: ${snap.ballState}`, 46, 334, { size: 24, color: snap.ballState === 'trapped' || snap.ballState === 'twin' ? GOLD : '#aab6d6' })
  label(ctx, `best chain ${snap.bestChain}`, 46, 368, { size: 24, color: '#aab6d6' })
}
