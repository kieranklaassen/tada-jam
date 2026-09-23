// Adaptive quality and the numbers a grown-up (or the jam's perf probe)
// can read. The forest watches its own frame intervals in half-second
// windows and counts how many frames missed the pace. It steps down
// through four tiers when too many frames run long, and cautiously back up
// after a long stretch with none. Hysteresis keeps it from flickering: two
// slow windows to step down, six clean ones to step up, and a wait that
// doubles after each up-step that failed. A window where nearly every frame
// is far off the pace steps down at once (two tiers when frames crawl), so
// a weak device reaches a tier it can carry within a few seconds. Counting
// missed frames rather than averaging them means one long hiccup cannot
// look like a slow device. Everything here is allocation-free because it
// runs every frame.

export type Tier = {
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** The paper-and-wobble post pass. */
  post: boolean
  /** Fireflies drifting over the clearing. */
  fireflies: number
  /** Share of the particle pool in use. */
  particles: number
}

/** Tier 3 is the full look; tier 0 is the lightest. */
export const TIERS: readonly Tier[] = [
  { dpr: 1, post: false, fireflies: 0, particles: 0.5 },
  { dpr: 1.25, post: true, fireflies: 6, particles: 1 },
  { dpr: 1.5, post: true, fireflies: 12, particles: 1 },
  { dpr: 2, post: true, fireflies: 12, particles: 1 },
]

export const TOP_TIER = TIERS.length - 1
const WINDOW_MS = 500
const MIN_WINDOW_FRAMES = 3
/** A frame interval above this missed the pace (a 60 Hz frame is 16.7 ms). */
const SLOW_MS = 20
const VERY_SLOW_MS = 40
const CRAWL_MS = 80
/** Share of missed frames that makes a window slow. */
const SLOW_SHARE = 0.25
/** A clean window may still hold this share of missed frames (one in fifty). */
const CLEAN_SHARE = 0.02
/** Share of very slow frames that steps down without waiting for a second window. */
const VERY_SLOW_SHARE = 0.75
const SLOW_WINDOWS_TO_STEP_DOWN = 2
const CLEAN_WINDOWS_TO_STEP_UP = 6
const FIRST_BLOCK_SECONDS = 30
const LONGEST_BLOCK_SECONDS = 240
const FAILED_UP_WITHIN_SECONDS = 6
/** The first moments pay for shader compiles and texture uploads. */
const WARMUP_SECONDS = 1.5
/** Intervals this long mean the tab stalled or was hidden, not that rendering is slow. */
const STALL_MS = 1000

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(TOP_TIER, Math.round(tier)))
}

export class FrameGovernor {
  tier: number
  readonly pinned: boolean
  private elapsed = 0
  private count = 0
  private missed = 0
  private verySlow = 0
  private crawling = 0
  private slow = 0
  private clean = 0
  private skip = 0
  private upAt = -Infinity
  private blockedUntil = -Infinity
  private blockSeconds = FIRST_BLOCK_SECONDS

  constructor(startTier: number, pinned = false) {
    this.tier = clampTier(startTier)
    this.pinned = pinned
  }

  get settings(): Tier {
    return TIERS[this.tier]
  }

  /** Record one frame interval at `now` seconds. Returns true when the tier changed. */
  sample(intervalMs: number, now: number): boolean {
    if (this.pinned || now < WARMUP_SECONDS || !(intervalMs > 0) || intervalMs > STALL_MS) return false
    this.elapsed += intervalMs
    this.count += 1
    if (intervalMs > SLOW_MS) this.missed += 1
    if (intervalMs > VERY_SLOW_MS) this.verySlow += 1
    if (intervalMs > CRAWL_MS) this.crawling += 1
    if (this.elapsed < WINDOW_MS || this.count < MIN_WINDOW_FRAMES) return false
    const missedShare = this.missed / this.count
    const verySlowShare = this.verySlow / this.count
    const crawlShare = this.crawling / this.count
    this.elapsed = 0
    this.count = 0
    this.missed = 0
    this.verySlow = 0
    this.crawling = 0
    if (this.skip > 0) {
      this.skip -= 1
      return false
    }
    if (verySlowShare >= VERY_SLOW_SHARE && this.tier > 0) return this.stepDown(crawlShare >= VERY_SLOW_SHARE ? 2 : 1, now)
    if (missedShare >= SLOW_SHARE) {
      this.clean = 0
      this.slow += 1
      if (this.slow >= SLOW_WINDOWS_TO_STEP_DOWN && this.tier > 0) return this.stepDown(1, now)
      return false
    }
    this.slow = 0
    this.clean = missedShare <= CLEAN_SHARE ? this.clean + 1 : 0
    if (this.clean >= CLEAN_WINDOWS_TO_STEP_UP && this.tier < TOP_TIER && now >= this.blockedUntil) {
      this.upAt = now
      return this.change(this.tier + 1)
    }
    return false
  }

  private stepDown(tiers: number, now: number): boolean {
    if (now - this.upAt < FAILED_UP_WITHIN_SECONDS) {
      this.blockedUntil = now + this.blockSeconds
      this.blockSeconds = Math.min(LONGEST_BLOCK_SECONDS, this.blockSeconds * 2)
    }
    return this.change(Math.max(0, this.tier - tiers))
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.slow = 0
    this.clean = 0
    this.skip = 1
    return true
  }
}

/** The last `capacity` values, oldest first when read. */
export class Ring {
  private readonly data: Float32Array
  private head = 0
  private size = 0

  constructor(capacity: number) {
    this.data = new Float32Array(capacity)
  }

  push(value: number): void {
    this.data[this.head] = value
    this.head = (this.head + 1) % this.data.length
    if (this.size < this.data.length) this.size += 1
  }

  get length(): number {
    return this.size
  }

  /** The i-th most recent value (0 = newest). */
  recent(i: number): number {
    const n = this.data.length
    return this.data[(this.head - 1 - i + n * 2) % n]
  }

  values(): number[] {
    const out: number[] = []
    for (let i = this.size - 1; i >= 0; i--) out.push(this.recent(i))
    return out
  }

  reset(): void {
    this.head = 0
    this.size = 0
  }
}

/** Parse `?tier=N` (pins a tier), `?fps=1` (the grown-up frame graph), and `?walk=1` (the scripted-walkthrough hook). */
export function perfOptions(search: string): { tier: number | null; overlay: boolean; walk: boolean } {
  const params = new URLSearchParams(search)
  const raw = params.get('tier')
  const tier = raw === null || raw === '' || !Number.isFinite(Number(raw)) ? null : clampTier(Number(raw))
  return { tier, overlay: params.get('fps') === '1', walk: params.get('walk') === '1' }
}
