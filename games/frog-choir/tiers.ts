// Adaptive quality. Tier 0 is the full look at DPR 2; each tier down lowers
// the pixel ratio and trims what costs fill rate or vertex work (particles,
// halo size, outline hulls on the pads). The monitor watches the real frame
// interval, because a GPU-bound iPad shows up there and not in CPU time.
// It steps down after two slow seconds, steps up only after ten steady ones,
// and after a step down it will not climb back into the tier that was slow
// for a while, so it never flickers between two tiers.

export const TIER_DPR: readonly number[] = [2, 1.5, 1.25, 1]
export const TIER_COUNT = TIER_DPR.length

export type TierLook = {
  dpr: number
  /** Drifting background fireflies. */
  ambientFireflies: number
  /** Sparkles in the firefly's trail. */
  trail: number
  /** Scale of the firefly's glow halo sprite (fill-rate). */
  halo: number
  padOutlines: boolean
  /** Reeds sway in the vertex shader. */
  reedSway: boolean
}

export function tierLook(tier: number, deviceDpr: number): TierLook {
  const t = Math.max(0, Math.min(TIER_COUNT - 1, tier))
  return {
    dpr: Math.min(TIER_DPR[t], Math.max(1, deviceDpr)),
    ambientFireflies: [14, 10, 6, 0][t],
    trail: [22, 16, 10, 6][t],
    halo: [1, 1, 0.85, 0.7][t],
    padOutlines: t < 3,
    reedSway: t < 3,
  }
}

export const WINDOW_MS = 1000
export const SLOW_MS = 19.5
export const STEADY_MS = 17.6
export const SLOW_WINDOWS_TO_DROP = 2
export const STEADY_WINDOWS_TO_CLIMB = 10
export const PROBATION_MS = 30000
/** A gap this long is a pause or a tab switch, not a slow frame. */
export const IGNORE_GAP_MS = 250

export class TierMonitor {
  tier: number
  readonly pinned: boolean
  private sum = 0
  private count = 0
  private windowStart: number | null = null
  private slow = 0
  private steady = 0
  private settle = 1
  private readonly blockedUntil: number[] = new Array(TIER_COUNT).fill(-Infinity)

  constructor(options: { start?: number; pinned?: number | null } = {}) {
    const pinned = options.pinned
    this.pinned = pinned !== null && pinned !== undefined
    this.tier = this.pinned ? clampTier(pinned!) : clampTier(options.start ?? 0)
  }

  /** Feed one frame interval. Returns true when the tier changed. */
  sample(frameMs: number, nowMs: number): boolean {
    if (this.pinned || !(frameMs > 0) || frameMs > IGNORE_GAP_MS) return false
    if (this.windowStart === null) this.windowStart = nowMs
    this.sum += frameMs
    this.count += 1
    if (nowMs - this.windowStart < WINDOW_MS) return false
    const average = this.sum / this.count
    this.sum = 0
    this.count = 0
    this.windowStart = nowMs
    if (this.settle > 0) {
      this.settle -= 1
      return false
    }
    if (average > SLOW_MS) {
      this.slow += 1
      this.steady = 0
    } else if (average <= STEADY_MS) {
      this.steady += 1
      this.slow = 0
    } else {
      this.slow = 0
      this.steady = 0
    }
    if (this.slow >= SLOW_WINDOWS_TO_DROP && this.tier < TIER_COUNT - 1) {
      this.blockedUntil[this.tier] = nowMs + PROBATION_MS
      return this.change(this.tier + 1)
    }
    if (this.steady >= STEADY_WINDOWS_TO_CLIMB && this.tier > 0 && nowMs >= this.blockedUntil[this.tier - 1]) {
      return this.change(this.tier - 1)
    }
    return false
  }

  private change(tier: number): boolean {
    this.tier = tier
    this.slow = 0
    this.steady = 0
    this.settle = 1
    return true
  }
}

function clampTier(tier: number): number {
  return Number.isFinite(tier) ? Math.max(0, Math.min(TIER_COUNT - 1, Math.round(tier))) : 0
}

/** `?tier=N` pins the tier for testing; anything else leaves it adaptive. */
export function tierOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('tier')
  if (raw === null || raw.trim() === '') return null
  const tier = Number(raw)
  return Number.isInteger(tier) && tier >= 0 && tier < TIER_COUNT ? tier : null
}
