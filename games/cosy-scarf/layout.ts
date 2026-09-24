import type { AnimalKey } from './state'
import { WIDTH } from './state'

// World layout in scene units (y up, z toward the child). The loom stands in
// the middle of a teal blanket on the snow, the cold animal waits on its left,
// the basket of yarn sits on its right, and wrapped animals keep each other
// company on the snowy slope behind.

export type Spot = { x: number; z: number; yaw: number }

/** One colour cell of the scarf on the loom: chunky knit, wider than tall. */
export const CELL_W = 4.2
export const CELL_H = 2.8

/**
 * The loom: posts (radius `postTop` under the knobs, `postBottom` at the foot),
 * the rod, and a foot running front to back under each post (a capsule lying
 * at height `y`, centred `z` in front of the post).
 */
export const LOOM = { x: 1, z: -3, rodY: 55.5, postX: 14.5, footY: 0.4, postTop: 1.7, postBottom: 2, rod: 1.15, foot: { radius: 1.7, length: 11, y: 1.4, z: 0.8 } }

/** Where the scarf hangs: its top edge under the rod, centred on the loom. */
export const SCARF = { x: LOOM.x, top: 54, z: LOOM.z + 1.4, halfWidth: (WIDTH * CELL_W) / 2 }

/**
 * The play blanket: from in front of the loom, draped over the foot of the
 * slope, lying `lift` above the snow with a round rib `ridge` high all along
 * its hem. The snow is pressed `press` down under it.
 */
export const BLANKET = { back: -28, front: 80, halfWidth: 150, rib: 4, lift: 0.2, ridge: 1, press: 0.6 }

/** The blanket's top around the loom, where it lies flat. */
const BLANKET_TOP = BLANKET.lift

/** The loom's felt cloth: its roll's lowest place and radius, how much felt it keeps below the needles, and the two slim felt loops hung over the rod. */
export const FELT = { bottom: 2.6, roll: 1.4, below: 6, loop: 1.6, loopTube: 0.42, loopInset: 1.6 }

/**
 * The needles, in the loom scarf's hang frame (x along the scarf, z toward the
 * child): two long needles a little apart in depth, crossing at a shallow
 * angle, a bead on one end and a point on the other. They hang far enough in
 * front of the loom that no swing or lift brings them to its posts, rod or
 * felt loops, and the live loops ride between them.
 */
export const NEEDLE_BAR = { radius: 0.55, length: 30, tilt: 0.05, tip: 2.4, bead: 1.5, beadAt: 15.5, apart: 1.15, z: 5, castOnDrop: 1.8, click: 0.05 }

/** The live loops riding on the needles: upright rings, a little taller than wide, hanging from between the needles. */
export const LOOPS = { radius: 1.2, tube: 0.5, y: -1.05, stretch: 1.2 }

type Sphere = { x: number; y: number; z: number; r: number }

/** Each end of the needle bar in its own frame: the bead of one needle and the point of the other, as spheres (the point's sphere holds its whole cone). */
export const NEEDLE_ENDS: readonly Sphere[] = (() => {
  const { length, tilt, tip, bead, beadAt, apart, radius } = NEEDLE_BAR
  const tipAt = length / 2 + tip / 2
  const tipR = Math.hypot(tip / 2, radius)
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return [
    { x: tipAt * c, y: tipAt * s, z: apart, r: tipR },
    { x: -beadAt * c, y: -beadAt * s, z: apart, r: bead },
    { x: -tipAt * c, y: tipAt * s, z: -apart, r: tipR },
    { x: beadAt * c, y: -beadAt * s, z: -apart, r: bead },
  ]
})()

/** How much clearance the needles keep from everything they could swing into. */
const NEEDLE_GAP = 0.3

/** The top of the loom's feet, and the band of x each covers. */
const FOOT_TOP = LOOM.foot.y + LOOM.foot.radius
const onFoot = (x: number, r: number) => Math.abs(Math.abs(x - LOOM.x) - LOOM.postX) < LOOM.foot.radius + r

/**
 * The lowest the needles' centre may hang: even clicking, their low beads stay
 * above the loom's feet. A long scarf's needles stop here and ride over its
 * last row rather than pressing into the feet or the blanket.
 */
export const NEEDLES_FLOOR = FOOT_TOP + NEEDLE_GAP + NEEDLE_BAR.bead + NEEDLE_BAR.beadAt * Math.sin(NEEDLE_BAR.tilt + NEEDLE_BAR.click)

/** How far the loom scarf may be pulled down, so its needles never reach the floor. */
export function maxDrop(rows: number): number {
  return Math.max(0, SCARF.top - rows * CELL_H - 0.5 - NEEDLES_FLOOR)
}

/** Something the needles must not swing into: a column standing at (x, z), `r` wide and `top` tall. */
export type KeepOut = { x: number; z: number; r: number; top: number }

