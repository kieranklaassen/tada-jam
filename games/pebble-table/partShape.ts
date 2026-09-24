import { noise3 } from './noise'
import type { PartKind } from './parts'
import { outlineOf, type Outline } from './stoneShape'

// One set of dimensions for the loose parts and their jars: the drawn
// acorns, shells, sticks, boulder, jars, and nest are built from the vertices
// here (view/models.tsx), and the colliders they rest and stack on are fitted
// around the same vertices, so what is drawn is what collides.

export type V3 = readonly [number, number, number]

/** Parts are modelled small and drawn this much larger; colliders are measured at the drawn size. */
export const PART_DRAW_SCALE = 1.45

/**
 * A primitive pressed from clay, in modelled units: a unit sphere, or a
 * capsule of radius 0.5 that is 1 long between its caps, pushed along its own
 * normals by noise (as clay's `lump` does), then scaled, turned (XYZ Euler),
 * and moved. The grid is a sphere's (`segments` around, `rings` pole to
 * pole), so three's SphereGeometry of the same grid takes these vertices.
 */
export type Lumped = {
  shape: 'sphere' | 'capsule'
  position: V3
  rotation?: V3
  scale: V3
  lump?: number
  frequency?: number
  seed?: number
  segments: number
  rings: number
}

/** A capsule grid with `capSegments` rings per cap, like three's CapsuleGeometry(0.5, 1, capSegments). */
export const capsuleRings = (capSegments: number) => 2 * capSegments + 1

/** Unit normals of a sphere grid, three's SphereGeometry vertex order. */
export function sphereGrid(segments: number, rings: number, capsule = false): Float32Array {
  const out = new Float32Array((segments + 1) * (rings + 1) * 3)
  const caps = (rings - 1) / 2
  let at = 0
  for (let iy = 0; iy <= rings; iy++) {
    const theta = !capsule ? (iy / rings) * Math.PI : iy <= caps ? (iy / caps) * (Math.PI / 2) : Math.PI / 2 + ((iy - caps - 1) / caps) * (Math.PI / 2)
    for (let ix = 0; ix <= segments; ix++) {
      const phi = (ix / segments) * Math.PI * 2
      out[at++] = -Math.cos(phi) * Math.sin(theta)
      out[at++] = Math.cos(theta)
      out[at++] = Math.sin(phi) * Math.sin(theta)
    }
  }
  return out
}

function turn(x: number, y: number, z: number, [a, b, c]: V3): [number, number, number] {
  // three's XYZ order: R = Rx · Ry · Rz, so z turns first.
  const x1 = x * Math.cos(c) - y * Math.sin(c)
  const y1 = x * Math.sin(c) + y * Math.cos(c)
  const x2 = x1 * Math.cos(b) + z * Math.sin(b)
  const z2 = -x1 * Math.sin(b) + z * Math.cos(b)
  return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)]
}

/**
 * The placed vertices of a primitive. `raise` lifts a point, in the same
 * unit space, as a function of its unit normal (a shell's ribs).
 */
export function lumpedVertices(p: Lumped, raise?: (x: number, y: number, z: number) => number): Float32Array {
  const capsule = p.shape === 'capsule'
  const grid = sphereGrid(p.segments, p.rings, capsule)
  const out = new Float32Array(grid.length)
  const amount = p.lump ?? 0
  const f = p.frequency ?? 2.2
  const seed = p.seed ?? 0
  const upper = (p.rings - 1) / 2
  const rotation = p.rotation ?? [0, 0, 0]
  for (let i = 0; i < grid.length; i += 3) {
    const [nx, ny, nz] = [grid[i], grid[i + 1], grid[i + 2]]
    const ring = Math.floor(i / 3 / (p.segments + 1))
    const radius = capsule ? 0.5 : 1
    const x = nx * radius
    const y = ny * radius + (capsule ? (ring <= upper ? 0.5 : -0.5) : 0)
    const z = nz * radius
    const push = amount ? (noise3(x * f + seed, y * f + seed * 1.7, z * f - seed) - 0.5) * amount : 0
    const lift = raise?.(nx, ny, nz) ?? 0
    const [tx, ty, tz] = turn((x + nx * push) * p.scale[0], (y + ny * push + lift) * p.scale[1], (z + nz * push) * p.scale[2], rotation)
    out[i] = tx + p.position[0]
    out[i + 1] = ty + p.position[1]
    out[i + 2] = tz + p.position[2]
  }
  return out
}

