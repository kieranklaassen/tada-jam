// The view: flat shapes and plain words from the snapshot, nothing else. Rule
// tiles that currently spell a rule get a green rim, so the child can see what
// is true right now. It holds no state; the shell maps pointers to logical
// coordinates and calls sim.pointer.

import { circle, clear, label, rect, roundRect } from '../../kit/draw.ts'
import { CELL, COLS, OX, OY, ROWS } from './sim.ts'
import type { PushableSnapshot } from './sim.ts'

const OBJECT_COLOR: Record<string, string> = { frog: '#3fa66b', rock: '#9a9186', wall: '#4a4f5c', pad: '#f2b134' }
const WORD_COLOR = { noun: '#3b6fb6', is: '#77706a', prop: '#c8553d' }

export function draw(ctx: CanvasRenderingContext2D, s: PushableSnapshot): void {
  clear(ctx, '#f3efe6')
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) rect(ctx, OX + x * CELL, OY + y * CELL, CELL, CELL, { stroke: '#e0d9ca', width: 2 })
  if (s.target) rect(ctx, OX + s.target.x * CELL + 6, OY + s.target.y * CELL + 6, CELL - 12, CELL - 12, { stroke: '#2b2620', width: 3 })

  // Things first, then tiles on top.
  for (const e of s.ents.filter((t) => t.kind === 'obj')) {
    const cx = OX + (e.x + 0.5) * CELL
    const cy = OY + (e.y + 0.5) * CELL
    if (e.name === 'wall') rect(ctx, cx - CELL / 2 + 2, cy - CELL / 2 + 2, CELL - 4, CELL - 4, OBJECT_COLOR.wall!)
    else if (e.name === 'pad') circle(ctx, cx, cy, 34, { fill: OBJECT_COLOR.pad, stroke: '#a37a1c', width: 5 })
    else circle(ctx, cx, cy, e.name === 'frog' ? 34 : 30, OBJECT_COLOR[e.name] ?? '#888')
    if (e.name === 'frog') {
      circle(ctx, cx - 12, cy - 12, 7, '#fff')
      circle(ctx, cx + 12, cy - 12, 7, '#fff')
    }
  }
  for (const e of s.ents.filter((t) => t.kind !== 'obj')) {
    const color = WORD_COLOR[e.kind as 'noun' | 'is' | 'prop']
    roundRect(ctx, OX + e.x * CELL + 5, OY + e.y * CELL + 5, CELL - 10, CELL - 10, 14, { fill: color, stroke: e.live ? '#1f9d55' : '#2b2620', width: e.live ? 8 : 2 })
    label(ctx, e.name.toUpperCase(), OX + (e.x + 0.5) * CELL, OY + (e.y + 0.5) * CELL, { align: 'center', baseline: 'middle', size: 24, color: '#fff' })
  }

  if (s.hint) {
    const phase = (s.tick % 30) / 30
    roundRect(ctx, s.hint.x - phase * 16, s.hint.y - phase * 16, s.hint.w + phase * 32, s.hint.h + phase * 32, 20, { stroke: `rgba(43,38,32,${(1 - phase) * 0.7})`, width: 6 })
  }

  for (const [r, text] of [[s.restart, 'restart'], [s.undo, 'undo']] as const) {
    roundRect(ctx, r.x, r.y, r.w, r.h, 20, { fill: s.status === 'stuck' && text === 'restart' ? '#f6c9c0' : '#e4dccb', stroke: '#8a7f6a', width: 4 })
    label(ctx, text, r.x + r.w / 2, r.y + r.h / 2, { align: 'center', baseline: 'middle', size: 30, color: '#5d5443' })
  }
  const line = s.status === 'solved' ? (s.how === 'rewrote' ? 'You rewrote the rules!' : 'You found a way round!') : s.status === 'stuck' ? 'Nothing is YOU. Undo or restart.' : s.rules.join('   ')
  label(ctx, line, 500, 774, { size: 26, color: s.status === 'stuck' ? '#b03a2e' : '#5d5443' })
  if (s.stars !== null) label(ctx, `stars ${s.stars}`, 1160, 774, { align: 'right', size: 30 })
}
