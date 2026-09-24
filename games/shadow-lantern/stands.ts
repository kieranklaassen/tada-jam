import { STAGE } from './projection'
import { SHAPES, SHAPE_KINDS, type ShapeKind } from './shapes'

// A stand: a cut card on a brass pin, and a stick behind it down to a folded
// paper foot on the stage. One set of dimensions for the view that draws it
// and the controller that keeps stands from passing through each other.
//
// Seen from above, a stand covers two boxes on the floor, both turned by its
// swing (yaw) about the pin: its slab (the card edge-on with its pin and
// stick, as wide as the card turned on its pin) and its foot. Cards hang far
// above the feet (the lowest card corner is 13 cm up, a foot is 1.5 cm
// tall), so slabs are tested against slabs and feet against feet.

export const STAND = {
  cardDepth: 0.26,
  pinRadius: 0.42,
  pinDepth: 0.2,
  stickHalf: 0.17,
  /** The stick's centre behind the pin, its front face a hair behind the card's back. */
  stickZ: -0.31,
  footHalfWidth: 2.4,
  footHeight: 1.5,
  footDepth: 2.8,
  /** The sole rests this high: on the stage planks (y 0.03) and above the contact spot under it. */
  sole: 0.06,
} as const

/** Air kept between two stands' boxes (cm): less than the rack leaves between neighbours one row apart. */
export const STAND_GAP = 0.1

/**
 * Nothing of a stand comes nearer the screen than this. In front of it the
 * waking creature lifts off the paper (its peel reaches about 6.8, see
 * `peelPose`), so a card on the front row swings less the nearer it stands.
 */
export const STAND_FRONT = 7.3

const SLAB_BACK = STAND.stickZ - STAND.stickHalf
const SLAB_FRONT = STAND.cardDepth / 2 + STAND.pinDepth
const FOOT_BACK = STAND.stickZ - STAND.footDepth / 2
const FOOT_FRONT = STAND.stickZ + STAND.footDepth / 2

/** Enough of a stand's pose to place it: pin on the floor, turn on its pin, swing on its wire. */
export type StandPose = { x: number; z: number; angle: number; yaw?: number }
export type Stand = { readonly kind: ShapeKind; readonly pose: StandPose }

type Box = { cx: number; cz: number; ax: number; az: number; bx: number; bz: number; hu: number; hd: number }

function box(): Box {
  return { cx: 0, cz: 0, ax: 1, az: 0, bx: 0, bz: 1, hu: 0, hd: 0 }
}

/** A box spanning card-local u in [u0, u1] and depth d in [d0, d1] about the pin, swung by yaw. */
function place(out: Box, x: number, z: number, yaw: number, u0: number, u1: number, d0: number, d1: number): Box {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  // The same swing as projectCardPoint: card-local u runs along (cos, −sin), depth along (sin, cos).
  out.ax = c
  out.az = -s
  out.bx = s
  out.bz = c
  const cu = (u0 + u1) / 2
  const cd = (d0 + d1) / 2
  out.cx = x + cu * c + cd * s
  out.cz = z - cu * s + cd * c
  out.hu = (u1 - u0) / 2
  out.hd = (d1 - d0) / 2
  return out
}

function radiusAlong(b: Box, nx: number, nz: number): number {
  return b.hu * Math.abs(b.ax * nx + b.az * nz) + b.hd * Math.abs(b.bx * nx + b.bz * nz)
}

/** Separating axes: true when the boxes come closer than `gap` along every axis. */
function boxesMeet(p: Box, q: Box, gap: number): boolean {
  const dx = q.cx - p.cx
  const dz = q.cz - p.cz
  for (let k = 0; k < 4; k++) {
    const nx = k === 0 ? p.ax : k === 1 ? p.bx : k === 2 ? q.ax : q.bx
    const nz = k === 0 ? p.az : k === 1 ? p.bz : k === 2 ? q.az : q.bz
    if (Math.abs(dx * nx + dz * nz) >= radiusAlong(p, nx, nz) + radiusAlong(q, nx, nz) + gap) return false
  }
  return true
}

const span = { min: 0, max: 0 }

/** Card-local horizontal extent of a shape turned by `angle` on its pin, pin included. */
export function cardSpan(kind: ShapeKind, angle: number, out: { min: number; max: number } = span): { min: number; max: number } {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  let min: number = -STAND.pinRadius
  let max: number = STAND.pinRadius
  for (const p of SHAPES[kind].outline) {
    const u = p.x * c - p.y * s
    if (u < min) min = u
    if (u > max) max = u
  }
  out.min = min
  out.max = max
  return out
}

