import { MOST } from './kinds'

// Where things stand, in the mat's own units (one unit is about a hand's
// width of foam). Pure numbers: the rules use them to say which head is
// nearest, and the view draws from the same ones, so what the child sees as
// nearest is what the rules call nearest.
// x runs left to right, z from the back wall (negative) towards the child.

/** The creatures stand in one row of five spots across the mat. */
export const SPOT_GAP = 3.2
export const ROW_Z = -0.6

export function spotX(spot: number): number {
  return (spot - (MOST - 1) / 2) * SPOT_GAP
}

/** The hats lie in one tile in front of the row, closer together than the spots, so the two rows never line up one under the other. */
export const HOLE_GAP = 2.3
export const TILE_Z = 4.1

export function holeX(hole: number, hats: number): number {
  return (hole - (hats - 1) / 2) * HOLE_GAP
}

/** Where a loose hat rests: in front of its round spot, clear of the lane the creatures walk along. */
export const LOOSE_Z = ROW_Z + 2.7

/** The foam arch the creatures come in through, at the back right of the mat. */
export const ARCH_X = 10.2
export const ARCH_Z = -4.0

/** The spot whose x is nearest to this x; the lower spot wins a tie. */
export function nearestSpot(x: number): number {
  let best = 0
  for (let spot = 1; spot < MOST; spot++) if (Math.abs(spotX(spot) - x) < Math.abs(spotX(best) - x)) best = spot
  return best
}

// --- The ways the creatures walk -----------------------------------------
// Every way is a line of straight stretches on the mat. They keep clear of
// one another by lanes: the row stands on z = ROW_Z, a walker passes in front
// of it on LANE_Z or behind it on BACK_Z, a loose hat rests further forward,
// and the tile lies in front of that. So a creature walking never passes
// through one standing, through a loose hat, the tile or the arch.

export type Point = { x: number; z: number }

/** The lane in front of the row, and the one behind it. */
export const LANE_Z = 0.55
export const BACK_Z = -2.4
/** Off the mat's view to the right, behind the arch, and to the left along the lane. */
export const OFF_RIGHT: Point = { x: ARCH_X + 8.5, z: ARCH_Z - 1.6 }
export const BEHIND_ARCH: Point = { x: ARCH_X, z: ARCH_Z - 1.6 }
export const IN_ARCH: Point = { x: ARCH_X, z: ARCH_Z }
export const OFF_LEFT_X = -14.5
/** Where the parade turns, at either end of the row. */
export const TURN_LEFT_X = -7.4
export const TURN_RIGHT_X = 8.2

export function spotPoint(spot: number): Point {
  return { x: spotX(spot), z: ROW_Z }
}

/** From off the mat to standing in the arch: the way of the one who waits. */
export function wayToArch(): Point[] {
  return [OFF_RIGHT, BEHIND_ARCH, IN_ARCH]
}

/** From the arch to a round spot: out of the arch, along the lane in front of the row, and back onto the spot. */
export function wayFromArch(spot: number): Point[] {
  return [IN_ARCH, { x: ARCH_X, z: LANE_Z }, { x: spotX(spot), z: LANE_Z }, spotPoint(spot)]
}

/** From a round spot out through the arch and off the mat. */
export function wayOutByArch(spot: number): Point[] {
  return [...wayFromArch(spot).reverse(), BEHIND_ARCH, OFF_RIGHT]
}

/** From a round spot off to the left: the way of a finished crew, which leaves the arch to the crew that waits. */
export function wayOffLeft(spot: number): Point[] {
  return [spotPoint(spot), { x: spotX(spot), z: LANE_Z }, { x: OFF_LEFT_X, z: LANE_Z }]
}

/** Once round the row and home again: forward, left along the lane, round behind the row, back along the lane. Every spot's way is as long as every other's, so the line keeps its gaps. */
export function paradeWay(spot: number): Point[] {
  const x = spotX(spot)
  return [spotPoint(spot), { x, z: LANE_Z }, { x: TURN_LEFT_X, z: LANE_Z }, { x: TURN_LEFT_X, z: BACK_Z }, { x: TURN_RIGHT_X, z: BACK_Z }, { x: TURN_RIGHT_X, z: LANE_Z }, { x, z: LANE_Z }, spotPoint(spot)]
}

/** From a round spot to the back edge of the tile beside a hole, for the first showing. */
export function wayToTile(spot: number, hole: number, hats: number): Point[] {
  return [spotPoint(spot), { x: spotX(spot), z: LANE_Z }, { x: holeX(hole, hats) - 1.5, z: TILE_Z - 2.2 }]
}

/** How fast the parade marches, in mat units a second, and how long each creature waits after the one before it, so the line opens out and nobody brushes a neighbour at a turn. */
export const PARADE_SPEED = 7
export const PARADE_STAGGER_S = 0.14

export function wayLength(way: readonly Point[]): number {
  let length = 0
  for (let i = 1; i < way.length; i++) length += Math.hypot(way[i].x - way[i - 1].x, way[i].z - way[i - 1].z)
  return length
}

/** Where a walker is after `distance` along a way, and which way it is heading there (-1 left, 1 right, 0 towards or away). Writes into `out`. */
export function alongWay(way: readonly Point[], distance: number, out: { x: number; z: number; heading: number }): void {
  let left = Math.max(0, distance)
  for (let i = 1; i < way.length; i++) {
    const a = way[i - 1], b = way[i], stretch = Math.hypot(b.x - a.x, b.z - a.z)
    if (left <= stretch || i === way.length - 1) {
      const t = stretch > 0 ? Math.min(1, left / stretch) : 1
      out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; out.heading = Math.sign(b.x - a.x)
      return
    }
    left -= stretch
  }
  out.x = way[0].x; out.z = way[0].z; out.heading = 0
}
