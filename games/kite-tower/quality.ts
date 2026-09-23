// Adaptive quality (R13). Software GL on a build machine and an iPad GPU at
// DPR 2 differ by an order of magnitude, so the playroom watches its own
// frame intervals and steps down until frames fit, then cautiously back up.
// The thresholds are Pebble Table's: frames are judged in windows of 40, a
// window with more than one frame in ten over 20 ms is bad, two bad windows
// in a row (or one averaging over 26 ms) step down, and six clean windows
// within the CPU budget step up, twice as many after a step up that failed.

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

/** A frame interval above this counts as a dropped frame (a 60 Hz frame is 16.7 ms). */
export const DROPPED_FRAME_MS = 20
/** CPU work per frame (controller plus draw submission) must stay under this to step back up. */
export const WORK_BUDGET_MS = 8
export const WINDOW = 40
/** A window also closes after this much frame time once it holds a few frames, so a device under 20 fps is judged in seconds, not minutes. */
export const WINDOW_SECONDS = 2
const MIN_WINDOW_FRAMES = 4
const BAD_DROP_RATIO = 0.1
const TERRIBLE_AVERAGE_MS = 26
export const GOOD_WINDOWS_TO_RAISE = 6
const MAX_GOOD_WINDOWS_TO_RAISE = 48
/** A step up followed by a step down within this many windows failed. */
const FAILED_RAISE_WINDOWS = 8
/** Intervals this long mean the tab stalled or was hidden, not that rendering is slow. */
export const STALL_MS = 1000

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
  private frames = 0
  private elapsed = 0
  private workSum = 0
  private dropped = 0
  private badWindows = 0
  private goodWindows = 0
  private goodNeeded = GOOD_WINDOWS_TO_RAISE
  private settle = 1
  private windows = 0
  private lastRaise = -Infinity
  private average = 16.7

  constructor(start: number, forced = false) {
    this.tier = clampTier(start)
    this.forced = forced
  }

  get settings(): Tier {
    return TIERS[this.tier]
  }

  /** Average frame interval of the last judged window, ms. */
  get frameMs(): number {
    return this.average
  }

  /** Dropped frames and all frames in the last judged window, for the grown-up overlay. */
  lastDropped = 0
  lastFrames = 0

  /** Pin a tier from the grown-up overlay, or pass null to go back to automatic. */
  force(tier: number | null): void {
    if (tier === null) {
      this.forced = false
      this.clear()
      this.settle = 1
      return
    }
    this.forced = true
    if (clampTier(tier) !== this.tier) this.change(clampTier(tier))
  }

  /** Record one frame: its interval and its CPU work, in ms. Returns true when the tier changed. */
  sample(intervalMs: number, workMs: number): boolean {
    if (!(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.frames += 1
    this.elapsed += intervalMs
    this.workSum += workMs
    if (intervalMs > DROPPED_FRAME_MS) this.dropped += 1
    if (this.frames < WINDOW && !(this.frames >= MIN_WINDOW_FRAMES && this.elapsed >= WINDOW_SECONDS * 1000)) return false
    return this.judge()
  }

  private judge(): boolean {
    const average = this.elapsed / this.frames
    const bad = this.dropped / this.frames > BAD_DROP_RATIO
    const clean = this.dropped === 0 && this.workSum / this.frames < WORK_BUDGET_MS
    this.average = average
    this.lastDropped = this.dropped
    this.lastFrames = this.frames
    this.clear()
    this.windows += 1
    if (this.forced) return false
    if (this.settle > 0) {
      this.settle -= 1
      return false
    }
    if (bad) {
      this.goodWindows = 0
      this.badWindows += 1
      if ((this.badWindows >= 2 || average > TERRIBLE_AVERAGE_MS) && this.tier < LOWEST_TIER) {
        if (this.windows - this.lastRaise <= FAILED_RAISE_WINDOWS) this.goodNeeded = Math.min(this.goodNeeded * 2, MAX_GOOD_WINDOWS_TO_RAISE)
        return this.change(this.tier + 1)
      }
      return false
    }
    this.badWindows = 0
    this.goodWindows = clean ? this.goodWindows + 1 : 0
    if (this.goodWindows >= this.goodNeeded && this.tier > 0) {
      this.lastRaise = this.windows
      return this.change(this.tier - 1)
    }
    return false
  }

  private clear(): void {
    this.frames = 0
    this.elapsed = 0
    this.workSum = 0
    this.dropped = 0
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.clear()
    this.badWindows = 0
    this.goodWindows = 0
    // The first window at a new tier pays for shader compiles and resized buffers.
    this.settle = 1
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
