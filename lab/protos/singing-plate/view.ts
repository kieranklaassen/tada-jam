// The view: flat shapes from the snapshot. Ugly on purpose. Words are allowed
// in the lab, so the plate says what it is doing.

import { circle, clear, label, roundRect } from '../../kit/draw.ts'
import { BAR, PLATE, TIP, TONE_HALF, TONE_NAMES, toneX } from './sim.ts'
import type { SingingPlateSnapshot } from './sim.ts'

const TONE_COLORS = ['#c8553d', '#3b7ea1', '#8f6bb3', '#d19a2a', '#4f9a6b', '#b8577f', '#6f7f3a']
const INK = '#2b2620'

export function draw(ctx: CanvasRenderingContext2D, s: SingingPlateSnapshot): void {
  clear(ctx, '#f1ece2')
  label(ctx, 'pour sand on the plate, slide a finger along the bar', 90, 28, { size: 22, color: '#6b6250' })

  // The plate shivers while a tone rings.
  const shake = s.ringing ? (s.tick % 2 === 0 ? 1 : -1) * s.energy * 3 : 0
  const toneColor = s.voice >= 0 ? TONE_COLORS[s.voice]! : '#7c705c'
  roundRect(ctx, PLATE.x + shake, PLATE.y, PLATE.w, PLATE.h, 10, {
    fill: '#ddd6c6',
    stroke: s.ringing ? toneColor : '#7c705c',
    width: s.ringing ? 8 : 4,
  })
  ctx.fillStyle = INK
  ctx.beginPath()
  for (let i = 0; i < s.grains.length; i += 2) ctx.rect(s.grains[i]! - 2 + shake, s.grains[i + 1]! - 2, 4, 4)
  ctx.fill()
  if (s.ringing) label(ctx, TONE_NAMES[s.voice]!, PLATE.x + 16, PLATE.y + 40, { size: 32, color: toneColor })
  label(ctx, `sand: ${s.pile}`, PLATE.x, PLATE.y + PLATE.h + 28, { size: 22, color: '#6b6250' })

  // The pitch bar. Hidden tones stay unmarked until they are found.
  roundRect(ctx, BAR.x, BAR.y, BAR.w, BAR.h, 18, { fill: `rgba(${228 - s.hum * 40},${220 - s.hum * 20},${203 - s.hum * 60},1)`, stroke: '#8a7f6a', width: 4 })
  s.found.forEach((isFound, i) => {
    if (!isFound) return
    roundRect(ctx, toneX(i) - TONE_HALF, BAR.y + 6, TONE_HALF * 2, BAR.h - 12, 12, { fill: TONE_COLORS[i]! })
    label(ctx, TONE_NAMES[i]!, toneX(i), BAR.y + BAR.h / 2, { align: 'center', baseline: 'middle', size: 20, color: '#fff' })
  })
  if (s.fingerX !== null) circle(ctx, s.fingerX, BAR.y + BAR.h / 2, 16, { fill: 'rgba(43,38,32,0.35)', stroke: INK, width: 3 })

  // The journal of found tones, and the tip button.
  TONE_NAMES.forEach((name, i) => {
    const y = 50 + i * 62
    const on = s.found[i]!
    roundRect(ctx, 780, y, 340, 54, 12, { fill: on ? TONE_COLORS[i]! : '#e6e0d2', stroke: s.ringing && s.voice === i ? INK : undefined, width: 5 })
    label(ctx, on ? name : '?', 800, y + 36, { size: 28, color: on ? '#fff' : '#a29882' })
  })
  label(ctx, `woven ${s.woven}`, 780, 526, { size: 28 })
  roundRect(ctx, TIP.x, TIP.y, TIP.w, TIP.h, 18, { fill: '#e4dccb', stroke: '#8a7f6a', width: 4 })
  label(ctx, 'tip out the sand', TIP.x + TIP.w / 2, TIP.y + TIP.h / 2, { align: 'center', baseline: 'middle', size: 24, color: '#5d5443' })

  if (s.hint) {
    // A ring that breathes on the tick clock, not a wall clock.
    const phase = (s.tick % 30) / 30
    circle(ctx, s.hint.x, s.hint.y, 40 + phase * 40, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }
}
