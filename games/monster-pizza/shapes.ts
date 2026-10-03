import type { Rng } from './rng'

// Outlines as closed rings of points, in whatever units the caller draws in.
// The felt-tip look is made from these: a ring is stroked with a wobble and
// filled with streaks that are cut where they cross it. No drawing here, so
// the cuts can be tested.

/** A closed ring, flat: x0, y0, x1, y1, ... */
export type Ring = number[]

/** An ellipse of `n` points. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28): Ring {
  const ring: Ring = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    ring.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)
  }
  return ring
}

/** A rectangle with rounded corners, `per` points to a corner. */
export function roundRect(x: number, y: number, w: number, h: number, r: number, per = 5): Ring {
  const ring: Ring = []
  const corners = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ]
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= per; i++) {
      const a = start + (i / per) * (Math.PI / 2)
      ring.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    }
  }
  return ring
}

/** A smooth closed curve through a few control points (Catmull-Rom), `per` points to a span. */
export function smooth(control: readonly number[], per = 6): Ring {
  const n = control.length / 2
  const at = (i: number): [number, number] => {
    const k = ((i % n) + n) % n
    return [control[k * 2], control[k * 2 + 1]]
  }
  const ring: Ring = []
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1), [x1, y1] = at(i), [x2, y2] = at(i + 1), [x3, y3] = at(i + 2)
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t
      ring.push(
        0.5 * (2 * x1 + (x2 - x0) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (3 * x1 - x0 - 3 * x2 + x3) * t3),
        0.5 * (2 * y1 + (y2 - y0) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (3 * y1 - y0 - 3 * y2 + y3) * t3),
      )
    }
  }
  return ring
}

/** The same ring with every point nudged by up to `by`: the hand that drew it was not steady. */
export function wobble(ring: Ring, by: number, rng: Rng): Ring {
  const out: Ring = []
  for (let i = 0; i < ring.length; i += 2) out.push(ring[i] + rng.range(-by, by), ring[i + 1] + rng.range(-by, by))
  return out
}

export function bounds(ring: Ring): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i])
    y0 = Math.min(y0, ring[i + 1]); y1 = Math.max(y1, ring[i + 1])
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Whether a point is inside the ring (even-odd). */
export function inside(ring: Ring, x: number, y: number): boolean {
  let hit = false
  const n = ring.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2], yi = ring[i * 2 + 1], xj = ring[j * 2], yj = ring[j * 2 + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** One stroke of a streaky fill: a straight line from (x0, y0) to (x1, y1). */
export type Streak = { x0: number; y0: number; x1: number; y1: number }

/**
 * The strokes of a marker fill: parallel lines `gap` apart at `angle`, each
 * cut where it crosses the ring. A hand colouring in does not stop on the
 * line, so each end falls short of the outline or runs over it by a little
 * (`miss`, from the stream).
 */
export function streaks(ring: Ring, angle: number, gap: number, miss: number, rng: Rng): Streak[] {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const n = ring.length / 2
  // The ring turned so that the strokes run along x.
  const u: number[] = [], v: number[] = []
  let v0 = Infinity, v1 = -Infinity
  for (let i = 0; i < n; i++) {
    const x = ring[i * 2], y = ring[i * 2 + 1]
    u.push(x * cos + y * sin)
    const vv = -x * sin + y * cos
    v.push(vv)
    v0 = Math.min(v0, vv); v1 = Math.max(v1, vv)
  }
  const out: Streak[] = []
  for (let line = v0 + gap * 0.5; line < v1; line += gap) {
    const crossings: number[] = []
    for (let i = 0, j = n - 1; i < n; j = i++) {
      if (v[i] > line !== v[j] > line) crossings.push(u[j] + ((line - v[j]) / (v[i] - v[j])) * (u[i] - u[j]))
    }
    crossings.sort((a, b) => a - b)
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const a = crossings[k] + rng.range(-miss * 0.5, miss), b = crossings[k + 1] + rng.range(-miss, miss * 0.5)
      if (b - a < gap * 0.3) continue
      const w = line + rng.range(-gap * 0.12, gap * 0.12)
      out.push({ x0: a * cos - w * sin, y0: a * sin + w * cos, x1: b * cos - w * sin, y1: b * sin + w * cos })
    }
  }
  return out
}
