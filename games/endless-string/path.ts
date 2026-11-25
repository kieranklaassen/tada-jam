import type { Point } from './input'

// The string as a path: from the box through each place it hangs on to its
// end. A span between two points sags like a quadratic. Things lie at fixed
// distances from the end, so when the path grows longer more comes out.

export const SPACING = 98
const STEPS = 10

export type Path = { xs: Float64Array; ys: Float64Array; along: Float64Array; count: number; length: number; /** The distance from the box of each point of the path. */ at: number[] }

export function makePath(): Path {
  const size = 20 * STEPS + 1
  return { xs: new Float64Array(size), ys: new Float64Array(size), along: new Float64Array(size), count: 0, length: 0, at: [] }
}

/** Writes the path through `points`. `sag(i, length)` is how deep span `i` hangs. */
export function layPath(path: Path, points: readonly Point[], sag: (span: number, length: number) => number): void {
  path.count = 0; path.length = 0; path.at.length = 0
  const put = (x: number, y: number) => {
    const n = path.count
    if (n > 0) path.length += Math.hypot(x - path.xs[n - 1], y - path.ys[n - 1])
    path.xs[n] = x; path.ys[n] = y; path.along[n] = path.length; path.count = n + 1
  }
  put(points[0].x, points[0].y)
  path.at.push(0)
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1], depth = sag(i, Math.hypot(b.x - a.x, b.y - a.y))
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS
      put(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + 4 * depth * t * (1 - t))
    }
    path.at.push(path.length)
  }
}

/** The point `distance` along the path from the box, held to its two ends. */
export function pointAt(path: Path, distance: number, out: Point): Point {
  const d = Math.min(path.length, Math.max(0, distance))
  let low = 0, high = path.count - 1
  while (high - low > 1) { const mid = (low + high) >> 1; if (path.along[mid] <= d) low = mid; else high = mid }
  const span = path.along[high] - path.along[low], t = span > 0 ? (d - path.along[low]) / span : 0
  out.x = path.xs[low] + (path.xs[high] - path.xs[low]) * t
  out.y = path.ys[low] + (path.ys[high] - path.ys[low]) * t
  return out
}

/** The span nearest to a point, and how far off it is. */
export function nearestSpan(path: Path, at: Point): { span: number; distance: number } {
  let best = Infinity, span = 0
  for (let i = 0; i + 1 < path.count; i++) {
    const ax = path.xs[i], ay = path.ys[i], dx = path.xs[i + 1] - ax, dy = path.ys[i + 1] - ay, l = dx * dx + dy * dy
    const t = l > 0 ? Math.min(1, Math.max(0, ((at.x - ax) * dx + (at.y - ay) * dy) / l)) : 0
    const d = Math.hypot(at.x - ax - dx * t, at.y - ay - dy * t)
    if (d < best) { best = d; span = Math.floor(i / STEPS) }
  }
  return { span, distance: best }
}
