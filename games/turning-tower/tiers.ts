// Adaptive quality (KTD8). The game watches its own frame intervals and steps
// down a tier when the median frame of a window is slow, and back up only
// after a calm stretch that doubles every time it has had to step down, so it
// never flickers between tiers. `?tier=N` pins a tier for measuring.

export type Tier = {
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** Drifting dusk motes. */
  motes: number
  /** Distant faceted spires in the sky. */
  silhouettes: boolean
  /** Dither in the sky gradient against banding. */
  dither: boolean
  /** Soft halos around the lantern and the door. */
  halos: boolean
}

export const TIERS: readonly Tier[] = [
  { dpr: 2, motes: 48, silhouettes: true, dither: true, halos: true },
  { dpr: 1.5, motes: 24, silhouettes: true, dither: true, halos: true },
  { dpr: 1.25, motes: 0, silhouettes: false, dither: false, halos: true },
  { dpr: 1, motes: 0, silhouettes: false, dither: false, halos: false },
]

export const LOWEST = TIERS.length - 1
export const WINDOW = 90
export const SLOW_MEDIAN_MS = 19
const CALM_MEDIAN_MS = 17.6
const CALM_CPU_MS = 6
const FIRST_CALM_WINDOWS = 4
const MAX_CALM_WINDOWS = 32
/** Intervals this long mean the tab stalled or was hidden, not that drawing is slow. */
const STALL_MS = 250

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(LOWEST, Math.round(tier)))
}

/** `?tier=N` from a query string, or null. */
export function pinnedTier(search: string): number | null {
  const match = /[?&]tier=(\d)/.exec(search)
  return match ? clampTier(Number(match[1])) : null
}

export class TierGovernor {
  tier: number
  readonly pinned: boolean
  private readonly intervals = new Float32Array(WINDOW)
  private readonly work = new Float32Array(WINDOW)
  private readonly scratch = new Float32Array(WINDOW)
  private count = 0
  private settle = 1
  private calmWindows = 0
  private calmNeeded = FIRST_CALM_WINDOWS

  constructor(start: number, pinned: number | null = null) {
    this.pinned = pinned !== null
    this.tier = clampTier(pinned ?? start)
  }

  get settings(): Tier {
    return TIERS[this.tier]
  }

  /** One frame: the interval since the last frame and this frame's CPU work. True when the tier changed. */
  sample(intervalMs: number, workMs: number): boolean {
    if (this.pinned || !(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.intervals[this.count] = intervalMs
    this.work[this.count] = workMs
    this.count += 1
    if (this.count < WINDOW) return false
    this.count = 0
    if (this.settle > 0) {
      this.settle -= 1
      return false
    }
    const median = this.quantile(this.intervals, 0.5)
    const cpu = this.quantile(this.work, 0.9)
    if (median > SLOW_MEDIAN_MS && this.tier < LOWEST) {
      this.calmNeeded = Math.min(MAX_CALM_WINDOWS, this.calmNeeded * 2)
      return this.change(this.tier + 1)
    }
    if (median < CALM_MEDIAN_MS && cpu < CALM_CPU_MS) this.calmWindows += 1
    else this.calmWindows = 0
    if (this.calmWindows >= this.calmNeeded && this.tier > 0) return this.change(this.tier - 1)
    return false
  }

  private quantile(values: Float32Array, q: number): number {
    this.scratch.set(values)
    this.scratch.sort()
    return this.scratch[Math.min(WINDOW - 1, Math.floor(WINDOW * q))]
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.calmWindows = 0
    // The window after a change pays for resized buffers.
    this.settle = 1
    return true
  }
}
