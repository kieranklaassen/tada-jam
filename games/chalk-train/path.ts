import type { Pt } from './yard'

// A mark as a path: a run of points that can be measured and walked along.
// Pure geometry, in the tar's own units.

/** The length of each stretch between neighbouring points, and the whole. */
export function lengths(pts: readonly Pt[]): { each: number[]; total: number } {
  const each: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    each.push(d)
    total += d
  }
  return { each, total }
}

export const pathLength = (pts: readonly Pt[]): number => lengths(pts).total

/** The same path as points a fixed step apart, ends kept. A single point stays a single point. */
export function resample(pts: readonly Pt[], step: number): Pt[] {
  if (pts.length < 2) return pts.map((p) => ({ x: p.x, y: p.y }))
  const out: Pt[] = [{ x: pts[0].x, y: pts[0].y }]
  let carry = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d === 0) continue
    let at = step - carry
    while (at <= d) {
      out.push({ x: a.x + ((b.x - a.x) * at) / d, y: a.y + ((b.y - a.y) * at) / d })
      at += step
    }
    carry = d - (at - step)
  }
  const last = pts[pts.length - 1], tail = out[out.length - 1]
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > step * 0.25) out.push({ x: last.x, y: last.y })
  return out
}

/** A place on a path: the point, and the unit direction of travel there. */
export type Spot = Pt & { tx: number; ty: number }

/** The spot a distance `s` along the path, held at the ends. */
export function spotAt(pts: readonly Pt[], s: number): Spot {
  if (pts.length === 0) return { x: 0, y: 0, tx: 1, ty: 0 }
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, tx: 1, ty: 0 }
  let left = Math.max(0, s)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d === 0) continue
    if (left <= d || i === pts.length - 1) {
      const t = Math.min(1, left / d)
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / d, ty: (b.y - a.y) / d }
    }
    left -= d
  }
  const end = pts[pts.length - 1]
  return { x: end.x, y: end.y, tx: 1, ty: 0 }
}

/** The nearest point of a path to `p`: how far along it lies, and how far away it is. */
export function nearestOn(pts: readonly Pt[], p: Pt): { s: number; gap: number } {
  let best = { s: 0, gap: Infinity }, walked = 0
  if (pts.length === 1) return { s: 0, gap: Math.hypot(p.x - pts[0].x, p.y - pts[0].y) }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy
    const t = d2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d2))
    const gap = Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
    const d = Math.sqrt(d2)
    if (gap < best.gap) best = { s: walked + d * t, gap }
    walked += d
  }
  return best
}

/** Whether a point lies inside a closed shape whose corners are `shape`. */
export function inside(shape: readonly Pt[], p: Pt): boolean {
  let within = false
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], b = shape[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) within = !within
  }
  return within
}

/** How many times two paths cross each other. */
export function crossings(a: readonly Pt[], b: readonly Pt[]): number {
  const side = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  let count = 0
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const d1 = side(b[j - 1], b[j], a[i - 1]), d2 = side(b[j - 1], b[j], a[i])
      const d3 = side(a[i - 1], a[i], b[j - 1]), d4 = side(a[i - 1], a[i], b[j])
      if (d1 * d2 < 0 && d3 * d4 < 0) count++
    }
  }
  return count
}

/** The middle of the box a path fits in. */
export function middle(pts: readonly Pt[]): Pt {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
}
