import { describe, expect, it } from 'vitest'
import { LOWEST, pinnedTier, TIERS, TierGovernor, WINDOW } from './tiers'

function feed(governor: TierGovernor, windows: number, intervalMs: number, workMs = 2): number {
  let changes = 0
  for (let i = 0; i < windows * WINDOW; i++) if (governor.sample(intervalMs, workMs)) changes += 1
  return changes
}

describe('quality tiers', () => {
  it('has at least three tiers stepping DPR down from 2 to 1', () => {
    expect(TIERS.length).toBeGreaterThanOrEqual(3)
    expect(TIERS.map((tier) => tier.dpr)).toEqual([2, 1.5, 1.25, 1])
  })

  it('steps down on slow windows, one tier per window', () => {
    const governor = new TierGovernor(0)
    feed(governor, 1, 30)
    expect(governor.tier).toBe(0)
    feed(governor, 1, 30)
    expect(governor.tier).toBe(1)
    feed(governor, 4, 30)
    expect(governor.tier).toBe(LOWEST)
  })

  it('ignores a few spikes because it judges the median', () => {
    const governor = new TierGovernor(0)
    for (let i = 0; i < WINDOW * 3; i++) governor.sample(i % 10 === 0 ? 60 : 16.7, 2)
    expect(governor.tier).toBe(0)
  })

  it('steps up only after a calm stretch that doubles after each drop', () => {
    const governor = new TierGovernor(0)
    feed(governor, 2, 30)
    expect(governor.tier).toBe(1)
    feed(governor, 8, 16.7)
    expect(governor.tier).toBe(1)
    feed(governor, 1, 16.7)
    expect(governor.tier).toBe(0)
    feed(governor, 2, 30)
    expect(governor.tier).toBe(1)
    feed(governor, 16, 16.7)
    expect(governor.tier).toBe(1)
    feed(governor, 1, 16.7)
    expect(governor.tier).toBe(0)
  })

  it('does not step up when the CPU is busy even if frames fit', () => {
    const governor = new TierGovernor(2)
    feed(governor, 40, 16.7, 9)
    expect(governor.tier).toBe(2)
  })

  it('ignores stalls and stays pinned when asked', () => {
    const governor = new TierGovernor(0)
    feed(governor, 5, 900)
    expect(governor.tier).toBe(0)
    const pinned = new TierGovernor(0, 2)
    feed(pinned, 5, 40)
    expect(pinned.tier).toBe(2)
  })

  it('reads ?tier=N', () => {
    expect(pinnedTier('?tier=3&fps=1')).toBe(3)
    expect(pinnedTier('?chrome=0&tier=9')).toBe(LOWEST)
    expect(pinnedTier('?chrome=0')).toBeNull()
  })
})
