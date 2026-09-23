// Small 2D toolkit for paper cuts: polygon measures, corner-keeping outline
// sampling, cut-edge wobble, and a marching-squares tracer that turns a
// rasterized mask into a smooth outline. Pure and allocation-light; used at
// build time and by tests, never inside the frame loop.

export type Point = { x: number; y: number }

export function polygonArea(points: readonly Point[]): number {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j].x + points[i].x) * (points[j].y - points[i].y)
  }
  return -sum / 2
}

export function pointInPolygon(x: number, y: number, points: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function centroid(points: readonly Point[]): Point {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

export function perimeter(points: readonly Point[]): number {
  let length = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    length += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return length
}

/** Evenly spaced points along a closed outline (for dotted lines). */
export function resampleClosed(points: readonly Point[], count: number): Point[] {
  const total = perimeter(points)
  const step = total / count
  const out: Point[] = []
  let i = 0
  let travelled = 0
  let segStart = points[0]
  let segEnd = points[1 % points.length]
  let segLength = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y)
  for (let n = 0; n < count; n++) {
    const target = n * step
    while (travelled + segLength < target && i < points.length) {
      travelled += segLength
      i++
      segStart = points[i % points.length]
      segEnd = points[(i + 1) % points.length]
      segLength = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y)
    }
    const t = segLength > 0 ? (target - travelled) / segLength : 0
    out.push({ x: segStart.x + (segEnd.x - segStart.x) * t, y: segStart.y + (segEnd.y - segStart.y) * t })
  }
  return out
}

export type Segment = { kind: 'line'; to: Point } | { kind: 'arc'; cx: number; cy: number; r: number; from: number; to: number }

/**
 * A closed outline of exactly `count` points built from lines and arcs,
 * starting at `start`. Points are shared out by length, and every segment
 * starts on its own first point, so paper corners stay sharp.
 */
export function outlineFromSegments(start: Point, segments: readonly Segment[], count: number): Point[] {
  const starts: Point[] = []
  const lengths: number[] = []
  let at = start
  for (const segment of segments) {
    starts.push(at)
    if (segment.kind === 'line') {
      lengths.push(Math.hypot(segment.to.x - at.x, segment.to.y - at.y))
      at = segment.to
    } else {
      lengths.push(Math.abs(segment.to - segment.from) * segment.r)
      at = { x: segment.cx + Math.cos(segment.to) * segment.r, y: segment.cy + Math.sin(segment.to) * segment.r }
    }
  }
  const total = lengths.reduce((a, b) => a + b, 0)
  const shares = lengths.map((length) => Math.max(1, Math.round((length / total) * count)))
  let excess = shares.reduce((a, b) => a + b, 0) - count
  while (excess !== 0) {
    const index = shares.indexOf(excess > 0 ? Math.max(...shares) : Math.min(...shares))
    shares[index] += excess > 0 ? -1 : 1
    excess += excess > 0 ? -1 : 1
  }
  const out: Point[] = []
  segments.forEach((segment, index) => {
    const from = starts[index]
    const n = shares[index]
    for (let k = 0; k < n; k++) {
      const t = k / n
      if (segment.kind === 'line') out.push({ x: from.x + (segment.to.x - from.x) * t, y: from.y + (segment.to.y - from.y) * t })
      else {
        const angle = segment.from + (segment.to - segment.from) * t
        out.push({ x: segment.cx + Math.cos(angle) * segment.r, y: segment.cy + Math.sin(angle) * segment.r })
      }
    }
  })
  return out
}

/** Deterministic smooth 1D noise in [-1, 1] (sum of detuned sines). */
export function smoothNoise(t: number, seed: number): number {
  return (Math.sin(t * 1.7 + seed * 12.9898) * 0.5 + Math.sin(t * 3.1 + seed * 78.233) * 0.3 + Math.sin(t * 5.3 + seed * 37.719) * 0.2)
}

/** Hand-cut edge: push each point along its normal by a little smooth noise. */
export function wobble(points: readonly Point[], amount: number, seed: number): Point[] {
  const n = points.length
  const ccw = polygonArea(points) > 0 ? 1 : -1
  let travelled = 0
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n]
    const next = points[(i + 1) % n]
    travelled += Math.hypot(p.x - prev.x, p.y - prev.y)
    const tx = next.x - prev.x
    const ty = next.y - prev.y
    const length = Math.hypot(tx, ty) || 1
    const nx = (ty / length) * ccw
    const ny = (-tx / length) * ccw
    const offset = smoothNoise(travelled * 0.9, seed) * amount
    return { x: p.x + nx * offset, y: p.y + ny * offset }
  })
}