/** A lumped ring (three's TorusGeometry(1, tube, radial, tubular)), lying flat, then scaled and moved. */
export type Ring = { tube: number; radial: number; tubular: number; position: V3; scale: number; lump: number; frequency: number; seed: number }

export function ringVertices(r: Ring): Float32Array {
  const out = new Float32Array((r.radial + 1) * (r.tubular + 1) * 3)
  let at = 0
  for (let j = 0; j <= r.radial; j++) {
    const v = (j / r.radial) * Math.PI * 2
    for (let i = 0; i <= r.tubular; i++) {
      const u = (i / r.tubular) * Math.PI * 2
      const [nx, ny, nz] = [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)]
      const x = Math.cos(u) + r.tube * nx
      const y = Math.sin(u) + r.tube * ny
      const z = r.tube * nz
      const push = (noise3(x * r.frequency + r.seed, y * r.frequency + r.seed * 1.7, z * r.frequency - r.seed) - 0.5) * r.lump
      // Laid flat by a quarter turn about x: (x, y, z) to (x, -z, y).
      out[at++] = (x + nx * push) * r.scale + r.position[0]
      out[at++] = -(z + nz * push) * r.scale + r.position[1]
      out[at++] = (y + ny * push) * r.scale + r.position[2]
    }
  }
  return out
}

// --- the parts ------------------------------------------------------------

export const ACORN = {
  nut: { shape: 'sphere', position: [0, -0.15, 0], scale: [0.85, 1, 0.85], lump: 0.06, segments: 16, rings: 11 },
  cap: { shape: 'sphere', position: [0, 0.45, 0], scale: [0.98, 0.5, 0.98], lump: 0.1, segments: 16, rings: 11 },
  stem: { shape: 'capsule', position: [0, 0.95, 0], scale: [0.14, 0.35, 0.14], segments: 6, rings: capsuleRings(2) },
} as const satisfies Record<string, Lumped>

export const SHELL = {
  body: { shape: 'sphere', position: [0, 0, 0], scale: [1.35, 0.32, 1.15], lump: 0.05, segments: 40, rings: 24 },
} as const satisfies Record<string, Lumped>

/** A shell's ribs are pressed up out of its back, fanning from the hinge at its -z edge to its rim. */
export const SHELL_RIBS = { count: 5, fan: 1.9, height: 0.28 } as const

/** How much of a rib a point of the shell (by its unit normal) is on, 0 to 1. */
export function shellRib(x: number, y: number, z: number): number {
  if (y <= 0) return 0
  const fromHinge = Math.hypot(x, z + 1)
  const angle = Math.atan2(x, z + 1.15)
  const wave = Math.cos((angle / SHELL_RIBS.fan) * SHELL_RIBS.count * Math.PI) * 0.5 + 0.5
  const smooth = (edge0: number, edge1: number, t: number) => {
    const k = Math.min(1, Math.max(0, (t - edge0) / (edge1 - edge0)))
    return k * k * (3 - 2 * k)
  }
  return wave ** 3 * smooth(0.05, 0.45, y) * smooth(0.25, 0.7, fromHinge) * (Math.abs(angle) < SHELL_RIBS.fan / 2 ? 1 : 0)
}

export const STICK = {
  bark: { shape: 'capsule', position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.62, 5, 0.62], lump: 0.1, frequency: 1.2, segments: 8, rings: capsuleRings(2) },
  /** A side twig grows out of the bark: its lower end stays inside it. */
  twig: { shape: 'capsule', position: [0.8, 0.5, 0.4], rotation: [0.6, 0, 0.9], scale: [0.3, 1.4, 0.3], segments: 6, rings: capsuleRings(2) },
} as const satisfies Record<string, Lumped>

