import type { Guidance } from './guidance'
import type { Spot } from './layout'
import type { Yard } from './yard'

// What the hand shows a child who has not touched anything for a while: a
// move that could be made now, never an answer. Tap an egg; then also carry
// something to one. With no egg, the hen, and a chick carried to her.

export type Move = { glow: Spot; from: Spot; to: Spot; drag: boolean }

export function moveToShow(yard: Yard, guidance: Guidance): Move {
  const egg = yard.asking
  const on = egg ?? yard.hen
  const glow = yard.place(on), mid = yard.middle(on)
  const g: Spot = { x: glow.x, y: mid.y }
  const tap = { glow: g, from: mid, to: mid, drag: false }
  if (guidance.demoIndex < 1) return tap
  if (egg) {
    if (guidance.demoIndex % 2 === 0) return tap
    const things = Object.values(yard.things).filter((t) => t.kind !== yard.gag?.thing)
    const near = yard.nearest(egg)
    const thing = things.find((t) => t.kind !== near && (t.kind === 'boot' || t.kind === 'bell')) ?? things[0]
    const side = thing.x < glow.x ? -1 : 1
    return { glow: g, from: yard.middle(thing), to: { x: mid.x + side * 110, y: mid.y }, drag: true }
  }
  const chick = yard.brood.find((c) => c.kind === 'chick' && c.host === null)
  if (!chick) return tap
  if (guidance.demoIndex % 2 === 0 && yard.brood.length >= 5) return { ...tap, from: yard.middle(chick), to: yard.middle(chick) }
  return { glow: g, from: yard.middle(chick), to: mid, drag: true }
}
