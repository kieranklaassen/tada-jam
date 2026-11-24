import type { Point } from './input'
import { BEDS } from './night'
import { GARMENTS, type Garment } from './things'

// Where everything stands, in stage units (1180 by 820). The line of clothes runs across the window; the beds
// stand in one row under it; the wardrobe is on the left and the lamp on the right.

export const BED = { first: 150, pitch: 220, width: 204, head: 388, top: 470, foot: 772 } as const
export const LANE = 800
export const WINDOW = { x: 184, y: 14, width: 832, height: 312 } as const
export const LINE = { y: 112, first: 236, pitch: 91, left: 138, right: 1066 } as const
export const PIECE = { width: 88, height: 118 } as const
/** Clear of the shell's home control, which stands at the top centre. */
export const MOON = { x: 800, y: 62, r: 40 } as const
export const WARDROBE = { x: 8, y: 34, width: 150, height: 316 } as const
export const LAMP = { x: 1106, y: 96 } as const
export const KNOB = { x: 1106, y: 292, r: 30 } as const
/** How far past the line of beds a finger still counts as over a bed. */
export const DROP_TOP = 290

export function bedX(bed: number): number {
  return BED.first + BED.pitch * bed
}

/** The bed whose column a point is in, when it is low enough to be meant for a bed. */
export function bedAt(at: Point, top: number = DROP_TOP): number | null {
  if (at.y < top) return null
  const bed = Math.round((at.x - BED.first) / BED.pitch)
  return Math.max(0, Math.min(BEDS - 1, bed))
}

/** The middle of a garment on its peg. */
export function pegOf(garment: Garment): Point {
  return { x: LINE.first + LINE.pitch * GARMENTS.indexOf(garment), y: LINE.y + 66 + sag(LINE.first + LINE.pitch * GARMENTS.indexOf(garment)) }
}

/** How far the line hangs below its ends. */
export function sag(x: number): number {
  const u = (x - LINE.left) / (LINE.right - LINE.left)
  return 4 * 22 * u * (1 - u)
}

export type Touched =
  | { what: 'garment' | 'peg'; garment: Garment }
  | { what: 'bed'; bed: number }
  | { what: 'cord' | 'wardrobe' | 'moon' | 'room' }

/** What a finger at that point is on. `hangs` says whether a garment is on its peg, `gone` whether it is out of the wardrobe and off its peg. */
export function touchedAt(at: Point, hangs: (garment: Garment) => boolean, gone: (garment: Garment) => boolean): Touched {
  if (at.x > 1054 && at.y > 72 && at.y < 356) return { what: 'cord' }
  let best: Garment | null = null, near = LINE.pitch * 0.56
  for (const garment of GARMENTS) {
    if (!hangs(garment) && !gone(garment)) continue
    const peg = pegOf(garment)
    if (at.y < LINE.y - 14 || at.y > peg.y + PIECE.height * 0.62) continue
    const off = Math.abs(at.x - peg.x)
    if (off < near) { near = off; best = garment }
  }
  if (best) return { what: hangs(best) ? 'garment' : 'peg', garment: best }
  if (Math.hypot(at.x - MOON.x, at.y - MOON.y) < MOON.r + 16) return { what: 'moon' }
  if (at.x < WARDROBE.x + WARDROBE.width && at.y < WARDROBE.y + WARDROBE.height) return { what: 'wardrobe' }
  const bed = bedAt(at, BED.head - 30)
  if (bed !== null && at.y < BED.foot + 14 && Math.abs(at.x - bedX(bed)) < BED.width / 2 + 4) return { what: 'bed', bed }
  return { what: 'room' }
}
