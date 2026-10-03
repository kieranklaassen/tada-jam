// The ground under the camp, as numbers only: one smooth height function over
// the unit square, seeded, with a few hills and one valley for the stream.
// The map's contour lines and its hill shading are both read from it, so they
// always agree. No DOM here: the painter (look.ts) does the drawing.
//
// Coordinates are the unit square, x to the right and y downwards, as on the
// sheet: (0, 0) is the top left corner of the map.

export type Point = { x: number; y: number }

/** One piece of a contour line, in unit coordinates, with the index of its level in the list that was asked for. */
export type Segment = { x1: number; y1: number; x2: number; y2: number; level: number }

export type Terrain = {
  readonly seed: number
  /** Height at a point of the unit square. Smooth, and the same for the same seed. */
  height(x: number, y: number): number
  /** How the slope at a point faces the light from the top left: above 0 is lit, below 0 is in shade, 0 is flat. Within -1 to 1. */
  shade(x: number, y: number): number
  /** The lowest and highest height on a grid of this many cells. */
  range(gridW: number, gridH: number): { min: number; max: number }
  /** Contour lines at the given heights, traced by marching squares on a grid of this many cells. */
  contourSegments(levels: readonly number[], gridW: number, gridH: number): Segment[]
  /** The stream's course from its spring to where it leaves the sheet, as a smooth run of points. */
  readonly stream: readonly Point[]
  /** The pool on the stream. */
  readonly pool: { x: number; y: number; rx: number; ry: number }
}

