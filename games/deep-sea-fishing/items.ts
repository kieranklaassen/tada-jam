import type { SpriteId } from './rig'

// One frame is a list of these, in order from the back: sprite stamps, and the
// few strokes that are drawn live (the line, pupils, mouths, bubbles, crumbs).
// The list is made from the game's numbers alone, with no canvas, so a test
// can count a frame and measure where things lie, and the painter (view.ts)
// only carries the list out.

/** The three dyes a live stroke can be drawn in. */
export type Dye = 'cream' | 'ochre' | 'dark'

export type Item =
  /** A painted sprite, stamped with its pivot at (x, y). `add` lays it on as light. `tint` stamps it in another dye: 1 inked black, 2 cheese yellow. */
  | { k: 'sprite'; id: SpriteId; x: number; y: number; r: number; sx: number; sy: number; a: number; add: boolean; tint: 0 | 1 | 2 }
  /** A filled oval: a pupil or a mouth in the dark dye, a crumb in ochre, a glint in cream. */
  | { k: 'disc'; x: number; y: number; rx: number; ry: number; r: number; dye: Dye; a: number }
  /** A bubble, or a ripple where `flat` squashes it onto the water. A bubble is drawn with its glint, so that it is never a bare ring. */
  | { k: 'ring'; x: number; y: number; rad: number; flat: number; w: number; a: number }
  /** A stroke through points given as x, y pairs: the fishing line, an arm, a string of cheese, a brow. */
  | { k: 'line'; pts: number[]; w: number; dye: Dye; a: number }

export function sprite(out: Item[], id: SpriteId, x: number, y: number, r = 0, sx = 1, sy = 1, a = 1, add = false, tint: 0 | 1 | 2 = 0): void {
  if (a > 0.004) out.push({ k: 'sprite', id, x, y, r, sx, sy, a: Math.min(1, a), add, tint })
}
export function disc(out: Item[], x: number, y: number, rx: number, ry: number, dye: Dye, a = 1, r = 0): void {
  if (a > 0.004 && rx > 0.05 && ry > 0.05) out.push({ k: 'disc', x, y, rx, ry, r, dye, a: Math.min(1, a) })
}
export function ring(out: Item[], x: number, y: number, rad: number, a = 1, w = 1.6, flat = 1): void {
  if (a > 0.004 && rad > 0.2) out.push({ k: 'ring', x, y, rad, flat, w, a: Math.min(1, a) })
}
export function line(out: Item[], pts: number[], w: number, dye: Dye, a = 1): void {
  if (a > 0.004) out.push({ k: 'line', pts, w, dye, a: Math.min(1, a) })
}