/** Furthest any part of a stand's footprint reaches from its pin, whatever its turn and swing. */
const REACH: Record<ShapeKind, number> = Object.fromEntries(
  SHAPE_KINDS.map((kind) => {
    let r: number = STAND.pinRadius
    for (const p of SHAPES[kind].outline) r = Math.max(r, Math.hypot(p.x, p.y))
    return [kind, Math.max(Math.hypot(r, Math.max(-SLAB_BACK, SLAB_FRONT)), Math.hypot(STAND.footHalfWidth, Math.max(-FOOT_BACK, FOOT_FRONT)))]
  }),
) as Record<ShapeKind, number>

const slabA = box()
const slabB = box()
const footA = box()
const footB = box()
const spanB = { min: 0, max: 0 }

function slabOf(out: Box, stand: Stand, s: { min: number; max: number }): Box {
  const pose = stand.pose
  cardSpan(stand.kind, pose.angle, s)
  return place(out, pose.x, pose.z, pose.yaw ?? 0, s.min, s.max, SLAB_BACK, SLAB_FRONT)
}

function footOf(out: Box, pose: StandPose): Box {
  return place(out, pose.x, pose.z, pose.yaw ?? 0, -STAND.footHalfWidth, STAND.footHalfWidth, FOOT_BACK, FOOT_FRONT)
}

/** Would these two stands pass through each other (or come within `gap`)? */
export function standsClash(a: Stand, b: Stand, gap = STAND_GAP): boolean {
  const pa = a.pose
  const pb = b.pose
  if (Math.hypot(pa.x - pb.x, pa.z - pb.z) >= REACH[a.kind] + REACH[b.kind] + gap) return false
  if (boxesMeet(footOf(footA, pa), footOf(footB, pb), gap)) return true
  return boxesMeet(slabOf(slabA, a, span), slabOf(slabB, b, spanB), gap)
}

/** Is any of the card, pin or stick nearer the screen than STAND_FRONT? */
export function standTooFront(stand: Stand): boolean {
  const b = slabOf(slabA, stand, span)
  return b.cz - radiusAlong(b, 0, 1) < STAND_FRONT
}

/** Clashes with any of `others` (skipping index `skip`), or stands too near the screen. */
export function standBlocked(stand: Stand, others: readonly Stand[], skip: number, gap = STAND_GAP): boolean {
  if (standTooFront(stand)) return true
  for (let j = 0; j < others.length; j++) if (j !== skip && standsClash(stand, others[j], gap)) return true
  return false
}

const probe = { kind: 'square' as ShapeKind, pose: { x: 0, z: 0, angle: 0, yaw: 0 } }

/**
 * The nearest place on the stage, at most `reach` cm from (x, z), where a
 * stand turned by `angle` stands clear of every stand in each of `crowds`
 * (skipping index `skip`) and of the screen. Writes into `out`; false if
 * there is none.
 */
export function clearSpot(kind: ShapeKind, x: number, z: number, angle: number, crowds: readonly (readonly Stand[])[], skip: number, out: { x: number; z: number }, reach = 40): boolean {
  probe.kind = kind
  probe.pose.angle = angle
  probe.pose.yaw = 0
  const free = (px: number, pz: number) => {
    if (px < STAGE.xMin || px > STAGE.xMax || pz < STAGE.zNear || pz > STAGE.zFar) return false
    probe.pose.x = px
    probe.pose.z = pz
    for (const crowd of crowds) if (standBlocked(probe, crowd, skip)) return false
    return true
  }
  for (let r = 0; r <= reach; r += 0.5) {
    const steps = r === 0 ? 1 : Math.max(8, Math.ceil((2 * Math.PI * r) / 0.5))
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2
      const px = x + Math.cos(a) * r
      const pz = z + Math.sin(a) * r
      if (free(px, pz)) {
        out.x = px
        out.z = pz
        return true
      }
    }
  }
  return false
}

/**
 * How far along the straight slide from (x0, z0) to (x1, z1) a stand turned
 * by `angle` gets before it would meet one of `crowds` (0..1, in steps no
 * longer than `step` cm). A slide that starts blocked is not blocked by
 * whatever it starts in.
 */
export function slideReach(kind: ShapeKind, x0: number, z0: number, x1: number, z1: number, angle: number, crowds: readonly (readonly Stand[])[], skip: number, gap = STAND_GAP, step = 0.25): number {
  probe.kind = kind
  probe.pose.angle = angle
  probe.pose.yaw = 0
  probe.pose.x = x0
  probe.pose.z = z0
  if (crowds.some((crowd) => standBlocked(probe, crowd, skip, gap))) return 1
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step))
  for (let i = 1; i <= n; i++) {
    probe.pose.x = x0 + ((x1 - x0) * i) / n
    probe.pose.z = z0 + ((z1 - z0) * i) / n
    for (const crowd of crowds) if (standBlocked(probe, crowd, skip, gap)) return (i - 1) / n
  }
  return 1
}
