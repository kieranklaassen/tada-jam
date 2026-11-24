import { BED, type Side } from './bed'
import type { Point } from './input'

// Where everything in the frame is, in stage units.

export const SHELF = { top: 66, y: 182, bottom: 206 } as const
/** The middle of each half, and how wide a half is. */
export const HALF: Record<Side, { left: number; right: number; mid: number }> = {
  left: { left: BED.left, right: BED.crest, mid: (BED.left + BED.crest) / 2 },
  right: { left: BED.crest, right: BED.right, mid: (BED.right + BED.crest) / 2 },
}
export const BOTTLE = { w: 54, h: 100, apart: 80 } as const
/** The foot of a bottle: `slot` of `n` on that shelf. */
export function bottleAt(side: Side, slot: number, n: number): Point {
  return { x: HALF[side].mid + (slot - (n - 1) / 2) * BOTTLE.apart, y: SHELF.y }
}
/** The quilt: rolled at the foot, and pulled up to the hem. */
export const QUILT = { roll: BED.bottom + 8, rollH: 74, hem: BED.top + 10, hemH: 58 } as const
/** The hem's height when the quilt is up so far (0 rolled, 1 up). */
export const hemAt = (k: number): number => QUILT.roll + (QUILT.hem - QUILT.roll) * k
export const DOG = { x: 102, y: 420 } as const
export const CRATE = { x: 102, y: 640 } as const
export const MOUSE = { x: 1132, y: 150 } as const
/** Anything the finger can land on. */
export type Thing =
  | { kind: 'sheep'; who: number }
  | { kind: 'hidden'; side: Side }
  | { kind: 'hem'; side: Side }
  | { kind: 'roll'; side: Side }
  | { kind: 'bottle'; index: number }
  | { kind: 'straw' }
  | { kind: 'dog' }
  | { kind: 'crate' }
  | { kind: 'mouse' }
  | { kind: 'ridge' }
  | { kind: 'mattress'; side: Side }
  | { kind: 'rug' }
