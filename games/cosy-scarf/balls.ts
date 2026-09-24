import type { Point3 } from './guidance'
import {
  BALL_RADIUS,
  BASKET,
  BASKET_PROFILE,
  BASKET_RIM,
  BLANKET,
  BUTTERFLY,
  CELL_H,
  FELT,
  groundY,
  LOOM,
  NEEDLE_BAR,
  needlePoint,
  SCARF,
  type KeepOut,
  type NeedlePose,
} from './layout'

// How the yarn balls keep out of everything else. At rest each sits on the
// basket's heap, leaning on the rim or on the balls in front, never pressed
// into them. A moving ball (carried, flying home or into the loom) rides over
// the snow, the blanket and the basket, and slides toward the child along its
// line of sight to pass in front of the other balls, the loom, its needles
// and scarf, the butterfly and the animals: on screen it stays under the
// finger. A hopping ball drifts toward the child rather than into the ball
// behind it.

/** A ball grows up to 8 % while it is the suggested colour. */
export const BALL_SWELL = 1.08
/** A moving ball stretches along its path with its speed, keeping its volume, up to a fifth longer. */
export const STRETCH_PER_SPEED = 0.002
export const MAX_STRETCH = 0.2
const BALL_GAP = 0.15
/** How close two resting ball centres may come: either may be the swelling one. */
export const BALL_APART = BALL_RADIUS * (1 + BALL_SWELL) + BALL_GAP
/** The room a resting ball keeps from the basket. */
const RESTING = BALL_RADIUS * BALL_SWELL + BALL_GAP

/** How much longer than round a ball moving at (vx, vy) is drawn. */
export function ballStretch(vx: number, vy: number): number {
  const speed = Math.hypot(vx, vy)
  return speed < 2 ? 0 : Math.min(MAX_STRETCH, speed * STRETCH_PER_SPEED)
}

/**
 * How far a ball reaches from its centre: stretched by its speed, swollen by
 * `swell`, and squashed by `squash` (flattening widens it; stretching tall
 * lifts its top, since it stands on its lowest point).
 */
export function ballReach(vx: number, vy: number, swell: number, squash: number): number {
  const s = Math.max(-0.8, Math.min(1.2, squash))
  return BALL_RADIUS * (1 + ballStretch(vx, vy)) * swell * (s >= 0 ? 1 + s * 0.12 : 1 - s * 0.4)
}

// --- the basket ---------------------------------------------------------------------

type P2 = readonly [number, number]

function segment2(x: number, y: number, a: P2, b: P2): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (y - a[1]) * aby) / (abx * abx + aby * aby)))
  return Math.hypot(x - a[0] - abx * t, y - a[1] - aby * t)
}

/** The heap's dome in the plane through the basket's axis, as a fine line from its top out to its edge. */
const HEAP: P2[] = Array.from({ length: 33 }, (_, i) => {
  const a = (i / 32) * (Math.PI / 2)
  return [BASKET.heap.radius * Math.sin(a), BASKET.heap.y + BASKET.heap.height * Math.cos(a)] as const
})

/**
 * Distance from a point to the basket's surface (its wall, rim and heap),
 * given how far out from the basket's axis the point is and its height: the
 * basket turns about its axis, so the nearest surface point lies in that plane.
 */
export function basketDistance(out: number, y: number): number {
  let d = Math.hypot(out - BASKET_RIM.ring, y - BASKET_RIM.y) - BASKET.rimTube
  for (let i = 1; i < BASKET_PROFILE.length; i++) d = Math.min(d, segment2(out, y, BASKET_PROFILE[i - 1], BASKET_PROFILE[i]))
  for (let i = 1; i < HEAP.length; i++) d = Math.min(d, segment2(out, y, HEAP[i - 1], HEAP[i]))
  return d
}

export const outFromBasket = (x: number, z: number) => Math.hypot(x - BASKET.x, z - BASKET.z)

/** Distance from a point to the nearer of the basket's two half-ring handles. */
function handleDistance(x: number, y: number, z: number): number {
  const { out, ring, tube } = BASKET.handle
  const dy = y - BASKET.handle.y
  const dz = z - BASKET.z
  const across = dz >= 0 ? Math.abs(Math.hypot(dy, dz) - ring) : Math.min(Math.hypot(dy - ring, dz), Math.hypot(dy + ring, dz))
  const dx = Math.abs(x - BASKET.x) - out
  return Math.hypot(dx, across) - tube
}

