// The clay parts a critter can be given, how many of each family a body
// holds, and where each part sits. Parts lay themselves out by count (one
// leg under the middle, two as a pair, six as three per side), so every
// creation looks intentional and the gait code can read the legs in order.

export const HUES = ['cobalt', 'lemon', 'pink'] as const
export type Hue = 0 | 1 | 2
export const HUE_COUNT = HUES.length

export function nextHue(hue: Hue, step = 1): Hue {
  return (((hue + step) % HUE_COUNT) + HUE_COUNT) % HUE_COUNT as Hue
}

export function isHue(value: unknown): value is Hue {
  return value === 0 || value === 1 || value === 2
}

export const PART_KINDS = ['legStub', 'legLong', 'eye', 'earRound', 'earPoint', 'earFlop', 'tailCurl', 'tailLong', 'head', 'horn'] as const
export type PartKind = (typeof PART_KINDS)[number]

export function isPartKind(value: unknown): value is PartKind {
  return (PART_KINDS as readonly unknown[]).includes(value)
}

export type Family = 'legs' | 'eyes' | 'ears' | 'tail' | 'head' | 'horns'

export const FAMILY: Record<PartKind, Family> = {
  legStub: 'legs',
  legLong: 'legs',
  eye: 'eyes',
  earRound: 'ears',
  earPoint: 'ears',
  earFlop: 'ears',
  tailCurl: 'tail',
  tailLong: 'tail',
  head: 'head',
  horn: 'horns',
}

export const CAPACITY: Record<Family, number> = { legs: 6, eyes: 3, ears: 2, tail: 1, head: 1, horns: 2 }

export type Part = { kind: PartKind; hue: Hue }

export function familyCount(parts: readonly Part[], family: Family): number {
  let count = 0
  for (const part of parts) if (FAMILY[part.kind] === family) count++
  return count
}

export function canTake(parts: readonly Part[], kind: PartKind): boolean {
  const family = FAMILY[kind]
  return familyCount(parts, family) < CAPACITY[family]
}

export function hasKind(parts: readonly Part[], kind: PartKind): boolean {
  for (const part of parts) if (part.kind === kind) return true
  return false
}

// --- body geometry (body-local: +z forward, +y up, units are bench cm) ------

export const BODY = { rx: 6, ry: 4.6, rz: 7 } as const
export const HEAD_RADIUS = 4.9
export const LEG_LENGTH: Record<'legStub' | 'legLong', number> = { legStub: 3.4, legLong: 6.6 }
/** How far a part's flared base sinks into the body it is pressed onto. */
export const SINK = 0.55

export type Vec3 = [number, number, number]

/** Where a part attaches: to the body, or to the face (the head when there is one, else the body's front). */
export type Anchor = 'body' | 'face'
export type Socket = { anchor: Anchor; dir: Vec3 }

const LEGS: readonly (readonly Vec3[])[] = [
  [],
  [[0, -1, 0.05]],
  [
    [-0.55, -0.85, 0.05],
    [0.55, -0.85, 0.05],
  ],
  [
    [-0.55, -0.8, 0.4],
    [0.55, -0.8, 0.4],
    [0, -0.85, -0.55],
  ],
  [
    [-0.52, -0.8, 0.46],
    [0.52, -0.8, 0.46],
    [-0.52, -0.8, -0.46],
    [0.52, -0.8, -0.46],
  ],
  [
    [-0.52, -0.8, 0.5],
    [0.52, -0.8, 0.5],
    [-0.55, -0.82, -0.2],
    [0.55, -0.82, -0.2],
    [0, -0.86, -0.62],
  ],
  [
    [-0.52, -0.8, 0.55],
    [0.52, -0.8, 0.55],
    [-0.56, -0.82, 0],
    [0.56, -0.82, 0],
    [-0.52, -0.8, -0.55],
    [0.52, -0.8, -0.55],
  ],
]

const EYES: readonly (readonly Vec3[])[] = [
  [],
  [[0, 0.36, 1]],
  [
    [-0.4, 0.34, 0.86],
    [0.4, 0.34, 0.86],
  ],
  [
    [-0.46, 0.22, 0.86],
    [0.46, 0.22, 0.86],
    [0, 0.66, 0.76],
  ],
]

const EARS: readonly (readonly Vec3[])[] = [
  [],
  [[-0.6, 0.74, -0.08]],
  [
    [-0.6, 0.74, -0.08],
    [0.6, 0.74, -0.08],
  ],
]

