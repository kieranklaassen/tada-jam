import type { Point } from './input'
import { inCorner } from './overlay'
import { toStage, type Fit } from './stage'

// The top right corner of the surface is the grown-up's (overlay.ts): a
// finger that rests there and three taps show the performance readout. A
// touch there is not the child's, and the yard does not answer it: no knock,
// no gloss, no look. The corner is measured where the overlay measures it,
// in the surface's own pixels, so the silent square and the overlay's square
// are the same square at every size of surface. It is not a place on the
// stage: a stage fitted into a wide surface does not reach it, and in a
// narrow one it lies over a different piece of sky.

/**
 * A touch as the yard takes it. `at` is the point in the surface's CSS pixels and `width` the surface's width in
 * the same pixels; `by` is the view's fit. It gives the point in stage units, or null for a touch in the
 * grown-up's corner, which the yard is not told about.
 */
export function yardTouch(at: Point, width: number, by: Fit): Point | null {
  return inCorner(at.x, at.y, width) ? null : toStage(at, by)
}
