// Light on the table plane, traced in 2D (units are centimetres on the
// panel; +y points toward the child). Light is an RGB bitmask, so colour
// mixing is exact: red + green reaching the same place is yellow, all three
// is white. Mirrors reflect on both faces, filters keep only their colour,
// the prism refracts each primary with its own index (red bends least,
// blue most) and reflects internally when Snell's law says it must.
// Creatures, lamp bodies, and the panel edge swallow light.
//
// The tracer writes into a reusable buffer so the frame loop allocates
// nothing; tests read the same buffer.

export const RED = 1
export const GREEN = 2
export const BLUE = 4
export const WHITE = RED | GREEN | BLUE
export type Mask = number
export const PRIMARIES = [RED, GREEN, BLUE] as const

/** Refractive index per primary. Exaggerated dispersion so the fan is visible on a table. */
export const PRISM_INDEX: Readonly<Record<number, number>> = { [RED]: 1.38, [GREEN]: 1.5, [BLUE]: 1.64 }

export const MAX_SEGMENTS = 96
export const MAX_INTERACTIONS = 24
const MAX_MIRRORS = 8
const MAX_FILTERS = 8
const MAX_PRISMS = 4
const MAX_CIRCLES = 16
const MAX_STACK = 48
const EPS = 1e-4

export type Source = { x: number; y: number; angle: number; mask: Mask }
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

/** The optical elements on the table this frame. Fixed capacity; `clear()` and re-add each trace. */
export class OpticsScene {
  // Segments (mirrors and filters): endpoints, mask for filters.
  mirrorCount = 0
  readonly mirrors = new Float64Array(MAX_MIRRORS * 4)
  filterCount = 0
  readonly filters = new Float64Array(MAX_FILTERS * 4)
  readonly filterMasks = new Uint8Array(MAX_FILTERS)
  /** Owner id per filter, so a view can light the pane a beam dies in. */
  readonly filterOwners = new Int16Array(MAX_FILTERS)
  prismCount = 0
  /** Three vertices per prism, counter-clockwise. */
  readonly prisms = new Float64Array(MAX_PRISMS * 6)
  readonly prismOwners = new Int16Array(MAX_PRISMS)
  circleCount = 0
  readonly circles = new Float64Array(MAX_CIRCLES * 3)
  /** Creature index per circle, or -1 for a plain absorber (a lamp body). */
  readonly circleTargets = new Int16Array(MAX_CIRCLES)
  bounds: Bounds = { minX: -60, minY: -34, maxX: 60, maxY: 34 }

  clear(): void {
    this.mirrorCount = 0
    this.filterCount = 0
    this.prismCount = 0
    this.circleCount = 0
  }

  addMirror(x: number, y: number, angle: number, half: number): void {
    if (this.mirrorCount >= MAX_MIRRORS) return
    const c = Math.cos(angle) * half
    const s = Math.sin(angle) * half
    const o = this.mirrorCount * 4
    this.mirrors[o] = x - c
    this.mirrors[o + 1] = y - s
    this.mirrors[o + 2] = x + c
    this.mirrors[o + 3] = y + s
    this.mirrorCount++
  }

  addFilter(x: number, y: number, angle: number, half: number, mask: Mask, owner = -1): void {
    if (this.filterCount >= MAX_FILTERS) return
    const c = Math.cos(angle) * half
    const s = Math.sin(angle) * half
    const i = this.filterCount
    this.filters[i * 4] = x - c
    this.filters[i * 4 + 1] = y - s
    this.filters[i * 4 + 2] = x + c
    this.filters[i * 4 + 3] = y + s
    this.filterMasks[i] = mask & WHITE
    this.filterOwners[i] = owner
    this.filterCount++
  }

  /** An equilateral prism; `angle` points at its first vertex, `radius` is the circumradius. */
  addPrism(x: number, y: number, angle: number, radius: number, owner = -1): void {
    if (this.prismCount >= MAX_PRISMS) return
    const i = this.prismCount
    for (let k = 0; k < 3; k++) {
      const a = angle + (k * 2 * Math.PI) / 3
      this.prisms[i * 6 + k * 2] = x + Math.cos(a) * radius
      this.prisms[i * 6 + k * 2 + 1] = y + Math.sin(a) * radius
    }
    this.prismOwners[i] = owner
    this.prismCount++
  }