/** A small seeded generator (mulberry32): the same run of numbers in 0 to 1 for the same seed. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Bump = { x: number; y: number; rx: number; ry: number; amp: number }

// Where the hills stand, before the seed moves them a little. The camp's
// clearing (left of centre) and the bottom of the sheet, where the kit lies,
// are left low and gentle on purpose.
const HILLS: readonly Bump[] = [
  { x: 0.07, y: 0.06, rx: 0.2, ry: 0.24, amp: 1 },
  { x: 0.4, y: -0.04, rx: 0.17, ry: 0.2, amp: 0.62 },
  { x: 0.84, y: 0.1, rx: 0.17, ry: 0.26, amp: 0.92 },
  { x: 0.02, y: 0.58, rx: 0.12, ry: 0.2, amp: 0.5 },
  { x: 1.02, y: 0.92, rx: 0.2, ry: 0.2, amp: 0.42 },
  { x: 0.56, y: 0.2, rx: 0.07, ry: 0.1, amp: 0.26 },
  { x: 0.2, y: 0.3, rx: 0.06, ry: 0.08, amp: 0.14 },
]

// The stream's course, before the seed bends it: down from the top, through
// the pool, and off to the right.
const COURSE: readonly Point[] = [
  { x: 0.615, y: -0.04 },
  { x: 0.64, y: 0.1 },
  { x: 0.61, y: 0.22 },
  { x: 0.655, y: 0.33 },
  { x: 0.675, y: 0.42 },
  { x: 0.74, y: 0.49 },
  { x: 0.82, y: 0.52 },
  { x: 0.9, y: 0.58 },
  { x: 1.04, y: 0.6 },
]
const POOL_AT = 4

function smoothCourse(points: readonly Point[], steps: number): Point[] {
  // Catmull-Rom through the points, so the stream has no corners.
  const out: Point[] = []
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t
      out.push({
        x: 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push({ ...points[points.length - 1] })
  return out
}

function distanceToCourse(course: readonly Point[], x: number, y: number): number {
  let best = Infinity
  for (let i = 0; i < course.length - 1; i++) {
    const a = course[i], b = course[i + 1]
    const dx = b.x - a.x, dy = b.y - a.y
    const span = dx * dx + dy * dy
    const t = span > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / span)) : 0
    const px = a.x + dx * t - x, py = a.y + dy * t - y
    const d = px * px + py * py
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

export function makeTerrain(seed: number): Terrain {
  const next = seeded(seed)
  const jitter = (amount: number) => (next() * 2 - 1) * amount
  const hills = HILLS.map((hill) => ({
    x: hill.x + jitter(0.025),
    y: hill.y + jitter(0.025),
    rx: hill.rx * (1 + jitter(0.12)),
    ry: hill.ry * (1 + jitter(0.12)),
    amp: hill.amp * (1 + jitter(0.15)),
  }))
  // The ends of the course stay put, so the stream always enters and leaves where the scene expects it.
  const bent = COURSE.map((p, i) => (i === 0 || i === COURSE.length - 1 || i === POOL_AT ? { ...p } : { x: p.x + jitter(0.012), y: p.y + jitter(0.012) }))
  const stream = smoothCourse(bent, 12)
  // A coarser copy for the height function, which asks for the distance at every sample.
  const valley = smoothCourse(bent, 2)
  const pool = { x: bent[POOL_AT].x, y: bent[POOL_AT].y, rx: 0.034 * (1 + jitter(0.1)), ry: 0.04 * (1 + jitter(0.1)) }
  const ripple = { ax: 5 + jitter(1), ay: 4 + jitter(1), px: next() * 6.28, py: next() * 6.28 }

  const height = (x: number, y: number): number => {
    // A slow fall from the top of the sheet to the bottom, with a faint ripple so no contour runs dead straight.
    let h = (1 - y) * 0.3 + 0.025 * Math.sin(x * ripple.ax + ripple.px) * Math.cos(y * ripple.ay + ripple.py)
    for (const hill of hills) {
      const dx = (x - hill.x) / hill.rx, dy = (y - hill.y) / hill.ry
      h += hill.amp * Math.exp(-(dx * dx + dy * dy))
    }
    const d = distanceToCourse(valley, x, y) / 0.075
    h -= 0.2 * Math.exp(-d * d)
    return h
  }

  const shade = (x: number, y: number): number => {
    const e = 0.004
    const gx = (height(x + e, y) - height(x - e, y)) / (2 * e)
    const gy = (height(x, y + e) - height(x, y - e)) / (2 * e)
    // The light comes from the top left, as on a printed sheet: a slope that falls away to the bottom right is in shade.
    const facing = (gx + gy) * 0.7071
    return Math.max(-1, Math.min(1, facing / 4))
  }

  const grids = new Map<string, Float32Array>()
  const sample = (gridW: number, gridH: number): Float32Array => {
    const key = `${gridW}x${gridH}`
    let grid = grids.get(key)
    if (!grid) {
      grid = new Float32Array((gridW + 1) * (gridH + 1))
      for (let j = 0; j <= gridH; j++) for (let i = 0; i <= gridW; i++) grid[j * (gridW + 1) + i] = height(i / gridW, j / gridH)
      grids.set(key, grid)
    }
    return grid
  }

  const range = (gridW: number, gridH: number) => {
    const grid = sample(gridW, gridH)
    let min = Infinity, max = -Infinity
    for (const value of grid) { if (value < min) min = value; if (value > max) max = value }
    return { min, max }
  }

  const contourSegments = (levels: readonly number[], gridW: number, gridH: number): Segment[] => {
    const grid = sample(gridW, gridH)
    const out: Segment[] = []
    const row = gridW + 1
    // Where a level crosses one edge of a cell, by straight interpolation between its two corners.
    const cross = (level: number, a: number, b: number) => (a === b ? 0.5 : Math.max(0, Math.min(1, (level - a) / (b - a))))
    for (let index = 0; index < levels.length; index++) {
      const level = levels[index]
      for (let j = 0; j < gridH; j++) {
        for (let i = 0; i < gridW; i++) {
          const tl = grid[j * row + i], tr = grid[j * row + i + 1], bl = grid[(j + 1) * row + i], br = grid[(j + 1) * row + i + 1]
          const code = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
          if (code === 0 || code === 15) continue
          const x0 = i / gridW, x1 = (i + 1) / gridW, y0 = j / gridH, y1 = (j + 1) / gridH
          const top: Point = { x: x0 + (x1 - x0) * cross(level, tl, tr), y: y0 }
          const bottom: Point = { x: x0 + (x1 - x0) * cross(level, bl, br), y: y1 }
          const left: Point = { x: x0, y: y0 + (y1 - y0) * cross(level, tl, bl) }
          const right: Point = { x: x1, y: y0 + (y1 - y0) * cross(level, tr, br) }
          const add = (a: Point, b: Point) => out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, level: index })
          switch (code) {
            case 1: case 14: add(left, bottom); break
            case 2: case 13: add(bottom, right); break
            case 3: case 12: add(left, right); break
            case 4: case 11: add(top, right); break
            case 6: case 9: add(top, bottom); break
            case 7: case 8: add(left, top); break
            default: {
              // A saddle: the middle of the cell decides which corners join.
              const high = (tl + tr + bl + br) / 4 > level
              if ((code === 5) === high) { add(left, top); add(bottom, right) } else { add(left, bottom); add(top, right) }
            }
          }
        }
      }
    }
    return out
  }

  return { seed, height, shade, range, contourSegments, stream, pool }
}
