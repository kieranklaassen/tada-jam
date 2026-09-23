import { describe, expect, it } from 'vitest'
import { FAST_SECONDS, HOLD_SECONDS, LOWEST_TIER, PERF_FRAMES, PerfRing, TierGovernor, tierOverride, TIERS } from './quality'

/** Feed frames of one interval for `seconds`, returning the game time reached. */
function feed(governor: TierGovernor, from: number, seconds: number, intervalMs: number, workMs = 2): number {
  let now = from
  const end = from + seconds
  while (now < end) {
    now += intervalMs / 1000
    governor.sample(intervalMs, workMs, now)
  }
  return now
}

describe('tiers', () => {
  it('step DPR down from 2 to 1 and cut effects on the way', () => {
    expect(TIERS.map((t) => t.dpr)).toEqual([2, 1.5, 1.25, 1])
    expect(TIERS[0].grade).toBe(true)
    expect(TIERS[LOWEST_TIER].grade).toBe(false)
    expect(TIERS[LOWEST_TIER].motes).toBe(0)
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
  it('drops a tier after sustained slow frames, not after a short spike', () => {
    const governor = new TierGovernor(0)
    let now = feed(governor, 0, 2, 16.7)
    now = feed(governor, now, 0.3, 60)
    now = feed(governor, now, 1, 16.7)
    expect(governor.tier).toBe(0)
    feed(governor, now, 3, 40)
    expect(governor.tier).toBe(1)
  })

  it('holds after a drop before dropping again', () => {
    const governor = new TierGovernor(0)
    let now = 0
    while (governor.tier === 0 && now < 10) now = feed(governor, now, 0.04, 40)
    expect(governor.tier).toBe(1)
    now = feed(governor, now, HOLD_SECONDS - 0.2, 40)
    expect(governor.tier).toBe(1)
    feed(governor, now, 2, 40)
    expect(governor.tier).toBe(2)
  })

  it('raises only after a long fast stretch within the CPU budget', () => {
    const governor = new TierGovernor(2)
    let now = feed(governor, 0, FAST_SECONDS - 1, 10)
    expect(governor.tier).toBe(2)
    now = feed(governor, now, 3, 10)
    expect(governor.tier).toBe(1)
    const busy = new TierGovernor(2)
    feed(busy, 0, 20, 10, 12)
    expect(busy.tier).toBe(2)
  })

  it('stops raising after a raise that did not hold', () => {
    const governor = new TierGovernor(1)
    let now = feed(governor, 0, 8, 10)
    expect(governor.tier).toBe(0)
    now = feed(governor, now, 3, 40)
    expect(governor.tier).toBe(1)
    feed(governor, now, 30, 10)
    expect(governor.tier).toBe(1)
  })

  it('a pinned tier never changes and stalls are ignored', () => {
    const pinned = new TierGovernor(3, true)
    feed(pinned, 0, 20, 8)
    expect(pinned.tier).toBe(3)
    const governor = new TierGovernor(0)
    expect(governor.sample(5000, 1, 1)).toBe(false)
    expect(governor.frameMs).toBeCloseTo(16.7, 5)
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
