// The peg dolls' measurements, one source for the rig (view/dolls.tsx), the
// kite line held in Pip's hand, the controller's idea of where Pip is, and
// the guard that keeps every doll's arms and head out of itself and out of
// the blocks. Plain numbers, no three.js.
//
// The head turns about the middle of its ball and each arm about the middle
// of its rounded top, so the joints (ball in the neck, arm against the
// shoulder) look the same in every pose; only what the motion asks for on top
// of that can collide, and the guard stops it at the first touch.

export type HeadKind = 'bob' | 'cap' | 'beanie'

export const NECK_Y = 1.34
export const HEAD_R = 0.37
/** The middle of the head's ball, the head's pivot. */
export const HEAD_Y = NECK_Y - 0.04 + HEAD_R
/** Hair and hats sit at most this far outside the ball (the beanie's cuff and the cap's brim are extra). */
export const HAIR = 0.035
export const ARM = 0.78
export const ARM_R = 0.078
export const HAND_R = ARM_R * 1.12
/** The middle of an arm's rounded top, the arm's pivot, on the right side (the left is mirrored). */
export const SHOULDER = { x: 0.31, y: 1.14 - ARM_R }
/** From the shoulder pivot to the middle of the hand. */
export const HAND_REACH = ARM - 2 * ARM_R
export const POM_R = 0.12
/** Where the beanie's pom-pom rests, above the middle of the head. */
export const POM_Y = HEAD_R + 0.09

/** The lathed body's outline (radius against height from the feet). */
export const BODY_PROFILE: readonly { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 0.32, y: 0 },
  { x: 0.355, y: 0.035 },
  { x: 0.36, y: 0.12 },
  { x: 0.33, y: 0.26 },
  { x: 0.295, y: 0.55 },
  { x: 0.285, y: 0.78 },
  { x: 0.3, y: 0.98 },
  { x: 0.3, y: 1.1 },
  { x: 0.265, y: 1.22 },
  { x: 0.18, y: 1.3 },
  { x: 0.13, y: NECK_Y },
  { x: 0, y: NECK_Y + 0.02 },
]
const BODY_TOP = NECK_Y + 0.02
/** The body's widest radius (at the hem). */
export const BODY_R = Math.max(...BODY_PROFILE.map((p) => p.x))

/** The cap's brim: an elliptic disc over the brow. */
export const BRIM = { y: HEAD_R * 0.62, thick: 0.045, rx: 0.36, rz: 0.45, z: 0.14 }
/** The beanie's rolled cuff: a band round the head above the ears. */
export const CUFF = { y0: HEAD_R * 0.36 - 0.06, y1: HEAD_R * 0.36 + 0.09, r: HEAD_R + 0.075 }

/** The painted face and the lowest hair, as spherical shells (radius, lowest polar angle from the top, and the arc they cover round the head). */
type Shell = { r: number; theta: number; phi0: number; phiLength: number }
/** The face atlas cell runs from polar angle `top` (its upper edge) to `bottom` round the front of the head. */
export const FACE_CELL = { top: 0.95, bottom: 2.2 }
const FACE: Shell = { r: HEAD_R + 0.006, theta: FACE_CELL.bottom, phi0: Math.PI / 2 - 0.85, phiLength: 1.7 }
export const FACE_SHELL = { r: FACE.r, phi0: FACE.phi0, phiLength: FACE.phiLength }
/** Where each doll's painted face starts: just below its hair, hat or the beanie's cuff, so it never tucks under them. */
export const FACE_TOP: Record<HeadKind, number> = { bob: 1.02, cap: 0.97, beanie: 1.38 }
const LOW_HAIR: Record<HeadKind, Shell> = {
  bob: { r: HEAD_R + 0.03, theta: 0.6 + 1.5, phi0: Math.PI / 2 + 0.95, phiLength: Math.PI * 2 - 1.9 },
  cap: { r: HEAD_R + 0.02, theta: 0.9 + 1.0, phi0: Math.PI / 2 + 1.1, phiLength: Math.PI * 2 - 2.2 },
  beanie: { r: HEAD_R + 0.02, theta: 1.1 + 0.7, phi0: Math.PI / 2 + 1.2, phiLength: Math.PI * 2 - 2.4 },
}

