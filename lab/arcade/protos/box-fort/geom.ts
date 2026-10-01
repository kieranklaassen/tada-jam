// Small polygon helpers for Box Fort: the openings a child cuts are convex
// hulls of the scissors' path, faceted so they look cut by hand.

export type Pt = [number, number]

// A tiny seeded generator, so a face or a hole can be redrawn the same way.
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

// Andrew's monotone chain. Returns the hull in order, without the repeat.
export function hull(points: readonly Pt[]): Pt[] {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1])
  if (pts.length < 3) return pts
  const lower: Pt[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

// Every point grown into a ring of points, so a single snip is a peephole and
// a straight cut is a slot wide enough for a cat's head.
export function fatten(points: readonly Pt[], radius: number): Pt[] {
  const out: Pt[] = []
  const step = Math.max(1, Math.floor(points.length / 48))
  for (let i = 0; i < points.length; i += step) {
    const p = points[i]
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      out.push([p[0] + Math.cos(a) * radius, p[1] + Math.sin(a) * radius])
    }
  }
  const last = points[points.length - 1]
  if (last) for (let k = 0; k < 10; k++) out.push([last[0] + Math.cos((k / 10) * Math.PI * 2) * radius, last[1] + Math.sin((k / 10) * Math.PI * 2) * radius])
  return out
}

// Walk the outline and keep a corner every `every` pixels, each nudged a
// little: scissors in a small hand cut facets, not curves.
export function facet(poly: readonly Pt[], every: number, jitter: number, rand: () => number, keepBelow = Infinity): Pt[] {
  if (poly.length < 3) return [...poly]
  const out: Pt[] = []
  let carry = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let at = carry
    while (at < len) {
      const t = at / len
      const x = a[0] + (b[0] - a[0]) * t
      const y = a[1] + (b[1] - a[1]) * t
      // The bottom of a door stays dead straight along the box's edge.
      const j = y >= keepBelow ? 0 : jitter
      out.push([x + (rand() - 0.5) * 2 * j, y >= keepBelow ? y : y + (rand() - 0.5) * 2 * j])
      at += every
    }
    carry = at - len
  }
  return out.length >= 3 ? out : [...poly]
}

export function inPoly(x: number, y: number, poly: readonly Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function bounds(poly: readonly Pt[]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of poly) {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  return { minX, minY, maxX, maxY }
}

// Do two roughly convex outlines touch? Good enough: any corner of one inside
// the other, or their boxes overlapping deeply.
export function touching(a: readonly Pt[], b: readonly Pt[]): boolean {
  for (const p of a) if (inPoly(p[0], p[1], b)) return true
  for (const p of b) if (inPoly(p[0], p[1], a)) return true
  const A = bounds(a)
  const B = bounds(b)
  const ox = Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX)
  const oy = Math.min(A.maxY, B.maxY) - Math.max(A.minY, B.minY)
  return ox > 12 && oy > 12
}

export function tracePoly(g: CanvasRenderingContext2D, poly: readonly Pt[]): void {
  g.beginPath()
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    if (i === 0) g.moveTo(p[0], p[1])
    else g.lineTo(p[0], p[1])
  }
  g.closePath()
}
