import { describe, expect, it } from 'vitest'
import { LOWEST_TIER, QualityGovernor, startingTier, TIERS, WINDOW } from './quality'

function feed(governor: QualityGovernor, windows: number, intervalMs: number, workMs = 3): number {
  let changes = 0
  for (let i = 0; i < windows * WINDOW; i++) if (governor.sample(intervalMs, workMs)) changes++
  return changes
}

describe('QualityGovernor', () => {
  it('offers at least three tiers stepping DPR 2, 1.5, 1.25, 1 and cutting effects on the way down, but keeps some light shafts', () => {
    expect(TIERS.map((tier) => tier.dpr)).toEqual([2, 1.5, 1.25, 1])
    expect(TIERS[0]).toMatchObject({ shafts: 1, particles: 1, sway: true })
    expect(TIERS[LOWEST_TIER]).toMatchObject({ sway: false })
    expect(TIERS[LOWEST_TIER].shafts).toBeLessThan(1)
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].particles).toBeLessThan(TIERS[i - 1].particles)
      expect(TIERS[i].shafts).toBeGreaterThan(0)
      expect(TIERS[i].shafts).toBeLessThanOrEqual(TIERS[i - 1].shafts)
    }
  })

  it('stays put at a steady 60 fps', () => {
    const governor = new QualityGovernor(0)
    expect(feed(governor, 20, 16.7)).toBe(0)
    expect(governor.tier).toBe(0)
  })

  it('shrugs off one hitch but steps down after two bad windows', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 1, 16.7)
    for (let i = 0; i < WINDOW; i++) governor.sample(i < 6 ? 40 : 16.7, 3)
    expect(governor.tier).toBe(0)
    feed(governor, 1, 16.7)
    for (let w = 0; w < 2; w++) for (let i = 0; i < WINDOW; i++) governor.sample(i < 6 ? 24 : 16.7, 3)
    expect(governor.tier).toBe(1)
  })

  it('steps down at once from a terrible window, and walks all the way to minimal on a slow device', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 1, 16.7)
    feed(governor, 1, 40)
    expect(governor.tier).toBe(1)
    feed(governor, 20, 40)
    expect(governor.tier).toBe(LOWEST_TIER)
  })

  it('steps back up only after clean windows with CPU headroom', () => {
    const governor = new QualityGovernor(2)
    feed(governor, 10, 16.7, 12)
    expect(governor.tier).toBe(2)
    feed(governor, 7, 16.7, 3)
    expect(governor.tier).toBe(1)
  })

  it('waits longer before trying again after an upgrade that failed', () => {
    const governor = new QualityGovernor(1)
    feed(governor, 7, 16.7)
    expect(governor.tier).toBe(0)
    feed(governor, 2, 40)
    expect(governor.tier).toBe(1)
    feed(governor, 8, 16.7)
    expect(governor.tier).toBe(1)
    feed(governor, 8, 16.7)
    expect(governor.tier).toBe(0)
  })

  it('ignores stalls from a hidden tab or a paused debugger', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 5, 5000)
    expect(governor.tier).toBe(0)
    expect(governor.stats.fps).toBe(0)
  })

  it('holds a pinned tier however frames go, until set back to automatic', () => {
    const governor = new QualityGovernor(0)
    governor.force(3)
    feed(governor, 10, 16.7)
    expect(governor.tier).toBe(3)
    governor.force(0)
    feed(governor, 10, 60)
    expect(governor.tier).toBe(0)
    governor.force(null)
    feed(governor, 3, 60)
    expect(governor.tier).toBeGreaterThan(0)
  })

  it('reports the last window for the grown-up overlay', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 1, 20, 4)
    expect(governor.stats.fps).toBeCloseTo(50, 5)
    expect(governor.stats.workMs).toBeCloseTo(4, 5)
    expect(governor.stats.dropped).toBe(0)
  })

  it('starts touch devices one tier down', () => {
    expect(startingTier(true)).toBe(1)
    expect(startingTier(false)).toBe(0)
  })
})
