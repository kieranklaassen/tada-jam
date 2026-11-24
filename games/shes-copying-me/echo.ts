import type { Spot } from './layout'

// The short memory behind the copy: where the leading hand was, so the other
// hand can go there a beat later. It is never saved.

export type Moment = { t: number; u: number; y: number; quiet: boolean }

const KEEP = 3

export class Echo {
  private moments: Moment[] = []

  clear(): void {
    this.moments.length = 0
  }

  push(t: number, spot: Spot, quiet: boolean): void {
    this.moments.push({ t, u: spot.u, y: spot.y, quiet })
    while (this.moments.length > 2 && this.moments[0].t < t - KEEP) this.moments.shift()
  }

  /** Where the leading hand was at `t`, or null from before the memory begins. */
  at(t: number): Moment | null {
    const list = this.moments
    if (list.length === 0 || t < list[0].t) return null
    for (let i = list.length - 1; i >= 0; i--) {
      const a = list[i]
      if (a.t > t) continue
      const b = list[i + 1]
      if (!b) return a
      const k = (t - a.t) / (b.t - a.t)
      return { t, u: a.u + (b.u - a.u) * k, y: a.y + (b.y - a.y) * k, quiet: a.quiet }
    }
    return null
  }
}