  addCircle(x: number, y: number, r: number, target: number): void {
    if (this.circleCount >= MAX_CIRCLES) return
    const i = this.circleCount
    this.circles[i * 3] = x
    this.circles[i * 3 + 1] = y
    this.circles[i * 3 + 2] = r
    this.circleTargets[i] = target
    this.circleCount++
  }
}

export const END_BOUNDS = 0
export const END_CIRCLE = 1
export const END_FILTER = 2
export const END_CAP = 3

/** Everything one trace produced. Reused frame to frame. */
export class BeamBuffer {
  count = 0
  readonly ax = new Float32Array(MAX_SEGMENTS)
  readonly ay = new Float32Array(MAX_SEGMENTS)
  readonly bx = new Float32Array(MAX_SEGMENTS)
  readonly by = new Float32Array(MAX_SEGMENTS)
  readonly mask = new Uint8Array(MAX_SEGMENTS)
  /** 1 when the segment runs inside prism glass. */
  readonly inside = new Uint8Array(MAX_SEGMENTS)
  /** Where each beam ended, for splashes: one entry per terminated ray. */
  endCount = 0
  readonly endX = new Float32Array(MAX_SEGMENTS)
  readonly endY = new Float32Array(MAX_SEGMENTS)
  readonly endMask = new Uint8Array(MAX_SEGMENTS)
  readonly endKind = new Uint8Array(MAX_SEGMENTS)
  /** Light swallowed by each creature circle this frame (index = circle target). */
  readonly creatureLight = new Uint8Array(8)
  /** Light that passed through each prism owner (for its caustic). */
  readonly prismLit = new Uint8Array(8)
  /** Light that reached each filter owner (for its glow), before filtering. */
  readonly filterLit = new Uint8Array(16)

  reset(): void {
    this.count = 0
    this.endCount = 0
    this.creatureLight.fill(0)
    this.prismLit.fill(0)
    this.filterLit.fill(0)
  }
}

// --- ray stack (module scratch; the tracer is single-threaded) --------------

const stack = {
  n: 0,
  ox: new Float64Array(MAX_STACK),
  oy: new Float64Array(MAX_STACK),
  dx: new Float64Array(MAX_STACK),
  dy: new Float64Array(MAX_STACK),
  mask: new Uint8Array(MAX_STACK),
  /** Prism index the ray is inside, or -1. */
  glass: new Int8Array(MAX_STACK),
  depth: new Uint8Array(MAX_STACK),
}

function push(ox: number, oy: number, dx: number, dy: number, mask: number, glass: number, depth: number): void {
  if (stack.n >= MAX_STACK) return
  const i = stack.n++
  stack.ox[i] = ox
  stack.oy[i] = oy
  stack.dx[i] = dx
  stack.dy[i] = dy
  stack.mask[i] = mask
  stack.glass[i] = glass
  stack.depth[i] = depth
}

/** Distance along the ray to segment AB, or Infinity. */
function raySegment(ox: number, oy: number, dx: number, dy: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax
  const ey = by - ay
  const denom = dx * ey - dy * ex
  if (Math.abs(denom) < 1e-12) return Infinity
  const wx = ax - ox
  const wy = ay - oy
  const t = (wx * ey - wy * ex) / denom
  const u = (wx * dy - wy * dx) / denom
  if (t <= EPS || u < 0 || u > 1) return Infinity
  return t
}

function rayCircle(ox: number, oy: number, dx: number, dy: number, cx: number, cy: number, r: number): number {
  const fx = ox - cx
  const fy = oy - cy
  const b = fx * dx + fy * dy
  const c = fx * fx + fy * fy - r * r
  const disc = b * b - c
  if (disc < 0) return Infinity
  const root = Math.sqrt(disc)
  const t0 = -b - root
  if (t0 > EPS) return t0
  const t1 = -b + root
  // Starting inside a creature: it swallows the light right away.
  if (c < 0 && t1 > EPS) return EPS * 2
  return Infinity
}

function rayBounds(ox: number, oy: number, dx: number, dy: number, b: Bounds): number {
  let t = Infinity
  if (dx > 1e-12) t = Math.min(t, (b.maxX - ox) / dx)
  else if (dx < -1e-12) t = Math.min(t, (b.minX - ox) / dx)
  if (dy > 1e-12) t = Math.min(t, (b.maxY - oy) / dy)
  else if (dy < -1e-12) t = Math.min(t, (b.minY - oy) / dy)
  return Math.max(0, t)
}

