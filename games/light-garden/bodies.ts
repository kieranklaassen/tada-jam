import type { CreatureKind, PieceKind } from './layout'
import type { Pose } from './motion'

// How much room each drawn thing takes, so nothing passes through anything
// else. The sizes are measured from the meshes in view/geometry.ts, and
// bodies.test.ts checks them against the geometry. A creature's parts are
// moved by the glass vertex shader (`deform` in view/materials.ts); `groundAlt`
// follows the parts that reach lowest through the same moves, so keep the two
// in step. Nothing here allocates per frame.

/** Creatures are drawn a little larger than the circle that catches light, so a seven-year-old reads them at a glance. */
export const CREATURE_SCALE = 1.45

/** How tall each piece's glass stands, and how far it reaches from the piece's centre, knob apart (cm). */
export const PIECE_BODY: Readonly<Record<PieceKind, { top: number; reach: number }>> = {
  lamp: { top: 6.85, reach: 4.66 },
  mirror: { top: 4.46, reach: 6.2 },
  filter: { top: 3.35, reach: 5.14 },
  prism: { top: 4.35, reach: 5.95 },
}

/** The knob's bead: how tall it stands, and how far it reaches round the knob point. Its arm is lower and slimmer. */
export const KNOB_BODY = { top: 2.07, bead: 1.57 } as const

/** The most any pose lifts a creature's glass above where it stands, and how far any pose spreads it sideways (cm). */
export const CREATURE_BODY: Readonly<Record<CreatureKind, { top: number; reach: number }>> = {
  moth: { top: 10.1, reach: 8.6 },
  fish: { top: 8.1, reach: 10.3 },
  snail: { top: 10.4, reach: 8.4 },
  jelly: { top: 12.7, reach: 9.3 },
}

/**
 * Where a creature's drawn glass can reach lowest: an ellipsoid (centre, then its three semi-axis vectors)
 * on one shader part. A jelly's tentacle tips are stretched by the shader, so they keep their radius `r`
 * and get their axes as they move.
 */
type Keel = { part: number; r: number; values: Float64Array }

const RIGID = 0
const PART_A = 1
const PART_B = 2

function keel(part: number, x: number, y: number, z: number, axes: readonly (readonly [number, number, number])[], r = 0): Keel {
  const values = new Float64Array(12)
  values.set([x, y, z])
  axes.forEach((axis, j) => values.set(axis, 3 + j * 3))
  return { part, r, values }
}

const sphere = (part: number, x: number, y: number, z: number, r: number) =>
  keel(part, x, y, z, [
    [r, 0, 0],
    [0, r, 0],
    [0, 0, r],
  ])

/** An ellipsoid turned by `rx` about x after `rz` about z (three's XYZ order with no y turn). */
function ellipsoid(part: number, x: number, y: number, z: number, a: number, b: number, c: number, rx = 0, rz = 0): Keel {
  const cz = Math.cos(rz)
  const sz = Math.sin(rz)
  const cx = Math.cos(rx)
  const sx = Math.sin(rx)
  // Columns of Rx(rx)·Rz(rz), each scaled by its semi-axis.
  return keel(part, x, y, z, [
    [cz * a, cx * sz * a, sx * sz * a],
    [-sz * b, cx * cz * b, sx * cz * b],
    [0, -sx * c, cx * c],
  ])
}

const FOREWING = [
  [1.5, 0.5],
  [2.3, 2.6],
  [1.7, 5.2],
  [-0.4, 4.6],
  [-1.1, 2.2],
  [-0.5, 0.5],
] as const
const HINDWING = [
  [-0.3, 0.4],
  [-0.7, 3.1],
  [-2.9, 3.3],
  [-3.2, 1.2],
  [-1.6, 0.3],
] as const

// A wing is a thin bevelled slab (view/geometry.ts, `wing`) whose edge runs in quadratic curves from
// midpoint to midpoint of its outline. A ball (half its thickness plus its bevel) at points along that
// edge holds it wherever the shader swings it.
const WING_EDGE = 0.3

