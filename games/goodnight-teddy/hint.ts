import { bareMud, most, wettest, type Fur } from './fur'
import type { Want } from './game'
import type { Point } from './input'
import { CURTAIN, DOORWAY, HOMES, LAMP, TEDDY, type Spot, type ThingId } from './room'

// What the idle ladder shows, chosen from the room as it is: which one thing glows, and the one move the ghost
// hand makes. It shows how a thing is carried to him or where a tap goes, never an order of things to do: the
// hand takes the one thing the room asks for now, and when it asks for nothing, nothing is shown.

export type Hint = {
  /** Where the glow lies, and how large. */
  glow: Spot
  /** The hand's one move: from a thing's place to a place on him. A tap stays where it starts. */
  from: Point
  to: Point
  tap: boolean
  /** The thing the hand carries, if it carries one. */
  carried: ThingId | null
}

/** `rests` is where each carried thing lies now. */
export function hintFor(fur: Fur, want: Want, rests: Record<ThingId, Point>): Hint | null {
  if (want === null) return null
  const onHim = (p: Point | null, or: Point): Point => { const q = p ?? or; return { x: TEDDY.x + q.x, y: TEDDY.y + q.y } }
  const tap = (spot: Spot, at: Point = spot): Hint => ({ glow: spot, from: at, to: at, tap: true, carried: null })
  if (want === 'lamp') return tap(LAMP)
  // The curtain is shown where its cloth hangs clear of the bed and the cat; the door at its handle.
  if (want === 'curtain') return tap(CURTAIN, { x: CURTAIN.x + 30, y: CURTAIN.y + 20 })
  if (want === 'door') return tap({ ...DOORWAY, ry: 150, y: DOORWAY.y - 40 }, { x: DOORWAY.x + 24, y: DOORWAY.y + 60 })
  const from = rests[want], glow = { ...HOMES[want], x: from.x, y: from.y }
  const carry = (to: Point): Hint => ({ glow, from, to, tap: false, carried: want })
  if (want === 'soap') return carry(onHim(bareMud(fur) ?? most(fur, 'mud'), { x: 0, y: -170 }))
  // The jug is shown carried over his head, since its water falls.
  if (want === 'jug') return carry({ x: TEDDY.x - 70, y: TEDDY.y - 520 })
  if (want === 'towel') return carry(onHim(wettest(fur), { x: 0, y: -400 }))
  return carry({ x: TEDDY.x, y: TEDDY.y - 170 })
}
