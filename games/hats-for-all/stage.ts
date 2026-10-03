import { MOST } from './kinds'

// Where things stand, in the mat's own units (one unit is about a hand's
// width of foam). Pure numbers: the rules use them to say which head is
// nearest, and the view draws from the same ones, so what the child sees as
// nearest is what the rules call nearest.
// x runs left to right, z from the back wall (negative) towards the child.

/** The creatures stand in one row of five spots across the mat. */
export const SPOT_GAP = 3
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

/** The foam arch the creatures come and go through, at the right edge of the mat. */
export const ARCH_X = 9.4
export const ARCH_Z = -1.4

/** The spot whose x is nearest to this x; the lower spot wins a tie. */
export function nearestSpot(x: number): number {
  let best = 0
  for (let spot = 1; spot < MOST; spot++) if (Math.abs(spotX(spot) - x) < Math.abs(spotX(best) - x)) best = spot
  return best
}