/**
 * Pip's outline for everything the controller moves near her: body and head
 * (arms keep clear of blocks on their own), with room above for her highest
 * spring, the jump for the kite (0.3 up and stretched 8%).
 */
export const PIP_CLEAR = { half: HEAD_R + HAIR + 0.04, top: HEAD_Y + HEAD_R + HAIR + 0.5 }

/** Radius of the body at height `y`, 0 above and below it. */
export function bodyRadius(y: number): number {
  if (y < 0 || y > BODY_TOP) return 0
  for (let i = 1; i < BODY_PROFILE.length; i++) {
    const a = BODY_PROFILE[i - 1]
    const b = BODY_PROFILE[i]
    if (y <= b.y) return b.y > a.y ? a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y) : Math.max(a.x, b.x)
  }
  return 0
}

/** How far the lathe's surface slopes at `y`, as the cosine that turns a radial gap into a gap along the surface normal. */
function bodySlope(y: number): number {
  for (let i = 1; i < BODY_PROFILE.length; i++) {
    const a = BODY_PROFILE[i - 1]
    const b = BODY_PROFILE[i]
    if (y <= b.y) {
      const dy = b.y - a.y
      const dx = b.x - a.x
      return dy > 1e-9 ? dy / Math.hypot(dx, dy) : 0
    }
  }
  return 1
}

/** Signed distance from a point to the body (negative inside), in the doll's own frame. */
export function bodyDistance(x: number, y: number, z: number): number {
  const radial = Math.hypot(x, z)
  if (y < 0) return Math.hypot(-y, Math.max(0, radial - BODY_PROFILE[1].x))
  if (y > BODY_TOP) return Math.hypot(y - BODY_TOP, radial)
  return (radial - bodyRadius(y)) * Math.max(0.3, bodySlope(y))
}

/** How deep the arm's rounded top sits in the shoulder in every pose; an arm may go no deeper anywhere. */
export const ARM_JOINT = ARM_R - bodyDistance(SHOULDER.x, SHOULDER.y, 0)

function combine(outward: number, vertical: number): number {
  return outward > 0 || vertical > 0 ? Math.hypot(Math.max(0, outward), Math.max(0, vertical)) : Math.max(outward, vertical)
}

/** Signed distance to the head, hair and hat (the pom is added by the guard), in the head's frame (origin at the ball's middle). */
export function headDistance(kind: HeadKind, x: number, y: number, z: number): number {
  let d = Math.hypot(x, y, z) - (HEAD_R + HAIR)
  if (kind === 'cap') {
    const k = Math.hypot(x / BRIM.rx, (z - BRIM.z) / BRIM.rz)
    const across = (k - 1) * Math.min(BRIM.rx, BRIM.rz)
    const up = Math.abs(y - (BRIM.y + BRIM.thick / 2)) - BRIM.thick / 2
    d = Math.min(d, combine(across, up))
  } else if (kind === 'beanie') {
    const out = Math.hypot(x, z) - CUFF.r
    const up = Math.abs(y - (CUFF.y0 + CUFF.y1) / 2) - (CUFF.y1 - CUFF.y0) / 2
    d = Math.min(d, combine(out, up))
  }
  return d
}

/** Distance from a point to a segment's axis, for the other arm. */
function segmentDistance(px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const length = dx * dx + dy * dy + dz * dz
  const t = length > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / length)) : 0
  return Math.hypot(px - ax - dx * t, py - ay - dy * t, pz - az - dz * t)
}

/** Signed distance to something outside the doll (a block), from a point in the doll's own frame. */
export type Obstacle = (x: number, y: number, z: number) => number

