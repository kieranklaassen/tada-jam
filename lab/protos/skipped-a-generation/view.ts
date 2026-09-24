// Flat shapes from the snapshot. Words are allowed here. The view draws the
// pedigree dots (parents, grandparents) under each creature, never the hidden
// spot genes.

import { circle, clear, label, roundRect } from '../../kit/draw.ts'
import { GATE, NEST, SLOTS, WISH_BOX } from './sim.ts'
import type { FamilySnapshot, Look } from './sim.ts'

const EAR = [0, 22, 42, 66]
const body = (hue: number) => `hsl(${hue} 65% 58%)`

// A creature centred at (x, y); scale 1 is the meadow size.
function creature(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number, scale = 1): void {
  const r = 46 * scale
  const ear = EAR[look.ears] ?? 22
  for (const side of [-1, 1]) {
    roundRect(ctx, x + side * r * 0.5 - r * 0.16, y - r * 0.8 - ear * scale, r * 0.32, ear * scale + r * 0.3, r * 0.16, { fill: body(look.hue), stroke: '#4a4235', width: 2 })
  }
  circle(ctx, x, y, r, { fill: body(look.hue), stroke: '#4a4235', width: 3 })
  if (look.spotted) {
    for (const [dx, dy] of [[-0.45, 0.25], [0.4, 0.35], [0.05, -0.5], [0.5, -0.2]] as const) circle(ctx, x + dx * r, y + dy * r, r * 0.16, '#4a4235')
  }
  circle(ctx, x - r * 0.3, y - r * 0.1, r * 0.1, '#2b2620')
  circle(ctx, x + r * 0.3, y - r * 0.1, r * 0.1, '#2b2620')
}

export function draw(ctx: CanvasRenderingContext2D, s: FamilySnapshot): void {
  clear(ctx, '#e8f0dc')
  label(ctx, 'Tap two to cross them. Tap the hatchling to keep it. Tap one, then the gate, to send it away.', 30, 50, { size: 26, color: '#5d5443' })
  label(ctx, 'dots under a creature: its parents, then its grandparents', 30, 78, { size: 20, color: '#7f7a68' })

  for (const [i, slot] of SLOTS.entries()) {
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 24, { fill: '#f6f0e4', stroke: '#8a7f6a', width: 3 })
    label(ctx, i === 0 ? 'first' : 'second', slot.x + slot.w / 2, slot.y + slot.h + 26, { align: 'center', size: 20, color: '#7f7a68' })
  }
  circle(ctx, 490, 695, 34 + s.pairing * 22, { fill: s.pairing > 0 ? '#f2c94c' : '#f6f0e4', stroke: '#8a7f6a', width: 3 })
  roundRect(ctx, GATE.x, GATE.y, GATE.w, GATE.h, 24, { fill: '#d9d2bf', stroke: '#8a7f6a', width: 3 })
  label(ctx, 'gate', GATE.x + GATE.w / 2, GATE.y + GATE.h / 2 + 8, { align: 'center', size: 30, color: '#5d5443' })
  roundRect(ctx, NEST.x, NEST.y, NEST.w, NEST.h, 30, { fill: s.full && s.nest ? '#e9c9c0' : '#f0e2b8', stroke: '#8a7f6a', width: 3 })
  if (!s.nest) label(ctx, 'nest', NEST.x + NEST.w / 2, NEST.y + NEST.h / 2 + 8, { align: 'center', size: 30, color: '#a89c7c' })

  if (s.wish) {
    roundRect(ctx, WISH_BOX.x, WISH_BOX.y, WISH_BOX.w, WISH_BOX.h, 20, { fill: '#f6f0e4', stroke: '#8a7f6a', width: 3 })
    creature(ctx, { hue: s.wish.hue, ears: s.wish.ears ?? 1, spotted: s.wish.spots }, WISH_BOX.x + WISH_BOX.w / 2, WISH_BOX.y + 96, 0.7)
    label(ctx, s.wish.ears === null ? 'wants a colour' : 'wants a body', WISH_BOX.x + WISH_BOX.w / 2, WISH_BOX.y - 10, { align: 'center', size: 18, color: '#7f7a68' })
    if (s.wishes) label(ctx, `wishes ${s.wishes}`, WISH_BOX.x + WISH_BOX.w / 2, WISH_BOX.y + WISH_BOX.h + 24, { align: 'center', size: 20, color: '#7f7a68' })
  }

  for (const c of s.meadow) {
    if (c.selected) circle(ctx, c.x, c.y, 62, { stroke: '#2b2620', width: 5 })
    creature(ctx, c, c.x, c.y)
    c.parents.forEach((p, i) => creature(ctx, p, c.x - 16 + i * 32, c.y + 68, 0.24))
    c.grands.forEach((g, i) => g && creature(ctx, g, c.x - 33 + i * 22, c.y + 90, 0.14))
  }
  if (s.nest) {
    const { creature: baby, left } = s.nest
    creature(ctx, baby, NEST.x + NEST.w / 2, NEST.y + NEST.h / 2 + 10)
    roundRect(ctx, NEST.x + 20, NEST.y + NEST.h - 22, (NEST.w - 40) * left, 8, 4, '#8a7f6a')
  }
  for (const l of s.leaving) creature(ctx, l, l.x, l.y, 0.7 * l.ttl + 0.3)

  for (const h of s.hint ?? []) {
    const phase = (s.tick % 30) / 30
    circle(ctx, h.x, h.y, 70 + phase * 30, { stroke: `rgba(43,38,32,${(1 - phase) * 0.6})`, width: 5 })
  }
}
