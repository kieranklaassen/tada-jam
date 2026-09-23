// Adaptive quality. Frame intervals from requestAnimationFrame decide the
// tier: a slow second drops one tier (two when it is very slow); a long run
// at the display's full rate tries the next tier up. A tier that has failed
// twice becomes a ceiling for the rest of the session, so the game never
// oscillates. Stalls and paced frames are skipped, and touch devices start
// one tier down.
// `?tier=N` pins a tier for testing.

export type Tier = {
  dpr: number
  /** Tilt-shift blur in the post pass. */
  blur: boolean
  /** The single full-screen pass (grade, vignette, blur). */
  post: boolean
  /**
   * The post pass draws the scene into a multisampled target, so its edges are
   * as smooth as the canvas's own (which is always multisampled). Top tier only:
   * on top of the canvas's samples it is a second multisampled surface.
   */
  msaa: boolean
  /** Fuzz shells: 3 bee + flowers + molehills, 2 bee + flowers, 1 bee, 0 none. */
  fuzz: 0 | 1 | 2 | 3
}

export const TIERS: readonly Tier[] = [
  { dpr: 2, blur: true, post: true, msaa: true, fuzz: 3 },
  { dpr: 1.5, blur: false, post: true, msaa: false, fuzz: 2 },
  { dpr: 1.25, blur: false, post: false, msaa: false, fuzz: 1 },
  { dpr: 1, blur: false, post: false, msaa: false, fuzz: 0 },
]

export const WINDOW_SECONDS = 1
export const SLOW_MS = 21
export const VERY_SLOW_MS = 34
export const FULL_RATE_MS = 18
export const UPGRADE_AFTER_SECONDS = 8
export const SETTLE_SECONDS = 0.6
/** A gap this long is a stall (a paused debugger, a tab switch the loop missed), not a slow device. */
export const STALL_MS = 1000

/**
 * Touch devices (tablets) start one tier down, so the first seconds never lag
 * while the controller learns; a fast one earns the top tier after
 * UPGRADE_AFTER_SECONDS at full rate.
 */
export function startingTier(coarsePointer: boolean): number {
  return coarsePointer ? 1 : 0
}

export class TierController {
  tier: number
  private readonly pinned: boolean
  private ceiling = 0
  private readonly failures = new Array<number>(TIERS.length).fill(0)
  private sum = 0
  private frames = 0
  private windowStart = 0
  private goodSince = 0
  private settleUntil = 0

  constructor(pinnedTier: number | null, now = 0, start = 0) {
    this.pinned = pinnedTier !== null
    this.tier = Math.min(TIERS.length - 1, Math.max(0, Math.round(pinnedTier ?? start)))
    this.windowStart = now
    this.goodSince = now
  }

  get current(): Tier {
    return TIERS[this.tier]
  }

  /** Feed one frame interval (ms) at time `now` (s). Returns true when the tier changed. */
  frame(intervalMs: number, now: number): boolean {
    if (this.pinned) return false
    if (now < this.settleUntil || intervalMs > STALL_MS) {
      this.skip(now)
      return false
    }
    this.sum += intervalMs
    this.frames += 1
    if (now - this.windowStart < WINDOW_SECONDS) return false
    const average = this.sum / this.frames
    this.sum = 0
    this.frames = 0
    this.windowStart = now
    if (average > SLOW_MS && this.tier < TIERS.length - 1) {
      this.failures[this.tier] += 1
      if (this.failures[this.tier] >= 2) this.ceiling = Math.max(this.ceiling, this.tier + 1)
      return this.set(Math.min(TIERS.length - 1, this.tier + (average > VERY_SLOW_MS ? 2 : 1)), now)
    }
    if (average > FULL_RATE_MS) this.goodSince = now
    else if (now - this.goodSince >= UPGRADE_AFTER_SECONDS && this.tier > this.ceiling) return this.set(this.tier - 1, now)
    return false
  }

  /**
   * An interval that says nothing about the device (a stall, or one spanning a
   * frame deliberately skipped while the meadow rests): start the measurement over.
   */
  skip(now: number): void {
    this.windowStart = now
    this.goodSince = now
    this.sum = 0
    this.frames = 0
  }

  private set(tier: number, now: number): boolean {
    if (tier === this.tier) return false
    this.tier = tier
    this.settleUntil = now + SETTLE_SECONDS
    this.goodSince = now
    return true
  }
}

export const PERF_FRAMES = 600

/** Rolling per-frame CPU time (update + render submit) and the renderer budget, for window.__jamPerf. */
export class PerfRecorder {
  private readonly samples = new Float32Array(PERF_FRAMES)
  private next = 0
  private filled = 0
  tier = 0
  drawCalls = 0
  triangles = 0

  push(ms: number): void {
    this.samples[this.next] = ms
    this.next = (this.next + 1) % PERF_FRAMES
    if (this.filled < PERF_FRAMES) this.filled += 1
  }

  reset(): void {
    this.next = 0
    this.filled = 0
  }

  /** Oldest first. Allocates, so it is only for the probe, never the frame loop. */
  list(): number[] {
    const out: number[] = []
    const start = this.filled < PERF_FRAMES ? 0 : this.next
    for (let i = 0; i < this.filled; i++) out.push(this.samples[(start + i) % PERF_FRAMES])
    return out
  }

  /** The most recent `count` samples into `out` (oldest first), for the overlay. */
  recent(out: Float32Array): number {
    const count = Math.min(out.length, this.filled)
    for (let i = 0; i < count; i++) out[i] = this.samples[(this.next - count + i + PERF_FRAMES) % PERF_FRAMES]
    return count
  }
}

export function parseTier(search: string): number | null {
  const value = new URLSearchParams(search).get('tier')
  if (value === null || value.trim() === '') return null
  const tier = Number(value)
  return Number.isInteger(tier) && tier >= 0 && tier < TIERS.length ? tier : null
}