/** Unit direction of an arm from its shoulder: raised `raise` out to the side (0 hanging, PI straight up) and swung `forward` about the shoulder, the way the rig turns it (Euler XYZ). */
export function armDirection(side: -1 | 1, raise: number, forward: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const c = Math.cos(raise)
  out.x = side * Math.sin(raise)
  out.y = -c * Math.cos(forward)
  out.z = -c * Math.sin(forward)
  return out
}

const SAMPLES = 10
const STEP = 0.12
/** Contact allowed, overlap not: a hair of room so a touch never reads as a poke through. */
const GAP = 0.012
/** Out to the side, clear of head and body whatever the swing: where the search starts. */
const HOME_RAISE = 1.2
const HANGING = 0.15
/** How far before a touch an arm starts to slow into it, so a wave that reaches past the head still rises and falls instead of stopping flat. */
const EASE = 0.35

/**
 * One doll's arm and head guard. Set the head's turn (and the pom's place)
 * each frame, then ask for each arm: the returned raise is the one asked for
 * if the arm can get there from out at its side without touching anything,
 * otherwise it eases toward where it would first touch and never passes it.
 * The swing is kept, so the doll's gesture stays its own, it just slows
 * against the head, the hat or a block.
 */
export class DollGuard {
  readonly kind: HeadKind
  private readonly m = new Float64Array(9)
  private pomX = 0
  private pomY = 0
  private pomZ = 0
  private pom = false
  private obstacle: Obstacle | null = null
  private readonly held = { side: 0, reach: 0, room: 0 }
  private readonly dir = { x: 0, y: 0, z: 0 }
  private readonly other = { set: false, ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0 }

  constructor(kind: HeadKind) {
    this.kind = kind
    this.head(0, 0, 0)
  }

  /** The head's turn this frame (Euler XYZ: pitch, yaw, roll), about its pivot. */
  head(pitch: number, yaw: number, roll: number): void {
    const cx = Math.cos(pitch)
    const sx = Math.sin(pitch)
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const cz = Math.cos(roll)
    const sz = Math.sin(roll)
    const m = this.m
    // R = Rx * Ry * Rz, row-major.
    m[0] = cy * cz
    m[1] = -cy * sz
    m[2] = sy
    m[3] = cx * sz + sx * sy * cz
    m[4] = cx * cz - sx * sy * sz
    m[5] = -sx * cy
    m[6] = sx * sz - cx * sy * cz
    m[7] = sx * cz + cx * sy * sz
    m[8] = cx * cy
  }

  /** The pom-pom's place in the head's frame, or none. */
  setPom(x: number, y: number, z: number): void {
    this.pom = true
    this.pomX = x
    this.pomY = y
    this.pomZ = z
  }

  setObstacle(obstacle: Obstacle | null): void {
    this.obstacle = obstacle
  }

  /** Something held in one hand (side 0 for nothing): its middle `reach` down the arm from the shoulder, kept `room` clear of the blocks like the hand. */
  hold(side: -1 | 0 | 1, reach = 0, room = 0): void {
    this.held.side = side
    this.held.reach = reach
    this.held.room = room
  }

  /** Start a frame's arms: the first arm asked for is not yet in the way of the second. */
  beginArms(): void {
    this.other.set = false
  }

  /** Signed distance from a doll-frame point to the head, hat and pom. */
  headDistanceAt(x: number, y: number, z: number): number {
    const m = this.m
    const dx = x
    const dy = y - HEAD_Y
    const dz = z
    // Into the head's frame: R transposed.
    const hx = m[0] * dx + m[3] * dy + m[6] * dz
    const hy = m[1] * dx + m[4] * dy + m[7] * dz
    const hz = m[2] * dx + m[5] * dy + m[8] * dz
    let d = headDistance(this.kind, hx, hy, hz)
    if (this.pom) d = Math.min(d, Math.hypot(hx - this.pomX, hy - this.pomY, hz - this.pomZ) - POM_R)
    return d
  }