export const BOULDER = {
  rock: { shape: 'sphere', position: [0, 0, 0], scale: [3.3, 1.9, 3.1], lump: 0.35, frequency: 0.8, seed: 41, segments: 16, rings: 11 },
} as const satisfies Record<string, Lumped>

export const PART_PIECES = { acorn: ACORN, shell: SHELL, stick: STICK, boulder: BOULDER } as const satisfies Record<PartKind, Record<string, Lumped>>

function scaled(vertices: Float32Array, by: number): Float32Array {
  return vertices.map((v) => v * by)
}

/** The drawn vertices of one piece of a part (ribs pressed in for the shell), in the part's own drawn space. */
export function partPieceVertices(kind: PartKind, piece: string): Float32Array {
  const pieces: Record<string, Lumped> = PART_PIECES[kind]
  return scaled(lumpedVertices(pieces[piece], kind === 'shell' ? (x, y, z) => shellRib(x, y, z) * SHELL_RIBS.height : undefined), PART_DRAW_SCALE)
}

function joined(arrays: Float32Array[]): Float32Array {
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0))
  let at = 0
  for (const a of arrays) {
    out.set(a, at)
    at += a.length
  }
  return out
}

/** Every drawn vertex of a part, in its own drawn space. */
export function partVertices(kind: PartKind): Float32Array {
  return joined(Object.keys(PART_PIECES[kind]).map((piece) => partPieceVertices(kind, piece)))
}

// --- colliders ------------------------------------------------------------

export type Ball = { x: number; y: number; z: number; r: number }

/** A part collides as an upright prism around its outline (as a stone does), plus small balls for thin bits that stand out of it. */
export type PartCollider = { prism: Outline | null; balls: Ball[] }

/**
 * Balls at `centres`, each as big as the farthest point nearest to it, less
 * `slack`: the points lie at most `slack` outside the balls, which the audit
 * and the eye both forgive, and the balls stand off the drawing less.
 */
export function fitBalls(points: ArrayLike<number>, centres: readonly V3[], slack = 0): Ball[] {
  const r = centres.map(() => 0)
  for (let i = 0; i < points.length; i += 3) {
    let best = 0
    let bestDistance = Infinity
    centres.forEach(([x, y, z], c) => {
      const d = Math.hypot(points[i] - x, points[i + 1] - y, points[i + 2] - z)
      if (d < bestDistance) {
        bestDistance = d
        best = c
      }
    })
    r[best] = Math.max(r[best], bestDistance)
  }
  return centres.flatMap(([x, y, z], c) => (r[c] > slack ? [{ x, y, z, r: r[c] - slack }] : []))
}

/**
 * Points over a grid's drawn triangles (split as three's SphereGeometry
 * splits them), no more than `step` apart: a capsule's middle is one long
 * band with no vertices along it, and a collider fitted to vertices alone
 * would leave it bare.
 */
export function surfacePoints(vertices: Float32Array, segments: number, rings: number, step: number): number[] {
  const out: number[] = []
  const at = (iy: number, ix: number) => (iy * (segments + 1) + ix) * 3
  const triangle = (a: number, b: number, c: number) => {
    const edge = (p: number, q: number) => Math.hypot(vertices[p] - vertices[q], vertices[p + 1] - vertices[q + 1], vertices[p + 2] - vertices[q + 2])
    const n = Math.max(1, Math.ceil(Math.max(edge(a, b), edge(b, c), edge(c, a)) / step))
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        for (let k = 0; k < 3; k++) out.push(vertices[a + k] + ((vertices[b + k] - vertices[a + k]) * i) / n + ((vertices[c + k] - vertices[a + k]) * j) / n)
      }
    }
  }
  for (let iy = 0; iy < rings; iy++) {
    for (let ix = 0; ix < segments; ix++) {
      const [a, b, c, d] = [at(iy, ix), at(iy + 1, ix), at(iy + 1, ix + 1), at(iy, ix + 1)]
      if (iy !== 0) triangle(a, b, d)
      if (iy !== rings - 1) triangle(b, c, d)
    }
  }
  return out
}

