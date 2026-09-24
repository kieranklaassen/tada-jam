// The view: flat shapes from the snapshot, nothing else. No state, no input.

import { circle, clear, label, line, roundRect } from '../../kit/draw.ts'
import { TABLE, TABLE_HX, TABLE_HY, weightPoint } from './sim.ts'
import type { PenSnapshot } from './sim.ts'

const INK = '#2b2620'
const ROD_COLORS = ['#c2410c', '#1d4ed8']

const CX = TABLE.x + TABLE.w / 2
const CY = TABLE.y + TABLE.h / 2

// Flat x, y pairs in table units to a path inside a box (the table, a card, a thumbnail).
function polyline(ctx: CanvasRenderingContext2D, pts: number[], cx: number, cy: number, hx: number, hy: number, color: string, width: number) {
  if (pts.length < 4) return
  ctx.beginPath()
  ctx.moveTo(cx + pts[0]! * hx, cy + pts[1]! * hy)
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(cx + pts[i]! * hx, cy + pts[i + 1]! * hy)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.stroke()
}

const STAGE_LINE: Record<PenSnapshot['stage'], string> = {
  set: 'slide the weights up or down, pull a rod back, let go',
  pulled: 'let go of a rod (one after the other)',
  swing: 'pull the other rod, or catch one and go again',
  done: 'pull a rod for fresh paper',
}

export function draw(ctx: CanvasRenderingContext2D, s: PenSnapshot): void {
  clear(ctx, '#f4efe6')

  // The two rods: pivot, the rod, five notches, the weight, and the tip to pull.
  s.rods.forEach((r, i) => {
    const color = ROD_COLORS[i]!
    line(ctx, r.pivot.x - 40, r.pivot.y - 12, r.pivot.x + 40, r.pivot.y - 12, '#8a7f6a', 8)
    line(ctx, r.pivot.x, r.pivot.y, r.tip.x, r.tip.y, '#8a7f6a', 8)
    for (let k = 1; k <= 5; k++) {
      const n = weightPoint(i, r.u, k)
      circle(ctx, n.x, n.y, 7, '#bdb39c')
    }
    circle(ctx, r.weight.x, r.weight.y, 32, { fill: color, stroke: INK, width: 3 })
    circle(ctx, r.tip.x, r.tip.y, 36, { fill: r.held ? color : '#fffdf7', stroke: color, width: 6 })
    label(ctx, i === 0 ? 'sideways' : 'up and down', r.pivot.x, 30, { align: 'center', size: 22, color })
  })

  // The table: the aim ghost under the ink, then the ink, then the pen.
  roundRect(ctx, TABLE.x, TABLE.y, TABLE.w, TABLE.h, 24, { fill: '#fffdf7', stroke: '#8a7f6a', width: 4 })
  line(ctx, CX, TABLE.y + 10, CX, TABLE.y + TABLE.h - 10, '#ece5d5', 2)
  line(ctx, TABLE.x + 10, CY, TABLE.x + TABLE.w - 10, CY, '#ece5d5', 2)
  if (s.target) polyline(ctx, s.target.ghost, CX, CY, TABLE_HX, TABLE_HY, s.target.met ? '#9fd6ae' : '#d9d1bd', 10)
  polyline(ctx, s.trace, CX, CY, TABLE_HX, TABLE_HY, INK, 3)
  const px = CX + s.pen.x * TABLE_HX
  const py = CY + s.pen.y * TABLE_HY
  circle(ctx, px, py, 10, s.inking ? { fill: '#d62828' } : { fill: '#fffdf7', stroke: '#d62828', width: 4 })
  if (s.lock) {
    label(ctx, `${s.lock.petals} petals, ${s.lock.cls}`, TABLE.x + TABLE.w - 20, TABLE.y + 40, { align: 'right', size: 30 })
  }

  // The aim card.
  if (s.aimCard && s.target) {
    const c = s.aimCard
    roundRect(ctx, c.x, c.y, c.w, c.h, 16, { fill: s.target.met ? '#dff3e4' : '#f4efe6', stroke: '#8a7f6a', width: 3 })
    polyline(ctx, s.target.ghost, c.x + c.w / 2, c.y + c.h / 2 + 6, c.w * 0.4, c.h * 0.3, INK, 3)
    label(ctx, s.target.met ? 'drawn!' : 'aim (tap)', c.x + c.w / 2, c.y + 22, { align: 'center', size: 18 })
  }

  // The petal-count strip.
  if (s.guessButtons) {
    label(ctx, s.guessResult === 'right' ? 'right!' : s.guessResult === 'wrong' ? 'not this time' : 'how many petals?', 462, 652, { size: 22, color: '#5d5443' })
    s.guessButtons.forEach((b, i) => {
      const picked = s.guess === i + 1
      const fill = picked ? (s.guessResult === 'right' ? '#9fd6ae' : s.guessResult === 'wrong' ? '#f0a8a0' : '#f2d9a0') : '#fffdf7'
      roundRect(ctx, b.x, b.y, b.w, b.h, 14, { fill, stroke: '#8a7f6a', width: 3 })
      label(ctx, i + 1, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', baseline: 'middle', size: 36 })
    })
  }

  // Fresh paper and the wall of past figures.
  const n = s.newPaper
  roundRect(ctx, n.x, n.y, n.w, n.h, 14, { fill: s.stage === 'done' ? '#f2d9a0' : '#ece5d5', stroke: '#8a7f6a', width: 3 })
  label(ctx, 'new paper', n.x + n.w / 2, n.y + n.h / 2, { align: 'center', baseline: 'middle', size: 26 })
  s.gallery.forEach((g, i) => {
    const x = 720 + i * 100
    roundRect(ctx, x, 752, 84, 58, 10, { fill: '#fffdf7', stroke: '#bdb39c', width: 2 })
    polyline(ctx, g.pts, x + 42, 781, 34, 22, INK, 1.5)
  })
  const line1 = s.stage === 'swing' && s.lock ? 'watch it shrink, or catch a rod and go again' : STAGE_LINE[s.stage]
  label(ctx, line1, 20, 790, { size: 20, color: '#5d5443' })

  // The idle hint: a ring that slides to where the finger should go.
  if (s.hint) {
    const x = s.hint.x + (s.hint.toX - s.hint.x) * s.hint.phase
    circle(ctx, x, s.hint.y, 62 - s.hint.phase * 10, { stroke: `rgba(43,38,32,${1 - s.hint.phase * 0.6})`, width: 5 })
  }
}
