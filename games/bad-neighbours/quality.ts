// Adaptive quality. The street watches its own frames and steps between four
// tiers so it fits whatever device it lands on, without a device list.
// Stepping down counts missed frames in short windows (40 frames, or 2 s once
// a window holds a few), leaving out each window's single longest frame so a
// one-off pause never moves the tier; two bad windows, or one averaging over
// 26 ms, drop a tier, and a window far off the pace drops two. Stepping up
// needs six clean windows in which nine frames in ten did under 8 ms of work
// (the game's own CPU time, not the interval, which a 60 Hz display pins at
// 16.7 ms; the browser's own style and compositing come on top), and an
// upgrade that fails within a few windows becomes a ceiling for the session.
// Touch devices start one tier down while it learns. `?tier=N` pins a tier.

export type Tier = {
  /** Canvas pixel ratio cap (the canvas also keeps a total pixel budget). */
  dpr: number
  /** Pedestrians walking along the street. */
  walkers: number
  /** Buildings, nearest the top of the tower, whose residents animate; the rest show their façade. */
  livelyBuildings: number
  /** Dust and sparkle particles alive at once. */
  particles: number
  /** Books, socks, plants and parachuting residents in the air at once. */
  props: number
  /** 120 Hz physics steps one display frame may catch up. */
  maxSteps: number
}

export const TIERS: readonly Tier[] = [
  { dpr: 2, walkers: 9, livelyBuildings: 40, particles: 64, props: 72, maxSteps: 6 },
  { dpr: 1.5, walkers: 9, livelyBuildings: 16, particles: 48, props: 48, maxSteps: 5 },
  { dpr: 1.25, walkers: 5, livelyBuildings: 8, particles: 24, props: 24, maxSteps: 4 },
  { dpr: 1, walkers: 3, livelyBuildings: 4, particles: 12, props: 12, maxSteps: 3 },
]
export const LOWEST_TIER = TIERS.length - 1

/** A frame interval over this is a dropped frame (a 60 Hz frame is 16.7 ms). */
export const DROPPED_FRAME_MS = 20
export const WINDOW = 40
/** A window also closes after this much frame time once it holds a few frames, so a very slow device is judged in seconds. */
export const WINDOW_SECONDS = 2
const MIN_WINDOW_FRAMES = 4
/** After a tier change (and at start) this much is skipped unjudged: it pays for resized buffers. */
const SETTLE_FRAMES = 20
const SETTLE_MS = 500
const BAD_DROP_RATIO = 0.1
const TERRIBLE_AVERAGE_MS = 26
/** A window averaging over this is far off the pace and drops two tiers. */
const FAR_OFF_AVERAGE_MS = 34
/** Per-frame work that nine frames in ten of a clean window must stay under to count towards a step up. */
export const WORK_BUDGET_MS = 8
export const GOOD_WINDOWS_TO_RAISE = 6
/** A step down within this many windows of a step up means the upgrade failed. */
const FAILED_RAISE_WINDOWS = 8
/** A gap this long is a stall (a hidden tab, a paused debugger), not a slow device. */
export const STALL_MS = 1000

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
  return coarsePointer ? 1 : 0
}

export class TierGovernor {
  tier: number
  forced: boolean
  /** The best tier this session may climb back to; a failed upgrade lowers it. */
  ceiling = 0
  private frames = 0
  private elapsed = 0
  private readonly work = new Float64Array(WINDOW)
  private dropped = 0
  private longest = 0
  private badWindows = 0
  private goodWindows = 0
  private settling = true
  private windows = 0
  private lastRaise = -Infinity

  constructor(start: number, forced = false) {
    this.tier = clampTier(start)
    this.forced = forced
  }

  get settings(): Tier {
    return TIERS[this.tier]
  }

  /** Pin a tier, or pass null to go back to automatic. */
  force(tier: number | null): void {
    this.forced = tier !== null
    this.clear()
    this.settling = true
    if (tier !== null) this.tier = clampTier(tier)
  }

  /** Record one frame: its interval and the game's own work in it, in ms. Returns true when the tier changed. */
  sample(intervalMs: number, workMs: number): boolean {
    if (!(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.frames += 1
    this.elapsed += intervalMs
    this.work[this.frames - 1] = workMs
    if (intervalMs > DROPPED_FRAME_MS) this.dropped += 1
    if (intervalMs > this.longest) this.longest = intervalMs
    if (this.settling) {
      if (this.frames >= SETTLE_FRAMES || this.elapsed >= SETTLE_MS) {
        this.settling = false
        this.clear()
      }
      return false
    }
    if (this.frames < WINDOW && !(this.frames >= MIN_WINDOW_FRAMES && this.elapsed >= WINDOW_SECONDS * 1000)) return false
    return this.judge()
  }

  private judge(): boolean {
    // The window's longest frame is left out: one first-time build or GC pause says nothing about the device.
    const frames = this.frames - 1
    const average = (this.elapsed - this.longest) / frames
    const dropped = this.dropped - (this.longest > DROPPED_FRAME_MS ? 1 : 0)
    // Per-frame work, judged frame by frame: the 90th percentile, so a few heavy frames block a step up the way
    // they would block the next tier.
    const work = this.work.subarray(0, this.frames).sort()[Math.floor(this.frames * 0.9)]
    this.clear()
    this.windows += 1
    if (this.forced) return false
    if (dropped / frames > BAD_DROP_RATIO) {
      this.goodWindows = 0
      this.badWindows += 1
      if ((this.badWindows >= 2 || average > TERRIBLE_AVERAGE_MS) && this.tier < LOWEST_TIER) {
        if (this.windows - this.lastRaise <= FAILED_RAISE_WINDOWS) this.ceiling = Math.max(this.ceiling, this.tier + 1)
        return this.change(this.tier + (average > FAR_OFF_AVERAGE_MS ? 2 : 1))
      }
      return false
    }
    this.badWindows = 0
    this.goodWindows = dropped === 0 && work < WORK_BUDGET_MS ? this.goodWindows + 1 : 0
    if (this.goodWindows >= GOOD_WINDOWS_TO_RAISE && this.tier > this.ceiling) {
      this.lastRaise = this.windows
      return this.change(this.tier - 1)
    }
    return false
  }

  private clear(): void {
    this.frames = 0
    this.elapsed = 0
    this.dropped = 0
    this.longest = 0
  }

  private change(tier: number): boolean {
    this.tier = clampTier(tier)
    this.clear()
    this.badWindows = 0
    this.goodWindows = 0
    this.settling = true
    return true
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
