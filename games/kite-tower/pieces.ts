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

/**
 * The rim's parts lie along lines tangent to the drawn curve (the mesh
 * rounds it in 36 steps): chords would sit inside it, and a block resting on
 * the rim would sink into the wood by their sag. The tangent at the top is
 * flat, so a plank laid across still rests on the crown; the inner chords
 * stay inside the opening.
 */
const ARCH_SEGMENTS = 6

function archShape(kind: PieceKind, outer: number, inner: number, depth: number): PieceShape {
  const cuts = [0]
  for (let i = 0; i < ARCH_SEGMENTS; i++) cuts.push((Math.PI * (i + 0.5)) / ARCH_SEGMENTS)
  cuts.push(Math.PI)
  const corner = outer / Math.cos(Math.PI / (2 * ARCH_SEGMENTS))
  const rim = (k: number) => (k === 0 || k === cuts.length - 1 ? outer : corner)
  const parts: Vec2[][] = []
  for (let k = 0; k + 1 < cuts.length; k++) {
    const a0 = cuts[k]
    const a1 = cuts[k + 1]
    parts.push([
      { x: Math.cos(a0) * rim(k), y: Math.sin(a0) * rim(k) },
      { x: Math.cos(a1) * rim(k + 1), y: Math.sin(a1) * rim(k + 1) },
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

const HOVER_GAP = 0.06
/**
 * Columns are taken this share of the piece's width inside its ends (at most
 * `LIFT_EDGE_MAX`), so a neighbour it is set down against does not lift it
 * onto its corner: blocks settle a little off where they were put, and a
 * finger is not that precise. `slideClear` moves it off that sliver before it
 * falls.
 */
const LIFT_EDGE_SHARE = 0.06
const LIFT_EDGE_MAX = 0.15
/** How far `slideClear` leaves a piece from the neighbour it slides off. */
const SIDE_GAP = 0.004

/** A held piece is drawn this much larger, lifted toward the child. */
export const HELD_SCALE = 1.035
/** A piece leaving the tray pops in over this long, overshooting its size a little on the way. */
export const POP_SECONDS = 0.38

function easeOutBack(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  const c = 1.9
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2)
}

/** How large a piece is drawn `age` seconds after it left the tray. */
export function popScale(age: number): number {
  return age < POP_SECONDS ? 0.78 + 0.22 * easeOutBack(age / POP_SECONDS) : 1
}

/**
 * Where a held piece may hover (KTD5): the lowest centre height at which its
 * underside clears everything beneath it. The held piece is never allowed
 * below that, so a release can never start inside another piece. The gap
 * between two convex outlines is narrowest under a corner of one of them, so
 * every corner of the piece and of whatever lies under it is a column to
 * check, and no corner can slip between samples. A piece drawn `scale` times
 * its size reaches that much further down; sideways its sliver of extra
 * width may hang over a neighbour it stands beside, or no two pieces could be
 * set down edge to edge.
 */
const liftScratch: Vec2[][] = []
const liftNear: Vec2[][] = []
const liftColumns: number[] = []
let liftParts = 0

/**
 * How far the last `restHeight` found a neighbour's side reaching into each
 * end of the piece, in the sliver it ignores (0 where clear), and the height
 * it would hover at if it could not slide off (riding over those corners).
 */
export const restSliver = { left: 0, right: 0, over: 0 }

/** How far the neighbours rise above the piece's underside at column `at`, or -Infinity where the piece has no underside. */
function columnGap(at: number): number {
  let bottom = Infinity
  for (let k = 0; k < liftParts; k++) {
    const span = spanAt(liftScratch[k], at)
    if (span && span[0] < bottom) bottom = span[0]
  }
  if (bottom === Infinity) return -Infinity
  let top = 0
  for (let k = 0; k < liftNear.length; k++) {
    const span = spanAt(liftNear[k], at)
    if (span && span[1] > top) top = span[1]
  }
  return top - bottom
}

export function restHeight(shapeOf: PieceShape, angle: number, x: number, others: readonly Placed[], scale = 1): number {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const parts = shapeOf.parts
  const columns = liftColumns
  columns.length = 0
  let minX = Infinity
  let maxX = -Infinity
  let lowest = Infinity
  for (let k = 0; k < parts.length; k++) {
    const part = parts[k]
    const world = liftScratch[k] ?? (liftScratch[k] = [])
    for (let i = 0; i < part.length; i++) {
      const p = part[i]
      const w = world[i] ?? (world[i] = { x: 0, y: 0 })
      w.x = x + p.x * c - p.y * s
      w.y = (p.x * s + p.y * c) * scale
      if (w.x < minX) minX = w.x
      if (w.x > maxX) maxX = w.x
      if (w.y < lowest) lowest = w.y
      columns.push(w.x)
    }
    world.length = part.length
  }
  liftParts = parts.length
  const near = liftNear
  near.length = 0
  for (const piece of others) {
    for (const part of piece.parts) {
      let lo = Infinity
      let hi = -Infinity
      for (const q of part) {
        if (q.x < lo) lo = q.x
        if (q.x > hi) hi = q.x
      }
      if (hi < minX || lo > maxX) continue
      near.push(part)
      for (const q of part) if (q.x > minX && q.x < maxX) columns.push(q.x)
    }
  }
  const edge = Math.min(LIFT_EDGE_MAX, (maxX - minX) * LIFT_EDGE_SHARE)
  let need = -lowest
  for (let i = 0; i < columns.length; i++) {
    const gap = columnGap(Math.min(maxX - edge, Math.max(minX + edge, columns[i])))
    if (gap > need) need = gap
  }
  let left = 0
  let right = 0
  let poke = need
  for (let i = 0; i < columns.length; i++) {
    const at = Math.min(maxX - 1e-6, Math.max(minX + 1e-6, columns[i]))
    const inLeft = at < minX + edge
    if (!inLeft && at <= maxX - edge) continue
    const gap = columnGap(at)
    if (gap <= need + 1e-4) continue
    poke = Math.max(poke, gap)
    if (inLeft) left = Math.max(left, at - minX)
    else right = Math.max(right, maxX - at)
  }
  if (left > 0 && right > 0) {
    // Caught at both ends: it is wider than the gap, so it rides over.
    need = poke
    left = right = 0
  }
  restSliver.left = left
  restSliver.right = right
  restSliver.over = poke + HOVER_GAP
  return need + HOVER_GAP
}

/**
 * Where piece `shapeOf`, turned `angle`, should come down near `x`: a sliver
 * over a neighbour's side it would fall onto that neighbour's corner and be
 * kicked into a spin, so it is slid that sliver clear to sit flush beside it.
 * It stays at `x` when it is clear, or when sliding off one neighbour would
 * put it onto another.
 */
export function slideClear(shapeOf: PieceShape, angle: number, x: number, others: readonly Placed[], scale = 1): number {
  let at = x
  let side = 0
  for (let pass = 0; pass < 3; pass++) {
    restHeight(shapeOf, angle, at, others, scale)
    const push = restSliver.left > 0 ? 1 : restSliver.right > 0 ? -1 : 0
    if (push === 0) return at
    if (side !== 0 && push !== side) return x
    side = push
    at += push * ((push > 0 ? restSliver.left : restSliver.right) + SIDE_GAP)
  }
  restHeight(shapeOf, angle, at, others, scale)
  return restSliver.left > 0 || restSliver.right > 0 ? x : at
}

/** Snap an angle to the nearest quarter turn. */
export function quarter(angle: number): number {
  return Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
}

export function clampX(x: number, halfWidth: number): number {
  return Math.min(PLAY_MAX_X - halfWidth, Math.max(PLAY_MIN_X + halfWidth, x))
}