  /** Whether an arm at this raise and swing touches nothing. */
  armClear(side: -1 | 1, raise: number, forward: number): boolean {
    const d = armDirection(side, raise, forward, this.dir)
    const sx = side * SHOULDER.x
    const other = this.other
    const obstacle = this.obstacle
    const rises = d.y * HAND_REACH + HAND_R > HEAD_Y - HEAD_R - HAIR - 0.12 - SHOULDER.y
    for (let i = 0; i <= SAMPLES; i++) {
      const a = (HAND_REACH * i) / SAMPLES
      const r = i === SAMPLES ? HAND_R : ARM_R
      const x = sx + d.x * a
      const y = SHOULDER.y + d.y * a
      const z = d.z * a
      if (bodyDistance(x, y, z) < r - ARM_JOINT - 0.004) return false
      if (rises && this.headDistanceAt(x, y, z) < r + GAP) return false
      if (other.set && segmentDistance(x, y, z, other.ax, other.ay, other.az, other.bx, other.by, other.bz) < r + HAND_R + GAP) return false
      if (obstacle && obstacle(x, y, z) < r + GAP) return false
    }
    const held = this.held
    if (obstacle && held.side === side && obstacle(sx + d.x * held.reach, SHOULDER.y + d.y * held.reach, d.z * held.reach) < held.room + GAP) return false
    return true
  }

  /** The raise this arm may take toward `raise` at swing `forward`; remembered so the other arm keeps clear of it. */
  arm(side: -1 | 1, raise: number, forward: number): number {
    let home = HOME_RAISE
    if (!this.armClear(side, home, forward)) home = this.armClear(side, HANGING, forward) ? HANGING : this.nearestClear(side, raise, forward)
    let out = raise
    if (home !== raise) {
      const dir = raise > home ? 1 : -1
      // Raising, look EASE past the ask: a touch that close already slows the arm. Lowering, an arm may rest against the body.
      const ease = dir > 0 ? EASE : 0
      const reach = raise + dir * ease
      let clear = home
      let blocked = Number.NaN
      for (let at = home + dir * STEP; dir > 0 ? at < reach : at > reach; at += dir * STEP) {
        if (!this.armClear(side, at, forward)) {
          blocked = at
          break
        }
        clear = at
      }
      if (Number.isNaN(blocked) && !this.armClear(side, reach, forward)) blocked = reach
      if (!Number.isNaN(blocked)) {
        for (let i = 0; i < 6; i++) {
          const mid = (clear + blocked) / 2
          if (this.armClear(side, mid, forward)) clear = mid
          else blocked = mid
        }
        if (ease === 0) out = clear
        else {
          const past = raise - (clear - ease)
          if (past > 0) out = Math.max(home, clear - ease * Math.exp(-past / ease))
        }
      }
    }
    const d = armDirection(side, out, forward, this.dir)
    const other = this.other
    other.set = true
    other.ax = side * SHOULDER.x
    other.ay = SHOULDER.y
    other.az = 0
    other.bx = other.ax + d.x * HAND_REACH
    other.by = other.ay + d.y * HAND_REACH
    other.bz = d.z * HAND_REACH
    return out
  }

  /** The clear raise nearest `raise` (a block beside the doll can leave neither out nor hanging free), or `raise` if there is none. */
  private nearestClear(side: -1 | 1, raise: number, forward: number): number {
    for (let step = 1; step * STEP <= Math.PI; step++) {
      const below = raise - step * STEP
      if (below >= 0 && this.armClear(side, below, forward)) return below
      const above = raise + step * STEP
      if (above <= Math.PI && this.armClear(side, above, forward)) return above
    }
    return raise
  }

  /** Whether the painted face and the lowest hair stay out of the body at this head turn. */
  headClear(pitch: number, yaw: number, roll: number): boolean {
    this.head(pitch, yaw, roll)
    const m = this.m
    for (const shell of [FACE, LOW_HAIR[this.kind]]) {
      for (const theta of [shell.theta, shell.theta - 0.25]) {
        const st = Math.sin(theta)
        const ct = Math.cos(theta)
        for (let i = 0; i <= 16; i++) {
          const phi = shell.phi0 + (shell.phiLength * i) / 16
          // three's sphere: x = -r cos(phi) sin(theta), y = r cos(theta), z = r sin(phi) sin(theta).
          const hx = -shell.r * Math.cos(phi) * st
          const hy = shell.r * ct
          const hz = shell.r * Math.sin(phi) * st
          const x = m[0] * hx + m[1] * hy + m[2] * hz
          const y = HEAD_Y + m[3] * hx + m[4] * hy + m[5] * hz
          const z = m[6] * hx + m[7] * hy + m[8] * hz
          if (bodyDistance(x, y, z) < 0.012) return false
        }
      }
    }
    return true
  }

