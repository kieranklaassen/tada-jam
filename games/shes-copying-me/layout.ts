import { STAGE, type Point } from './stage'
import type { Act, Side } from './rules'

// Where everything is. Both halves of the room are one half, measured outward
// from the middle: `u` is the distance from the middle line and `y` is the
// stage's own. A copy is therefore the same numbers on the other side.

export type Spot = { u: number; y: number }

export const MIDDLE = STAGE.width / 2

export function toPoint(side: Side, spot: Spot): Point {
  return { x: side === 0 ? MIDDLE - spot.u : MIDDLE + spot.u, y: spot.y }
}

export function toSpot(side: Side, at: Point): Spot {
  return { u: side === 0 ? MIDDLE - at.x : at.x - MIDDLE, y: at.y }
}

export const sideOf = (at: Point): Side => (at.x < MIDDLE ? 0 : 1)

/** The direction outward on a side, for drawing. */
export const outward = (side: Side): 1 | -1 => (side === 0 ? -1 : 1)

export const AUNT: Spot = { u: 250, y: 380 }
export const FACE: Spot = { u: 250, y: 240 }
export const FACE_RADIUS = 78
export const SHOULDER: Spot = { u: 292, y: 372 }
export const HOME: Spot = { u: 312, y: 486 }
export const GUEST: Spot = { u: 455, y: 575 }
const GUEST_REACH = { u: 108, y: 118 }
/** The hands meet at the middle, in this column. */
const MEET = { u: 96, top: 320, bottom: 640 }
export const MEETING: Spot = { u: 62, y: 470 }
const SHOW_BELOW = 168

/** Where a hand may go: it never leaves its half, and stays off the surface's edges. */
export function reach(spot: Spot): Spot {
  return { u: Math.min(560, Math.max(34, spot.u)), y: Math.min(668, Math.max(88, spot.y)) }
}

export type Zone = Exclude<Act, 'wave'> | 'meet' | null

/** What being at a place means. */
export function zoneAt(spot: Spot): Zone {
  if (spot.u < MEET.u && spot.y > MEET.top && spot.y < MEET.bottom) return 'meet'
  if (Math.hypot(spot.u - FACE.u, spot.y - FACE.y) < FACE_RADIUS) return 'self'
  if (Math.hypot((spot.u - GUEST.u) / GUEST_REACH.u, (spot.y - GUEST.y) / GUEST_REACH.y) < 1) return 'dab'
  if (spot.y < SHOW_BELOW) return 'show'
  if (Math.abs(spot.u - GUEST.u) < 118 && spot.y < GUEST.y) return 'tip'
  return null
}

/** The four places on the table: two on each half, the nearer one first. */
export const TABLE_TOP = 704
const PLACES: readonly { side: Side; spot: Spot }[] = [
  { side: 0, spot: { u: 218, y: 654 } },
  { side: 0, spot: { u: 106, y: 654 } },
  { side: 1, spot: { u: 106, y: 654 } },
  { side: 1, spot: { u: 218, y: 654 } },
]
export const place = (slot: number): Point => toPoint(PLACES[slot].side, PLACES[slot].spot)
export const placeSide = (slot: number): Side => PLACES[slot].side

export const BELL: Point = { x: MIDDLE, y: 664 }
export const PENDULUM = { pivot: { x: MIDDLE, y: 306 }, length: 92, bob: { x: MIDDLE, y: 398 } } as const
export const PANES: readonly [Point, Point] = [{ x: MIDDLE - 66, y: 196 }, { x: MIDDLE + 66, y: 196 }]
export const PANE = { width: 122, height: 190 } as const

export type Target =
  | { kind: 'hand' }
  | { kind: 'thing'; slot: number }
  | { kind: 'bell' }
  | { kind: 'pendulum' }
  | { kind: 'pane'; side: Side }

/** What a finger landing here is on. Everything that is nothing else is the hand of that half, so every touch is answered. */
export function targetAt(at: Point, bell: boolean): Target {
  for (let slot = 0; slot < 4; slot++) {
    const p = place(slot)
    if (Math.abs(at.x - p.x) < 54 && at.y > 596 && at.y < 724) return { kind: 'thing', slot }
  }
  if (bell && Math.abs(at.x - BELL.x) < 50 && at.y > 610 && at.y < 724) return { kind: 'bell' }
  if (Math.hypot(at.x - PENDULUM.bob.x, at.y - PENDULUM.bob.y) < 52) return { kind: 'pendulum' }
  for (const side of [0, 1] as const) {
    const p = PANES[side]
    if (Math.abs(at.x - p.x) < PANE.width / 2 + 4 && Math.abs(at.y - p.y) < PANE.height / 2) return { kind: 'pane', side }
  }
  return { kind: 'hand' }
}

/** Whether a thing let go here is let go on that half's aunt. */
export function onAunt(at: Point): boolean {
  const spot = toSpot(sideOf(at), at)
  return spot.u > 110 && spot.u < 400 && spot.y > 130 && spot.y < 596
}

/** Whether a bell let go here rings: lifted over the middle of the table. */
export function rings(at: Point): boolean {
  return Math.abs(at.x - BELL.x) < 170 && at.y > 380 && at.y < BELL.y - 50
}

/** The cat on the sofa, behind the table. It answers a finger as itself, and the hand goes there all the same. */
export function onCat(at: Point): boolean {
  return Math.abs(at.x - MIDDLE) < 90 && at.y > 552 && at.y < 600
}
