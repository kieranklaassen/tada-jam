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
/** Where a load's middle stands pressed against the wall, whose face is at 0. */
export const AT_WALL = DEPTH / 2 + 0.03
export const ENTER_Z = -1.75
export const SLOT_Z = -2.95
export const CUB_Z = -4.1
export const SLOTS = [-4.4, 0, 4.4] as const

export const WIDE = { radius: 1.16, height: 3.1 }
export const TALL = { radius: 0.94, height: 3.75 }
export const BEARS = [WIDE, TALL] as const
/** How flat a bear is pressed, as a share of its height. */
export const FLAT = 0.4

/** The part of the world that is always in view, as drawn. */
export const VIEW = { half: 7.45, low: -1.75, high: 8.8 }
