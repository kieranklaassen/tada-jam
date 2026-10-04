// The way the snail glides when it comes out: along the wet the child made,
// to the wettest place (ART.md, "The scenes"). No renderer. The wet is the
// coarse grid of ground.ts, so the way has the shape of the child's line as
// that grid holds it: cell by cell from the patch, always on to the wettest
// wet cell next to it, and never nearer a thing than a snail may pass.

import { COLS, ROWS, cellAt, centreOf, type Ground } from './ground'
import { THING_REACH as PATCH_REACH, distance, type Place } from './layout'

/** How near the middle of another thing the way may pass. */
export const WAY_CLEAR = 1.9
/** The most legs a way has: a glide is a few seconds long. */
export const WAY_MOST = 8
/** With no wet sand to go to it glides across its own patch, to here from the patch's middle. */
export const ACROSS: Place = { x: -0.5, z: -0.24 }

/** How far from the patch's middle the way may begin: a line that comes this near the patch is joined to it. */
export const FIRST_REACH = 3.0

/**
 * The way from the patch at `home`, as points measured from `home`. It begins
 * on the nearest wet cell by the patch and goes on, cell by cell, to the
 * nearest wet cell next to it (the wetter of two as near), or over a gap of
 * one cell where the line was drawn fast. It never curls back on itself, and it ends on the wettest cell
 * it reached, the furthest such cell if several are as wet. With no wet cell
 * beside the patch, or none it may pass to, it is the short way across the
 * patch: a snail does not cross dry sand.
 */
export function snailWay(ground: Ground, home: Place, others: readonly Place[]): Place[] {
  if (cellAt(home.x, home.z) < 0) return [{ ...ACROSS }]
  const clear = (at: Place) => others.every((other) => distance(other, at) > WAY_CLEAR)
  const seen = new Set<number>()
  const way: number[] = []
  let from: Place = home
  const beside = (a: Place, b: Place) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)) < 1.5
  /** The wet cell it goes on to from where it is, of those `near` picks. */
  const next = (near: (at: Place) => boolean): number => {
    let best = -1
    for (let cell = 0; cell < COLS * ROWS; cell++) {
      const at = centreOf(cell)
      // The patch's own reach takes its water as the patch: the sand, and the way, begin outside it.
      if (seen.has(cell) || !(ground[cell] > 0) || distance(at, home) <= PATCH_REACH || !near(at)) continue
      // It does not curl back: no cell beside one it passed before the one it has just left.
      if (way.slice(0, -2).some((earlier) => beside(at, centreOf(earlier)))) continue
      // The leg there is clear at its end and at its middle.
      if (!clear(at) || !clear({ x: (from.x + at.x) / 2, z: (from.z + at.z) / 2 })) continue
      // The nearest wet cell is the next of the line, which keeps the line's shape; of two as near, the wetter.
      const gap = distance(from, at), bestGap = best < 0 ? Infinity : distance(from, centreOf(best))
      if (gap < bestGap - 0.01 || (Math.abs(gap - bestGap) <= 0.01 && ground[cell] > ground[best])) best = cell
    }
    return best
  }
  const within = (cells: number) => (at: Place) => Math.max(Math.abs(at.x - from.x), Math.abs(at.z - from.z)) < cells + 0.5
  let cell = next((at) => distance(at, home) <= FIRST_REACH)
  while (cell >= 0 && way.length < WAY_MOST) {
    way.push(cell)
    seen.add(cell)
    from = centreOf(cell)
    cell = next(within(1))
    if (cell < 0) cell = next(within(2))
  }
  if (way.length === 0) return [{ ...ACROSS }]
  const wettest = Math.max(...way.map((at) => ground[at]))
  const last = way.map((at) => ground[at]).lastIndexOf(wettest)
  return way.slice(0, last + 1).map((at) => ({ x: centreOf(at).x - home.x, z: centreOf(at).z - home.z }))
}
