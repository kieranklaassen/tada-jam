// template: cartridge/stage.ts v3
import type { Point } from './input'

// For a canvas 2D game. The stage is drawn in fixed units and fitted into the
// surface with one scale and one offset, and every touch comes back through
// the inverse. The shell resizes the surface as it likes, so nothing is laid
// out in the surface's own pixels. A three.js game frames its scene with its
// camera and has no use for this file.
//
// One fit serves both ways, and it is made from the surface's size in CSS
// pixels, the Mount's `width` and `height`: `fit(width, height)`.
// - A touch arrives in CSS pixels and goes through `toStage` with that fit.
// - The draw sets its transform to the pixel ratio times that fit:
//   `setTransform(dpr * scale, 0, 0, dpr * scale, dpr * x, dpr * y)`.
// The fit is never made from `canvas.width` and `canvas.height`. Those are
// the size times the pixel ratio, so every touch would land off by the ratio
// on a tablet, and right on a display of ratio 1, where a test runs.

/** The stage in its own units. It is the size the stills are taken at, so at that size one unit is one pixel. */
export const STAGE = { width: 1180, height: 820 } as const

/** How the stage sits in a surface: one scale, and the offset that centres it. */
export type Fit = { scale: number; x: number; y: number }

/**
 * Fits the whole stage into a surface of `width` by `height` CSS pixels, centred. A surface of another shape
 * shows more of the backdrop at two sides, so the backdrop is drawn past the stage's edges. A surface with no
 * size yet gives a scale of 0: draw nothing then.
 */
export function fit(width: number, height: number): Fit {
  if (!(width > 0) || !(height > 0)) return { scale: 0, x: 0, y: 0 }
  const scale = Math.min(width / STAGE.width, height / STAGE.height)
  return { scale, x: (width - STAGE.width * scale) / 2, y: (height - STAGE.height * scale) / 2 }
}

/** A point of the surface in CSS pixels, as a touch gives it, in stage units: where on the stage the touch landed. A touch outside the stage lands outside its bounds. */
export function toStage(at: Point, by: Fit): Point {
  return { x: (at.x - by.x) / by.scale, y: (at.y - by.y) / by.scale }
}
