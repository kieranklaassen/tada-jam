// Adaptive quality (R13). Software GL on a build machine and an iPad GPU at
// DPR 2 differ by an order of magnitude, so the playroom watches its own
// frame intervals and steps down until frames fit, then cautiously back up.
// A smoothed interval must stay slow for a while before a drop and fast for
// much longer before a raise; a raise that is followed by a quick drop locks
// raising, so the tier never flickers.

export type Tier = {
  name: string
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** The warm grade and vignette overlay (the only full-screen pass). */
  grade: boolean
  /** Dust motes drifting in the window's sunbeam. */
  motes: number
  /** Verlet links in the kite's tail. */
  tail: number
  /** Physics catch-up substeps per frame. */
  substeps: number
}

export const TIERS: readonly Tier[] = [
  { name: 'full', dpr: 2, grade: true, motes: 40, tail: 14, substeps: 3 },
  { name: 'balanced', dpr: 1.5, grade: true, motes: 20, tail: 12, substeps: 3 },
  { name: 'lean', dpr: 1.25, grade: false, motes: 0, tail: 10, substeps: 2 },
  { name: 'minimal', dpr: 1, grade: false, motes: 0, tail: 8, substeps: 2 },
]
export const LOWEST_TIER = TIERS.length - 1

export const SLOW_MS = 20
export const FAST_MS = 13.5
export const WORK_BUDGET_MS = 8
export const SLOW_SECONDS = 1.5
export const FAST_SECONDS = 5
export const HOLD_SECONDS = 3
/** A drop this soon after a raise means the raise failed. */
const FAILED_RAISE_SECONDS = 8
const STALL_MS = 250
const SMOOTHING = 0.08

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(LOWEST_TIER, Math.round(tier)))
}

/** `?tier=N` pins a tier for testing; anything else is automatic. */
export function tierOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('tier')
  if (raw === null || raw.trim() === '' || !Number.isFinite(Number(raw))) return null
  return clampTier(Number(raw))
}

export class TierGovernor {
  tier: number
  forced: boolean
  private interval = 16.7
  private work = 1
  private slowFor = 0
  private fastFor = 0
  private holdUntil = 0
  private lastRaise = -Infinity
  private raiseLocked = false

  constructor(start: number, forced = false) {
    this.tier = clampTier(start)
    this.forced = forced
  }

  get settings(): Tier {
    return TIERS[this.tier]
  }

  /** Smoothed frame interval, ms. */
  get frameMs(): number {
    return this.interval
  }

  /** Record one frame at game time `now` (seconds). Returns true when the tier changed. */
  sample(intervalMs: number, workMs: number, now: number): boolean {
    if (!(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.interval += (intervalMs - this.interval) * SMOOTHING
    this.work += (workMs - this.work) * SMOOTHING
    if (this.forced) return false
    const dt = intervalMs / 1000
    if (this.interval > SLOW_MS) {
      this.fastFor = 0
      this.slowFor += dt
      if (this.slowFor >= SLOW_SECONDS && now >= this.holdUntil && this.tier < LOWEST_TIER) {
        if (now - this.lastRaise < FAILED_RAISE_SECONDS) this.raiseLocked = true
        return this.change(this.tier + 1, now)
      }
      return false
    }
    this.slowFor = Math.max(0, this.slowFor - dt)
    if (this.interval < FAST_MS && this.work < WORK_BUDGET_MS && !this.raiseLocked) {
      this.fastFor += dt
      if (this.fastFor >= FAST_SECONDS && now >= this.holdUntil && this.tier > 0) {
        this.lastRaise = now
        return this.change(this.tier - 1, now)
      }
    } else this.fastFor = 0
    return false
  }

  private change(tier: number, now: number): boolean {
    this.tier = tier
    this.slowFor = 0
    this.fastFor = 0
    this.holdUntil = now + HOLD_SECONDS
    // The first frames at a new tier pay for resized buffers; start the average fresh.
    this.interval = 16.7
    return true
  }
}

export const PERF_FRAMES = 600

/** The last 600 frames of CPU work (update plus render submit), without allocating per frame. */
export class PerfRing {
  private readonly samples = new Float64Array(PERF_FRAMES)
  private count = 0
  private next = 0

  push(ms: number): void {
    this.samples[this.next] = ms
    this.next = (this.next + 1) % PERF_FRAMES
    if (this.count < PERF_FRAMES) this.count += 1
  }

  /** Oldest first. Allocates, so only for the probe and the overlay. */
  ordered(): number[] {
    const out: number[] = []
    const start = (this.next - this.count + PERF_FRAMES) % PERF_FRAMES
    for (let i = 0; i < this.count; i++) out.push(this.samples[(start + i) % PERF_FRAMES])
    return out
  }

  /** The i-th most recent sample (0 = newest), for the bar graph. */
  recent(i: number): number {
    if (i >= this.count) return 0
    return this.samples[(this.next - 1 - i + PERF_FRAMES * 2) % PERF_FRAMES]
  }

  get size(): number {
    return this.count
  }

  reset(): void {
    this.count = 0
    this.next = 0
  }
}