  /**
   * The head turn this frame, with the nod or tilt eased back just enough
   * that the face and hair stay out of the body. Leaves the guard set to it
   * and returns the pitch and roll actually used (yaw is always free).
   */
  turnHead(pitch: number, yaw: number, roll: number, out: { pitch: number; roll: number }): { pitch: number; roll: number } {
    let k = 1
    if (!this.headClear(pitch, yaw, roll)) {
      let lo = 0
      let hi = 1
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2
        if (this.headClear(pitch * mid, yaw, roll * mid)) lo = mid
        else hi = mid
      }
      k = lo
    }
    out.pitch = pitch * k
    out.roll = roll * k
    this.head(out.pitch, yaw, out.roll)
    return out
  }
}

/** Where a hand is in the doll's frame for an arm at this raise and swing. */
export function handAt(side: -1 | 1, raise: number, forward: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  armDirection(side, raise, forward, out)
  out.x = side * SHOULDER.x + out.x * HAND_REACH
  out.y = SHOULDER.y + out.y * HAND_REACH
  out.z *= HAND_REACH
  return out
}

/** Pip's arms while she hangs from the kite: high at her sides, the right hand on the spool, far enough below the head that the guard never eases it. */
export const FLY_RAISE = 2.4
const flyHand = handAt(1, FLY_RAISE, 0, { x: 0, y: 0, z: 0 })
/** The spool sits just past the fingers, across the arm. */
export const SPOOL_R = 0.14
export const SPOOL_HALF = 0.16
/** Room the spool needs round its middle, whichever way it lies. */
export const SPOOL_ROOM = Math.hypot(SPOOL_R, SPOOL_HALF) + 0.02
/** From the shoulder down the arm to the middle of a spool held in the hand. */
export const GRIP_REACH = HAND_REACH + HAND_R + SPOOL_R + 0.01
/** Where the kite line meets the spool in Pip's frame (feet at the origin) while she flies. */
export const FLY_GRIP = {
  x: flyHand.x + Math.sin(FLY_RAISE) * (HAND_R + SPOOL_R + 0.01),
  y: flyHand.y - Math.cos(FLY_RAISE) * (HAND_R + SPOOL_R + 0.01),
}

type Point = { x: number; y: number; z: number }

/**
 * The blocks near one doll, as drawn this frame, as an `Obstacle` in that
 * doll's own frame. Each convex part is a prism through the build plane; the
 * distance is the largest of its side planes, combined with its front and back
 * faces: exact inside, a little short just off a corner, so an arm stops a
 * hair early there rather than late.
 */