function emit(out: BeamBuffer, ax: number, ay: number, bx: number, by: number, mask: number, inside: boolean): boolean {
  if (out.count >= MAX_SEGMENTS) return false
  const i = out.count++
  out.ax[i] = ax
  out.ay[i] = ay
  out.bx[i] = bx
  out.by[i] = by
  out.mask[i] = mask
  out.inside[i] = inside ? 1 : 0
  return true
}

function end(out: BeamBuffer, x: number, y: number, mask: number, kind: number): void {
  if (out.endCount >= MAX_SEGMENTS) return
  const i = out.endCount++
  out.endX[i] = x
  out.endY[i] = y
  out.endMask[i] = mask
  out.endKind[i] = kind
}

// Refraction result scratch: direction, or TIR.
const bent = { x: 0, y: 0, tir: false }

/**
 * Bend unit direction (dx, dy) crossing a surface with unit normal (nx, ny)
 * pointing back toward the incoming side, from index n1 into n2.
 */
export function refract(dx: number, dy: number, nx: number, ny: number, n1: number, n2: number, result = bent): typeof bent {
  const cosI = -(dx * nx + dy * ny)
  const eta = n1 / n2
  const k = 1 - eta * eta * (1 - cosI * cosI)
  if (k < 0) {
    result.tir = true
    result.x = dx + 2 * cosI * nx
    result.y = dy + 2 * cosI * ny
    return result
  }
  const f = eta * cosI - Math.sqrt(k)
  result.tir = false
  result.x = eta * dx + f * nx
  result.y = eta * dy + f * ny
  const len = Math.hypot(result.x, result.y)
  result.x /= len
  result.y /= len
  return result
}

/** Trace every source through the scene into `out` (reset first). */
export function trace(scene: OpticsScene, sources: readonly Source[], out: BeamBuffer, sourceCount = sources.length): void {
  out.reset()
  stack.n = 0
  for (let s = Math.min(sourceCount, sources.length) - 1; s >= 0; s--) {
    const src = sources[s]
    push(src.x, src.y, Math.cos(src.angle), Math.sin(src.angle), src.mask & WHITE, -1, 0)
  }
  while (stack.n > 0) {
    const i = --stack.n
    const ox = stack.ox[i]
    const oy = stack.oy[i]
    const dx = stack.dx[i]
    const dy = stack.dy[i]
    const mask = stack.mask[i]
    const glass = stack.glass[i]
    const depth = stack.depth[i]
    if (mask === 0) continue
    if (depth >= MAX_INTERACTIONS) {
      end(out, ox, oy, mask, END_CAP)
      continue
    }
    if (glass >= 0) {
      traceInside(scene, out, ox, oy, dx, dy, mask, glass, depth)
      continue
    }

    let best = rayBounds(ox, oy, dx, dy, scene.bounds)
    let kind = END_BOUNDS
    let index = -1
    let edge = -1
    for (let m = 0; m < scene.mirrorCount; m++) {
      const o = m * 4
      const t = raySegment(ox, oy, dx, dy, scene.mirrors[o], scene.mirrors[o + 1], scene.mirrors[o + 2], scene.mirrors[o + 3])
      if (t < best) {
        best = t
        kind = 10
        index = m
      }
    }
    for (let f = 0; f < scene.filterCount; f++) {
      const o = f * 4
      const t = raySegment(ox, oy, dx, dy, scene.filters[o], scene.filters[o + 1], scene.filters[o + 2], scene.filters[o + 3])
      if (t < best) {
        best = t
        kind = 11
        index = f
      }
    }
    for (let p = 0; p < scene.prismCount; p++) {
      for (let k = 0; k < 3; k++) {
        const o = p * 6
        const a = k * 2
        const b = ((k + 1) % 3) * 2
        const t = raySegment(ox, oy, dx, dy, scene.prisms[o + a], scene.prisms[o + a + 1], scene.prisms[o + b], scene.prisms[o + b + 1])
        if (t < best) {
          best = t
          kind = 12
          index = p
          edge = k
        }
      }
    }
    for (let c = 0; c < scene.circleCount; c++) {
      const o = c * 3
      const t = rayCircle(ox, oy, dx, dy, scene.circles[o], scene.circles[o + 1], scene.circles[o + 2])
      if (t < best) {
        best = t
        kind = 13
        index = c
      }
    }

    const hx = ox + dx * best
    const hy = oy + dy * best
    if (!emit(out, ox, oy, hx, hy, mask, false)) return
    switch (kind) {
      case 10: {
        const o = index * 4
        const ex = scene.mirrors[o + 2] - scene.mirrors[o]
        const ey = scene.mirrors[o + 3] - scene.mirrors[o + 1]
        const len = Math.hypot(ex, ey)
        const nx = -ey / len
        const ny = ex / len
        const dot = dx * nx + dy * ny
        push(hx, hy, dx - 2 * dot * nx, dy - 2 * dot * ny, mask, -1, depth + 1)
        break
      }
      case 11: {
        const owner = scene.filterOwners[index]
        if (owner >= 0 && owner < out.filterLit.length) out.filterLit[owner] |= mask
        const kept = mask & scene.filterMasks[index]
        if (kept) push(hx + dx * EPS, hy + dy * EPS, dx, dy, kept, -1, depth + 1)
        else end(out, hx, hy, mask, END_FILTER)
        break
      }
      case 12: {
        const owner = scene.prismOwners[index]
        if (owner >= 0 && owner < out.prismLit.length) out.prismLit[owner] |= mask
        const o = index * 6
        const a = edge * 2
        const b = ((edge + 1) % 3) * 2
        // Counter-clockwise vertices: the outward normal of edge AB is (ey, -ex).
        const ex = scene.prisms[o + b] - scene.prisms[o + a]
        const ey = scene.prisms[o + b + 1] - scene.prisms[o + a + 1]
        const len = Math.hypot(ex, ey)
        const nx = ey / len
        const ny = -ex / len
        for (let c = 0; c < PRIMARIES.length; c++) {
          const primary = PRIMARIES[c]
          if (!(mask & primary)) continue
          const r = refract(dx, dy, nx, ny, 1, PRISM_INDEX[primary])
          push(hx + r.x * EPS, hy + r.y * EPS, r.x, r.y, primary, index, depth + 1)
        }
        break
      }
      case 13: {
        const target = scene.circleTargets[index]
        if (target >= 0 && target < out.creatureLight.length) out.creatureLight[target] |= mask
        end(out, hx, hy, mask, END_CIRCLE)
        break
      }
      default:
        end(out, hx, hy, mask, END_BOUNDS)
    }
  }
}

