import { at, FLAME, GATE, LENGTH, PLACES } from './garden'
import type { Point } from './input'
import type { Play } from './play'

// What the idle ladder shows from the state of play: only the one who carries
// and where its light is wanted next, never two things.

export type Want = { what: 'light' | 'place' | 'blow' | 'none'; place: number; from: Point; to: Point; drag: boolean }

export function want(play: Play): Want {
  const w = play.walker, here = play.where(), hand = { x: here.x, y: here.y - (w.u < 30 ? 110 : 48) }
  if (play.puff !== null || play.tune !== null) return { what: 'none', place: -1, from: hand, to: hand, drag: false }
  if (play.full) return { what: play.asksToBlow ? 'blow' : 'none', place: -1, from: { x: GATE.x, y: GATE.y - 120 }, to: hand, drag: false }
  if (!w.lit) return { what: 'light', place: -1, from: hand, to: { x: FLAME.x, y: FLAME.y - 34 }, drag: true }
  const place = play.nearestDark(here)
  if (place < 0) return { what: 'none', place: -1, from: hand, to: hand, drag: false }
  return { what: 'place', place, from: hand, to: PLACES[place].apple, drag: true }
}

/** Where the ghost hand is, part of the way along a move: it keeps to the path, as a finger that traces it would. */
export function handAt(play: Play, w: Want, travel: number): Point {
  if (!w.drag) return w.from
  const from = play.walker.u, to = w.what === 'light' ? LENGTH : PLACES[w.place].u
  const on = at(from + (to - from) * travel), start = at(from), end = at(to), lift = 1 - travel
  return { x: on.x + (w.from.x - start.x) * lift + (w.to.x - end.x) * travel, y: on.y + (w.from.y - start.y) * lift + (w.to.y - end.y) * travel }
}