export function translate(points: readonly Point[], dx: number, dy: number): Point[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

// --- masks ---------------------------------------------------------------------

export type Mask = { x0: number; y0: number; cell: number; w: number; h: number; data: Uint8Array }

export function createMask(x0: number, y0: number, x1: number, y1: number, cell: number): Mask {
  const w = Math.ceil((x1 - x0) / cell) + 1
  const h = Math.ceil((y1 - y0) / cell) + 1
  return { x0, y0, cell, w, h, data: new Uint8Array(w * h) }
}

export function maskAt(mask: Mask, x: number, y: number): boolean {
  const i = Math.round((x - mask.x0) / mask.cell)
  const j = Math.round((y - mask.y0) / mask.cell)
  if (i < 0 || j < 0 || i >= mask.w || j >= mask.h) return false
  return mask.data[j * mask.w + i] === 1
}

export function maskArea(mask: Mask): number {
  let count = 0
  for (let i = 0; i < mask.data.length; i++) count += mask.data[i]
  return count * mask.cell * mask.cell
}

/**
 * The longest closed contour of a mask, traced with marching squares on the
 * cell corners, counter-clockwise, in world units.
 */
export function traceMask(mask: Mask): Point[] {
  const { w, h, data } = mask
  const at = (i: number, j: number) => (i >= 0 && j >= 0 && i < w && j < h ? data[j * w + i] : 0)
  // Edges between inside and outside cells, keyed by their start corner.
  const next = new Map<number, number[]>()
  const key = (i: number, j: number) => j * (w + 2) + i
  const add = (a: number, b: number) => {
    const list = next.get(a)
    if (list) list.push(b)
    else next.set(a, [b])
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!at(i, j)) continue
      // Corner coordinates: cell (i,j) has corners (i,j),(i+1,j),(i+1,j+1),(i,j+1) with y up.
      if (!at(i, j - 1)) add(key(i, j), key(i + 1, j)) // bottom edge, left→right
      if (!at(i + 1, j)) add(key(i + 1, j), key(i + 1, j + 1)) // right edge, bottom→top
      if (!at(i, j + 1)) add(key(i + 1, j + 1), key(i, j + 1)) // top edge, right→left
      if (!at(i - 1, j)) add(key(i, j + 1), key(i, j)) // left edge, top→bottom
    }
  }
  let best: Point[] = []
  const used = new Set<string>()
  for (const [start, targets] of next) {
    for (const firstTarget of targets) {
      const edgeId = `${start}>${firstTarget}`
      if (used.has(edgeId)) continue
      const loop: Point[] = []
      let from = start
      let to = firstTarget
      let guard = 0
      while (guard++ < w * h * 4) {
        used.add(`${from}>${to}`)
        const fi = from % (w + 2)
        const fj = Math.floor(from / (w + 2))
        loop.push({ x: mask.x0 + (fi - 0.5) * mask.cell, y: mask.y0 + (fj - 0.5) * mask.cell })
        const options = next.get(to)
        if (!options) break
        const unused = options.find((candidate) => !used.has(`${to}>${candidate}`))
        if (unused === undefined) break
        from = to
        to = unused
        if (from === start) break
      }
      if (loop.length > best.length) best = loop
    }
  }
  return best
}

/** Ramer–Douglas–Peucker simplification of a closed outline. */
export function simplifyClosed(points: readonly Point[], tolerance: number): Point[] {
  if (points.length < 8) return [...points]
  const rdp = (list: readonly Point[]): Point[] => {
    if (list.length < 3) return [...list]
    const a = list[0]
    const b = list[list.length - 1]
    let maxDistance = 0
    let index = 0
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy) || 1
    for (let i = 1; i < list.length - 1; i++) {
      const distance = Math.abs(dy * list[i].x - dx * list[i].y + b.x * a.y - b.y * a.x) / length
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (maxDistance <= tolerance) return [a, b]
    const left = rdp(list.slice(0, index + 1))
    const right = rdp(list.slice(index))
    return [...left.slice(0, -1), ...right]
  }
  const half = Math.floor(points.length / 2)
  const first = rdp(points.slice(0, half + 1))
  const second = rdp([...points.slice(half), points[0]])
  return [...first.slice(0, -1), ...second.slice(0, -1)]
}

/** Chaikin corner cutting on a closed outline: rounds the stair-steps of a traced mask. */
export function chaikinClosed(points: readonly Point[], passes: number): Point[] {
  let current = [...points]
  for (let pass = 0; pass < passes; pass++) {
    const out: Point[] = []
    for (let i = 0; i < current.length; i++) {
      const a = current[i]
      const b = current[(i + 1) % current.length]
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    current = out
  }
  return current
}