function traceInside(scene: OpticsScene, out: BeamBuffer, ox: number, oy: number, dx: number, dy: number, mask: number, glass: number, depth: number): void {
  const o = glass * 6
  let best = Infinity
  let edge = -1
  for (let k = 0; k < 3; k++) {
    const a = k * 2
    const b = ((k + 1) % 3) * 2
    const t = raySegment(ox, oy, dx, dy, scene.prisms[o + a], scene.prisms[o + a + 1], scene.prisms[o + b], scene.prisms[o + b + 1])
    if (t < best) {
      best = t
      edge = k
    }
  }
  if (edge < 0) return
  const hx = ox + dx * best
  const hy = oy + dy * best
  if (!emit(out, ox, oy, hx, hy, mask, true)) return
  const a = edge * 2
  const b = ((edge + 1) % 3) * 2
  const ex = scene.prisms[o + b] - scene.prisms[o + a]
  const ey = scene.prisms[o + b + 1] - scene.prisms[o + a + 1]
  const len = Math.hypot(ex, ey)
  // Leaving the glass: the normal facing back into the glass is the inward one.
  const nx = -ey / len
  const ny = ex / len
  const r = refract(dx, dy, nx, ny, PRISM_INDEX[mask] ?? 1.5, 1)
  if (r.tir) push(hx + r.x * EPS, hy + r.y * EPS, r.x, r.y, mask, glass, depth + 1)
  else push(hx + r.x * EPS, hy + r.y * EPS, r.x, r.y, mask, -1, depth + 1)
}

/** Union of the light passing within `r` of a point (inside-glass segments excluded). */
export function lightAt(out: BeamBuffer, x: number, y: number, r: number): Mask {
  let light = 0
  const r2 = r * r
  for (let i = 0; i < out.count; i++) {
    if (out.inside[i]) continue
    const ax = out.ax[i]
    const ay = out.ay[i]
    const ex = out.bx[i] - ax
    const ey = out.by[i] - ay
    const len2 = ex * ex + ey * ey
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len2)) : 0
    const px = ax + ex * t - x
    const py = ay + ey * t - y
    if (px * px + py * py <= r2) light |= out.mask[i]
  }
  return light
}

/** How a creature answers the light reaching it: exact colour wakes it, a mix that holds its colour stirs it. */
export function response(light: Mask, wants: Mask): 'wake' | 'stir' | 'none' {
  if (light === wants) return 'wake'
  return light & wants ? 'stir' : 'none'
}