const HORNS: readonly (readonly Vec3[])[] = [
  [],
  [[0, 1, 0.18]],
  [
    [-0.34, 0.92, 0.2],
    [0.34, 0.92, 0.2],
  ],
]

export const TAIL_DIR: Vec3 = [0, 0.28, -1]
export const HEAD_DIR: Vec3 = [0, 0.6, 0.8]
export const NOSE_DIR: Vec3 = [0, -0.04, 1]
/** Painted sleepy eyes and mouth, used when the critter has no eye parts. */
export const MARK_EYES: readonly Vec3[] = EYES[2]
export const MOUTH_DIR: Vec3 = [0, -0.36, 0.94]

const LAYOUT: Record<Exclude<Family, 'tail' | 'head'>, { anchor: Anchor; table: readonly (readonly Vec3[])[] }> = {
  legs: { anchor: 'body', table: LEGS },
  eyes: { anchor: 'face', table: EYES },
  ears: { anchor: 'face', table: EARS },
  horns: { anchor: 'face', table: HORNS },
}

/** The socket of `parts[index]`, laid out by its place among its family. Pass `out` to reuse a socket object. */
export function socketFor(parts: readonly Part[], index: number, out: Socket = { anchor: 'body', dir: TAIL_DIR }): Socket {
  return socketOf(parts, index, parts[index].kind, out)
}

/** Like socketFor, for a part of `kind` at `index` whether or not it is in `parts` yet (so a dragged part can preview its place). */
export function socketOf(parts: readonly Part[], index: number, kind: PartKind, out: Socket): Socket {
  const family = FAMILY[kind]
  if (family === 'tail' || family === 'head') {
    out.anchor = 'body'
    out.dir = family === 'tail' ? TAIL_DIR : HEAD_DIR
    return out
  }
  const appended = index >= parts.length
  let order = 0
  let count = appended ? 1 : 0
  for (let i = 0; i < parts.length; i++) {
    if (FAMILY[parts[i].kind] !== family) continue
    if (appended || i < index) order++
    count++
  }
  const { anchor, table } = LAYOUT[family]
  const row = table[Math.min(count, table.length - 1)]
  out.anchor = anchor
  out.dir = row[Math.min(order, row.length - 1)]
  return out
}

/** The socket a new part of `kind` would take (for the glowing attach point while dragging), or null when the family is full. */
export function nextSocket(parts: readonly Part[], kind: PartKind, out: Socket = { anchor: 'body', dir: TAIL_DIR }): Socket | null {
  if (!canTake(parts, kind)) return null
  return socketOf(parts, parts.length, kind, out)
}

/** Legs in attach order: their kinds decide the gait, their count picks the routine. */
export function legsOf(parts: readonly Part[]): ('legStub' | 'legLong')[] {
  const legs: ('legStub' | 'legLong')[] = []
  for (const part of parts) if (part.kind === 'legStub' || part.kind === 'legLong') legs.push(part.kind)
  return legs
}

/** Height of the body centre above the bench: resting on its belly with no legs, raised by the average leg otherwise. */
export function bodyLift(parts: readonly Part[]): number {
  const legs = legsOf(parts)
  if (legs.length === 0) return BODY.ry * 0.9
  let total = 0
  for (const leg of legs) total += LEG_LENGTH[leg]
  return BODY.ry * 0.82 + total / legs.length - SINK
}

/** A point on an axis-aligned ellipsoid's surface along `dir` from its centre, and the surface normal there. */
export function ellipsoidPoint(dir: Vec3, rx: number, ry: number, rz: number, out: { p: Vec3; n: Vec3 }): { p: Vec3; n: Vec3 } {
  const [dx, dy, dz] = dir
  const k = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2)
  const px = dx * k
  const py = dy * k
  const pz = dz * k
  const nx = px / (rx * rx)
  const ny = py / (ry * ry)
  const nz = pz / (rz * rz)
  const nl = Math.hypot(nx, ny, nz)
  out.p[0] = px
  out.p[1] = py
  out.p[2] = pz
  out.n[0] = nx / nl
  out.n[1] = ny / nl
  out.n[2] = nz / nl
  return out
}

/** Top-of-face parts lean forward on a headless body, so ears and horns sit near the front. */
export const FACE_TILT = 0.55

export function tiltForward(dir: Vec3, out: Vec3): Vec3 {
  const c = Math.cos(FACE_TILT)
  const s = Math.sin(FACE_TILT)
  const y = dir[1]
  const z = dir[2]
  out[0] = dir[0]
  out[1] = y * c - z * s
  out[2] = y * s + z * c
  return out
}
