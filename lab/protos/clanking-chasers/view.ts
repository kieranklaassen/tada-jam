// The view: flat shapes from the snapshot, nothing else. Squares, boxy robots,
// grey scrap heaps, a blue child. It holds no state and forwards no input (the
// shell maps taps to logical coordinates and calls sim.pointer).

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { CELL, COLS, ROWS, X0, Y0, blockedAt, inBounds } from './sim.ts'
import type { ChaserSnapshot } from './sim.ts'

const cx = (c: number) => X0 + c * CELL + CELL / 2
const cy = (r: number) => Y0 + r * CELL + CELL / 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function draw(ctx: CanvasRenderingContext2D, s: ChaserSnapshot): void {
  clear(ctx, '#efe9dd')
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) rect(ctx, X0 + c * CELL, Y0 + r * CELL, CELL, CELL, (c + r) % 2 === 0 ? '#e6dfcd' : '#ede7d8')
  }

  // Faint dots on the squares the child could step to.
  if (s.phase === 'play') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const c = s.child.c + dc
        const r = s.child.r + dr
        if ((dc !== 0 || dr !== 0) && inBounds(c, r) && !blockedAt(c, r, s.robots, s.heaps)) circle(ctx, cx(c), cy(r), 9, 'rgba(47,111,181,0.35)')
      }
    }
  }

  // Scrap heaps: a dark pile with the number of robots inside.
  for (const h of s.heaps) {
    roundRect(ctx, cx(h.c) - 38, cy(h.r) - 26, 76, 56, 12, { fill: '#6b6558', stroke: '#3f3b33', width: 4 })
    line(ctx, cx(h.c) - 24, cy(h.r) - 30, cx(h.c) + 6, cy(h.r) - 44, '#3f3b33', 5)
    line(ctx, cx(h.c) + 10, cy(h.r) - 30, cx(h.c) + 30, cy(h.r) - 40, '#3f3b33', 5)
    if (h.n > 0) label(ctx, h.n, cx(h.c), cy(h.r) + 10, { align: 'center', size: 30, color: '#efe9dd' })
  }

  // A ring where robots just ended.
  if (s.sinceTurn < 14) {
    for (const k of s.clanks) circle(ctx, cx(k.c), cy(k.r), 26 + s.sinceTurn * 4, { stroke: `rgba(226,90,46,${1 - s.sinceTurn / 14})`, width: 6 })
  }

  // The idle hint: where each robot will step next, and a pulse on the child.
  if (s.hint) {
    for (const a of s.hint.arrows) {
      line(ctx, cx(a.c0), cy(a.r0), cx(a.c1), cy(a.r1), 'rgba(184,52,32,0.8)', 6)
      circle(ctx, cx(a.c1), cy(a.r1), 11, 'rgba(184,52,32,0.8)')
    }
    const pulse = (s.tick % 30) / 30
    circle(ctx, cx(s.child.c), cy(s.child.r), 44 + pulse * 30, { stroke: `rgba(47,111,181,${1 - pulse})`, width: 5 })
  }

  // Robots slide from where they stood to where they are.
  const slide = 1 - (1 - Math.min(1, s.sinceTurn / 5)) ** 3
  for (const b of s.robots) {
    const x = lerp(cx(b.pc), cx(b.c), slide)
    const y = lerp(cy(b.pr), cy(b.r), slide)
    line(ctx, x, y - 30, x, y - 44, '#7a2e1c', 4)
    circle(ctx, x, y - 46, 5, '#7a2e1c')
    roundRect(ctx, x - 30, y - 30, 60, 58, 10, { fill: '#d9573a', stroke: '#7a2e1c', width: 4 })
    circle(ctx, x - 12, y - 10, 8, '#fff')
    circle(ctx, x + 12, y - 10, 8, '#fff')
    circle(ctx, x - 12, y - 9, 3.5, '#2b2620')
    circle(ctx, x + 12, y - 9, 3.5, '#2b2620')
    rect(ctx, x - 14, y + 8, 28, 6, '#7a2e1c')
  }

  // The child.
  const caught = s.phase === 'caught'
  circle(ctx, cx(s.child.c), cy(s.child.r), 30, { fill: caught ? '#b0392b' : '#2f6fb5', stroke: '#1e3f66', width: 5 })
  circle(ctx, cx(s.child.c) - 10, cy(s.child.r) - 6, 5, '#fff')
  circle(ctx, cx(s.child.c) + 10, cy(s.child.r) - 6, 5, '#fff')
  rect(ctx, cx(s.child.c) - 9, cy(s.child.r) + 8, 18, 4, '#fff')

  label(ctx, 'Tap a square: you step one toward it. Every robot steps one toward you. Robots that bump make scrap.', X0, 30, { size: 21, color: '#5d5443' })
  label(ctx, `${s.formation}  round ${s.round + 1}  robots ${s.robots.length}  turns ${s.turns}`, X0 + COLS * CELL, Y0 + ROWS * CELL, { align: 'right', baseline: 'bottom', size: 20, color: '#8a7f6a' })
  if (caught) label(ctx, 'Caught. Same robots, try again.', 590, 420, { align: 'center', size: 48, color: '#b0392b' })
  if (s.phase === 'cleared') {
    const heaped = s.heaps.filter((h) => h.n > 0).length
    label(ctx, heaped === 1 ? 'Herded into one heap!' : 'Cleared.', 590, 400, { align: 'center', size: 52, color: '#2f6f4e' })
    if (s.stars !== null) label(ctx, '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars), 590, 460, { align: 'center', size: 56, color: '#d4a017' })
  }
}
