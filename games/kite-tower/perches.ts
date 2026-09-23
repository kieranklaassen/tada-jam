import type { KiteTarget } from './climb'
import { LAMP, SHELF } from './layout'

// Where the kite can get stuck. Each perch is a real place in the playroom
// (a shelf board, the shelf top, the picture hook, the window sill, the lamp
// shade) at its own height. After a flight the kite drifts to the next one:
// always a different place and a different height, never a level.

export type PerchPlace = 'shelfBoard' | 'hook' | 'shelfTop' | 'sill' | 'lamp'

export type Perch = {
  place: PerchPlace
  /** Where the kite hangs in the build plane: x, and the height the doll's fingertips must reach. */
  x: number
  grabY: number
  /** The kite's resting centre, tilt and backward lean, for the view. */
  kite: { x: number; y: number; z: number; tilt: number; lean: number }
}

// A kite resting on a ledge leans back so its bottom tip sits just past the
// front edge and the tail and line fall in front of it. One caught on the
// lamp hangs just in front of the shade's rim.
export const PERCHES: readonly Perch[] = [
  { place: 'shelfBoard', x: 5.3, grabY: 3.95, kite: { x: 5.3, y: 4.86, z: SHELF.front - 0.2, tilt: 0.22, lean: -0.3 } },
  { place: 'hook', x: -1.4, grabY: 5.3, kite: { x: -1.4, y: 6.25, z: -2.05, tilt: -0.12, lean: 0 } },
  { place: 'shelfTop', x: 5.6, grabY: 6.65, kite: { x: 5.6, y: 7.56, z: SHELF.front - 0.12, tilt: -0.3, lean: -0.3 } },
  { place: 'sill', x: -5.5, grabY: 4.6, kite: { x: -5.5, y: 5.48, z: -1.9, tilt: 0.28, lean: -0.3 } },
  { place: 'lamp', x: -3.3, grabY: 6.05, kite: { x: -3.3, y: 7.0, z: LAMP.z + LAMP.shade + 0.16, tilt: 0.1, lean: 0 } },
]

export function perchIndex(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < PERCHES.length ? value : 0
}

/** Age is a dial: the youngest start where one block is enough; older children start a little higher. */
export function startPerch(childAge: number | null): number {
  return childAge !== null && childAge >= 7 ? 3 : 0
}

export function nextPerch(current: number): number {
  return (perchIndex(current) + 1) % PERCHES.length
}

export function kiteTarget(index: number): KiteTarget {
  const perch = PERCHES[perchIndex(index)]
  return { x: perch.x, grabY: perch.grabY }
}
