// Flat shapes from the snapshot: a hedge with three holes, a can on a string
// for each, the rhythm you sent and the one that came back, and the rule
// chips when a friend is being named. Words are allowed in the lab.

import { circle, clear, label, rect, roundRect } from '../../kit/draw.ts'
import { MIN_HEARD_TO_GUESS, WAVE_TICKS } from './sim.ts'
import type { AnswerSnapshot, Gap } from './sim.ts'

const SPACING: Record<Gap, number> = { S: 30, L: 76 }

// A row of knock dots; the gap to the next dot is the rhythm.
function strip(ctx: CanvasRenderingContext2D, x: number, y: number, gaps: readonly Gap[], count: number, color: string): void {
  let px = x
  for (let i = 0; i < count; i++) {
    circle(ctx, px, y, 11, color)
    if (i < gaps.length) px += SPACING[gaps[i]!]
  }
}

export function draw(ctx: CanvasRenderingContext2D, s: AnswerSnapshot): void {
  clear(ctx, '#e9eedd')

  s.friends.forEach((f, i) => {
    const { bush, can } = f
    roundRect(ctx, bush.x, bush.y, bush.w, bush.h, 40, { fill: can.asleep ? '#b9c2ad' : '#5f9b57', stroke: '#3c6b39', width: 4 })
    circle(ctx, f.ax, f.ay, 22, '#2b2a24')
    if (can.asleep) label(ctx, 'zzz', bush.x + 120, bush.y + 96, { align: 'center', size: 36, color: '#66705c' })
    else if (f.solved) {
      circle(ctx, bush.x + 130, bush.y + 70, 34, { fill: can.color, stroke: '#2b2a24', width: 4 })
      label(ctx, f.label ?? '', bush.x + 110, bush.y + 150, { align: 'center', size: 22, color: '#f6f0e4' })
    } else label(ctx, f.exchanges >= MIN_HEARD_TO_GUESS ? 'who?' : '?', bush.x + 130, bush.y + 96, { align: 'center', size: 40, color: '#f6f0e4' })
    if (can.asleep) return

    // The string: straight when taut, a droop when slack.
    ctx.beginPath()
    ctx.moveTo(f.ax, f.ay)
    if (can.taut) ctx.lineTo(can.x, can.y)
    else ctx.quadraticCurveTo((f.ax + can.x) / 2, (f.ay + can.y) / 2 + 90, can.x, can.y)
    ctx.strokeStyle = can.taut ? '#2b2a24' : '#8a7f6a'
    ctx.lineWidth = can.taut ? 5 : 3
    ctx.stroke()

    // Pulses run down the string: out from a knock, back from the friend.
    for (const w of s.waves) {
      if (w.friend !== i) continue
      const p = Math.min(1, w.age / WAVE_TICKS)
      const t = w.dir === 'out' ? 1 - p : p
      circle(ctx, f.ax + (can.x - f.ax) * t, f.ay + (can.y - f.ay) * t, 12 + 14 * p, { stroke: w.dir === 'out' ? '#2b2a24' : can.color, width: 5 })
    }

    roundRect(ctx, can.x - can.r, can.y - can.r, can.r * 2, can.r * 2, 16, { fill: can.color, stroke: '#2b2a24', width: can.taut || can.held ? 7 : 3 })
    rect(ctx, can.x - can.r + 8, can.y - 8, can.r * 2 - 16, 16, 'rgba(255,255,255,0.45)')
  })

  // What you sent and what came back (the friend's row fills in as it arrives).
  label(ctx, 'you', 30, 40, { size: 22, color: '#5d5443' })
  label(ctx, 'friend', 30, 88, { size: 22, color: '#5d5443' })
  if (s.exchange) {
    const color = s.friends[s.exchange.friend]!.can.color
    strip(ctx, 130, 34, s.exchange.you, s.exchange.you.length + 1, '#2b2a24')
    strip(ctx, 130, 82, s.exchange.back, s.exchange.shown, color)
  }

  label(ctx, s.tip, 1150, 40, { align: 'right', size: 24, color: '#5d5443' })
  if (s.cooling) label(ctx, 'wait a moment', 1150, 76, { align: 'right', size: 22, color: '#a5482f' })

  if (s.panel) {
    const named = s.friends[s.panel.friend]!.bush
    roundRect(ctx, named.x - 6, named.y - 6, named.w + 12, named.h + 12, 44, { stroke: '#2b2a24', width: 6 })
    for (const c of s.panel.chips) {
      roundRect(ctx, c.x, c.y, c.w, c.h, 18, { fill: '#f6f0e4', stroke: '#2b2a24', width: 4 })
      const [first, second] = c.label.split(' + ')
      label(ctx, first ?? '', c.x + c.w / 2, c.y + (second ? 30 : 45), { align: 'center', baseline: 'middle', size: 24 })
      if (second) label(ctx, `+ ${second}`, c.x + c.w / 2, c.y + 62, { align: 'center', baseline: 'middle', size: 24 })
    }
  }

  if (s.hint) {
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 70 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }
}