/** The furthest the basket reaches from its axis: its rim, or a handle's bow. */
const BASKET_REACH = Math.max(BASKET_RIM.ring + BASKET.rimTube, Math.hypot(BASKET.handle.out + BASKET.handle.tube, BASKET.handle.ring + BASKET.handle.tube))

/** Distance from a point to the basket: its wall, rim, heap and handles. */
export function basketDistanceAt(x: number, y: number, z: number): number {
  return Math.min(basketDistance(outFromBasket(x, z), y), handleDistance(x, y, z))
}

/** Where a ball `room` round lying at (x, z) comes to rest in the basket: it drops until it first touches the heap, the wall, the rim or a handle. */
function basketRestY(x: number, z: number, room: number): number {
  let y = BASKET.rimY + 4 * BALL_RADIUS
  while (y > 0 && basketDistanceAt(x, y - 0.01, z) >= room) y -= 0.01
  return y
}

const FRONT_Z = BASKET.z + 4.2
const BACK_Z = BASKET.z - 4.5

function computeRests(count: number): Point3[] {
  const front = Math.ceil(count / 2)
  const rests: Point3[] = []
  for (let index = 0; index < count; index++) {
    const inFront = index < front
    const rowCount = inFront ? front : count - front
    const slot = inFront ? index : index - front
    const x = BASKET.x + (slot - (rowCount - 1) / 2) * BALL_APART + (inFront ? 0 : BALL_APART * 0.1)
    const z = inFront ? FRONT_Z : BACK_Z
    let y = basketRestY(x, z, RESTING)
    // The back row leans on the front row.
    for (const f of rests) {
      const across = Math.hypot(x - f.x, z - f.z)
      if (across < BALL_APART) y = Math.max(y, f.y + Math.sqrt(BALL_APART * BALL_APART - across * across))
    }
    rests.push({ x, y, z })
  }
  return rests
}

const RESTS = new Map<number, Point3[]>()

/** Resting place of ball `index` among `count` balls in the basket: a front row on the heap, a raised back row leaning on it. */
export function ballRest(index: number, count: number): Point3 {
  let rests = RESTS.get(count)
  if (!rests) {
    rests = computeRests(count)
    RESTS.set(count, rests)
  }
  const rest = rests[index]
  return { x: rest.x, y: rest.y, z: rest.z }
}

/** The basket, its rim and handles and the yarn resting in it, as a column the loom scarf's needles keep out of. */
export const BASKET_KEEP_OUT: KeepOut = {
  x: BASKET.x,
  z: BASKET.z,
  r: BASKET_REACH,
  top: Math.max(...[4, 5, 6].flatMap((count) => Array.from({ length: count }, (_, i) => ballRest(i, count).y))) + BALL_RADIUS * BALL_SWELL,
}

/**
 * A hopping ball at `p` (resting at `rest`) drifts toward the child just
 * enough to pass the balls at `others` resting behind it (`otherRests`),
 * instead of rising into them.
 */
export function hopPast(p: Point3, rest: Point3, others: readonly Point3[], otherRests: readonly Point3[], self: number): void {
  for (let i = 0; i < others.length; i++) {
    if (i === self || otherRests[i].z >= rest.z) continue
    const o = others[i]
    const dx = p.x - o.x
    const dy = p.y - o.y
    const need = BALL_APART * BALL_APART - dx * dx - dy * dy
    if (need > 0) p.z = Math.max(p.z, o.z + Math.sqrt(need))
  }
}

// --- moving balls ---------------------------------------------------------------------

/** What stands in a moving ball's way this frame, besides the snow, the basket and the other balls. */
export type BallScene = {
  /** Where the loom scarf's needles are, and how far that scarf swings. */
  needles: NeedlePose
  swing: number
  /** Rows hanging on the loom. */
  rows: number
  /** 0..1: how far the butterfly on the loom is shown. */
  butterfly: number
  /** Each animal, as a column (top −Infinity when it is away). */
  animals: readonly KeepOut[]
}

/** The lowest a ball reaching `reach` may ride over the snow or the blanket at (x, z). */
function floorFor(x: number, z: number, reach: number): number {
  return groundY(x, z) + BLANKET.lift + BLANKET.ridge + reach + BALL_GAP
}