export class BlockField {
  /** Doll frame to room, row-major 3x4, set each frame before the arms are asked for. */
  readonly frame = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0])
  private readonly planes: Float64Array[] = []
  private readonly sides: number[] = []
  private readonly halfDepth: number[] = []
  private count = 0

  get empty(): boolean {
    return this.count === 0
  }

  clear(): void {
    this.count = 0
  }

  /** One convex part of a piece (its own points, either winding) placed at (x, y), turned `angle`, drawn at `scale`, `depth` deep. */
  add(points: readonly { x: number; y: number }[], x: number, y: number, angle: number, scale: number, depth: number): void {
    const n = points.length
    const slot = this.count++
    let planes = this.planes[slot]
    if (!planes || planes.length < n * 3) planes = this.planes[slot] = new Float64Array(Math.max(n, 8) * 3)
    const c = Math.cos(angle) * scale
    const s = Math.sin(angle) * scale
    let area = 0
    for (let i = 0; i < n; i++) {
      const a = points[i]
      const b = points[(i + 1) % n]
      area += a.x * b.y - b.x * a.y
    }
    const outward = area >= 0 ? 1 : -1
    for (let i = 0; i < n; i++) {
      const a = points[i]
      const b = points[(i + 1) % n]
      const ax = x + a.x * c - a.y * s
      const ay = y + a.x * s + a.y * c
      const dx = (b.x - a.x) * c - (b.y - a.y) * s
      const dy = (b.x - a.x) * s + (b.y - a.y) * c
      const length = Math.hypot(dx, dy) || 1
      const nx = (outward * dy) / length
      const ny = (-outward * dx) / length
      planes[i * 3] = nx
      planes[i * 3 + 1] = ny
      planes[i * 3 + 2] = nx * ax + ny * ay
    }
    this.sides[slot] = n
    this.halfDepth[slot] = depth / 2
  }

  /** Signed distance from a point in the doll's frame to the nearest block. */
  readonly distance: Obstacle = (x, y, z) => {
    const f = this.frame
    return this.roomDistance(f[0] * x + f[1] * y + f[2] * z + f[3], f[4] * x + f[5] * y + f[6] * z + f[7], f[8] * x + f[9] * y + f[10] * z + f[11])
  }

  /** Signed distance from a point in the room to the nearest block. */
  roomDistance(wx: number, wy: number, wz: number): number {
    let best = Infinity
    for (let k = 0; k < this.count; k++) {
      const planes = this.planes[k]
      let d = -Infinity
      for (let i = 0, n = this.sides[k] * 3; i < n; i += 3) {
        const side = planes[i] * wx + planes[i + 1] * wy - planes[i + 2]
        if (side > d) d = side
      }
      const e = combine(d, Math.abs(wz) - this.halfDepth[k])
      if (e < best) best = e
    }
    return best
  }

  /**
   * Push room point `p` until it is `room` clear of every block (the frame
   * is not used): out through the nearest side, or out past the front face
   * toward the child, whichever is shorter. True if it moved.
   */
  pushOut(p: Point, room: number): boolean {
    let moved = false
    // Twice round, so a push out of one part into a neighbour is undone.
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < this.count; k++) {
        const half = this.halfDepth[k]
        if (p.z >= half + room || p.z <= -half - room) continue
        const planes = this.planes[k]
        let d = -Infinity
        let side = 0
        for (let i = 0, n = this.sides[k] * 3; i < n; i += 3) {
          const out = planes[i] * p.x + planes[i + 1] * p.y - planes[i + 2]
          if (out > d) {
            d = out
            side = i
          }
        }
        if (d >= room) continue
        const across = room - d
        const front = half + room - p.z
        if (front < across) p.z += front
        else {
          p.x += planes[side] * across
          p.y += planes[side + 1] * across
        }
        moved = true
      }
    }
    return moved
  }
}

/** A standing doll's spring, sideways lean about her feet, and squash (above 1 taller, below 1 shorter), as drawn this frame. */
export type HeadPose = { lift: number; roll: number; squash: number }

/** The lowest squash a doll ducks to under a block that comes down lower than her head. */
export const DUCK = 0.78
/** Room kept between a doll's head and a block. */
const HEAD_GAP = 0.012

/**
 * Fit a doll's head (feet at (x, y), `z` out from the build, drawn at
 * `scale`) among the blocks `room` measures in the room. She springs, leans
 * and stretches only as far as they allow, eased back together, and ducks
 * under a block lower than her head as she stands (never below `DUCK`), so
 * she still hops and reaches, just never into wood. `pose` is fitted in
 * place. Squash scales the head with her, so it is measured as a ball as
 * wide as it gets either way.
 */
