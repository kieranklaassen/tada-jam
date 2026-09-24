import type { BirdPose } from './motion'
import type { MutableVec3 } from './projection'
import { PAVER_RAISE, type Vec3 } from './world'

// The characters' proportions, shared by the rigs that draw them and the
// controller that keeps them clear of the lattice, stands the wanderer on the
// bird's back, and lifts a rocking body onto the rim it rocks on. Local
// frames: feet at the origin, facing +z, +x to the character's right.

/** Big enough for a seven-year-old to find at a glance: a hood nearly as tall as a paver is wide. */
export const WANDERER_SCALE = 1.3
/** Radius of the cloak's hem, before scaling: it rocks on this rim when the body rolls or leans. */
export const WANDERER_HEM = 0.2
/** Radius of the round shadow at its feet, scaled: wider than the hem. */
export const WANDERER_SHADOW = 0.25 * WANDERER_SCALE

export const BIRD = {
  halfWidth: 0.43,
  belly: 0.16,
  back: 0.95,
  chamfer: 0.15,
  /** Cross-sections along the body, tail to breast: [z, scale about the middle]. */
  rings: [
    [-0.47, 0.55],
    [-0.38, 1],
    [0.3, 1],
    [0.44, 0.7],
  ] as const,
  /** The saddle's top sits level with every paver, so a bird bridge reads as path and feet step across without a ledge. */
  saddleTop: 1 + PAVER_RAISE,
  /** The rider stands this far toward the tail, clear of the head. */
  riderZ: -0.18,
  neck: [0, 0.86, 0.34] as Vec3,
  headBall: { centre: [0, 0.12, 0.06] as Vec3, radius: 0.24 },
  beakTip: [0, 0.08, 0.46] as Vec3,
  crest: [
    [0, 0.52, -0.06],
    [0, 0.46, -0.16],
  ] as const,
  tailRoot: [0, 0.8, -0.44] as Vec3,
  /** The tail feathers' outer tips, left to right: the middle feather has two. */
  tailTips: [
    [-0.24, 0.16, -0.32],
    [-0.06, 0.26, -0.42],
    [0.06, 0.26, -0.42],
    [0.24, 0.16, -0.32],
  ] as const,
  /** The right wing's hinge; the left mirrors it. */
  wingRoot: [0.435, 0.8, -0.02] as Vec3,
  /** The wing plate's corners from its hinge (x outward), then the tips of its accent feather. */
  wingPlate: [
    [0.012, 0, 0.22],
    [0.012, -0.02, -0.3],
    [0.012, -0.44, -0.36],
    [0.012, -0.34, 0.06],
  ] as const,
  wingAccent: [
    [0.024, -0.34, -0.2],
    [0.024, -0.44, -0.36],
    [0.024, -0.3, -0.38],
  ] as const,
  /** Most a beat opens a wing (radians). */
  wingOpen: 1.15,
  /** The feet's front and back edges: a pitched body stays on its toes or heels, never through the floor. */
  toe: 0.12,
  heel: 0.03,
} as const

/** The tail's flick (radians about x) for a tail spring value, as the rig draws it. */
export function tailFlick(tail: number): number {
  return Math.max(-0.6, Math.min(0.8, tail * 0.5))
}

/**
 * One of the rig's frames in world space: a 3×3 turn-and-scale (row-major)
 * then a translation. A body part's frame is built once and carries every
 * point on it, so the clearance tests pay for the turns once per pose.
 */
export type Frame = Float64Array

export function frame(): Frame {
  return new Float64Array(12)
}

/** A point given in a frame, in world space. */
export function apply(f: Frame, x: number, y: number, z: number, out: MutableVec3): MutableVec3 {
  out[0] = f[0] * x + f[1] * y + f[2] * z + f[9]
  out[1] = f[3] * x + f[4] * y + f[5] * z + f[10]
  out[2] = f[6] * x + f[7] * y + f[8] * z + f[11]
  return out
}

/** A turn and scale on its own: 3×3, row-major. */
export type Turn = Float64Array

export function turnOf(): Turn {
  return new Float64Array(9)
}

/** A child frame: turned by `r` and placed at `at` in `parent` (which `out` may be). */
function child(parent: Frame, r: Turn, at: readonly number[], out: Frame): Frame {
  const x = at[0]
  const y = at[1]
  const z = at[2]
  for (let i = 0; i < 9; i += 3) {
    const a = parent[i]
    const b = parent[i + 1]
    const c = parent[i + 2]
    out[i] = a * r[0] + b * r[3] + c * r[6]
    out[i + 1] = a * r[1] + b * r[4] + c * r[7]
    out[i + 2] = a * r[2] + b * r[5] + c * r[8]
    out[9 + i / 3] = a * x + b * y + c * z + parent[9 + i / 3]
  }
  return out
}

const turn = turnOf()
const hinge: MutableVec3 = [0, 0, 0]
const shared = frame()

/**
 * The bird's torso frame, for a pose whose heading and body pitch may be
 * overridden (the controller tries headings before it commits to one).
 * Mirrors the rig: root (position, heading, scale), then the torso (pitch,
 * squash and puff).
 */
export function torsoFrame(pose: BirdPose, heading: number, pitch: number, out: Frame): Frame {
  const puff = 1 + pose.puff * 0.14
  const a = (puff / Math.sqrt(pose.squash)) * pose.scale
  const b = puff * pose.squash * pose.scale
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const ch = Math.cos(heading)
  const sh = Math.sin(heading)
  out[0] = ch * a
  out[1] = sh * b * sp
  out[2] = sh * a * cp
  out[3] = 0
  out[4] = b * cp
  out[5] = -a * sp
  out[6] = -sh * a
  out[7] = ch * b * sp
  out[8] = ch * a * cp
  out[9] = pose.x
  out[10] = pose.y + pose.bob
  out[11] = pose.z
  return out
}

