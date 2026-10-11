import { FOLD_X, LANES, LEAF_SQUEEZE } from './layout'

// The one full-surface composite of a frame: the still picture, stamped onto the surface before the figures are
// painted over it. It is stamped once, whole. Two moments stamp it in pieces that together cover the surface
// once: while the board slides, the part of the wide picture that is in view; and while the leaf behind the fold
// is lifted, the picture in bands, with the lanes of the leaf drawn narrower and the table under them filled in.

/** The surface in its own pixels, and where the stage lies on it: `k` pixels to a stage unit, from (`x`, `y`). */
export type Surface = { w: number; h: number; k: number; x: number; y: number }

type Stamper = Pick<CanvasRenderingContext2D, 'drawImage' | 'fillRect' | 'fillStyle'>

/**
 * Stamps the still picture. `leaf` is how far the leaf is lifted, 0 to 1; `slid` is how far the wide picture has
 * slid, in stage units, and 0 when the picture is not the wide one. Returns the number of stamps.
 */
export function stampStill(surface: Stamper, still: CanvasImageSource, on: Surface, leaf: number, slid: number, table: string): number {
  const { w, h, k } = on
  if (leaf <= 0) {
    surface.drawImage(still, Math.round(slid * k), 0, w, h, 0, 0, w, h)
    return 1
  }
  const top = Math.round(on.y + LANES.y * k), bottom = Math.round(on.y + (LANES.y + LANES.h) * k)
  const fold = Math.round(on.x + FOLD_X * k), narrow = Math.round(fold * (1 - LEAF_SQUEEZE * leaf))
  surface.drawImage(still, 0, 0, w, top, 0, 0, w, top)
  surface.drawImage(still, 0, bottom, w, h - bottom, 0, bottom, w, h - bottom)
  surface.drawImage(still, fold, top, w - fold, bottom - top, fold, top, w - fold, bottom - top)
  surface.fillStyle = table
  surface.fillRect(0, top, fold - narrow, bottom - top)
  surface.drawImage(still, 0, top, fold, bottom - top, fold - narrow, top, narrow, bottom - top)
  // The lifted leaf is in its own shade, and throws a hard one on the table it left.
  surface.fillStyle = `rgba(46, 26, 12, ${0.16 * leaf})`
  surface.fillRect(fold - narrow, top, narrow, bottom - top)
  surface.fillStyle = `rgba(46, 26, 12, ${0.3 * leaf})`
  surface.fillRect(Math.max(0, fold - narrow - 26 * k * leaf), top + 10 * k, Math.min(fold - narrow, 26 * k * leaf), bottom - top - 10 * k)
  return 4
}
