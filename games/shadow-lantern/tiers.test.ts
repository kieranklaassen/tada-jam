import { describe, expect, it } from 'vitest'
import { LOWEST_TIER, PerfRing, startingTier, TierGovernor, tierOverride, TIERS } from './tiers'

function run(governor: TierGovernor, seconds: number, intervalMs: number, workMs = 2): number {
  let changes = 0
  for (let t = 0; t < seconds * 1000; t += intervalMs) if (governor.sample(intervalMs, workMs)) changes++
  return changes
}

describe('tiers', () => {
  it('pixel ratio steps down 2 → 1.5 → 1.25 → 1, shedding extras on the way', () => {
    expect(TIERS.map((tier) => tier.dpr)).toEqual([2, 1.5, 1.25, 1])
    expect(TIERS[0].motes).toBeGreaterThan(TIERS[1].motes)
    expect(TIERS[LOWEST_TIER].penumbra).toBe(false)
  })

  it('steps down after a sustained slow stretch, not after one slow frame', () => {
    const governor = new TierGovernor(0)
    governor.sample(16.7, 2)
    governor.sample(200, 2)
    run(governor, 0.3, 16.7)
    expect(governor.tier).toBe(0)
    run(governor, 3, 33)
    expect(governor.tier).toBeGreaterThanOrEqual(1)
    run(governor, 30, 50)
    expect(governor.tier).toBe(LOWEST_TIER)
  })

  it('climbs back only after a long comfortable stretch, and waits longer after an upgrade that did not hold', () => {
    const governor = new TierGovernor(2)
    run(governor, 5, 16.6)
    expect(governor.tier).toBe(2)
    run(governor, 2, 16.6)
    expect(governor.tier).toBe(1)
    // The upgrade was too much: back down, and the next try needs twice the calm.
    run(governor, 3, 33)
    expect(governor.tier).toBe(2)
    run(governor, 8, 16.6)
    expect(governor.tier).toBe(2)
    run(governor, 6, 16.6)
    expect(governor.tier).toBe(1)
  })

  it('heavy CPU work keeps it from climbing even when frames look fast', () => {
    const governor = new TierGovernor(1)
    run(governor, 20, 16.6, 12)
    expect(governor.tier).toBe(1)
  })

  it('a stalled or hidden tab is not mistaken for slow rendering', () => {
    const governor = new TierGovernor(0)
    for (let i = 0; i < 20; i++) governor.sample(5000, 1)
    expect(governor.tier).toBe(0)
  })

  it('?tier=N pins a tier; anything else means automatic', () => {
    expect(tierOverride('?tier=2')).toBe(2)
    expect(tierOverride('?fps=1&tier=9')).toBe(LOWEST_TIER)
    expect(tierOverride('?tier=-3')).toBe(0)
    expect(tierOverride('?tier=')).toBeNull()
    expect(tierOverride('?tier=fast')).toBeNull()
    expect(tierOverride('')).toBeNull()
    const pinned = new TierGovernor(0, 3)
    expect(pinned.forced).toBe(true)
    run(pinned, 10, 16.6)
    expect(pinned.tier).toBe(3)
  })

  it('touch screens start one tier down', () => {
    expect(startingTier(true)).toBe(1)
    expect(startingTier(false)).toBe(0)
  })

  it('the perf ring keeps the newest samples in order', () => {
    const ring = new PerfRing(4)
    for (let i = 1; i <= 6; i++) ring.push(i)
    expect(ring.size).toBe(4)
    expect(ring.values()).toEqual([3, 4, 5, 6])
    expect(ring.recent(0)).toBe(6)
    ring.reset()
    expect(ring.values()).toEqual([])
  })
})