/**
 * A drawn capsule (stretched, so its ends taper) as a chain of balls along
 * its axis, `spacing` apart: each as thick as the rod is where it sits, less
 * `slack`. A row of balls stacks and settles in cannon where a thin prism
 * rocks; `spacing` keeps the dip between two balls well under the audit's
 * tolerance.
 */
function rodBalls(points: ArrayLike<number>, rod: Lumped, spacing: number, slack: number): Ball[] {
  const [ax, ay, az] = turn(0, 1, 0, rod.rotation ?? [0, 0, 0])
  const [ox, oy, oz] = rod.position.map((p) => p * PART_DRAW_SCALE)
  const half = rod.scale[1] * PART_DRAW_SCALE
  const count = Math.max(1, Math.round((2 * half) / spacing))
  const step = (2 * half) / count
  const radius = new Array<number>(count).fill(0)
  for (let i = 0; i < points.length; i += 3) {
    const [dx, dy, dz] = [points[i] - ox, points[i + 1] - oy, points[i + 2] - oz]
    const t = dx * ax + dy * ay + dz * az
    const slot = Math.min(count - 1, Math.max(0, Math.floor((t + half) / step)))
    if (Math.abs(t - (-half + step * (slot + 0.5))) > step / 4) continue
    radius[slot] = Math.max(radius[slot], Math.hypot(dx - ax * t, dy - ay * t, dz - az * t))
  }
  return radius.flatMap((r, k) => {
    const t = -half + step * (k + 0.5)
    return r - slack > 0.05 ? [{ x: ox + ax * t, y: oy + ay * t, z: oz + az * t, r: r - slack }] : []
  })
}

/** How far drawn points may lie outside a ball: well under the audit's tolerance and about a pixel on screen. */
export const BALL_SLACK = 0.08
/** Balls along a stick's bark this far apart dip about 0.2 cm between each other, where the bark is thickest. */
const STICK_SPACING = 0.8
/** A stick's balls are this much thinner than its lumpiest bark: it lies on its balls, so its lumps barely touch the table. */
const STICK_SLACK = 0.03

/** A piece's drawn surface, sampled `step` apart. */
function pieceSurface(kind: PartKind, piece: string, step: number): number[] {
  const pieces: Record<string, Lumped> = PART_PIECES[kind]
  return surfacePoints(partPieceVertices(kind, piece), pieces[piece].segments, pieces[piece].rings, step)
}

/** A shell's collider: a ring of `count` balls of radius `radius`, `at` of the way out to its rim, round one in its middle. */
const SHELL_BALLS = { count: 8, at: 0.72, radius: 0.45 } as const

/**
 * A shell as balls: stacked thin prisms rock in cannon where balls settle.
 * The middle ball is as thick as the shell's middle; the ring's balls stand
 * on the shell's lowest point. Its rim reaches past the ring by a few
 * millimetres, but only where it is thinner than that, so nothing can sink
 * into it further than the audit forgives.
 */
function shellBalls(): Ball[] {
  const v = partVertices('shell')
  let [bottom, reachX, reachZ] = [Infinity, 0, 0]
  let [middleBottom, middleTop] = [Infinity, -Infinity]
  for (let i = 0; i < v.length; i += 3) {
    bottom = Math.min(bottom, v[i + 1])
    reachX = Math.max(reachX, Math.abs(v[i]))
    reachZ = Math.max(reachZ, Math.abs(v[i + 2]))
    if (Math.hypot(v[i], v[i + 2]) < 0.3) {
      middleBottom = Math.min(middleBottom, v[i + 1])
      middleTop = Math.max(middleTop, v[i + 1])
    }
  }
  const { count, at, radius } = SHELL_BALLS
  const ring = Array.from({ length: count }, (_, k) => {
    const a = (k / count) * Math.PI * 2
    return { x: Math.cos(a) * reachX * at, y: bottom + radius, z: Math.sin(a) * reachZ * at, r: radius }
  })
  return [{ x: 0, y: (middleBottom + middleTop) / 2, z: 0, r: (middleTop - middleBottom) / 2 }, ...ring]
}

