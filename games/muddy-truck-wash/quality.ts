// template: cartridge/quality.ts v2 (frozen: do not edit; tune through config.ts)
import { GOVERNOR, TIERS, type Tier } from './config'

// Adaptive quality. The game watches its own frames and steps between the
// tiers in config.ts so it fits whatever device it lands on, without a device
// list. Tiers count from 0, which is full quality.
// Stepping down counts missed frames in short windows, leaving out each
// window's single longest frame so a one-off pause never moves the tier; two
// bad windows, or one with a terrible average, drop a tier, and a window far
// off the pace drops two. Stepping up needs a run of clean windows in which
// nine frames in ten did little work (the game's own CPU time, not the
// interval, which a 60 Hz display pins at 16.7 ms; the browser's own style and
// compositing come on top). A fresh upgrade is on probation, judged on short
// windows: one bad window takes it back at once and makes it a ceiling for the
// session, so a failed upgrade costs well under a second; one that fails later
// doubles the wait before the next climb.
// Touch devices start one tier down while it learns. `?tier=N` pins a tier.

export const LOWEST_TIER = TIERS.length - 1

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(LOWEST_TIER, Math.round(tier)))
}

/** `?tier=N` pins a tier for measurement; anything else is automatic. */
export function tierOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('tier')
  if (raw === null || raw.trim() === '' || !Number.isFinite(Number(raw))) return null
  return clampTier(Number(raw))
}

/** Touch devices start one tier down, so a child's first seconds never lag while the governor learns. */
export function startingTier(coarsePointer: boolean): number {
  return coarsePointer ? clampTier(1) : 0
}

export class TierGovernor {
  tier: number
  forced: boolean
  /** The best tier this session may climb back to; a failed upgrade lowers it. */
  ceiling = 0
  private frames = 0
  private elapsed = 0
  private readonly work = new Float64Array(Math.max(GOVERNOR.windowFrames, GOVERNOR.probationWindowFrames, GOVERNOR.settleFrames))
  private dropped = 0
  private longest = 0
  private badWindows = 0
  private goodWindows = 0
  private settling = true
  private settleFrames: number = GOVERNOR.settleFrames
  private settleMs: number = GOVERNOR.settleMs
  private probation = 0
  private goodNeeded: number = GOVERNOR.goodWindowsToRaise
  private raisedTo = -1
  private windows = 0
  private lastRaise = -Infinity

  /** `ceiling` is the best tier the device may ever reach (a look it has no budget for stays out of reach). */
  constructor(start: number, forced = false, ceiling = 0) {
    this.ceiling = clampTier(ceiling)
    this.tier = Math.max(this.ceiling, clampTier(start))
    if (forced) this.tier = clampTier(start)
    this.forced = forced
  }

  get settings(): Tier {
    return TIERS[this.tier]
  }

  /** Pin a tier, or pass null to go back to automatic. */
  force(tier: number | null): void {
    this.forced = tier !== null
    this.clear()
    this.settle(false)
    if (tier !== null) this.tier = clampTier(tier)
  }

  /** Record one frame: its interval and the game's own work in it, in ms. Returns true when the tier changed. */
  sample(intervalMs: number, workMs: number): boolean {
    if (!(intervalMs > 0) || intervalMs > GOVERNOR.stallMs) return false
    this.frames += 1
    this.elapsed += intervalMs
    this.work[this.frames - 1] = workMs
    if (intervalMs > GOVERNOR.droppedFrameMs) this.dropped += 1
    if (intervalMs > this.longest) this.longest = intervalMs
    if (this.settling) {
      if (this.frames >= this.settleFrames || this.elapsed >= this.settleMs) {
        this.settling = false
        this.clear()
      }
      return false
    }
    const size = this.probation > 0 ? GOVERNOR.probationWindowFrames : GOVERNOR.windowFrames
    const closeMs = this.probation > 0 ? GOVERNOR.probationWindowMs : GOVERNOR.windowMs
    if (this.frames < size && !(this.frames >= GOVERNOR.minWindowFrames && this.elapsed >= closeMs)) return false
    return this.judge()
  }

  private judge(): boolean {
    // The window's longest frame is left out: one first-time build or GC pause says nothing about the device.
    const frames = this.frames - 1
    const average = (this.elapsed - this.longest) / frames
    const dropped = this.dropped - (this.longest > GOVERNOR.droppedFrameMs ? 1 : 0)
    // Per-frame work, judged frame by frame: the 90th percentile, so a few heavy frames block a step up the way
    // they would block the next tier.
    const work = this.work.subarray(0, this.frames).sort()[Math.floor(this.frames * 0.9)]
    this.clear()
    this.windows += 1
    if (this.forced) return false
    if (this.probation > 0) {
      this.probation -= 1
      if (dropped / frames > GOVERNOR.badDropRatio) {
        this.probation = 0
        this.ceiling = Math.max(this.ceiling, this.tier + 1)
        return this.change(this.tier + 1)
      }
      if (this.probation === 0) this.lastRaise = this.windows
      return false
    }
    if (dropped / frames > GOVERNOR.badDropRatio) {
      this.goodWindows = 0
      this.badWindows += 1
      if ((this.badWindows >= 2 || average > GOVERNOR.terribleAverageMs) && this.tier < LOWEST_TIER) {
        if (this.windows - this.lastRaise <= GOVERNOR.failedRaiseWindows) this.ceiling = Math.max(this.ceiling, this.tier + 1)
        if (this.tier === this.raisedTo) this.goodNeeded = Math.min(this.goodNeeded * 2, GOVERNOR.maxGoodWindowsToRaise)
        return this.change(this.tier + (average > GOVERNOR.farOffAverageMs ? 2 : 1))
      }
      return false
    }
    this.badWindows = 0
    this.goodWindows = dropped === 0 && work < GOVERNOR.workBudgetMs ? this.goodWindows + 1 : 0
    if (this.goodWindows >= this.goodNeeded && this.tier > this.ceiling) return this.change(this.tier - 1, true)
    return false
  }

  private clear(): void {
    this.frames = 0
    this.elapsed = 0
    this.dropped = 0
    this.longest = 0
  }

  private change(tier: number, raise = false): boolean {
    this.tier = clampTier(tier)
    this.clear()
    this.badWindows = 0
    this.goodWindows = 0
    this.settle(raise)
    this.probation = raise ? GOVERNOR.probationWindows : 0
    if (raise) this.raisedTo = this.tier
    return true
  }

  private settle(afterRaise: boolean): void {
    this.settling = true
    this.settleFrames = afterRaise ? GOVERNOR.probationSettleFrames : GOVERNOR.settleFrames
    this.settleMs = afterRaise ? GOVERNOR.probationSettleMs : GOVERNOR.settleMs
  }
}

export const PERF_FRAMES = 600

/** The last 600 frames of the game's own work, without allocating per frame. */
export class PerfRing {
  private readonly samples = new Float64Array(PERF_FRAMES)
  private count = 0
  private next = 0

  push(ms: number): void {
    this.samples[this.next] = ms
    this.next = (this.next + 1) % PERF_FRAMES
    if (this.count < PERF_FRAMES) this.count += 1
  }

  /** Oldest first. Allocates, so only for the probe. */
  ordered(): number[] {
    const out: number[] = []
    const start = (this.next - this.count + PERF_FRAMES) % PERF_FRAMES
    for (let i = 0; i < this.count; i++) out.push(this.samples[(start + i) % PERF_FRAMES])
    return out
  }

  reset(): void {
    this.count = 0
    this.next = 0
  }
}
