import { CAST, SEAT, type GuestId } from './cast'
import { STAGE, type Point } from './stage'

// The world: the table starts at x 0 and grows to the right, the floor is at
// y 0 and up is negative. The camera shows all of the table at every length.

export type { Point }

/** The table's top as they sit behind it, the line the dishes stand on, the underside of the bellows. */
export const TOP = -170
export const DISH_Y = -184
export const APRON = -84
/** Stage units: where the floor is. */
export const FLOOR = 700
export const ZOOM = { min: 0.5, max: 1.24 } as const
/** The knob and the bell never get smaller than this on the stage, as a radius. */
export const GRIP = 52
const GRIP_WORLD = 56
/** How much of its width everyone keeps when the table is pushed shut. */
export const SHUT = 0.56
/** The gap that opens when nobody is left to come. */
export const SPARE = 70

export type Camera = { z: number; x: number }

/** The camera for a table this long with a gap this wide still to come. */
export function cameraFor(length: number, gap: number, out: Camera): Camera {
  const need = length + gap + 40
  // Room at each side for a whole bell and a whole knob, which stop shrinking before the table does.
  const near = STAGE.width / (need + 246)
  const z = Math.min(ZOOM.max, Math.max(ZOOM.min, near * GRIP_WORLD >= GRIP ? near : (STAGE.width - GRIP * 4 - 8) / (need + 16)))
  out.z = z
  out.x = STAGE.width / 2 - (need * z) / 2
  return out
}

export function toWorld(p: Point, c: Camera): Point {
  return { x: (p.x - c.x) / c.z, y: (p.y - FLOOR) / c.z }
}

export function toStagePoint(p: Point, c: Camera): Point {
  return { x: p.x * c.z + c.x, y: p.y * c.z + FLOOR }
}

export function gripRadius(z: number): number {
  return Math.max(GRIP_WORLD, GRIP / z)
}

export function widthOf(id: GuestId): number {
  return CAST[id].width
}

/** Things in the house that answer a finger and change nothing. World units. */
export const SPOTS = {
  cuckoo: { x: 70, y: -462, r: 62 },
  cat: { x: 743, y: -462, r: 70 },
  pot: { x: 945, y: -428, r: 74 },
  curtain: { x: 1062, y: -470, r: 70 },
  hen: { x: 462, y: -1118, r: 80 },
  sun: { x: 1330, y: -930, r: 110 },
  tree: { x: 1690, y: -560, r: 170 },
  mice: { x: 700, y: 178, r: 74 },
} as const
export type SpotKey = keyof typeof SPOTS
export const SPOT_KEYS = Object.keys(SPOTS) as SpotKey[]

export { SEAT }
