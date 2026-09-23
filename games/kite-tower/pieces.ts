// The wooden set (KTD2). Every piece kind is a few convex 2D parts around
// its centre of mass plus a depth. Physics extrudes the parts, the climb
// planner reads their top edges, and the view extrudes the outline with a
// bevel, so what the child sees, what falls, and what the doll climbs are
// one shape. One unit is the edge of a cube block.

export type Vec2 = { x: number; y: number }
export type Pose = { x: number; y: number; angle: number }

export type PieceKind = 'archL' | 'archM' | 'cube' | 'pillar' | 'half' | 'plank'

export type PieceShape = {
  kind: PieceKind
  /** Convex parts, counter-clockwise, centred on the centre of mass. */
  parts: Vec2[][]
  /** The whole silhouette for the mesh (may be concave), same frame as `parts`. */
  outline: Vec2[]
  depth: number
  mass: number
  /** Which local axis the wood grain runs along. */
  grain: 'x' | 'y'
  /** Half extents of the unrotated shape, for hit tests. */
  half: Vec2
}

export type PieceSpec = { id: number; kind: PieceKind; stain: string }

/** The play plane runs between these x limits; the rug floor is y = 0. */
export const PLAY_MIN_X = -7.4
export const PLAY_MAX_X = 7.4

function arc(cx: number, cy: number, r: number, from: number, to: number, steps: number): Vec2[] {
  const points: Vec2[] = []
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return points
}

function area(poly: readonly Vec2[]): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

function centroid(poly: readonly Vec2[]): Vec2 {
  let cx = 0
  let cy = 0
  const a = area(poly)
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

function shape(kind: PieceKind, parts: Vec2[][], outline: Vec2[], depth: number, density: number, grain: 'x' | 'y'): PieceShape {
  let total = 0
  let mx = 0
  let my = 0
  for (const part of parts) {
    const a = area(part)
    const c = centroid(part)
    total += a
    mx += c.x * a
    my += c.y * a
  }
  const com = { x: mx / total, y: my / total }
  const shift = (p: Vec2): Vec2 => ({ x: p.x - com.x, y: p.y - com.y })
  const shiftedOutline = outline.map(shift)
  let hx = 0
  let hy = 0
  for (const p of shiftedOutline) {
    hx = Math.max(hx, Math.abs(p.x))
    hy = Math.max(hy, Math.abs(p.y))
  }
  return { kind, parts: parts.map((part) => part.map(shift)), outline: shiftedOutline, depth, mass: total * depth * density, grain, half: { x: hx, y: hy } }
}

function box(w: number, h: number): Vec2[] {
  return [
    { x: -w / 2, y: 0 },
    { x: w / 2, y: 0 },
    { x: w / 2, y: h },
    { x: -w / 2, y: h },
  ]
}

function archShape(kind: PieceKind, outer: number, inner: number, depth: number): PieceShape {
  const segments = 6
  const parts: Vec2[][] = []
  for (let i = 0; i < segments; i++) {
    const a0 = (Math.PI * i) / segments
    const a1 = (Math.PI * (i + 1)) / segments
    parts.push([
      { x: Math.cos(a0) * outer, y: Math.sin(a0) * outer },
      { x: Math.cos(a1) * outer, y: Math.sin(a1) * outer },
      { x: Math.cos(a1) * inner, y: Math.sin(a1) * inner },
      { x: Math.cos(a0) * inner, y: Math.sin(a0) * inner },
    ])
  }
  const outline = [...arc(0, 0, outer, 0, Math.PI, 36), ...arc(0, 0, inner, Math.PI, 0, 28)]
  return shape(kind, parts, outline, depth, 1, 'x')
}

function halfMoon(radius: number, depth: number): PieceShape {
  const dome = arc(0, 0, radius, 0, Math.PI, 12)
  return shape('half', [dome], arc(0, 0, radius, 0, Math.PI, 36), depth, 1, 'x')
}

export const SHAPES: Record<PieceKind, PieceShape> = {
  archL: archShape('archL', 1.6, 0.95, 0.8),
  archM: archShape('archM', 1.15, 0.55, 0.8),
  cube: shape('cube', [box(1, 1)], box(1, 1), 1, 1, 'y'),
  pillar: shape('pillar', [box(0.8, 1.9)], box(0.8, 1.9), 0.9, 1, 'y'),
  half: halfMoon(1, 0.8),
  plank: shape('plank', [box(3.4, 0.32)], box(3.4, 0.32), 0.9, 1, 'x'),
}

/** The whole set in the tray, in the order it lies there (left to right). Stains are Grimm's-like watercolour hues. */
export const PIECES: readonly PieceSpec[] = [
  { id: 0, kind: 'cube', stain: '#f4c73c' },
  { id: 1, kind: 'cube', stain: '#6cb35a' },
  { id: 2, kind: 'archL', stain: '#e05444' },
  { id: 3, kind: 'cube', stain: '#5c9bd8' },
  { id: 4, kind: 'plank', stain: '#f3e0bd' },
  { id: 5, kind: 'half', stain: '#ec8aab' },
  { id: 6, kind: 'pillar', stain: '#9272c6' },
  { id: 7, kind: 'archM', stain: '#f29440' },
  { id: 8, kind: 'cube', stain: '#3fb0a6' },
  { id: 9, kind: 'half', stain: '#a8d468' },
  { id: 10, kind: 'pillar', stain: '#4d82cc' },
  { id: 11, kind: 'plank', stain: '#e9bf6c' },
]

export function pieceShape(id: number): PieceShape {
  return SHAPES[PIECES[id].kind]
}

/** Transform local points by a pose into `out` (reused to avoid allocation when the caller keeps it). */
export function transformInto(points: readonly Vec2[], pose: Pose, out: Vec2[]): Vec2[] {
  const c = Math.cos(pose.angle)
  const s = Math.sin(pose.angle)
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const target = out[i] ?? (out[i] = { x: 0, y: 0 })
    target.x = pose.x + p.x * c - p.y * s
    target.y = pose.y + p.x * s + p.y * c
  }
  out.length = points.length
  return out
}

