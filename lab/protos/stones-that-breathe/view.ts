// The view: flat shapes from the snapshot, nothing else. It forwards no input
// (the shell maps pointer events to logical coordinates and calls sim.pointer)
// and holds no state. Stones grow and brighten as they rise and shrink and
// darken as they sink, so watching one bob is how the beat is found.

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { NOPE_T, SPLASH_T, SPOTS, STONE_R } from './sim.ts'
import type { StonesSnapshot } from './sim.ts'

const LAST_TEXT = { none: '', dunked: 'splash! back to the bank', clean: 'clean crossing', messy: 'across, after some splashes' } as const

export function draw(ctx: CanvasRenderingContext2D, s: StonesSnapshot): void {
  clear(ctx, '#d9ead6')
  // The river, and the two banks.
  const [left, right] = s.banks
  rect(ctx, left.x + left.w, 0, right.x - left.x - left.w, FIELD_H, '#86bddb')
  rect(ctx, 0, 0, left.x + left.w, FIELD_H, '#a9d18e')
  rect(ctx, right.x, 0, FIELD_W - right.x, FIELD_H, '#a9d18e')

  // The lily waits on the bank the frog is heading for.
  const lily = SPOTS[s.lilySide]
  circle(ctx, lily.x, lily.y + 100, 48, '#4c9a52')
  circle(ctx, lily.x, lily.y + 100, 22, s.blooms !== null && s.blooms > 0 ? '#f28ab2' : '#f6f0d8')

  // Stones: size and shade say how high each one is right now.
  for (const st of s.stones) {
    if (!st.live) continue
    const r = STONE_R * (0.55 + 0.45 * st.h)
    if (!st.up) circle(ctx, st.x, st.y, STONE_R * 0.95, { stroke: 'rgba(255,255,255,0.55)', width: 4 })
    circle(ctx, st.x, st.y, r, { fill: st.up ? `rgb(${150 + 60 * st.h}, ${150 + 55 * st.h}, ${135 + 40 * st.h})` : '#4a78a0', stroke: '#5b5a4e', width: st.up ? 5 : 2 })
    if (st.queued > 0) label(ctx, st.queued, st.x, st.y + 10, { align: 'center', size: 30, color: '#1f2a1c' })
  }

  // The frog's plan.
  for (let i = 1; i < s.path.length; i++) line(ctx, s.path[i - 1]!.x, s.path[i - 1]!.y, s.path[i]!.x, s.path[i]!.y, 'rgba(40,90,40,0.5)', 5)

  if (s.splash) circle(ctx, s.splash.x, s.splash.y, 20 + (SPLASH_T - s.splash.t) * 5, { stroke: `rgba(255,255,255,${s.splash.t / SPLASH_T})`, width: 6 })
  if (s.nope) circle(ctx, s.nope.x, s.nope.y, STONE_R + 8, { stroke: `rgba(200,60,50,${s.nope.t / NOPE_T})`, width: 6 })
  if (s.hint) {
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 70 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }

  // The frog, with a shadow while it is in the air.
  const f = s.frog
  if (f.lift > 0) circle(ctx, f.x, f.y + 12, 26, 'rgba(0,0,0,0.18)')
  circle(ctx, f.x, f.y - f.lift, 32, { fill: '#3f9f3f', stroke: '#1f5a1f', width: 4 })
  circle(ctx, f.x - 12, f.y - f.lift - 18, 8, '#fff')
  circle(ctx, f.x + 12, f.y - f.lift - 18, 8, '#fff')
  circle(ctx, f.x - 12, f.y - f.lift - 18, 3.5, '#111')
  circle(ctx, f.x + 12, f.y - f.lift - 18, 3.5, '#111')

  roundRect(ctx, 24, 24, 700, 116, 18, 'rgba(255,255,255,0.7)')
  label(ctx, 'Tap stones in reach to send the frog to the lily.', 44, 62, { size: 28 })
  label(ctx, 'Stones rise and sink. A stone that is down dunks the frog.', 44, 96, { size: 24, color: '#4a5a44' })
  const bloom = s.blooms === null ? '' : `   blooms ${s.blooms}`
  label(ctx, `crossings ${s.crossings}   clean ${s.clean}   splashes ${s.dunks}${bloom}`, 44, 128, { size: 24, color: '#2b2620' })
  if (LAST_TEXT[s.last]) label(ctx, LAST_TEXT[s.last], 590, 800, { align: 'center', size: 30, color: '#33502e' })
}
