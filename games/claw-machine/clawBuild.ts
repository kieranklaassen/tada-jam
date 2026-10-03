import type { Brick, Rgb } from './bricks'
import { STEEL, STEEL_DARK, TRIM } from './palette'

// The claw: a hub on the end of the cable and two jaws that swing out from it.
// Each part is built hanging down from its own origin: the hub from the end of
// the cable, a jaw from its hinge.

const box = (colour: Rgb, x: number, y: number, z: number, w: number, d: number, h: number, studs = false): Brick => ({ x, y, z, w, d, h, colour, studs })

/** How far below the end of the cable the jaws are hinged, in world units. */
export const HINGE_DROP = 1.6
/** How far out from the middle each hinge is. */
export const HINGE_OUT = 1
/** How far below its hinge a jaw reaches, in world units: where its tooth is. */
export const JAW_REACH = 2.8
/** How far a tooth turns in from its arm, and how far below the hinge the middle of a tooth is. */
export const TOOTH = 0.9
export const TOOTH_DROP = 2.6

/**
 * How far open the jaws stand to hold something `half` wide between their teeth, as the claw counts it (0 shut,
 * 1 wide open): the teeth close beside the thing and never into it.
 */
export function gripFor(half: number): number {
  const inner = 1 - TOOTH
  return Math.asin(Math.min(0.95, Math.max(0, (half + 0.22 - inner) / TOOTH_DROP))) / JAW_SWING
}
/** How far a jaw swings, in radians, when the claw is wide open. */
export const JAW_SWING = 0.75

export function hubBricks(): Brick[] {
  return [
    { x: -1, y: -3, z: -1, w: 2, d: 2, h: 3, colour: STEEL_DARK, round: true, studs: false },
    { x: -1.5, y: -4, z: -1.5, w: 3, d: 3, h: 1, colour: TRIM, round: true, studs: false },
  ]
}

/** One jaw, for the side `side` (-1 left, 1 right): an arm down from the hinge and a tooth turned inward. */
export function jawBricks(side: -1 | 1): Brick[] {
  const arm = box(STEEL, side > 0 ? 0 : -1, -6, -1, 1, 2, 6)
  const tooth = box(TRIM, side > 0 ? -TOOTH : -1, -7, -1, 1 + TOOTH, 2, 1)
  return [arm, tooth]
}