/** Where the loom scarf's needles are and how it hangs: all that decides where their ends go. */
export type NeedlePose = {
  /** The scarf's hang pivot (its top centre) in world space. */
  pivotY: number
  pivotZ: number
  /** The loom's own rock about its foot (about z), and the scarf's lean about x when offered (radians). */
  rock: number
  lean: number
  /** The needles' centre in the hang frame, from the pivot, and their click. */
  x: number
  y: number
  click: number
}

const scratchEnd = { x: 0, y: 0, z: 0 }

/** Where point `e` of the needle bar (in the bar's own frame) is in world space for a loom scarf swung by `angle`. */
export function needlePoint(pose: NeedlePose, angle: number, e: { x: number; y: number; z: number }, out: { x: number; y: number; z: number }): void {
  const cc = Math.cos(pose.click)
  const sc = Math.sin(pose.click)
  // In the hang frame: the needles' centre plus the end, clicked about that centre.
  const hx = pose.x + e.x * cc - e.y * sc
  const hy = pose.y + e.x * sc + e.y * cc
  const hz = NEEDLE_BAR.z + e.z
  // Leaning about x, then swinging about z, about the pivot.
  const cl = Math.cos(pose.lean)
  const sl = Math.sin(pose.lean)
  const ly = hy * cl - hz * sl
  const lz = hy * sl + hz * cl
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const px = SCARF.x - LOOM.x + hx * ca - ly * sa
  const py = pose.pivotY + hx * sa + ly * ca
  // The loom rocks about its own foot.
  const cr = Math.cos(pose.rock)
  const sr = Math.sin(pose.rock)
  out.x = LOOM.x + px * cr - py * sr
  out.y = px * sr + py * cr
  out.z = pose.pivotZ + lz
}

/** Each needle's shaft, end to end, in the bar's own frame. */
const SHAFTS = [-1, 1].map((side) => {
  const half = NEEDLE_BAR.length / 2
  const c = Math.cos(side * NEEDLE_BAR.tilt) * half
  const s = Math.sin(side * NEEDLE_BAR.tilt) * half
  const z = side * NEEDLE_BAR.apart
  return [
    { x: -c, y: -s, z },
    { x: c, y: s, z },
  ] as const
})
const shaftA = { x: 0, y: 0, z: 0 }
const shaftB = { x: 0, y: 0, z: 0 }

/** Whether each needle's shaft passes above both loom feet (its ends are checked on their own). */
function shaftsClearFeet(pose: NeedlePose, angle: number): boolean {
  for (const [a, b] of SHAFTS) {
    needlePoint(pose, angle, a, shaftA)
    needlePoint(pose, angle, b, shaftB)
    const dx = shaftB.x - shaftA.x
    const dy = shaftB.y - shaftA.y
    for (let side = -1; side <= 1; side += 2) {
      const footX = LOOM.x + side * LOOM.postX
      const t0 = (footX - LOOM.foot.radius - shaftA.x) / dx
      const t1 = (footX + LOOM.foot.radius - shaftA.x) / dx
      if (Math.max(t0, t1) < 0 || Math.min(t0, t1) > 1) continue
      // The shaft's lowest height over the foot's band of x (a straight shaft is lowest at an edge of it).
      const lowest = Math.min(shaftA.y + dy * Math.max(0, Math.min(1, t0)), shaftA.y + dy * Math.max(0, Math.min(1, t1)))
      if (lowest - NEEDLE_BAR.radius < FOOT_TOP + NEEDLE_GAP) return false
    }
  }
  return true
}

/** Whether the needles are clear of the feet, the blanket and each keep-out at this swing. */
export function needlesClear(pose: NeedlePose, angle: number, keepOuts: readonly KeepOut[]): boolean {
  if (!shaftsClearFeet(pose, angle)) return false
  for (const e of NEEDLE_ENDS) {
    needlePoint(pose, angle, e, scratchEnd)
    const { x, y, z } = scratchEnd
    const low = y - e.r
    if (low < (onFoot(x, e.r) ? FOOT_TOP : BLANKET_TOP) + NEEDLE_GAP) return false
    for (const k of keepOuts) {
      if (low > k.top + NEEDLE_GAP) continue
      if (Math.hypot(x - k.x, z - k.z) < k.r + e.r + NEEDLE_GAP) return false
    }
  }
  return true
}

/** The furthest the loom scarf swings each way when pulled (radians). */
export const MAX_SWING = 0.45
const SWING_STEP = 0.0125

/**
 * How far (up to `want`) the loom scarf may swing in direction `side` (−1
 * toward the waiting animal, +1 toward the basket) before a needle end would
 * touch something.
 */
export function swingRoom(side: -1 | 1, want: number, pose: NeedlePose, keepOuts: readonly KeepOut[]): number {
  const limit = Math.min(MAX_SWING, want)
  let room = 0
  while (room < limit) {
    const next = Math.min(limit, room + SWING_STEP)
    if (!needlesClear(pose, side * next, keepOuts)) break
    room = next
  }
  return room
}

