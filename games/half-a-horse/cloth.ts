import { CLOTH_REST, GROUND } from './layout'

// The cloth between the two ends: a chain of points sewn on at both, stepped
// at a fixed rate. Slack cloth sags, pulled cloth is straight and thin, and a
// shake runs along it. Pure numbers: the view draws a ribbon through them.

export const NODES = 15
const STEP = 1 / 120
const THICK = 172

export type Pt = { x: number; y: number }

export class Cloth {
  readonly x = new Float64Array(NODES)
  readonly y = new Float64Array(NODES)
  private readonly px = new Float64Array(NODES)
  private readonly py = new Float64Array(NODES)
  private left = 0
  /** The point a finger has hold of, or -1, and where it is. */
  grabbed = -1
  private readonly at: Pt = { x: 0, y: 0 }

  constructor(a: Pt, b: Pt) {
    this.reset(a, b)
  }

  reset(a: Pt, b: Pt): void {
    for (let i = 0; i < NODES; i++) {
      const t = i / (NODES - 1)
      this.x[i] = this.px[i] = a.x + (b.x - a.x) * t
      this.y[i] = this.py[i] = a.y + (b.y - a.y) * t
    }
    // Settled as it would hang.
    this.step(0.6, a, b)
    for (let i = 0; i < NODES; i++) { this.px[i] = this.x[i]; this.py[i] = this.y[i] }
  }

  get chord(): number {
    return Math.hypot(this.x[NODES - 1] - this.x[0], this.y[NODES - 1] - this.y[0])
  }

  /** How far past its rest the cloth is pulled: 0 at rest, about 1 at 450 units, more beyond. */
  get stretch(): number {
    return Math.max(0, (this.chord - CLOTH_REST) / 285)
  }

  /** The cloth's height, top to belly, at a point along it (0 to 1). What is pulled long is thin, most of all in the middle. */
  thickness(t: number): number {
    const pulled = Math.sqrt(CLOTH_REST / Math.max(CLOTH_REST * 0.82, this.chord))
    const middle = Math.sin(Math.PI * t)
    const waist = 1 - 0.42 * Math.min(1, this.stretch) * middle
    // As tall as the ends where it is sewn on to them.
    const sewn = 0.24 * (1 - middle) ** 2
    return THICK * (pulled * waist * (1 - sewn) + 1.1 * sewn)
  }

  nearest(at: Pt): { node: number; distance: number } {
    let node = 0, distance = Infinity
    for (let i = 0; i < NODES; i++) {
      const d = Math.hypot(this.x[i] - at.x, this.y[i] - at.y)
      if (d < distance) { distance = d; node = i }
    }
    return { node, distance }
  }

  grab(node: number, at: Pt): void {
    this.grabbed = Math.max(1, Math.min(NODES - 2, node))
    this.pull(at)
  }

  pull(at: Pt): void {
    // A finger bends the cloth this far from the line between the ends and no further.
    const t = this.grabbed / (NODES - 1)
    const mx = this.x[0] + (this.x[NODES - 1] - this.x[0]) * t, my = this.y[0] + (this.y[NODES - 1] - this.y[0]) * t
    const dx = at.x - mx, dy = at.y - my, d = Math.hypot(dx, dy) || 1
    const by = Math.min(1, 190 / d)
    this.at.x = mx + dx * by
    this.at.y = my + dy * by
  }

  release(): void {
    this.grabbed = -1
  }

  /** A knock at a point along the cloth, up or down. */
  flick(node: number, speed: number): void {
    for (let i = 1; i < NODES - 1; i++) {
      const near = Math.exp(-((i - node) ** 2) / 6)
      this.py[i] -= speed * near * STEP
    }
  }

  step(dt: number, a: Pt, b: Pt): void {
    this.left = Math.min(this.left + dt, 0.12)
    const ax = this.x[0], ay = this.y[0], bx = this.x[NODES - 1], by = this.y[NODES - 1]
    const steps = Math.floor(this.left / STEP)
    if (steps === 0) return
    this.left -= steps * STEP
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      this.tick(ax + (a.x - ax) * t, ay + (a.y - ay) * t, bx + (b.x - bx) * t, by + (b.y - by) * t)
    }
  }

  private tick(ax: number, ay: number, bx: number, by: number): void {
    const { x, y, px, py } = this
    const last = NODES - 1
    for (let i = 1; i < last; i++) {
      const vx = (x[i] - px[i]) * 0.972, vy = (y[i] - py[i]) * 0.972
      px[i] = x[i]; py[i] = y[i]
      x[i] += vx
      y[i] += vy + 1500 * STEP * STEP
    }
    x[0] = px[0] = ax; y[0] = py[0] = ay
    x[last] = px[last] = bx; y[last] = py[last] = by
    const chord = Math.hypot(bx - ax, by - ay)
    // Pulled, every piece is its share of the chord; slack, it keeps its length and sags. A little give either way.
    const rest = Math.max(CLOTH_REST * 0.52, chord * 1.01) / last
    for (let k = 0; k < 14; k++) {
      if (this.grabbed > 0) {
        x[this.grabbed] += (this.at.x - x[this.grabbed]) * 0.3
        y[this.grabbed] += (this.at.y - y[this.grabbed]) * 0.3
      }
      for (let i = 0; i < last; i++) {
        const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i], d = Math.hypot(dx, dy) || 1e-6
        const off = ((d - rest) / d) * 0.5 * (d > rest ? 0.7 : 0.35)
        if (i > 0) { x[i] += dx * off; y[i] += dy * off }
        if (i + 1 < last) { x[i + 1] -= dx * off; y[i + 1] -= dy * off }
      }
    }
    const floor = GROUND - 26
    for (let i = 1; i < last; i++) if (y[i] > floor) y[i] = floor
  }
}
