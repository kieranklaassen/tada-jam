// The farmyard's layout and the little geometry the heist needs: what blocks
// feet, what blocks eyes, and how a guard gets round the hedge to the far pen.

import { clamp } from '../../kit/math.ts'

export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Disc {
  x: number
  y: number
  r: number
}

// The stump the raccoon lives in, the porch in front of it where nothing can
// see or follow, and the spot the raccoon stands on (and lands on when punted).
export const DEN: Pt = { x: 96, y: 440 }
export const SAFE: Disc = { x: 140, y: 462, r: 98 }
export const HOME: Pt = { x: 182, y: 480 }

export const POND = { x: 610, y: 428, rx: 100, ry: 62 }
export const KENNEL: Pt = { x: 935, y: 296 }
export const DOG_REST: Pt = { x: 935, y: 370 }
export const DOG_SENSE = 165
export const DOG_LEASH = 265
export const BARN: Rect = { x: 975, y: 0, w: 205, h: 158 }
export const BARN_DOOR: Pt = { x: 1075, y: 158 }

// The pen round the dragon egg: an L of hedge with one gap at the far right.
export const HEDGES: readonly Rect[] = [
  { x: 905, y: 560, w: 46, h: 260 },
  { x: 905, y: 560, w: 180, h: 46 },
]
export const BOUNDS = { x0: 30, y0: 134, x1: 1150, y1: 790 }

const WALLS: readonly Rect[] = [...HEDGES, BARN]
const ROCKS: readonly Disc[] = [
  { x: DEN.x, y: DEN.y - 22, r: 58 },
  { x: KENNEL.x, y: KENNEL.y, r: 44 },
]

export const BUSH_R = 44
export const BUSHES: readonly Pt[] = [
  { x: 505, y: 545 },
  { x: 700, y: 318 },
  { x: 468, y: 158 },
  { x: 478, y: 728 },
  { x: 852, y: 166 },
  { x: 848, y: 500 },
]

// tier 0 white, 1 spotted, 2 golden, 3 dragon.
export const NESTS: readonly { x: number; y: number; tier: number }[] = [
  { x: 340, y: 252, tier: 0 },
  { x: 332, y: 644, tier: 0 },
  { x: 622, y: 178, tier: 1 },
  { x: 644, y: 712, tier: 1 },
  { x: 1048, y: 306, tier: 2 },
  { x: 1066, y: 716, tier: 3 },
]

export function inPond(x: number, y: number): boolean {
  const dx = (x - POND.x) / (POND.rx - 8)
  const dy = (y - POND.y) / (POND.ry - 6)
  return dx * dx + dy * dy < 1
}

// Keep a round thing of radius r out of walls and rocks and inside the yard.
export function pushOut(p: Pt, r: number): void {
  for (const w of WALLS) {
    const cx = clamp(p.x, w.x, w.x + w.w)
    const cy = clamp(p.y, w.y, w.y + w.h)
    const dx = p.x - cx
    const dy = p.y - cy
    const d2 = dx * dx + dy * dy
    if (d2 >= r * r) continue
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2)
      p.x = cx + (dx / d) * r
      p.y = cy + (dy / d) * r
    } else {
      const left = p.x - w.x
      const right = w.x + w.w - p.x
      const top = p.y - w.y
      const bottom = w.y + w.h - p.y
      const m = Math.min(left, right, top, bottom)
      if (m === left) p.x = w.x - r
      else if (m === right) p.x = w.x + w.w + r
      else if (m === top) p.y = w.y - r
      else p.y = w.y + w.h + r
    }
  }
  for (const c of ROCKS) {
    const dx = p.x - c.x
    const dy = p.y - c.y
    const d = Math.hypot(dx, dy)
    const min = c.r + r
    if (d >= min) continue
    if (d < 0.01) {
      p.y = c.y + min
      continue
    }
    p.x = c.x + (dx / d) * min
    p.y = c.y + (dy / d) * min
  }
  p.x = clamp(p.x, BOUNDS.x0, BOUNDS.x1)
  p.y = clamp(p.y, BOUNDS.y0, BOUNDS.y1)
}

// How far along the segment from (ox, oy) by (dx, dy) sight runs before a hedge
// stops it: 1 is all the way.
export function sight(ox: number, oy: number, dx: number, dy: number): number {
  let best = 1
  for (const r of HEDGES) {
    let t0 = 0
    let t1 = 1
    let hit = true
    if (Math.abs(dx) < 1e-6) {
      if (ox < r.x || ox > r.x + r.w) hit = false
    } else {
      let a = (r.x - ox) / dx
      let b = (r.x + r.w - ox) / dx
      if (a > b) [a, b] = [b, a]
      t0 = Math.max(t0, a)
      t1 = Math.min(t1, b)
    }
    if (hit) {
      if (Math.abs(dy) < 1e-6) {
        if (oy < r.y || oy > r.y + r.h) hit = false
      } else {
        let a = (r.y - oy) / dy
        let b = (r.y + r.h - oy) / dy
        if (a > b) [a, b] = [b, a]
        t0 = Math.max(t0, a)
        t1 = Math.min(t1, b)
      }
    }
    if (hit && t0 <= t1 && t0 < best) best = t0
  }
  return best
}

const inPen = (x: number, y: number) => x > 951 && y > 583

// Where a guard should head right now to get from one point to another: the
// target itself, unless the hedge pen is in the way, then the gap.
export function route(fromX: number, fromY: number, toX: number, toY: number): [number, number] {
  const a = inPen(fromX, fromY)
  const b = inPen(toX, toY)
  if (a === b) return [toX, toY]
  if (!a) return fromX > 1100 && fromY > 470 ? [1134, 640] : [1134, 505]
  return fromX > 1100 ? [1134, 500] : [1134, 640]
}

export function angDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

// Turn `cur` toward `target` along the short way round.
export function turnTo(cur: number, target: number, rate: number, dt: number): number {
  return cur + angDiff(target, cur) * (1 - Math.exp(-rate * dt))
}