export function fitHead(room: (x: number, y: number, z: number) => number, x: number, y: number, z: number, scale: number, pose: HeadPose): void {
  const clear = (lift: number, roll: number, squash: number) => {
    const h = HEAD_Y * squash * scale
    const r = (HEAD_R + HAIR) * Math.max(squash, 1 / Math.sqrt(squash)) * scale + HEAD_GAP
    return room(x - Math.sin(roll) * h, y + lift + Math.cos(roll) * h, z) >= r
  }
  const { lift, roll, squash } = pose
  if (clear(lift, roll, squash)) return
  const low = Math.min(1, squash)
  if (clear(0, 0, low)) {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2
      if (clear(lift * mid, roll * mid, low + (squash - low) * mid)) lo = mid
      else hi = mid
    }
    pose.lift = lift * lo
    pose.roll = roll * lo
    pose.squash = low + (squash - low) * lo
    return
  }
  let lo = Math.min(DUCK, low)
  let hi = low
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2
    if (clear(0, 0, mid)) lo = mid
    else hi = mid
  }
  pose.lift = 0
  pose.roll = 0
  pose.squash = lo
}

/** Where one doll's parts are in the room this frame, written by its rig after it poses the doll. */
export class DollPlace {
  /** False until the rig has posed the doll once. */
  set = false
  scale = 1
  readonly feet: Point = { x: 0, y: 0, z: 0 }
  readonly neck: Point = { x: 0, y: 0, z: 0 }
  /** The middle of the head's ball. */
  readonly head: Point = { x: 0, y: 0, z: 0 }
  readonly shoulderL: Point = { x: 0, y: 0, z: 0 }
  readonly handL: Point = { x: 0, y: 0, z: 0 }
  readonly shoulderR: Point = { x: 0, y: 0, z: 0 }
  readonly handR: Point = { x: 0, y: 0, z: 0 }
  /** The middle of a spool held in the right hand. */
  readonly grip: Point = { x: 0, y: 0, z: 0 }
}

/** How far above the feet the body capsule's core starts: its round bottom then meets the hem within a few hundredths. */
const BODY_CORE = 0.2

/** Push `p` out along the shortest way until it is `clear` from segment a-b (a point when a = b); true if it moved. */
function pushFromSegment(p: Point, a: Point, b: Point, clear: number): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  const length = dx * dx + dy * dy + dz * dz
  const t = length > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) / length)) : 0
  const ox = p.x - a.x - dx * t
  const oy = p.y - a.y - dy * t
  const oz = p.z - a.z - dz * t
  const d = Math.hypot(ox, oy, oz)
  if (d >= clear) return false
  if (d < 1e-6) {
    p.y += clear
    return true
  }
  const k = clear / d - 1
  p.x += ox * k
  p.y += oy * k
  p.z += oz * k
  return true
}

const bodyBase: Point = { x: 0, y: 0, z: 0 }

/**
 * Move a point out of the doll (head and hair, body, both arms) until it is
 * `margin` clear, the way a string or a hanging bow drapes over her rather
 * than through her. The body is a capsule as wide as the hem from the feet to
 * the neck, a little fuller than the lathe near the neck. True if it moved.
 */
export function keepOut(place: DollPlace, p: Point, margin: number): boolean {
  if (!place.set) return false
  const s = place.scale
  const { feet, neck } = place
  const k = (BODY_CORE * s) / (Math.hypot(neck.x - feet.x, neck.y - feet.y, neck.z - feet.z) || 1)
  bodyBase.x = feet.x + (neck.x - feet.x) * k
  bodyBase.y = feet.y + (neck.y - feet.y) * k
  bodyBase.z = feet.z + (neck.z - feet.z) * k
  let moved = false
  // Twice round, so a push out of one part into a neighbour is undone.
  for (let pass = 0; pass < 2; pass++) {
    moved = pushFromSegment(p, place.head, place.head, (HEAD_R + HAIR) * s + margin) || moved
    moved = pushFromSegment(p, bodyBase, place.neck, BODY_R * s + margin) || moved
    moved = pushFromSegment(p, place.shoulderL, place.handL, HAND_R * s + margin) || moved
    moved = pushFromSegment(p, place.shoulderR, place.handR, HAND_R * s + margin) || moved
  }
  return moved
}
