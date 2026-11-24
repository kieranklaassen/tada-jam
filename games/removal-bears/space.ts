// The one measure of the world: a cell of a load, of the wall and of an
// opening is 1. x runs right, y up, z toward the child. The camera looks
// straight in with a small pitch and no perspective, so a load in front and an
// opening behind it are drawn at one size; a point of the world is drawn at
// (u, v), and a finger is brought back to (u, v).

export const PITCH = 0.2
const COS = Math.cos(PITCH), SIN = Math.sin(PITCH)
export const drawnAt = (x: number, y: number, z: number): { u: number; v: number } => ({ u: x, v: y * COS - z * SIN })

/** The floor of the loft, and so the sill of every opening. */
export const SILL = 4
/** The lane the bears and the cart stand in. */
export const LANE = 4.2
/** How high the bears carry: the load's underside. */
export const CARRY = 0.55
/** A load is a little less deep than a cell. */
export const DEPTH = 0.86
/** Where a load's middle stands against the wall, whose face is at 0, with room for what is on its back. */
export const AT_WALL = DEPTH / 2 + 0.32
export const ENTER_Z = -1.87
export const SLOT_Z = -3.35
export const CUB_Z = -4.52
export const SLOTS = [-4.4, 0, 4.4] as const

export const WIDE = { radius: 1.16, height: 3.1, flat: 1.76 }
export const TALL = { radius: 0.94, height: 3.75, flat: 1.88 }
export const BEARS = [WIDE, TALL] as const
/** How flat a bear is pressed, as a share of its height. `flat` is how high it then is, ears and all. */
export const FLAT = 0.4

/** The part of the world that is always in view, as drawn. */
export const VIEW = { half: 7.45, low: -1.75, high: 8.8 }
