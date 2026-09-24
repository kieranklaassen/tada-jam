// Adaptive quality. The M4 desktop renders everything at 60 fps with room to
// spare; a mid-range iPad at DPR 2 is several times weaker on the GPU, and
// the owner saw heavy lag there. Rather than guess per device, the game
// watches its own frame times and steps quality down until frames fit, then
// cautiously back up. Hysteresis keeps it from flickering between tiers.

export type PostMode = 'full' | 'grade' | 'off'

export type QualitySettings = {
  name: string
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** Most fur shells a guest may draw; 0 falls back to the bare clay body. */
  furShells: number
  /** full: tilt-shift blur plus grade; grade: grade and vignette only; off: tone mapping in the renderer, no post pass. */
  post: PostMode
}

export const TIERS: readonly QualitySettings[] = [
  { name: 'full', dpr: 2, furShells: 6, post: 'full' },
  { name: 'balanced', dpr: 1.5, furShells: 3, post: 'full' },
  { name: 'lean', dpr: 1.25, furShells: 0, post: 'grade' },
  { name: 'minimal', dpr: 1, furShells: 0, post: 'off' },
]

export const LOWEST_TIER = TIERS.length - 1

/** A frame interval above this counts as a dropped frame (a 60 Hz frame is 16.7 ms; 120 Hz screens are fine at 60). */
export const DROPPED_FRAME_MS = 20
/** CPU work per frame (controller plus draw submission) must stay under this to step back up. */
export const WORK_BUDGET_MS = 8
const WINDOW = 40
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
  /** Draw calls and triangles in the last measured frame (all passes). */
  render = { calls: 0, triangles: 0 }
  private intervals: number[] = []
  private work: number[] = []
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

  /** Pin a tier (from the grown-up overlay), or pass null to go back to automatic. */
  force(tier: number | null): void {
    this.forced = tier !== null
    if (tier !== null) this.tier = clampTier(tier)
    this.reset()
  }

  /**
   * Record one frame: the interval since the previous frame and the CPU time
   * this frame's work took. Returns true when the tier changed.
   */
  sample(intervalMs: number, workMs: number): boolean {
    if (!(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.intervals.push(intervalMs)
    this.work.push(workMs)
    if (this.intervals.length < WINDOW) return false
    return this.evaluate()
  }

  private evaluate(): boolean {
    const intervals = this.intervals
    // One isolated long frame (a first-time build, a GC pause) says nothing about the device, so the window's
    // single longest frame is left out; two or more still count.
    const total = intervals.reduce((a, b) => a + b, 0)
    const longest = intervals.reduce((a, b) => Math.max(a, b), 0)
    const allDropped = intervals.filter((ms) => ms > DROPPED_FRAME_MS).length
    const average = (total - longest) / (intervals.length - 1)
    const dropped = allDropped - (longest > DROPPED_FRAME_MS ? 1 : 0)
    const work = this.work.reduce((a, b) => a + b, 0) / this.work.length
    this.last = { tier: this.tier, forced: this.forced, fps: (1000 * intervals.length) / total, frameMs: total / intervals.length, workMs: work, dropped: allDropped }
    this.intervals = []
    this.work = []
    this.windows += 1
    if (this.forced) return false
    if (this.settle > 0) {
      this.settle -= 1
      return false
    }
    const bad = dropped / WINDOW > BAD_DROP_RATIO
    if (bad) {
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
    this.intervals = []
    this.work = []
    this.badWindows = 0
    this.goodWindows = 0
    // The frame after a change pays for shader compiles and resized buffers.
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
