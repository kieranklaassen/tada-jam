import { other, parting, sideOf, type Side } from './bed'
import { asker, hidden, quiet, type Game } from './game'
import type { Point } from './input'
import { CRATE, DOG, HALF, QUILT } from './layout'

// What the idle hand shows: one move, chosen from what is on screen. With milk
// out it taps the sheep that asks, and what comes of it is seen. For a child of
// three or four the way to do it has to be shown on a sheep that wants to go.

export type Hint = { at: Point; glow: Point[]; r: number }

export function hintFor(g: Game): Hint | null {
  if (!quiet(g)) return null
  if (!g.save.milk) return { at: { x: CRATE.x, y: CRATE.y - 14 }, glow: [CRATE, DOG], r: 100 }
  const q = g.save.quilt
  const who = asker(g)
  if (who === null) return null
  // Whoever is under the quilt cannot be tapped: off with it first.
  const at = hidden(g, who) && q ? { x: HALF[q].mid, y: QUILT.hem + 20 } : spot(g, who)
  return { at, glow: [at], r: 84 }
}
const spot = (g: Game, i: number): Point => ({ x: g.bed.sheep[i].x, y: g.bed.sheep[i].y + 16 })

/** The half with the most room, which the dog watches. */
export function roomiest(g: Game): Side {
  const parts = parting(g.bed)
  return parts.left.length === parts.right.length ? other(sideOf(g.bed.sheep[0].x)) : parts.left.length < parts.right.length ? 'left' : 'right'
}
