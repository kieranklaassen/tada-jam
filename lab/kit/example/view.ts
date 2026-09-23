// The view: flat shapes from the snapshot, nothing else. It forwards no input
// (the shell maps pointer events to logical coordinates and calls sim.pointer)
// and holds no state, so the same snapshot always draws the same picture.
// Scores, words, and numbers are allowed in the lab. Keep this under about 150
// lines and put the effort into the loop.

import { circle, clear, label, line, roundRect } from '../draw.ts'
import type { ExampleSnapshot } from './sim.ts'

export function draw(ctx: CanvasRenderingContext2D, snapshot: ExampleSnapshot): void {
  clear(ctx, '#f6f0e4')

  // The pump glows while it is held.
  const { pump, basket } = snapshot
  roundRect(ctx, pump.x, pump.y, pump.w, pump.h, 28, { fill: snapshot.pumping ? '#c9e3d1' : '#e4dccb', stroke: '#8a7f6a', width: 4 })
  label(ctx, 'hold to pump', pump.x + pump.w / 2, pump.y + pump.h / 2, { align: 'center', baseline: 'middle', size: 26, color: '#5d5443' })

  roundRect(ctx, basket.x, basket.y, basket.w, basket.h, 28, { fill: '#ead7b5', stroke: '#8a7f6a', width: 4 })
  label(ctx, 'basket', basket.x + basket.w / 2, basket.y - 14, { align: 'center', size: 24, color: '#8a7f6a' })

  for (const b of snapshot.balls) {
    // String first, so the balloon covers its end.
    if (!b.stowed) line(ctx, b.x, b.y + b.r, b.x + 10, b.y + b.r + 46, '#8a7f6a', 3)
    circle(ctx, b.x, b.y, b.r, { fill: b.color, stroke: b.held ? '#2b2620' : undefined, width: 6 })
    circle(ctx, b.x - b.r * 0.32, b.y - b.r * 0.34, b.r * 0.16, 'rgba(255,255,255,0.55)')
  }

  if (snapshot.hint) {
    // A ring that grows and fades on the tick clock, not a wall clock.
    const phase = (snapshot.tick % 30) / 30
    circle(ctx, snapshot.hint.x, snapshot.hint.y, 70 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }

  if (snapshot.score !== null) label(ctx, `score ${snapshot.score}`, 40, 64, { size: 36 })
}