function wingEdge(outline: readonly (readonly [number, number])[], part: number, y: number, side: number): Keel[] {
  const point = (i: number) => outline[i % outline.length]
  const mid = (i: number, axis: 0 | 1) => (point(i)[axis] + point(i + 1)[axis]) / 2
  const keels: Keel[] = []
  for (let i = 1; i <= outline.length; i++) {
    for (const t of [0, 0.25, 0.5, 0.75]) {
      const along = (axis: 0 | 1) => (1 - t) * (1 - t) * mid(i - 1, axis) + 2 * (1 - t) * t * point(i)[axis] + t * t * mid(i, axis)
      keels.push(sphere(part, along(0), y, along(1) * side, WING_EDGE))
    }
  }
  return keels
}

const KEELS: Readonly<Record<CreatureKind, readonly Keel[]>> = {
  moth: [
    ...[0, 1, 2].map((i) => ellipsoid(RIGID, -2.0 + i * 0.95, 2.3, 0, 0.78, 0.82 + i * 0.08, 0.82 + i * 0.08)),
    sphere(RIGID, 1.2, 2.5, 0, 1.3),
    sphere(RIGID, 2.5, 2.6, 0, 1.0),
    ...[1, -1].flatMap((side) => [...wingEdge(FOREWING, side > 0 ? PART_A : PART_B, 2.56, side), ...wingEdge(HINDWING, side > 0 ? PART_A : PART_B, 2.42, side)]),
  ],
  fish: [
    ellipsoid(RIGID, 0.2, 2.5, 0, 3.3, 2.1, 1.55),
    ellipsoid(RIGID, 0.5, 1.9, 0, 2.5, 1.2, 1.2),
    ...[0.55, -0.55].map((tilt) => ellipsoid(PART_A, -4.0, 2.5 + tilt * 1.3, 0, 1.6, 0.85, 0.2, 0, tilt)),
    ...[1, -1].map((side) => ellipsoid(PART_B, 0.4, 2.0, side * 1.55, 1.05, 0.14, 0.7, side * 0.5, -0.4)),
  ],
  snail: [
    // The foot is a capsule: its lowest point is always at one of its two ends.
    ellipsoid(PART_A, -2.4, 0.85, 0, 0.85, 0.85, 1.0625),
    ellipsoid(PART_A, 2.8, 0.85, 0, 0.85, 0.85, 1.0625),
    sphere(PART_A, 2.9, 1.55, 0, 1.1),
    // The outer coil of the shell, ball by ball round its ring, and the dome inside it.
    ...Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2
      return ellipsoid(RIGID, -0.7 + Math.cos(a) * 2.1, 3.35 + Math.sin(a) * 2.1, 0, 1.05, 1.05, 1.3125)
    }),
    ellipsoid(RIGID, -0.7, 3.35, -0.35, 2.6, 2.6, 1.1),
  ],
  jelly: Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2 + 0.3
    const radius = i % 2 ? 2.1 : 1.3
    return keel(PART_B, Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius, [], i % 2 ? 0.14 : 0.26)
  }),
}

const w = new Float64Array(12)

function turnY(i: number, a: number): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const x = w[i]
  const z = w[i + 2]
  w[i] = c * x + s * z
  w[i + 2] = -s * x + c * z
}

function turnX(i: number, a: number): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const y = w[i + 1]
  const z = w[i + 2]
  w[i + 1] = c * y - s * z
  w[i + 2] = s * y + c * z
}

/** Turn the working ellipsoid about a pivot: its centre round the pivot, its axes in place. */
function turnAbout(px: number, py: number, pz: number, turn: (i: number, a: number) => void, a: number): void {
  w[0] -= px
  w[1] -= py
  w[2] -= pz
  for (let i = 0; i < 12; i += 3) turn(i, a)
  w[0] += px
  w[1] += py
  w[2] += pz
}

