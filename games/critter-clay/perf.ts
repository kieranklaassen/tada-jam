// Frame-time measurement and adaptive quality. The frame loop records the
// main-thread cost of each frame (update plus render submit) into a rolling
// buffer, and the tier controller watches whole-frame intervals: sustained
// slow frames step down a tier, a long run of fast frames steps back up, and
// each step down makes stepping up again more patient so tiers don't
// flicker. Tier 3 is the full look at DPR 2; tier 0 is DPR 1 with the
// overlay pass and the clay normal map off.

export const TIER_COUNT = 4
export const TOP_TIER = TIER_COUNT - 1
export const TIER_DPR: readonly number[] = [1, 1.25, 1.5, 2]

export type TierFeatures = { dpr: number; overlay: boolean; normalMap: boolean }

export function tierFeatures(tier: number, deviceDpr: number): TierFeatures {
  const t = Math.max(0, Math.min(TOP_TIER, Math.round(tier)))
  return { dpr: Math.min(TIER_DPR[t], Math.max(1, deviceDpr)), overlay: t >= 2, normalMap: t >= 1 }
}

/** A `?tier=N` override for testing, or null. */
export function tierOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('tier')
  if (raw === null || raw === '') return null
  const tier = Number(raw)
  return Number.isInteger(tier) && tier >= 0 && tier <= TOP_TIER ? tier : null
}

export const RING_SIZE = 600

/** A fixed ring of the last 600 values; reading a snapshot is the only allocation. */
export class Ring {
  private readonly values = new Float64Array(RING_SIZE)
  private next = 0
  private filled = 0

  push(value: number): void {
    this.values[this.next] = value
    this.next = (this.next + 1) % RING_SIZE
    if (this.filled < RING_SIZE) this.filled++
  }

  get length(): number {
    return this.filled
  }

  last(): number {
    return this.filled === 0 ? 0 : this.values[(this.next - 1 + RING_SIZE) % RING_SIZE]
  }

  /** Oldest to newest. */
  snapshot(): number[] {
    const out: number[] = []
    const start = this.filled < RING_SIZE ? 0 : this.next
    for (let i = 0; i < this.filled; i++) out.push(this.values[(start + i) % RING_SIZE])
    return out
  }

  clear(): void {
    this.next = 0
    this.filled = 0
  }
}

/** Frames slower than this (about 48 fps) count against the tier. */
export const SLOW_FRAME_MS = 21
/** Frames faster than this (about 66 fps headroom) count toward stepping up. */
export const FAST_FRAME_MS = 15
export const WINDOW_SECONDS = 1.5

export class TierController {
  tier: number
  private readonly pinned: boolean
  private windowTime = 0
  private windowFrames = 0
  private windowSlow = 0
  private slowWindows = 0
  private fastTime = 0
  private stepsDown = 0
  private settleUntil = 0
  private clock = 0

  constructor(start = TOP_TIER, pinned = false) {
    this.tier = start
    this.pinned = pinned
  }

  /** Feed one whole-frame interval in ms. Returns true when the tier changed. */
  frame(intervalMs: number): boolean {
    if (this.pinned || !(intervalMs > 0)) return false
    const seconds = Math.min(intervalMs, 250) / 1000
    this.clock += seconds
    if (this.clock < this.settleUntil) return false
    this.windowTime += seconds
    this.windowFrames++
    if (intervalMs > SLOW_FRAME_MS) this.windowSlow++
    this.fastTime = intervalMs < FAST_FRAME_MS ? this.fastTime + seconds : 0
    if (this.windowTime >= WINDOW_SECONDS) {
      const slowShare = this.windowSlow / this.windowFrames
      this.slowWindows = slowShare > 0.5 ? this.slowWindows + 1 : 0
      this.windowTime = 0
      this.windowFrames = 0
      this.windowSlow = 0
      if (this.slowWindows >= 2 && this.tier > 0) return this.step(-1)
    }
    if (this.tier < TOP_TIER && this.fastTime >= 6 * (1 + this.stepsDown)) return this.step(1)
    return false
  }

  private step(direction: -1 | 1): boolean {
    this.tier += direction
    if (direction < 0) this.stepsDown++
    this.slowWindows = 0
    this.fastTime = 0
    this.windowTime = 0
    this.windowFrames = 0
    this.windowSlow = 0
    this.settleUntil = this.clock + 1
    return true
  }
}

/** What the frame loop records: CPU time per frame, whole-frame intervals, the tier, and the renderer's budget. */
export class PerfMonitor {
  readonly cpu = new Ring()
  readonly intervals = new Ring()
  drawCalls = 0
  triangles = 0

  constructor(readonly tiers: TierController) {}
}

/** The shape the jam's perf probe reads from `window.__jamPerf`. */
export type JamPerf = { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }

export function jamPerf(monitor: PerfMonitor): JamPerf {
  return {
    get cpuMs() {
      return monitor.cpu.snapshot()
    },
    get tier() {
      return monitor.tiers.tier
    },
    get drawCalls() {
      return monitor.drawCalls
    },
    get triangles() {
      return monitor.triangles
    },
    reset() {
      monitor.cpu.clear()
      monitor.intervals.clear()
    },
  }
}
