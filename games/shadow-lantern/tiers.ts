// Adaptive quality. A mid-range iPad at DPR 2 is several times weaker on the
// GPU than a desktop, so rather than guess per device the theatre watches its
// own frame intervals and steps down until frames fit, then cautiously back
// up. Hysteresis (different thresholds and hold times each way, and a longer
// wait after an upgrade that did not stick) keeps it from flickering.

export type TierSettings = {
  name: string
  /** Device pixel ratio cap (never above the screen's own). */
  dpr: number
  /** Dust motes drifting in the lamp's beam. */
  motes: number
  /** Stars that twinkle (the rest stay still). */
  twinkle: boolean
  /** The soft penumbra ring around every shadow. */
  penumbra: boolean
  /** The lamp's additive halo and the guidance glow rings. */
  halo: boolean
}

export const TIERS: readonly TierSettings[] = [
  { name: 'full', dpr: 2, motes: 36, twinkle: true, penumbra: true, halo: true },
  { name: 'balanced', dpr: 1.5, motes: 18, twinkle: true, penumbra: true, halo: true },
  { name: 'lean', dpr: 1.25, motes: 0, twinkle: false, penumbra: true, halo: true },
  { name: 'minimal', dpr: 1, motes: 0, twinkle: false, penumbra: false, halo: false },
]

export const LOWEST_TIER = TIERS.length - 1

/** Smoothed frame interval above this is too slow (a 60 Hz frame is 16.7 ms). */
export const SLOW_MS = 21
/** Smoothed frame interval under this, with CPU work under WORK_BUDGET_MS, is comfortable. */
export const FAST_MS = 17.8
export const WORK_BUDGET_MS = 8
const DOWN_AFTER_S = 1.5
const UP_AFTER_S = 6
const MAX_UP_AFTER_S = 48
/** Intervals this long mean the tab stalled or was hidden, not that rendering is slow. */
const STALL_MS = 1000

export function clampTier(tier: number): number {
  return Math.max(0, Math.min(LOWEST_TIER, Math.round(tier)))
}

/** `?tier=N` pins a tier for testing; anything else means automatic. */
export function tierOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('tier')
  if (raw === null || raw.trim() === '' || !Number.isFinite(Number(raw))) return null
  return clampTier(Number(raw))
}

/** Touch devices start one tier down so the first seconds do not lag while the governor learns. */
export function startingTier(coarsePointer: boolean): number {
  return coarsePointer ? 1 : 0
}

export class TierGovernor {
  tier: number
  readonly forced: boolean
  private ema = 16.7
  private slowFor = 0
  private fastFor = 0
  private upAfter = UP_AFTER_S
  private sinceUpgrade = Infinity
  private settle = 3

  constructor(startTier: number, forced: number | null = null) {
    this.forced = forced !== null
    this.tier = clampTier(forced ?? startTier)
  }

  get settings(): TierSettings {
    return TIERS[this.tier]
  }

  /** One frame: the interval since the previous frame and this frame's CPU work. Returns true when the tier changed. */
  sample(intervalMs: number, workMs: number): boolean {
    if (this.forced || !(intervalMs > 0) || intervalMs > STALL_MS) return false
    if (this.settle > 0) {
      this.settle -= 1
      return false
    }
    const dt = intervalMs / 1000
    this.sinceUpgrade += dt
    this.ema += (intervalMs - this.ema) * 0.08
    if (this.ema > SLOW_MS) {
      this.slowFor += dt
      this.fastFor = 0
    } else if (this.ema < FAST_MS && workMs < WORK_BUDGET_MS) {
      this.fastFor += dt
      this.slowFor = Math.max(0, this.slowFor - dt)
    } else {
      this.fastFor = 0
      this.slowFor = Math.max(0, this.slowFor - dt * 0.5)
    }
    if (this.slowFor >= DOWN_AFTER_S && this.tier < LOWEST_TIER) {
      // An upgrade that did not last: wait twice as long before trying again.
      if (this.sinceUpgrade < UP_AFTER_S) this.upAfter = Math.min(MAX_UP_AFTER_S, this.upAfter * 2)
      return this.change(this.tier + 1)
    }
    if (this.fastFor >= this.upAfter && this.tier > 0) {
      this.sinceUpgrade = 0
      return this.change(this.tier - 1)
    }
    return false
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.slowFor = 0
    this.fastFor = 0
    this.ema = 16.7
    // The next frames pay for resized buffers and shader variants.
    this.settle = 3
    return true
  }
}

/** A fixed ring of the last `capacity` samples. Pushing never allocates. */
export class PerfRing {
  readonly capacity: number
  private readonly data: Float32Array
  private head = 0
  private count = 0

  constructor(capacity = 600) {
    this.capacity = capacity
    this.data = new Float32Array(capacity)
  }

  get size(): number {
    return this.count
  }

  push(value: number): void {
    this.data[this.head] = value
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count += 1
  }

  /** The i-th most recent sample (0 is the newest). */
  recent(i: number): number {
    return this.data[(this.head - 1 - i + this.capacity * 2) % this.capacity]
  }

  /** Oldest to newest, as a plain array (allocates; for the probe, not the frame loop). */
  values(): number[] {
    const out: number[] = []
    for (let i = this.count - 1; i >= 0; i--) out.push(this.recent(i))
    return out
  }

  reset(): void {
    this.head = 0
    this.count = 0
  }
}
