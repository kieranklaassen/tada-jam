// Adaptive quality. The frame interval (not just CPU time, so GPU-bound
// frames count too) is smoothed and compared against two thresholds with
// hysteresis: a sustained slow stretch drops one tier (two when far off the
// pace), and only a long
// stretch of on-time frames with light CPU work climbs back (a 60 Hz display
// caps the interval at 16.7 ms, so only the work shows spare time). A tier
// that fails soon after being climbed into, or that had to be dropped twice,
// is not tried again. `?tier=N` pins a tier for testing.

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
/** Smoothed frames this slow are far off the pace: a drop skips a tier. */
export const VERY_SLOW_MS = 34
/** On time for a 60 Hz display (16.7 ms); climbing back also needs CPU work under LIGHT_WORK_MS. */
export const ON_TIME_MS = 18
/** CPU work per frame (update plus draw submission) must stay under this to climb back. */
export const LIGHT_WORK_MS = 8
/** A tier dropped within this long of being climbed into failed its upgrade and is not tried again. */
export const PROBATION_S = 5
export const DROP_AFTER_S = 1.5
export const RISE_AFTER_S = 8
export const COOLDOWN_S = 2
/** Only a gap this long is a stall (a tab switch, a paused debugger); a device at 2 to 4 fps must still count as slow. */
export const IGNORE_OVER_MS = 1000
const SMOOTHING = 0.12

export class TierController {
  tier: number
  readonly forced: boolean
  private smoothed = 1000 / 60
  private smoothedWork = 0
  private climbedAt = -Infinity
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

  /**
   * Feed one frame interval (ms) at time `now` (s), with that frame's CPU work
   * (ms). Returns the new tier when it changes, otherwise -1.
   */
  sample(frameMs: number, now: number, workMs = 0): number {
    if (this.forced || frameMs <= 0 || frameMs > IGNORE_OVER_MS) return -1
    this.smoothed += (frameMs - this.smoothed) * SMOOTHING
    this.smoothedWork += (workMs - this.smoothedWork) * SMOOTHING
    if (now - this.lastChange < COOLDOWN_S) return -1
    if (this.smoothed > SLOW_MS) {
      this.fastSince = null
      this.slowSince ??= now
      if (now - this.slowSince >= DROP_AFTER_S && this.tier < TIERS.length - 1) {
        this.drops[this.tier] = now - this.climbedAt < PROBATION_S ? 2 : this.drops[this.tier] + 1
        return this.change(Math.min(TIERS.length - 1, this.tier + (this.smoothed > VERY_SLOW_MS ? 2 : 1)), now)
      }
    } else if (this.smoothed < ON_TIME_MS && this.smoothedWork < LIGHT_WORK_MS) {
      this.slowSince = null
      this.fastSince ??= now
      const up = this.tier - 1
      if (now - this.fastSince >= RISE_AFTER_S && up >= 0 && this.drops[up] < 2) {
        this.climbedAt = now
        return this.change(up, now)
      }
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
