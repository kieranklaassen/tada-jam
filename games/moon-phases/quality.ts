// Adaptive quality. The orrery watches its own frames and steps between four
// tiers so it fits whatever device it lands on, without a device list.
// Stepping down counts missed frames in short windows (40 frames, or 2 s once
// a window holds a few), leaving out each window's single longest frame so a
// one-off pause never moves the tier; two bad windows, or one averaging over
// 26 ms, drop a tier, and a window far off the pace drops two. Stepping up
// needs six clean windows in which nine frames in ten did under 8 ms of work
// (the game's own CPU time, not the interval, which a 60 Hz display pins at
// 16.7 ms; the browser's own style and compositing come on top). A fresh
// upgrade is on probation, judged on short windows: one bad window takes it
// back at once and makes it a ceiling for the session, so a failed upgrade
// costs well under a second; one that fails later doubles the wait before the
// next climb.
// Touch devices start one tier down while it learns. `?tier=N` pins a tier.

/**
 * The post chain: `full` is a shallow depth of field, bloom and the film grade; `bloom` is bloom alone; `plain`
 * is only the output pass (tone mapping and colour), with the lamp's glow carried by its sprites.
 */
export type Post = 'full' | 'bloom' | 'plain'

export type Tier = {
  /** Pixel ratio cap (the canvas also keeps a total pixel budget). */
  dpr: number
  post: Post
  /** The porthole's view is drawn every this many frames; the sky in it moves slowly. */
  windowEvery: number
  /** Frosted glass on the controls: a backdrop blur the compositor redoes every frame over a moving scene. */
  frosted: boolean
  /** Multisampling on the post target: the costliest thing at a large size, so only the top tier has it. */
  samples: number
  /** Blur levels in the bloom: five for the widest halo, three for a tighter one at eight passes fewer. */
  bloomMips: 3 | 5
}

export const TIERS: readonly Tier[] = [
  { dpr: 2, post: 'full', windowEvery: 1, frosted: true, samples: 4, bloomMips: 5 },
  { dpr: 1.5, post: 'bloom', windowEvery: 3, frosted: true, samples: 0, bloomMips: 3 },
  { dpr: 1.25, post: 'plain', windowEvery: 3, frosted: false, samples: 0, bloomMips: 3 },
  { dpr: 1, post: 'plain', windowEvery: 4, frosted: false, samples: 0, bloomMips: 3 },
]
export const LOWEST_TIER = TIERS.length - 1

/**
 * Which passes run after the scene for a post chain. `standing` is how far the camera is into the child's own
 * view (0 to 1); standing on Earth the whole sky is far away, so there is no miniature blur there.
 */
export function postPasses(post: Post, standing: number): { depthOfField: boolean; bloom: boolean; grade: boolean } {
  return { depthOfField: post === 'full' && standing < 0.5, bloom: post !== 'plain', grade: post === 'full' }
}

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
/** A raised tier that fails later doubles the clean stretch the next climb needs, up to this. */
const MAX_GOOD_WINDOWS_TO_RAISE = 48
/** A step down within this many windows after probation still means the upgrade failed. */
const FAILED_RAISE_WINDOWS = 8
/** A fresh upgrade is judged on windows this short, this many times; one bad window takes it back. */
const PROBATION_WINDOW = 12
const PROBATION_WINDOW_MS = 300
const PROBATION_WINDOWS = 8
/** A fresh upgrade settles only briefly: every tier's programs are compiled ahead, so only a resize costs a frame. */
const PROBATION_SETTLE_FRAMES = 4
const PROBATION_SETTLE_MS = 100
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
  private settleFrames = SETTLE_FRAMES
  private settleMs = SETTLE_MS
  private probation = 0
  private goodNeeded = GOOD_WINDOWS_TO_RAISE
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
    if (!(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.frames += 1
    this.elapsed += intervalMs
    this.work[this.frames - 1] = workMs
    if (intervalMs > DROPPED_FRAME_MS) this.dropped += 1
    if (intervalMs > this.longest) this.longest = intervalMs
    if (this.settling) {
      if (this.frames >= this.settleFrames || this.elapsed >= this.settleMs) {
        this.settling = false
        this.clear()
      }
      return false
    }
    const size = this.probation > 0 ? PROBATION_WINDOW : WINDOW
    const closeMs = this.probation > 0 ? PROBATION_WINDOW_MS : WINDOW_SECONDS * 1000
    if (this.frames < size && !(this.frames >= MIN_WINDOW_FRAMES && this.elapsed >= closeMs)) return false
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
    if (this.probation > 0) {
      this.probation -= 1
      if (dropped / frames > BAD_DROP_RATIO) {
        this.probation = 0
        this.ceiling = Math.max(this.ceiling, this.tier + 1)
        return this.change(this.tier + 1)
      }
      if (this.probation === 0) this.lastRaise = this.windows
      return false
    }
    if (dropped / frames > BAD_DROP_RATIO) {
      this.goodWindows = 0
      this.badWindows += 1
      if ((this.badWindows >= 2 || average > TERRIBLE_AVERAGE_MS) && this.tier < LOWEST_TIER) {
        if (this.windows - this.lastRaise <= FAILED_RAISE_WINDOWS) this.ceiling = Math.max(this.ceiling, this.tier + 1)
        if (this.tier === this.raisedTo) this.goodNeeded = Math.min(this.goodNeeded * 2, MAX_GOOD_WINDOWS_TO_RAISE)
        return this.change(this.tier + (average > FAR_OFF_AVERAGE_MS ? 2 : 1))
      }
      return false
    }
    this.badWindows = 0
    this.goodWindows = dropped === 0 && work < WORK_BUDGET_MS ? this.goodWindows + 1 : 0
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
    this.probation = raise ? PROBATION_WINDOWS : 0
    if (raise) this.raisedTo = this.tier
    return true
  }

  private settle(afterRaise: boolean): void {
    this.settling = true
    this.settleFrames = afterRaise ? PROBATION_SETTLE_FRAMES : SETTLE_FRAMES
    this.settleMs = afterRaise ? PROBATION_SETTLE_MS : SETTLE_MS
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
