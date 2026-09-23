import { inBowl, plateOf } from './feeding'
import { FEEDING, type MatKey, type Point } from './layout'
import { panOf } from './scale'

// What pieces rest on besides the bare table: the rug, the plates on it, the
// bowl's floor, and the pans' floors. Heights are centimetres above the table
// top (the physics' units). The models draw these surfaces from the same
// numbers and the physics holds stones on them, so a resting stone sits on
// what is drawn instead of sinking into it.

/** The Fair Feeding rug: a thin cloth ellipse (world units in the plane, cm up). */
export const RUG = { center: { x: 780, y: 470 } as Point, rx: 420, rz: 300, bottom: 0.04, top: 0.12 } as const

/** The rug's hem: a clay rope pressed flat into the cloth's edge, low enough to stand and rest on. */
export const RUG_HEM = { tube: 0.42, flatten: 0.3 } as const
export const RUG_HEM_Y = RUG_HEM.tube * RUG_HEM.flatten
export const RUG_HEM_TOP = 2 * RUG_HEM_Y

export function onRug(p: Point): boolean {
  const dx = (p.x - RUG.center.x) / RUG.rx
  const dy = (p.y - RUG.center.y) / RUG.rz
  return dx * dx + dy * dy <= 1
}

/** Plate profile (unit radius) and how tall it is drawn: the flat top is where stones rest. */
export const PLATE_PROFILE: readonly [number, number][] = [
  [0, 0],
  [0.95, 0],
  [1, 0.05],
  [0.98, 0.09],
  [0.74, 0.04],
  [0, 0.04],
]
export const PLATE_HEIGHT = 3.5
export const PLATE_TOP = RUG.top + 0.04 * PLATE_HEIGHT

/** Bowl profile (unit radius at the inner rim, drawn at the bowl's radius): a flat floor, a flared inner wall, a rolled lip. */
export const BOWL_PROFILE: readonly [number, number][] = [
  [0, 0.0],
  [0.62, 0.0],
  [0.82, 0.05],
  [0.98, 0.2],
  [1.1, 0.4],
  [1.17, 0.47],
  [1.13, 0.52],
  [1.05, 0.5],
  [0.99, 0.42],
  [0.88, 0.22],
  [0.72, 0.06],
  [0, 0.06],
]
export const BOWL_SCALE = FEEDING.bowl.r * 0.1
/** The bowl stands on the rug; its floor is this far above the table. */
export const BOWL_FLOOR = RUG.top + 0.06 * BOWL_SCALE
/** The inner wall as (radius, height above the bowl's base) in cm: from the floor, up to the lip, over the lip's crown. */
export const BOWL_WALL: readonly (readonly [number, number])[] = [
  [0.72 * BOWL_SCALE, 0.06 * BOWL_SCALE],
  [0.99 * BOWL_SCALE, 0.42 * BOWL_SCALE],
  [1.13 * BOWL_SCALE, 0.52 * BOWL_SCALE],
]
/** How thick the bowl's wall is drawn, measured square to it. */
export const BOWL_WALL_THICKNESS = 1

/** Scale pan profile (unit radius) and its drawn depth: a flat floor with a steep inner rim. */
export const DISH_PROFILE: readonly [number, number][] = [
  [0, -0.05],
  [0.85, -0.04],
  [1.02, 0.08],
  [1.06, 0.13],
  [1.0, 0.13],
  [0.975, 0.05],
  [0.96, 0.03],
  [0, 0.03],
]
export const PAN_DEPTH = 13
/** A pan's floor above its hanging point. */
export const PAN_FLOOR = 0.03 * PAN_DEPTH
/** The rolled clay rim laid on a pan's edge: a ring (radius and tube as fractions of the pan's radius) at `y` cm above the hanging point. */
export const PAN_ROLL = { radius: 1.03, tube: 0.08, y: 1.6 } as const
/** Where pieces in a pan stop against its rim, as a fraction of its radius: inside the rolled rim's inner edge. */
export const PAN_RIM = PAN_ROLL.radius * (1 - PAN_ROLL.tube) - 0.01

export type Surfaces = { mat: MatKey; seats: readonly boolean[]; panFloors: readonly [number, number] }

/** The height of what a piece lying at `at` rests on: a pan's floor, the bowl's floor, a seated plate, the rug, or the table. */
export function surfaceUnder(at: Point, { mat, seats, panFloors }: Surfaces): number {
  if (mat === 'scale') {
    const side = panOf(at)
    return side === null ? 0 : panFloors[side]
  }
  if (mat !== 'feeding') return 0
  if (inBowl(at)) return BOWL_FLOOR
  const plate = plateOf(at)
  if (plate !== null && seats[plate]) return PLATE_TOP
  return onRug(at) ? RUG.top : 0
}
