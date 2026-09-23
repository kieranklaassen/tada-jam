// Adaptive quality (KTD8). The game watches its own frame intervals and steps
// down a tier when the median frame of a window is slow, and back up only
// after a calm stretch that doubles every time it has had to step down, so it
// never flickers between tiers. `?tier=N` pins a tier for measuring.

export type Tier = {
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** Drifting dusk motes. */
  motes: number
  /** Dither in the sky gradient against banding. */
  dither: boolean
}

// The door's halo is the scene's want and the lantern's is the wanderer's
// identity: both stay at every tier, since each is one small quad.
export const TIERS: readonly Tier[] = [
  { dpr: 2, motes: 48, dither: true },
  { dpr: 1.5, motes: 24, dither: true },
  { dpr: 1.25, motes: 0, dither: false },
  { dpr: 1, motes: 0, dither: false },
]

export const LOWEST = TIERS.length - 1
export const WINDOW = 90
/** A window also closes after this long, so a slow device is judged in a second and a half, not after ninety of its frames. */
export const WINDOW_MS = 1500
const MIN_WINDOW = 12
/** Page load is noisy, so the first stretch is not judged. */
export const START_SETTLE_MS = 1500
/** After a change only the resize hitch is skipped, so a device that is slow at every tier reaches the lowest in seconds. */
export const CHANGE_SETTLE_MS = 500
export const SLOW_MEDIAN_MS = 19
const CALM_MEDIAN_MS = 17.6
const CALM_CPU_MS = 6
const FIRST_CALM_WINDOWS = 4
const MAX_CALM_WINDOWS = 32
/** Intervals this long mean the tab stalled or was hidden, not that drawing is slow. A software-rendered device can take 300 ms a frame, and that must still count. */
export const STALL_MS = 1000

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(LOWEST, Math.round(tier)))
}

/** Touch devices (tablets) start one tier down, so the first seconds on an iPad never lag while the governor learns; a fast one earns the top tier. */
export function startingTier(coarsePointer: boolean): number {
  return coarsePointer ? 1 : 0
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
  private elapsed = 0
  private settleMs = START_SETTLE_MS
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
    if (this.settleMs > 0) {
      this.settleMs -= intervalMs
      return false
    }
    this.intervals[this.count] = intervalMs
    this.work[this.count] = workMs
    this.count += 1
    this.elapsed += intervalMs
    if (this.count < WINDOW && (this.elapsed < WINDOW_MS || this.count < MIN_WINDOW)) return false
    const n = this.count
    this.count = 0
    this.elapsed = 0
    const median = this.quantile(this.intervals, n, 0.5)
    const cpu = this.quantile(this.work, n, 0.9)
    if (median > SLOW_MEDIAN_MS && this.tier < LOWEST) {
      this.calmNeeded = Math.min(MAX_CALM_WINDOWS, this.calmNeeded * 2)
      return this.change(this.tier + 1)
    }
    if (median < CALM_MEDIAN_MS && cpu < CALM_CPU_MS) this.calmWindows += 1
    else this.calmWindows = 0
    if (this.calmWindows >= this.calmNeeded && this.tier > 0) return this.change(this.tier - 1)
    return false
  }

  /** Insertion sort into the scratch buffer: at most WINDOW values, and no allocation. */
  private quantile(values: Float32Array, n: number, q: number): number {
    const sorted = this.scratch
    for (let i = 0; i < n; i++) {
      const value = values[i]
      let j = i - 1
      while (j >= 0 && sorted[j] > value) {
        sorted[j + 1] = sorted[j]
        j -= 1
      }
      sorted[j + 1] = value
    }
    return sorted[Math.min(n - 1, Math.floor(n * q))]
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.calmWindows = 0
    this.settleMs = CHANGE_SETTLE_MS
    return true
  }
}
