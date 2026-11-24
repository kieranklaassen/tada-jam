import { other, parting, sideOf, type Side } from './bed'
import { askers, hidden, quiet, type Game } from './game'
import type { Point } from './input'
import { CRATE, DOG, HALF, QUILT } from './layout'

// What the idle hand shows: one move, chosen from what is on screen. With milk
// out it taps a sheep whose eyes are on a straw, and what comes of it is seen.

export type Hint = { at: Point; glow: Point[]; r: number }

export function hintFor(g: Game, turn = 0): Hint | null {
  if (!quiet(g)) return null
  if (!g.save.milk) return { at: { x: CRATE.x, y: CRATE.y - 14 }, glow: [CRATE, DOG], r: 100 }
  const asking = askers(g).filter((i) => !hidden(g, i))
  if (asking.length === 0) {
    const q = g.save.quilt
    if (q && parting(g.bed)[q].length > 0) return { at: { x: HALF[q].mid, y: QUILT.hem + 18 }, glow: [{ x: HALF[q].mid, y: QUILT.hem + 18 }], r: 80 }
    const any = g.bed.sheep.findIndex((_, i) => !hidden(g, i))
    if (any < 0) return null
    return { at: spot(g, any), glow: [spot(g, any)], r: 84 }
  }
  return { at: spot(g, asking[turn % asking.length]), glow: asking.map((i) => spot(g, i)), r: 84 }
}
const spot = (g: Game, i: number): Point => ({ x: g.bed.sheep[i].x, y: g.bed.sheep[i].y + 16 })

/** The half with the most room, which the dog watches. */
export function roomiest(g: Game): Side {
  const parts = parting(g.bed)
  return parts.left.length === parts.right.length ? other(sideOf(g.bed.sheep[0].x)) : parts.left.length < parts.right.length ? 'left' : 'right'
}
