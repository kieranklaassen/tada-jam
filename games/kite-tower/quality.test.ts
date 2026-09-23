import { describe, expect, it } from 'vitest'
import { GOOD_WINDOWS_TO_RAISE, LOWEST_TIER, PERF_FRAMES, PerfRing, STALL_MS, TierGovernor, tierOverride, TIERS, WINDOW, WINDOW_SECONDS } from './quality'

/** Feed `frames` frames of one interval. */
function feed(governor: TierGovernor, frames: number, intervalMs: number, workMs = 2): void {
  for (let i = 0; i < frames; i++) governor.sample(intervalMs, workMs)
}

describe('tiers', () => {
  it('step DPR down from 2 to 1 and cut effects on the way', () => {
    expect(TIERS.map((t) => t.dpr)).toEqual([2, 1.5, 1.25, 1])
    expect(TIERS[0].motes).toBeGreaterThan(0)
    expect(TIERS[LOWEST_TIER].motes).toBe(0)
    expect(TIERS[LOWEST_TIER].tail).toBeLessThan(TIERS[0].tail)
  })

  it('?tier=N pins a tier, anything else is automatic', () => {
    expect(tierOverride('?tier=2')).toBe(2)
    expect(tierOverride('?fps=1&tier=9')).toBe(LOWEST_TIER)
    expect(tierOverride('?tier=')).toBeNull()
    expect(tierOverride('?tier=abc')).toBeNull()
    expect(tierOverride('')).toBeNull()
  })
})

describe('TierGovernor', () => {
  it('drops a tier after two bad windows, not after a short spike', () => {
    const governor = new TierGovernor(0)
    feed(governor, WINDOW * 2, 16.7)
    feed(governor, 3, 60)
    feed(governor, WINDOW * 2, 16.7)
    expect(governor.tier).toBe(0)
    feed(governor, WINDOW * 2, 22)
    expect(governor.tier).toBe(1)
  })

  it('one window averaging over 26 ms drops at once', () => {
    const governor = new TierGovernor(0)
    feed(governor, WINDOW, 16.7)
    feed(governor, WINDOW, 30)
    expect(governor.tier).toBe(1)
  })

  it('skips the first window after a change before judging again', () => {
    const governor = new TierGovernor(0)
    feed(governor, WINDOW, 16.7)
    feed(governor, WINDOW, 30)
    expect(governor.tier).toBe(1)
    feed(governor, WINDOW, 30)
    expect(governor.tier).toBe(1)
    feed(governor, WINDOW, 30)
    expect(governor.tier).toBe(2)
  })

  it('a device under 20 fps is judged in seconds: a window closes after 2 s of frames', () => {
    const governor = new TierGovernor(0)
    let changedAt = -1
    let elapsed = 0
    for (let i = 0; i < 40 && changedAt < 0; i++) {
      elapsed += 400
      if (governor.sample(400, 3)) changedAt = elapsed
    }
    expect(governor.tier).toBe(1)
    expect(changedAt).toBeLessThanOrEqual(2 * WINDOW_SECONDS * 1000 + 400)
  })

  it('steps up after six clean windows within the CPU budget, not when the CPU is busy', () => {
    const governor = new TierGovernor(2)
    feed(governor, WINDOW * GOOD_WINDOWS_TO_RAISE, 10)
    expect(governor.tier).toBe(2)
    feed(governor, WINDOW, 10)
    expect(governor.tier).toBe(1)
    const busy = new TierGovernor(2)
    feed(busy, WINDOW * 40, 10, 12)
    expect(busy.tier).toBe(2)
  })

  it('a step up that fails doubles the clean stretch needed next time', () => {
    const governor = new TierGovernor(1)
    feed(governor, WINDOW * (GOOD_WINDOWS_TO_RAISE + 1), 10)
    expect(governor.tier).toBe(0)
    feed(governor, WINDOW * 2, 30)
    expect(governor.tier).toBe(1)
    feed(governor, WINDOW * (GOOD_WINDOWS_TO_RAISE + 1), 10)
    expect(governor.tier).toBe(1)
    feed(governor, WINDOW * GOOD_WINDOWS_TO_RAISE, 10)
    expect(governor.tier).toBe(0)
  })

  it('a pinned tier never changes and stalls are ignored', () => {
    const pinned = new TierGovernor(3, true)
    feed(pinned, WINDOW * 20, 8)
    expect(pinned.tier).toBe(3)
    const governor = new TierGovernor(0)
    expect(governor.sample(STALL_MS + 1, 1)).toBe(false)
    feed(governor, WINDOW * 4, STALL_MS + 1)
    expect(governor.tier).toBe(0)
  })

  it('the overlay can pin any tier and hand it back to automatic', () => {
    const governor = new TierGovernor(0)
    governor.force(2)
    expect(governor.tier).toBe(2)
    feed(governor, WINDOW * 10, 40)
    expect(governor.tier).toBe(2)
    feed(governor, WINDOW * 20, 10)
    expect(governor.tier).toBe(2)
    expect(governor.lastFrames).toBe(WINDOW)
    expect(governor.lastDropped).toBe(0)
    governor.force(null)
    feed(governor, WINDOW * 3, 40)
    expect(governor.tier).toBe(3)
    expect(governor.lastDropped).toBe(WINDOW)
  })
})

describe('PerfRing', () => {
  it('keeps the last 600 samples in order', () => {
    const ring = new PerfRing()
    for (let i = 0; i < PERF_FRAMES + 25; i++) ring.push(i)
    const ordered = ring.ordered()
    expect(ordered).toHaveLength(PERF_FRAMES)
    expect(ordered[0]).toBe(25)
    expect(ordered[PERF_FRAMES - 1]).toBe(PERF_FRAMES + 24)
    expect(ring.recent(0)).toBe(PERF_FRAMES + 24)
    expect(ring.recent(1)).toBe(PERF_FRAMES + 23)
    ring.reset()
    expect(ring.ordered()).toEqual([])
    expect(ring.recent(0)).toBe(0)
  })
})
