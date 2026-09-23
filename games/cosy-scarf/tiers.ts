// Adaptive quality. The frame interval (not just CPU time, so GPU-bound
// frames count too) is smoothed and compared against two thresholds with
// hysteresis: a sustained slow stretch drops one tier, only a long fast
// stretch climbs back, and a tier that had to be dropped twice is not tried
// again. `?tier=N` pins a tier for testing.

export type Tier = {
  dpr: number
  /** The one full-screen pass: tilt-shift, grade and vignette. */
  post: boolean
  /** Blur taps in the post pass. */
  blurTaps: number
  /** Share of the snowfall drawn. */
  flakes: number
  /** Stitch relief on the far hillside. */
  hillRelief: boolean
}

export const TIERS: readonly Tier[] = [
  { dpr: 2, post: true, blurTaps: 8, flakes: 1, hillRelief: true },
  { dpr: 1.5, post: true, blurTaps: 4, flakes: 0.7, hillRelief: true },
  { dpr: 1.25, post: false, blurTaps: 0, flakes: 0.45, hillRelief: true },
  { dpr: 1, post: false, blurTaps: 0, flakes: 0.25, hillRelief: false },
]

export const SLOW_MS = 21
export const FAST_MS = 14.5
export const DROP_AFTER_S = 1.5
export const RISE_AFTER_S = 8
export const COOLDOWN_S = 2
const IGNORE_OVER_MS = 250
const SMOOTHING = 0.12

export class TierController {
  tier: number
  readonly forced: boolean
  private smoothed = 1000 / 60
  private slowSince: number | null = null
  private fastSince: number | null = null
  private lastChange = -Infinity
  private readonly drops = new Array<number>(TIERS.length).fill(0)

  constructor(start: number, forced: number | null = null) {
    this.forced = forced !== null
    this.tier = clampTier(forced ?? start)
  }

  get smoothedMs(): number {
    return this.smoothed
  }

  /** Feed one frame interval (ms) at time `now` (s). Returns the new tier when it changes, otherwise -1. */
  sample(frameMs: number, now: number): number {
    if (this.forced || frameMs <= 0 || frameMs > IGNORE_OVER_MS) return -1
    this.smoothed += (frameMs - this.smoothed) * SMOOTHING
    if (now - this.lastChange < COOLDOWN_S) return -1
    if (this.smoothed > SLOW_MS) {
      this.fastSince = null
      this.slowSince ??= now
      if (now - this.slowSince >= DROP_AFTER_S && this.tier < TIERS.length - 1) {
        this.drops[this.tier]++
        return this.change(this.tier + 1, now)
      }
    } else if (this.smoothed < FAST_MS) {
      this.slowSince = null
      this.fastSince ??= now
      const up = this.tier - 1
      if (now - this.fastSince >= RISE_AFTER_S && up >= 0 && this.drops[up] < 2) return this.change(up, now)
    } else {
      this.slowSince = null
      this.fastSince = null
    }
    return -1
  }

  private change(tier: number, now: number): number {
    this.tier = tier
    this.lastChange = now
    this.slowSince = null
    this.fastSince = null
    return tier
  }
}

export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0
  return Math.min(TIERS.length - 1, Math.max(0, Math.round(tier)))
}

/** `?tier=N` from a query string, or null. */
export function forcedTier(search: string): number | null {
  const value = new URLSearchParams(search).get('tier')
  if (value === null || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? clampTier(n) : null
}
