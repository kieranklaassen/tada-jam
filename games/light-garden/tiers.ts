// Adaptive quality. The top tier is the full look (DPR 2, one half-resolution
// glow pass, many light motes); each tier below trades resolution and extras
// for frame time, and the lowest still reads clearly because the glow is
// also faked with sprite halos. Tiers follow measured frame time with
// hysteresis, and `?tier=N` pins one for testing.

export type TierSettings = {
  dpr: number
  /** The half-resolution selective glow pass (one full-screen composite). */
  glowPass: boolean
  /** Dust motes drifting in the beams. */
  motes: number
  /** Animated caustic decals under lit glass. */
  caustics: boolean
  /** Multiplier on sprite halo size, to make up for the missing glow pass. */
  halo: number
}

export const TIERS: readonly TierSettings[] = [
  { dpr: 1, glowPass: false, motes: 0, caustics: false, halo: 1.3 },
  { dpr: 1.25, glowPass: false, motes: 12, caustics: true, halo: 1.25 },
  { dpr: 1.5, glowPass: false, motes: 28, caustics: true, halo: 1.15 },
  { dpr: 2, glowPass: true, motes: 48, caustics: true, halo: 1 },
]
export const TOP_TIER = TIERS.length - 1

/** Frames averaging slower than this (ms) for DROP_AFTER_MS step down. */
export const SLOW_MS = 22
export const DROP_AFTER_MS = 1500
/** Frames averaging faster than this for RAISE_AFTER_MS step up (60 Hz vsync sits at 16.7). */
export const FAST_MS = 17.6
export const RAISE_AFTER_MS = 8000
/** A tier that just failed is not retried for this long. */
export const RETRY_AFTER_MS = 30000
const SETTLE_MS = 2000

export class QualityGovernor {
  tier: number
  readonly pinned: boolean
  private ema = 16.7
  private slowFor = 0
  private fastFor = 0
  private settle = SETTLE_MS
  private clock = 0
  private readonly failedAt = new Array<number>(TIERS.length).fill(-Infinity)

  constructor(start: number = TOP_TIER, pinned = false) {
    this.tier = Math.max(0, Math.min(TOP_TIER, Math.round(start)))
    this.pinned = pinned
  }

  get settings(): TierSettings {
    return TIERS[this.tier]
  }

  /** Feed one frame's duration (ms). Returns true when the tier changed. */
  sample(frameMs: number): boolean {
    if (this.pinned || !(frameMs > 0)) return false
    const dt = Math.min(frameMs, 100)
    this.clock += dt
    this.ema += (dt - this.ema) * 0.1
    if (this.settle > 0) {
      this.settle -= dt
      return false
    }
    if (this.ema > SLOW_MS) {
      this.fastFor = 0
      this.slowFor += dt
      if (this.slowFor >= DROP_AFTER_MS && this.tier > 0) {
        this.failedAt[this.tier] = this.clock
        return this.change(this.tier - 1)
      }
    } else if (this.ema < FAST_MS) {
      this.slowFor = 0
      this.fastFor += dt
      const next = this.tier + 1
      if (this.fastFor >= RAISE_AFTER_MS && next <= TOP_TIER && this.clock - this.failedAt[next] >= RETRY_AFTER_MS) return this.change(next)
    } else {
      this.slowFor = 0
      this.fastFor = 0
    }
    return false
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.slowFor = 0
    this.fastFor = 0
    this.settle = SETTLE_MS
    this.ema = 16.7
    return true
  }
}

/** `?tier=N` (in the query or the hash's query) pins a tier; anything else means adaptive. */
export function parseTierOverride(href: string): number | null {
  const match = /[?&]tier=(\d+)/.exec(href)
  if (!match) return null
  const tier = Number(match[1])
  return tier >= 0 && tier <= TOP_TIER ? tier : null
}

/** `?fps=1` shows the grown-up frame-time overlay. */
export function wantsPerfOverlay(href: string): boolean {
  return /[?&]fps=1\b/.test(href)
}