const colliders = new Map<PartKind, PartCollider>()

export function partCollider(kind: PartKind): PartCollider {
  let collider = colliders.get(kind)
  if (collider) return collider
  switch (kind) {
    case 'acorn': {
      // The prism holds the nut and cap; one small ball holds the stem where it stands above the cap.
      const prism = outlineOf(joined([partPieceVertices('acorn', 'nut'), partPieceVertices('acorn', 'cap')]), 8)
      const stem = pieceSurface('acorn', 'stem', 0.05)
      const above: number[] = []
      for (let i = 0; i < stem.length; i += 3) if (stem[i + 1] > prism.top) above.push(stem[i], stem[i + 1], stem[i + 2])
      const tip = (ACORN.stem.position[1] + ACORN.stem.scale[1]) * PART_DRAW_SCALE
      collider = { prism, balls: fitBalls(above, [[0, (prism.top + tip) / 2, 0]]) }
      break
    }
    case 'shell':
      collider = { prism: null, balls: shellBalls() }
      break
    case 'stick': {
      // Rows of balls along the bark and the side twig; twig balls buried in the bark are left out.
      const bark = rodBalls(pieceSurface('stick', 'bark', 0.05), STICK.bark, STICK_SPACING, STICK_SLACK)
      const twig = rodBalls(pieceSurface('stick', 'twig', 0.05), STICK.twig, STICK_SPACING / 2, STICK_SLACK)
      const buried = (b: Ball) => bark.some((c) => Math.hypot(b.x - c.x, b.y - c.y, b.z - c.z) + b.r <= c.r)
      collider = { prism: null, balls: [...bark, ...twig.filter((b) => !buried(b))] }
      break
    }
    case 'boulder':
      collider = { prism: outlineOf(partVertices('boulder'), 12), balls: [] }
      break
    default: {
      const unknown: never = kind
      return unknown
    }
  }
  colliders.set(kind, collider)
  return collider
}

/** Height of a resting part's origin above what it rests on: its collider's lowest reach. */
export function partRest(kind: PartKind): number {
  const { prism, balls } = partCollider(kind)
  return -Math.min(prism?.bottom ?? Infinity, ...balls.map((b) => b.y - b.r))
}

/** How tall a part stands, resting as it is spawned. */
export function partHeight(kind: PartKind): number {
  const { prism, balls } = partCollider(kind)
  return Math.max(prism?.top ?? -Infinity, ...balls.map((b) => b.y + b.r)) + partRest(kind)
}

/** How far a part reaches from its origin along its own z, either way. */
export function partDepth(kind: PartKind): number {
  const v = partVertices(kind)
  let depth = 0
  for (let i = 2; i < v.length; i += 3) depth = Math.max(depth, Math.abs(v[i]))
  return depth
}

/** How far a part reaches sideways from its origin, turned any way about the vertical. */
export function partReach(kind: PartKind): number {
  const v = partVertices(kind)
  let reach = 0
  for (let i = 0; i < v.length; i += 3) reach = Math.max(reach, Math.hypot(v[i], v[i + 2]))
  return reach
}

// --- jars and the nest ------------------------------------------------------

/**
 * A jar as modelled (drawn at JAR_SCALE): a lumped pot, a neck and a lid (unit
 * cylinders, three's CylinderGeometry(1, 1, 1), lumped by clay's `lump`), and
 * a small copy of its part pressed on the front as a label.
 */
export const JAR = {
  body: { shape: 'sphere', position: [0, 3.8, 0], scale: [3.6, 3.9, 3.6], lump: 0.18, frequency: 0.6, seed: 45, segments: 24, rings: 16 },
  neck: { y: 7.6, radius: 2.3, height: 1.2, lump: 0.08 },
  /** A knob of radius `knob` sits `height` above the lid's middle. */
  lid: { radius: 2.7, height: 0.6, lump: 0.08, knob: 0.7 },
  label: { position: [0, 4.2, 3.4], tilt: Math.PI / 2 - 0.3, scale: 0.8 },
} as const

