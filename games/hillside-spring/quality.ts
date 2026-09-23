// Adaptive quality (R13). A mid-range iPad at DPR 2 is several times weaker on
// the GPU than the machines this garden is built on, so rather than guess per
// device the garden watches its own frame times, steps quality down until
// frames fit, and creeps back up only with headroom. Same rules as Pebble
// Table's governor, so a grown-up reading either overlay sees the same thing.

export type QualitySettings = {
  name: string
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** Share of the slow additive light shafts drawn, most prominent first. Never zero: they are the look. */
  shafts: number
  /** Share of each particle burst that is drawn. */
  particles: number
  /** Grass and crops sway in the wind (vertex work in every painted material). */
  sway: boolean
}

export const TIERS: readonly QualitySettings[] = [
  { name: 'full', dpr: 2, shafts: 1, particles: 1, sway: true },
  { name: 'balanced', dpr: 1.5, shafts: 1, particles: 0.8, sway: true },
  { name: 'lean', dpr: 1.25, shafts: 0.5, particles: 0.55, sway: true },
  { name: 'minimal', dpr: 1, shafts: 0.5, particles: 0.3, sway: false },
]

export const LOWEST_TIER = TIERS.length - 1

/** A frame interval above this counts as dropped (a 60 Hz frame is 16.7 ms; 120 Hz screens are fine at 60). */
export const DROPPED_FRAME_MS = 20
/** CPU work per frame (controller plus draw submission) must stay under this to step back up. */
export const WORK_BUDGET_MS = 8
export const WINDOW = 40
const BAD_DROP_RATIO = 0.1
const TERRIBLE_AVERAGE_MS = 26
const GOOD_WINDOWS_TO_UPGRADE = 6
const MAX_GOOD_WINDOWS_TO_UPGRADE = 48
/** Intervals this long mean the tab stalled or was hidden, not that rendering is slow. */
const STALL_MS = 1000

export type GovernorStats = {
  tier: number
  forced: boolean
  fps: number
  frameMs: number
  workMs: number
  dropped: number
}

export class QualityGovernor {
  tier: number
  forced = false
  private intervals = 0
  private intervalSum = 0
  private workSum = 0
  private dropped = 0
  private badWindows = 0
  private goodWindows = 0
  private goodNeeded = GOOD_WINDOWS_TO_UPGRADE
  private settle = 1
  private lastUpgradeWindow = -Infinity
  private windows = 0
  private last: GovernorStats

  constructor(startTier: number) {
    this.tier = clampTier(startTier)
    this.last = { tier: this.tier, forced: false, fps: 0, frameMs: 0, workMs: 0, dropped: 0 }
  }

  get settings(): QualitySettings {
    return TIERS[this.tier]
  }

  get stats(): GovernorStats {
    return this.last
  }

  /** Pin a tier (from `?tier=N` or the grown-up overlay), or pass null to go back to automatic. */
  force(tier: number | null): void {
    this.forced = tier !== null
    if (tier !== null) this.tier = clampTier(tier)
    this.last = { ...this.last, tier: this.tier, forced: this.forced }
    this.reset()
  }

  /** Drop a half-measured window, for example when frame pacing changes. */
  restart(): void {
    this.intervals = 0
    this.intervalSum = 0
    this.workSum = 0
    this.dropped = 0
  }

  /** Record one frame: the interval since the previous frame and the CPU time its work took. Returns true when the tier changed. */
  sample(intervalMs: number, workMs: number): boolean {
    if (!(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.intervals += 1
    this.intervalSum += intervalMs
    this.workSum += workMs
    if (intervalMs > DROPPED_FRAME_MS) this.dropped += 1
    if (this.intervals < WINDOW) return false
    return this.evaluate()
  }

  private evaluate(): boolean {
    const average = this.intervalSum / this.intervals
    const work = this.workSum / this.intervals
    const dropped = this.dropped
    this.last = { tier: this.tier, forced: this.forced, fps: 1000 / average, frameMs: average, workMs: work, dropped }
    this.restart()
    this.windows += 1
    if (this.forced) return false
    if (this.settle > 0) {
      this.settle -= 1
      return false
    }
    if (dropped / WINDOW > BAD_DROP_RATIO) {
      this.goodWindows = 0
      this.badWindows += 1
      if ((this.badWindows >= 2 || average > TERRIBLE_AVERAGE_MS) && this.tier < LOWEST_TIER) {
        if (this.windows - this.lastUpgradeWindow <= 8) this.goodNeeded = Math.min(this.goodNeeded * 2, MAX_GOOD_WINDOWS_TO_UPGRADE)
        return this.change(this.tier + 1)
      }
      return false
    }
    this.badWindows = 0
    if (dropped === 0 && work < WORK_BUDGET_MS) this.goodWindows += 1
    else this.goodWindows = 0
    if (this.goodWindows >= this.goodNeeded && this.tier > 0) {
      this.lastUpgradeWindow = this.windows
      return this.change(this.tier - 1)
    }
    return false
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.last = { ...this.last, tier }
    this.reset()
    return true
  }

  private reset(): void {
    this.restart()
    this.badWindows = 0
    this.goodWindows = 0
    // The window after a change pays for shader compiles and resized buffers.
    this.settle = 1
  }
}

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(LOWEST_TIER, Math.round(tier)))
}

/** Start one tier down on touch devices: the first seconds should not lag while the governor learns. */
export function startingTier(coarsePointer: boolean): number {
  return coarsePointer ? 1 : 0
}
