import type { Guidance } from './guidance'
import type { Spot } from './layout'
import type { Yard } from './yard'

// What the hand shows a child who has not touched anything for a while: a
// move that could be made now, never an answer. Tap an egg; then also carry
// something to one. Then the mother of the chick
// that came out. With no egg, the hen, and a chick carried to her.

export type Move = { glow: Spot; from: Spot; to: Spot; drag: boolean; then?: Spot }

export function moveToShow(yard: Yard, guidance: Guidance): Move {
  // First the mother of the one just hatched: touch her, and see who does it too. Then the next egg.
  const mother = yard.proud ? yard.things[yard.proud] : null
  const egg = mother ? null : yard.asking
  const on = mother ?? egg ?? yard.hen
  const glow = yard.place(on), mid = yard.middle(on)
  const g: Spot = { x: glow.x, y: mid.y }
  const tap: Move = { glow: g, from: mid, to: mid, drag: false }
  const chick = yard.brood.find((c) => c.kind === 'chick' && c.host === null)
  if (mother) return tap
  // With five chicks the hen lifts her wing, and the next tap calls them all in under it.
  if (!egg && chick && yard.brood.length >= 5) tap.then = mid
  if (guidance.demoIndex < 1) return tap
  if (egg) {
    if (guidance.demoIndex % 2 === 0) return tap
    const things = Object.values(yard.things).filter((t) => t.kind !== yard.gag?.thing)
    const near = yard.nearest(egg)
    const thing = things.find((t) => t.kind !== near && (t.kind === 'boot' || t.kind === 'bell')) ?? things[0]
    const side = thing.x < glow.x ? -1 : 1
    return { glow: g, from: yard.middle(thing), to: { x: mid.x + side * 110, y: mid.y }, drag: true }
  }
  if (!chick || guidance.demoIndex % 2 === 0) return tap
  return { glow: g, from: yard.middle(chick), to: mid, drag: true }
}
