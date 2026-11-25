import { COLUMNS, LEFT, STRIP, ground, POND, BEARS } from './layout'

// The snow on the hill: a depth for each strip of the ground. It is added and
// taken in whole amounts (depth times width), so none is ever lost.

/** The most two neighbouring strips may differ before the higher slumps. */
const SLUMP = 0.1

export class Snow {
  readonly depth: Float64Array = new Float64Array(COLUMNS)
  private loose = false

  index(x: number): number {
    return Math.min(COLUMNS - 1, Math.max(0, Math.floor((x - LEFT) / STRIP)))
  }

  /** Depth at a place, blended between the middles of the strips. */
  at(x: number): number {
    const f = Math.min(COLUMNS - 1, Math.max(0, (x - LEFT) / STRIP - 0.5))
    const i = Math.min(COLUMNS - 2, Math.floor(f)), t = f - i
    return this.depth[i] * (1 - t) + this.depth[i + 1] * t
  }

  /** The surface a sled rests on. */
  top(x: number): number {
    return ground(x) + this.at(x)
  }

  water(x: number): boolean {
    return x > POND.left && x < POND.right && this.at(x) < BEARS
  }

  /** How much of a stretch is under snow, 0 to 1. */
  cover(from: number, to: number, deep = 0.09): number {
    let white = 0
    const n = 8
    for (let i = 0; i <= n; i++) if (this.at(from + ((to - from) * i) / n) >= deep) white++
    return white / (n + 1)
  }

  get total(): number {
    let sum = 0
    for (const d of this.depth) sum += d
    return sum * STRIP
  }

  add(x: number, amount: number): void {
    const c = this.index(x)
    for (let k = -1; k <= 1; k++) this.depth[Math.min(COLUMNS - 1, Math.max(0, c + k))] += (amount * (k === 0 ? 0.5 : 0.25)) / STRIP
    this.loose = true
  }

  /** Takes up to `amount` evenly off the whole hill and returns what came. */
  take(amount: number): number {
    const total = this.total
    if (total <= 0) return 0
    const taken = Math.min(amount, total), keep = 1 - taken / total
    for (let i = 0; i < COLUMNS; i++) this.depth[i] *= keep
    if (keep <= 1e-9) this.depth.fill(0)
    return taken
  }

  /** Steep heaps slump. */
  settle(): void {
    if (!this.loose) return
    let moved = false
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 0; k < COLUMNS - 1; k++) {
        const i = pass % 2 ? COLUMNS - 2 - k : k
        const d = this.depth[i] - this.depth[i + 1]
        if (Math.abs(d) <= SLUMP) continue
        const move = ((Math.abs(d) - SLUMP) / 2) * Math.sign(d)
        this.depth[i] -= move
        this.depth[i + 1] += move
        if (Math.abs(move) > 1e-4) moved = true
      }
    }
    this.loose = moved
  }
}