/** How a jar's label part is turned: the stick lies a little aslant. */
export const labelTurn = (kind: PartKind): V3 => [JAR.label.tilt, 0, kind === 'stick' ? 0.4 : 0]

/** Half the height of a lumped unit cylinder of `height`, at most: its faces move up to half the lump along their normals. */
const cylinderHalf = (height: number, lump: number) => height * (0.5 + lump / 2)

/** The boulder's nest: a lumped ring of twigs round a soft bed, modelled at the jars' size. */
export const NEST = {
  ring: { tube: 0.35, radial: 9, tubular: 28, position: [0, 0.9, 0], scale: 4.6, lump: 0.3, frequency: 1.4, seed: 44 },
  bed: { shape: 'sphere', position: [0, 0.3, 0], scale: [4.4, 0.5, 4.4], lump: 0.2, frequency: 1.2, segments: 24, rings: 16 },
} as const satisfies { ring: Ring; bed: Lumped }

function extent(vertices: Float32Array): { bottom: number; top: number; reach: number } {
  let bottom = Infinity
  let top = -Infinity
  let reach = 0
  for (let i = 0; i < vertices.length; i += 3) {
    bottom = Math.min(bottom, vertices[i + 1])
    top = Math.max(top, vertices[i + 1])
    reach = Math.max(reach, Math.hypot(vertices[i], vertices[i + 2]))
  }
  return { bottom, top, reach }
}

/** A jar's pot and the nest's ring and bed, measured as modelled. */
export const jarBody = () => lumpedVertices(JAR.body)
export const nestRing = () => ringVertices(NEST.ring)
export const nestBed = () => lumpedVertices(NEST.bed)

/** How far a jar's model is raised so its lumpy pot stands on the table (negative: lowered). */
export const JAR_LIFT = -extent(jarBody()).bottom

const LID_HALF = cylinderHalf(JAR.lid.height, JAR.lid.lump)
/** Where the closed lid sits in the jar's model: on its neck. */
export const JAR_LID_CLOSED = JAR.neck.y + cylinderHalf(JAR.neck.height, JAR.neck.lump) + LID_HALF

/** How far a jar's pot reaches sideways, as modelled. */
export const JAR_REACH = extent(jarBody()).reach

/** A jar's label as a box in the jar's model (turned as the label is, XYZ), where it stands out of the pot. */
export function jarLabelBox(kind: PartKind): { center: V3; half: V3; rotation: V3 } {
  const v = partVertices(kind)
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < v.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], v[i + k])
      hi[k] = Math.max(hi[k], v[i + k])
    }
  }
  const s = JAR.label.scale / PART_DRAW_SCALE
  const rotation = labelTurn(kind)
  const [x, y, z] = turn(((lo[0] + hi[0]) / 2) * s, ((lo[1] + hi[1]) / 2) * s, ((lo[2] + hi[2]) / 2) * s, rotation)
  const p = JAR.label.position
  return { center: [x + p[0], y + p[1], z + p[2]], half: [((hi[0] - lo[0]) / 2) * s, ((hi[1] - lo[1]) / 2) * s, ((hi[2] - lo[2]) / 2) * s], rotation }
}

/** How far an empty jar's lid leans in from standing straight up. */
export const LID_LEAN = 0.2

/** How far a jar tips about x and z at the height of its wobble (view/models.tsx), pivoting where it stands. */
export const JAR_WOBBLE: V3 = [0.05, 0, 0.08]

/** Vertices of a jar as modelled, tipped by `w` (-1 to 1) of its wobble. */
function wobbled(vertices: Float32Array, w: number): Float32Array {
  const out = new Float32Array(vertices.length)
  const tilt: V3 = [JAR_WOBBLE[0] * w, JAR_WOBBLE[1] * w, JAR_WOBBLE[2] * w]
  for (let i = 0; i < vertices.length; i += 3) {
    const [x, y, z] = turn(vertices[i], vertices[i + 1] + JAR_LIFT, vertices[i + 2], tilt)
    out[i] = x
    out[i + 1] = y - JAR_LIFT
    out[i + 2] = z
  }
  return out
}