/** The shader's moves for one keel, applied to the working ellipsoid `w`. */
function deformKeel(kind: CreatureKind, k: Keel, pose: Pose, time: number): void {
  switch (kind) {
    case 'jelly': {
      const hang = 3.6 - w[1]
      const spread = (1 - 0.22 * pose.a) * (1 + hang * 0.28 * pose.c)
      let x = w[0] * spread
      let z = w[2] * spread
      const wave = Math.sin(hang * 1.5 - time * 2.4 + z * 1.7 + x)
      x += wave * pose.b * hang * 0.22
      z += Math.cos(hang * 1.2 - time * 2.0 + x * 2.0) * pose.b * hang * 0.12
      w[0] = x
      w[1] = 3.6 - hang * (1 - 0.4 * pose.c)
      w[2] = z
      const across = k.r * spread + 0.02
      w.fill(0, 3)
      w[3] = across
      w[7] = k.r * (1 - 0.4 * pose.c) + 0.02
      w[11] = across
      return
    }
    case 'moth': {
      const angle = -0.32 + 0.44 * pose.a + pose.b * 0.75
      const sweep = (1 - pose.a) * 0.62
      if (k.part === PART_A || k.part === PART_B) {
        const side = k.part === PART_A ? -1 : 1
        turnAbout(0.4, 2.35, 0, turnY, side * sweep)
        turnAbout(0.4, 2.35, 0, turnX, side * angle)
      }
      return
    }
    case 'snail': {
      const ext = 0.28 + 0.72 * pose.a
      if (k.part === PART_A && w[0] > -0.4) {
        w[0] = -0.4 + (w[0] + 0.4) * ext
        for (let i = 3; i < 12; i += 3) w[i] *= ext
      }
      // The foot's slow wave, at its lowest everywhere at once.
      w[1] -= 0.07 * pose.a
      return
    }
    case 'fish': {
      if (k.part === PART_A) turnAbout(-2.9, 2.5, 0, turnY, pose.a * 0.65)
      else if (k.part === PART_B) {
        const side = Math.sign(w[2])
        turnAbout(0.8, 2.2, side * 1.3, turnX, -pose.b * 0.6 * side)
      }
      // The C-bend shears the body sideways by how far along it a point is.
      const bend = 2 * 0.085 * pose.c * w[0]
      for (let i = 3; i < 12; i += 3) w[i + 2] += bend * w[i]
      w[2] += pose.c * w[0] * w[0] * 0.085
      return
    }
    default: {
      const never: never = kind
      return never
    }
  }
}

/**
 * The lowest height a creature can stand at in this pose (drawn the way the view draws it, the shader's
 * moves included) before any of its glass dips under the panel. Negative when its lowest part sits above
 * where it stands.
 */
export function groundAlt(kind: CreatureKind, pose: Pose, time: number): number {
  const sx = pose.stretch * CREATURE_SCALE
  const sy = pose.squash * CREATURE_SCALE
  const sz = CREATURE_SCALE / Math.sqrt(Math.max(0.2, pose.stretch * pose.squash))
  // The world-up row of the view's rotation (roll, -heading, pitch in YXZ order), times the scale.
  const cr = Math.cos(pose.roll)
  const ux = cr * Math.sin(pose.pitch) * sx
  const uy = cr * Math.cos(pose.pitch) * sy
  const uz = -Math.sin(pose.roll) * sz
  let lowest = Infinity
  for (const k of KEELS[kind]) {
    w.set(k.values)
    deformKeel(kind, k, pose, time)
    let spread = 0
    for (let i = 3; i < 12; i += 3) {
      const g = w[i] * ux + w[i + 1] * uy + w[i + 2] * uz
      spread += g * g
    }
    lowest = Math.min(lowest, w[0] * ux + w[1] * uy + w[2] * uz - Math.sqrt(spread))
  }
  return -lowest
}