/** Raises a moving ball at `p` (in place) until it rides clear over the snow, the blanket and the basket. */
export function liftBall(p: Point3, reach: number): void {
  p.y = Math.max(p.y, floorFor(p.x, p.z, reach))
  if (outFromBasket(p.x, p.z) < BASKET_REACH + reach + BALL_GAP) while (basketDistanceAt(p.x, p.y, p.z) < reach + BALL_GAP) p.y += 0.05
}

type Seg = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; r: number }

function capsule(p: Point3, s: Seg): number {
  const abx = s.bx - s.ax
  const aby = s.by - s.ay
  const abz = s.bz - s.az
  const t = Math.max(0, Math.min(1, ((p.x - s.ax) * abx + (p.y - s.ay) * aby + (p.z - s.az) * abz) / (abx * abx + aby * aby + abz * abz)))
  return Math.hypot(p.x - s.ax - abx * t, p.y - s.ay - aby * t, p.z - s.az - abz * t) - s.r
}

function box(x: number, y: number, z: number, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): number {
  const dx = Math.max(x0 - x, 0, x - x1)
  const dy = Math.max(y0 - y, 0, y - y1)
  const dz = Math.max(z0 - z, 0, z - z1)
  return Math.hypot(dx, dy, dz)
}

/** Distance from `p` to a flat-topped column standing on the snow. */
function column(p: Point3, k: KeepOut, margin: number): number {
  const out = Math.hypot(p.x - k.x, p.z - k.z) - k.r - margin
  const up = p.y - k.top - margin
  const down = groundY(k.x, k.z) - p.y
  const v = Math.max(up, down)
  return out <= 0 && v <= 0 ? Math.max(out, v) : Math.hypot(Math.max(out, 0), Math.max(v, 0))
}

const KNOB = 2.7
const POST_TOP = LOOM.rodY + 1.5 + 2.1
const FELT_HALF = LOOM.postX - 1.6
/** The loom's still parts, as capsules: posts with their knobs, the rod with the felt loops on it, the feet and the bottom bar. */
const LOOM_PARTS: Seg[] = [
  ...[-1, 1].flatMap((side): Seg[] => {
    const x = LOOM.x + side * LOOM.postX
    const footZ = LOOM.z + LOOM.foot.z
    return [
      { ax: x, ay: 0, az: LOOM.z, bx: x, by: POST_TOP, bz: LOOM.z, r: KNOB },
      { ax: x, ay: LOOM.foot.y, az: footZ - LOOM.foot.length / 2, bx: x, by: LOOM.foot.y, bz: footZ + LOOM.foot.length / 2, r: LOOM.foot.radius },
    ]
  }),
  { ax: LOOM.x - LOOM.postX - 2.5, ay: LOOM.rodY, az: SCARF.z, bx: LOOM.x + LOOM.postX + 2.5, by: LOOM.rodY, bz: SCARF.z, r: FELT.loop + FELT.loopTube },
  { ax: LOOM.x - LOOM.postX, ay: 3.6, az: LOOM.z - 0.4, bx: LOOM.x + LOOM.postX, by: 3.6, bz: LOOM.z - 0.4, r: 1.1 },
]
/** The needle bar end to end, round enough to hold both needles, their beads and points and the loops hanging between them. */
const NEEDLES_HALF = NEEDLE_BAR.length / 2 + NEEDLE_BAR.tip
const NEEDLES_ROUND = 3.1
const barEnd = [
  { x: -NEEDLES_HALF, y: 0, z: 0 },
  { x: NEEDLES_HALF, y: 0, z: 0 },
]
const bar: Seg = { ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, r: NEEDLES_ROUND }
const barPoint = { x: 0, y: 0, z: 0 }
/** The butterfly with its wings open and its bob, round its middle. */
const BUTTERFLY_ROUND = 11
const BUTTERFLY_MIDDLE = 2
/** Animals' ears flop and arms reach past their bodies: a ball keeps this much further off. */
const ANIMAL_MARGIN = 3.5

