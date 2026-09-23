// Adaptive quality and the numbers a grown-up (or the jam's perf probe)
// can read. The forest measures its own frame intervals and steps down
// through four tiers when frames run long, then cautiously back up.
// Hysteresis keeps it from flickering: two slow windows to step down, six
// fast ones to step up, and a long wait after an up-step that failed.
// Everything here is allocation-free because it runs every frame.

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
const WINDOW = 45
const SLOW_MS = 20
const FAST_MS = 14.5
const SLOW_WINDOWS_TO_STEP_DOWN = 2
const FAST_WINDOWS_TO_STEP_UP = 6
const BLOCK_AFTER_FAILED_UP_SECONDS = 30
const FAILED_UP_WITHIN_SECONDS = 6
/** The first moments pay for shader compiles and texture uploads. */
const WARMUP_SECONDS = 1.5
/** Intervals this long mean the tab stalled or was hidden, not that rendering is slow. */
const STALL_MS = 250

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(TOP_TIER, Math.round(tier)))
}

export class FrameGovernor {
  tier: number
  readonly pinned: boolean
  private sum = 0
  private count = 0
  private slow = 0
  private fast = 0
  private skip = 0
  private upAt = -Infinity
  private blockedUntil = -Infinity

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
    this.sum += intervalMs
    this.count += 1
    if (this.count < WINDOW) return false
    const average = this.sum / this.count
    this.sum = 0
    this.count = 0
    if (this.skip > 0) {
      this.skip -= 1
      return false
    }
    if (average > SLOW_MS) {
      this.fast = 0
      this.slow += 1
      if (this.slow >= SLOW_WINDOWS_TO_STEP_DOWN && this.tier > 0) {
        if (now - this.upAt < FAILED_UP_WITHIN_SECONDS) this.blockedUntil = now + BLOCK_AFTER_FAILED_UP_SECONDS
        return this.change(this.tier - 1)
      }
      return false
    }
    this.slow = 0
    this.fast = average < FAST_MS ? this.fast + 1 : 0
    if (this.fast >= FAST_WINDOWS_TO_STEP_UP && this.tier < TOP_TIER && now >= this.blockedUntil) {
      this.upAt = now
      return this.change(this.tier + 1)
    }
    return false
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.slow = 0
    this.fast = 0
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