/**
 * The basket: centre, radius at the rim, the rim's height and the thickness of
 * its rolled rim, the low heap of yarn filling its bottom (a flattened dome
 * `radius` wide, `height` tall, standing on `y`), and a half-ring handle on
 * each side, upright against the rim and bowing toward the child.
 */
export const BASKET = {
  x: 34,
  z: 9,
  radius: 13.5,
  rimY: 8.5,
  rimTube: 1.35,
  heap: { y: 6.1, radius: 11.7, height: 1.17 },
  handle: { out: 13.3, y: 7.9, ring: 3.6, tube: 0.9 },
}

/** The basket's woven wall as it turns about its centre: (distance out, height) from the floor, up the outside, over the rim and down the inside. */
export const BASKET_PROFILE: readonly (readonly [number, number])[] = [
  [0.2, 0.25],
  [BASKET.radius - 3.4, 0.3],
  [BASKET.radius - 1.6, 1.6],
  [BASKET.radius - 0.7, 4.6],
  [BASKET.radius - 0.1, BASKET.rimY - 0.6],
  [BASKET.radius, BASKET.rimY],
  [BASKET.radius - 1.2, BASKET.rimY - 0.2],
  [BASKET.radius - 1.9, BASKET.rimY - 3],
]

/** The rolled rim: a ring `ring` out from the basket's centre at height `y`. */
export const BASKET_RIM = { ring: BASKET.radius - 0.2, y: BASKET.rimY + 0.2 }
export const BALL_RADIUS = 4.6

/** The butterfly perches in front of the loom's rod, clear of it and the felt's loops over it, wings open or shut. */
export const BUTTERFLY = { x: LOOM.x + 9.5, y: LOOM.rodY + 3.2, z: SCARF.z + 3.4 }

export const LOOM_SPOT: Spot = { x: -32, z: 7, yaw: 0.32 }
export const ENTRY: Spot = { x: -104, z: 16, yaw: Math.PI / 2 }

/**
 * Each animal's own place on the slope once it is cosy. None stands (or walks
 * home) straight up the slope from the loom spot, where it would poke out
 * behind the next cold animal's head.
 */
export const HILL_SPOTS: Record<AnimalKey, Spot> = {
  bunny: { x: -74, z: -64, yaw: 0.45 },
  penguin: { x: 38, z: -80, yaw: -0.2 },
  fox: { x: 64, z: -72, yaw: -0.35 },
  bear: { x: 90, z: -98, yaw: -0.5 },
}

/** Snow height: flat where the blanket lies, rising into a gentle slope behind that levels off. */
export function groundY(x: number, z: number): number {
  const back = Math.max(0, -z - 16)
  const roll = Math.min(1, back / 30)
  return 15 * (1 - Math.exp(-back / 62)) + roll * (2.4 * Math.sin(x * 0.045 + 0.6) + 3.4 * Math.sin(x * 0.021 - 0.8) * Math.cos(z * 0.035 + 0.4))
}

/**
 * How tall each animal stands (what a finger aims at), where its neck (the
 * scarf's home) sits, and the room it takes: how far its body and head reach
 * out from where it stands, and its very top, ears and snow cap included.
 */
export const BODY: Record<AnimalKey, { height: number; neck: number; reach: number; top: number }> = {
  bunny: { height: 34, neck: 13.9, reach: 9.5, top: 38 },
  penguin: { height: 28, neck: 16.2, reach: 10.5, top: 34 },
  fox: { height: 27, neck: 13.3, reach: 9.5, top: 30 },
  bear: { height: 32, neck: 16.6, reach: 11.5, top: 36 },
}

/** Centre of the scarf's colour cell (row, column) while it hangs on the loom. */
export function cellCentre(row: number, column: number): { x: number; y: number; z: number } {
  return { x: SCARF.x - SCARF.halfWidth + (column + 0.5) * CELL_W, y: SCARF.top - (row + 0.5) * CELL_H, z: SCARF.z }
}

/** The colour cell under a point on the loom plane, or null. */
export function cellAt(x: number, y: number, rows: number): { row: number; column: number } | null {
  const column = Math.floor((x - (SCARF.x - SCARF.halfWidth)) / CELL_W)
  const row = Math.floor((SCARF.top - y) / CELL_H)
  if (column < 0 || column >= WIDTH || row < 0 || row >= rows) return null
  return { row, column }
}

/** The needles sit at the scarf's free edge. */
export function needlesY(rows: number): number {
  return SCARF.top - rows * CELL_H - 0.4
}

/** Where the felt's rolled edge sits for a scarf showing `rows` rows: unrolled just past the needles, never below the loom's foot. */
export function feltBottom(rows: number): number {
  return Math.max(FELT.bottom, needlesY(rows) - FELT.below)
}