/** Distance from `p` to the loom scarf's knitted face: it hangs from its pivot, swung and rocked with the needles. */
function scarfDistance(p: Point3, scene: BallScene): number {
  const pose = scene.needles
  // Undo the loom's rock about its foot, then the swing about the scarf's pivot.
  const cr = Math.cos(pose.rock)
  const sr = Math.sin(pose.rock)
  const rx = p.x - LOOM.x
  const x = LOOM.x + rx * cr + p.y * sr
  const y = -rx * sr + p.y * cr
  const hx = x - SCARF.x
  const hy = y - pose.pivotY
  const ca = Math.cos(scene.swing)
  const sa = Math.sin(scene.swing)
  const fx = hx * ca + hy * sa
  const fy = -hx * sa + hy * ca
  const length = Math.max(1, scene.rows) * CELL_H
  const depth = 1 + length * Math.abs(Math.sin(pose.lean))
  return box(fx, fy, p.z - pose.pivotZ, -SCARF.halfWidth - 1, SCARF.halfWidth + 1, -length - 1, 1, -depth, depth)
}

/** Distance from `p` to the loom's still parts and the felt hanging from its rod (zero or less inside them). */
export function loomDistance(p: Point3): number {
  let distance = box(p.x, p.y, p.z, LOOM.x - FELT_HALF, LOOM.x + FELT_HALF, FELT.bottom - FELT.roll, LOOM.rodY + 0.6, LOOM.z - 0.5, LOOM.z + FELT.roll * 2)
  for (const s of LOOM_PARTS) distance = Math.min(distance, capsule(p, s))
  return distance
}

/** Whether a ball reaching `reach` at `p` is clear of the loom, its needles and scarf, the butterfly and the animals. */
export function ballClearOfScene(p: Point3, reach: number, scene: BallScene): boolean {
  const room = reach + BALL_GAP
  if (loomDistance(p) < room) return false
  if (scarfDistance(p, scene) < room) return false
  needlePoint(scene.needles, scene.swing, barEnd[0], barPoint)
  bar.ax = barPoint.x
  bar.ay = barPoint.y
  bar.az = barPoint.z
  needlePoint(scene.needles, scene.swing, barEnd[1], barPoint)
  bar.bx = barPoint.x
  bar.by = barPoint.y
  bar.bz = barPoint.z
  if (capsule(p, bar) < room) return false
  if (scene.butterfly > 0.05 && Math.hypot(p.x - BUTTERFLY.x, p.y - BUTTERFLY.y - BUTTERFLY_MIDDLE, p.z - BUTTERFLY.z) < BUTTERFLY_ROUND + room) return false
  for (const a of scene.animals) if (a.top > -Infinity && column(p, a, ANIMAL_MARGIN) < room) return false
  return true
}

/** Whether a ball reaching `reach` at `p` rides clear of the snow, the blanket, the basket and the other balls. */
function ballClearOfYarn(p: Point3, reach: number, self: number, others: readonly Point3[], reaches: readonly number[]): boolean {
  if (p.y < floorFor(p.x, p.z, reach) - 1e-6) return false
  if (outFromBasket(p.x, p.z) < BASKET_REACH + reach + BALL_GAP && basketDistanceAt(p.x, p.y, p.z) < reach + BALL_GAP - 1e-6) return false
  for (let i = 0; i < others.length; i++) {
    if (i === self) continue
    const o = others[i]
    const need = reach + reaches[i] + BALL_GAP
    if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 + (p.z - o.z) ** 2 < need * need - 1e-6) return false
  }
  return true
}

/** How far toward the child a moving ball may slide looking for room. */
export const SLIDE_LIMIT = 60
const SLIDE_STEP = 0.5
const slid = { x: 0, y: 0, z: 0 }

/**
 * Moves a moving ball at `p` (ball `self` among `others`, each reaching as
 * far as `reaches` says) clear of everything: it rides up over the snow, the
 * blanket and the basket, then slides along `towardEye` (its line of sight,
 * per unit of depth toward the child) until nothing is in its way.
 */
export function clearBall(p: Point3, self: number, others: readonly Point3[], reaches: readonly number[], towardEye: Point3, scene: BallScene): void {
  const reach = reaches[self]
  liftBall(p, reach)
  if (ballClearOfYarn(p, reach, self, others, reaches) && ballClearOfScene(p, reach, scene)) return
  for (let k = SLIDE_STEP; k <= SLIDE_LIMIT; k += SLIDE_STEP) {
    slid.x = p.x + towardEye.x * k
    slid.y = p.y + towardEye.y * k
    slid.z = p.z + towardEye.z * k
    if (ballClearOfYarn(slid, reach, self, others, reaches) && ballClearOfScene(slid, reach, scene)) {
      p.x = slid.x
      p.y = slid.y
      p.z = slid.z
      return
    }
  }
}