/**
 * An empty jar's lid stands on its edge on the table at the pot's +x side,
 * knob out, leaning in by LID_LEAN until it rests against the pot however
 * far the pot wobbles, in the jar's model. The jars stand a lid's width and
 * more apart, so it never reaches the next one.
 */
export function jarLidOpen(kind: PartKind): { position: V3; rotation: V3 } {
  let open = openLids.get(kind)
  if (!open) {
    open = placeOpenLid(kind)
    openLids.set(kind, open)
  }
  return open
}

const openLids = new Map<PartKind, { position: V3; rotation: V3 }>()

function placeOpenLid(kind: PartKind): { position: V3; rotation: V3 } {
  const radius = JAR.lid.radius * (1 + JAR.lid.lump / 2)
  const [cos, sin] = [Math.cos(LID_LEAN), Math.sin(LID_LEAN)]
  const y = -JAR_LIFT + radius * cos + LID_HALF * sin
  const still = joined([jarBody(), jarLabel(kind)])
  const pot = joined([-1, -0.5, 0, 0.5, 1].map((w) => wobbled(still, w)))
  const touches = (x: number) => {
    for (let i = 0; i < pot.length; i += 3) {
      const [dx, dy, dz] = [pot[i] - x, pot[i + 1] - y, pot[i + 2]]
      const across = dx * cos + dy * sin
      const up = -dx * sin + dy * cos
      if (Math.abs(across) <= LID_HALF && Math.hypot(up, dz) <= radius) return true
    }
    return false
  }
  let x = 0
  while (touches(x)) x += 0.02
  return { position: [x + 0.02, y, 0], rotation: [0, 0, LID_LEAN - Math.PI / 2] }
}

/** How far anything of a jar reaches sideways on the table, as modelled: its pot, its label, or its lid standing open beside it, knob and all. */
export function jarFootprint(kind: PartKind): number {
  const lid = jarLidOpen(kind)
  const outward = lid.position[0] + (LID_HALF + JAR.lid.height + JAR.lid.knob) * Math.cos(LID_LEAN)
  return Math.max(JAR_REACH, extent(jarLabel(kind)).reach, Math.hypot(outward, JAR.lid.radius * (1 + JAR.lid.lump / 2)))
}

/** The label part's vertices, placed on the jar's front as modelled. */
function jarLabel(kind: PartKind): Float32Array {
  const label = partVertices(kind)
  const out = new Float32Array(label.length)
  const s = JAR.label.scale / PART_DRAW_SCALE
  for (let i = 0; i < label.length; i += 3) {
    const [x, y, z] = turn(label[i] * s, label[i + 1] * s, label[i + 2] * s, labelTurn(kind))
    out[i] = x + JAR.label.position[0]
    out[i + 1] = y + JAR.label.position[1]
    out[i + 2] = z + JAR.label.position[2]
  }
  return out
}

/** How tall a closed jar stands on the table, lid and knob included, as modelled. */
export const JAR_TOP = JAR_LIFT + JAR_LID_CLOSED + JAR.lid.height + JAR.lid.knob
/** How high a jar's open mouth stands on the table, as modelled: the top of its neck. */
export const JAR_MOUTH = JAR_LIFT + JAR.neck.y + cylinderHalf(JAR.neck.height, JAR.neck.lump)

const ring = extent(nestRing())
const bed = extent(nestBed())
/** How far the nest is lifted so its lumpy ring and bed stand on the table, as modelled. */
export const NEST_LIFT = -Math.min(ring.bottom, bed.bottom)
/** The nest's ring, from its inner edge to its outer one and up to its top, and its bed's top, as modelled (lifted). */
export const NEST_SPAN = {
  inner: (() => {
    const v = nestRing()
    let inner = Infinity
    for (let i = 0; i < v.length; i += 3) inner = Math.min(inner, Math.hypot(v[i], v[i + 2]))
    return inner
  })(),
  outer: ring.reach,
  top: ring.top + NEST_LIFT,
  bed: bed.top + NEST_LIFT,
}