/** The head's turn on its neck: tilted, pitched by `headPitch` (up is positive), then turned by `yaw`. */
export function headTurn(yaw: number, headPitch: number, tilt: number, out: Turn): Turn {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cq = Math.cos(-headPitch)
  const sq = Math.sin(-headPitch)
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  out[0] = cy * ct + sy * sq * st
  out[1] = -cy * st + sy * sq * ct
  out[2] = sy * cq
  out[3] = cq * st
  out[4] = cq * ct
  out[5] = -sq
  out[6] = -sy * ct + cy * sq * st
  out[7] = sy * st + cy * sq * ct
  out[8] = cy * cq
  return out
}

/**
 * The head turns about the middle of its ball, not the neck: however it turns,
 * the ball sits in the body exactly as deep as at rest.
 */
export const HEAD_PIVOT: Vec3 = [BIRD.neck[0] + BIRD.headBall.centre[0], BIRD.neck[1] + BIRD.headBall.centre[1], BIRD.neck[2] + BIRD.headBall.centre[2]]

/** The head's frame, in the head's own coordinates (origin at the neck), for a turn from `headTurn`. */
export function headFrame(torso: Frame, head: Turn, out: Frame): Frame {
  child(torso, head, HEAD_PIVOT, out)
  const [x, y, z] = BIRD.headBall.centre
  for (let i = 0; i < 3; i++) out[9 + i] -= out[i * 3] * x + out[i * 3 + 1] * y + out[i * 3 + 2] * z
  return out
}

/** Turned farther than this (radians), the bird is looking back over its shoulder. */
export const SHOULDER_YAW = 1.2

/**
 * The lowest its head can look (up is positive), turned by `yaw`, when facing
 * ahead it can look `down`: over its shoulder it looks down less the farther
 * it turns, or its cheek would sink into its back.
 */
export function shoulderPitch(yaw: number, down: number): number {
  return Math.min(0, -down + Math.max(0, Math.abs(yaw) - SHOULDER_YAW))
}

/** One wing's turn on its hinge, opened by `angle`, with its drawing mirrored to its side. Side +1 is the right wing. */
export function wingTurn(side: number, angle: number, out: Turn): Turn {
  const c = Math.cos(side * angle)
  const s = Math.sin(side * angle)
  out[0] = c * side
  out[1] = -s
  out[2] = 0
  out[3] = s * side
  out[4] = c
  out[5] = 0
  out[6] = 0
  out[7] = 0
  out[8] = 1
  return out
}

/** One wing's hinge frame (x outward) for a turn from `wingTurn` on the same side. */
export function wingFrame(torso: Frame, side: number, wing: Turn, out: Frame): Frame {
  hinge[0] = side * BIRD.wingRoot[0]
  hinge[1] = BIRD.wingRoot[1]
  hinge[2] = BIRD.wingRoot[2]
  return child(torso, wing, hinge, out)
}

/** The tail's turn on its root, flicked by `flick`. */
export function tailTurn(flick: number, out: Turn): Turn {
  const c = Math.cos(flick)
  const s = Math.sin(flick)
  out[0] = 1
  out[1] = 0
  out[2] = 0
  out[3] = 0
  out[4] = c
  out[5] = -s
  out[6] = 0
  out[7] = s
  out[8] = c
  return out
}

export function tailFrame(torso: Frame, tail: Turn, out: Frame): Frame {
  return child(torso, tail, BIRD.tailRoot, out)
}

/** A point in the bird's torso frame, in world space. */
export function torsoPoint(pose: BirdPose, heading: number, pitch: number, out: MutableVec3): MutableVec3 {
  return apply(torsoFrame(pose, heading, pitch, shared), out[0], out[1], out[2], out)
}

/** A point on the head (its own frame) for a head yaw and pitch, tilted as the pose is. */
export function headPoint(pose: BirdPose, heading: number, pitch: number, yaw: number, headPitch: number, local: Vec3, out: MutableVec3): MutableVec3 {
  const f = headFrame(torsoFrame(pose, heading, pitch, shared), headTurn(yaw, headPitch, pose.headTilt, turn), shared)
  return apply(f, local[0], local[1], local[2], out)
}

/** A point on one wing (its hinge frame, x outward) opened by `angle`. Side +1 is the right wing. */
export function wingPoint(pose: BirdPose, heading: number, pitch: number, side: number, angle: number, local: Vec3, out: MutableVec3): MutableVec3 {
  const f = wingFrame(torsoFrame(pose, heading, pitch, shared), side, wingTurn(side, angle, turn), shared)
  return apply(f, local[0], local[1], local[2], out)
}

/** A point on the tail (its own frame) flicked by `flick`. */
export function tailPoint(pose: BirdPose, heading: number, pitch: number, flick: number, local: Vec3, out: MutableVec3): MutableVec3 {
  const f = tailFrame(torsoFrame(pose, heading, pitch, shared), tailTurn(flick, turn), shared)
  return apply(f, local[0], local[1], local[2], out)
}

/** Where the rider's feet rest on the saddle, in world space. */
export function riderPoint(pose: BirdPose, out: MutableVec3): MutableVec3 {
  return apply(torsoFrame(pose, pose.heading, pose.pitch, shared), 0, BIRD.saddleTop, BIRD.riderZ, out)
}