export function worldParts(shapeOf: PieceShape, pose: Pose): Vec2[][] {
  return shapeOf.parts.map((part) => transformInto(part, pose, []))
}

const spanOut: [number, number] = [0, 0]

/**
 * The vertical span of a convex polygon along the line x = `at`, or null when
 * the line misses it. The returned pair is reused: read it before the next call.
 */
export function spanAt(poly: readonly Vec2[], at: number): [number, number] | null {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    if (at < minX - 1e-9 || at > maxX + 1e-9) continue
    if (Math.abs(b.x - a.x) < 1e-9) {
      lo = Math.min(lo, a.y, b.y)
      hi = Math.max(hi, a.y, b.y)
    } else {
      const t = (at - a.x) / (b.x - a.x)
      const y = a.y + (b.y - a.y) * t
      lo = Math.min(lo, y)
      hi = Math.max(hi, y)
    }
  }
  if (lo > hi) return null
  spanOut[0] = lo
  spanOut[1] = hi
  return spanOut
}

export function pointInConvex(poly: readonly Vec2[], p: Vec2): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) < -1e-9) return false
  }
  return true
}

export type Placed = { id: number; parts: Vec2[][] }

/** The highest solid point at x among placed pieces (the floor is 0). */
export function skylineAt(placed: readonly Placed[], at: number): number {
  let top = 0
  for (const piece of placed) {
    for (const part of piece.parts) {
      const span = spanAt(part, at)
      if (span && span[1] > top) top = span[1]
    }
  }
  return top
}

const LIFT_SAMPLES = 9
const HOVER_GAP = 0.06

/**
 * Where a held piece may hover (KTD5): the lowest centre height at which its
 * underside clears everything beneath it. The held piece is never allowed
 * below that, so a release can never start inside another piece.
 */
const liftScratch: Vec2[][] = []
const liftPose: Pose = { x: 0, y: 0, angle: 0 }

export function restHeight(shapeOf: PieceShape, angle: number, x: number, others: readonly Placed[]): number {
  liftPose.x = x
  liftPose.angle = angle
  const parts = shapeOf.parts
  let minX = Infinity
  let maxX = -Infinity
  let lowest = Infinity
  for (let k = 0; k < parts.length; k++) {
    const world = transformInto(parts[k], liftPose, liftScratch[k] ?? (liftScratch[k] = []))
    for (const p of world) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < lowest) lowest = p.y
    }
  }
  let need = -lowest
  for (let i = 0; i < LIFT_SAMPLES; i++) {
    const at = minX + ((maxX - minX) * (i + 0.5)) / LIFT_SAMPLES
    let bottom = Infinity
    for (let k = 0; k < parts.length; k++) {
      const span = spanAt(liftScratch[k], at)
      if (span && span[0] < bottom) bottom = span[0]
    }
    if (bottom === Infinity) continue
    const clear = skylineAt(others, at) - bottom
    if (clear > need) need = clear
  }
  return need + HOVER_GAP
}

/** Snap an angle to the nearest quarter turn. */
export function quarter(angle: number): number {
  return Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
}

export function clampX(x: number, halfWidth: number): number {
  return Math.min(PLAY_MAX_X - halfWidth, Math.max(PLAY_MIN_X + halfWidth, x))
}
