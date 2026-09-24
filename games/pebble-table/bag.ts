import { BAG } from './layout'
import { to3, type Vec3 } from './physics3d'

// The stone bag lies on its side, its mouth toward the mat. A tip is a
// quick crouch, then either a big lurch forward or a side-to-side shake-out,
// alternating. The view draws this pose and the controller sends stones out
// of it, so a stone always leaves from just past where the mouth is drawn at
// that moment.

/** How long and how plump (cm) the sack is drawn when full. */
export const BAG_LENGTH = 11.5
export const BAG_GIRTH = 7.2
/** Which way the bag lies on the table (about the vertical), and how far over onto its side (about its heading). */
export const BAG_HEADING = 0.82
export const BAG_LIE = -1.42
/** The sack's lathe profile (radius, height) in girths and lengths: round bottom, gathered neck, ruffled mouth. */
export const SACK_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.55, 0.03],
  [0.9, 0.2],
  [1.0, 0.45],
  [0.92, 0.72],
  [0.62, 0.92],
  [0.4, 1.0],
  [0.42, 1.06],
  [0.58, 1.18],
  [0.62, 1.24],
  [0.54, 1.24],
  [0.36, 1.1],
]
/** Where the sack's ruffled mouth ends along it, in sack lengths. */
export const SACK_MOUTH = 1.24
/** How much wider the sack's bottom half sags, lying down, at a height along it. */
export const sackSlump = (y: number) => 1 + Math.max(0, 0.5 - y) * 0.12

export type BagTip = { crouch: number; lurch: number; shake: number }

/** How long (s) a tip crouches before it lurches or shakes. */
const BAG_CROUCH = 0.12

const RESTING_TIP: BagTip = { crouch: 0, lurch: 0, shake: 0 }

/** The bag's tip `age` seconds after it was tipped (null: never). */
export function bagTip(age: number | null, shakeOut: boolean): BagTip {
  if (age === null) return RESTING_TIP
  const crouch = age < BAG_CROUCH ? Math.sin((age / BAG_CROUCH) * Math.PI) * (shakeOut ? 0.08 : 0.12) : 0
  const since = age - BAG_CROUCH
  const lurch = since >= 0 && since < 0.43 ? Math.sin((since / 0.43) * Math.PI) * (shakeOut ? 0.26 : 0.42) : 0
  const shake = shakeOut && since >= 0 && since < 0.68 ? Math.sin(since * 42) * 0.12 * Math.sin((since / 0.68) * Math.PI) : 0
  return { crouch, lurch, shake }
}

export type BagShape = { scale: [number, number, number]; y: number; roll: number; lie: number }

/** How far below its bottom's centre (cm) the sack reaches, `across` wide and `length` long, turned by `lie` and `roll`. */
function sackDepth(across: number, length: number, lie: number, roll: number): number {
  let deepest = -Infinity
  for (const [r, y] of SACK_PROFILE) {
    const radius = r * sackSlump(y) * across
    deepest = Math.max(deepest, Math.hypot(radius * Math.sin(lie) * Math.cos(roll), radius * 1.1 * Math.sin(roll)) - y * length * Math.cos(lie) * Math.cos(roll))
  }
  return deepest
}

/**
 * How the sack is placed inside its heading: scale, the height of its
 * bottom's centre, and its two turns (Euler XYZ: roll about x, lie about z).
 * It rocks on its belly as it tips, rising by however much deeper the tip
 * would push it than it lies at rest, so it never sinks into the table.
 */
export function bagShape(fullness: number, tip: BagTip, breathe = 1): BagShape {
  const girth = 0.7 + fullness * 0.32
  const across = BAG_GIRTH * girth * breathe * (1 + tip.crouch)
  const length = BAG_LENGTH * (1 - tip.crouch * 0.6)
  const roll = tip.shake
  const lie = BAG_LIE - tip.lurch + tip.crouch * 0.6
  const rock = Math.max(0, sackDepth(across, length, lie, roll) - sackDepth(BAG_GIRTH * girth * breathe, BAG_LENGTH, BAG_LIE, 0))
  return { scale: [across, length, across * 1.1], y: BAG_GIRTH * girth * 0.88 + rock, roll, lie }
}

/** The middle of the bag's mouth and the way it faces (world, cm). */
export function bagMouth(shape: BagShape): { at: Vec3; axis: Vec3 } {
  const { roll, lie } = shape
  const x = -Math.sin(lie)
  const y = Math.cos(lie) * Math.cos(roll)
  const z = Math.cos(lie) * Math.sin(roll)
  const axis = { x: x * Math.cos(BAG_HEADING) + z * Math.sin(BAG_HEADING), y, z: -x * Math.sin(BAG_HEADING) + z * Math.cos(BAG_HEADING) }
  const reach = shape.scale[1] * SACK_MOUTH
  const origin = to3(BAG, shape.y)
  return { at: { x: origin.x + axis.x * reach, y: origin.y + axis.y * reach, z: origin.z + axis.z * reach }, axis }
}

/** How far past the mouth's middle (cm) a stone's centre starts, beyond its widest reach, the ruffle's lumps and the bag's wobble. */
const MOUTH_CLEAR = 1.5

/** Where a stone reaching `reach` (cm) from its centre leaves the bag's mouth. */
export function bagExit(shape: BagShape, reach: number): Vec3 {
  const { at, axis } = bagMouth(shape)
  const out = reach + MOUTH_CLEAR
  return { x: at.x + axis.x * out, y: at.y + axis.y * out, z: at.z + axis.z * out }
}
