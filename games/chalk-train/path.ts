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
