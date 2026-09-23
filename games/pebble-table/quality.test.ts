import { describe, expect, it } from 'vitest'
import { LOWEST_TIER, QualityGovernor, startingTier, TIERS } from './quality'

const feed = (governor: QualityGovernor, frames: number, intervalMs: number, workMs = 3) => {
  let changes = 0
  for (let i = 0; i < frames; i++) if (governor.sample(intervalMs, workMs)) changes += 1
  return changes
}

describe('quality tiers', () => {
  it('step down in cost: pixels, fur, post, physics', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].dpr).toBeLessThanOrEqual(TIERS[i - 1].dpr)
      expect(TIERS[i].furShells).toBeLessThanOrEqual(TIERS[i - 1].furShells)
      expect(TIERS[i].physicsSubsteps).toBeLessThanOrEqual(TIERS[i - 1].physicsSubsteps)
    }
    expect(TIERS[LOWEST_TIER]).toMatchObject({ dpr: 1, furShells: 0, post: 'off' })
  })

  it('starts one tier down on touch devices', () => {
    expect(startingTier(true)).toBe(1)
    expect(startingTier(false)).toBe(0)
  })
})

describe('QualityGovernor', () => {
  it('stays put at a steady 60 fps', () => {
    const governor = new QualityGovernor(0)
    expect(feed(governor, 2000, 16.7)).toBe(0)
    expect(governor.tier).toBe(0)
  })

  it('steps down after two windows of dropped frames, not after one hitch', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 40, 16.7)
    feed(governor, 40, 22)
    expect(governor.tier).toBe(0)
    feed(governor, 40, 22)
    expect(governor.tier).toBe(1)
  })

  it('steps down at once when frames are terrible', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 40, 16.7)
    feed(governor, 40, 40)
    expect(governor.tier).toBe(1)
  })

  it('keeps stepping down while frames stay slow, and stops at the lowest tier', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 2000, 40)
    expect(governor.tier).toBe(LOWEST_TIER)
  })

  it('steps back up only after a long clean stretch with CPU headroom', () => {
    const governor = new QualityGovernor(2)
    feed(governor, 40 * 4, 16.7)
    expect(governor.tier).toBe(2)
    feed(governor, 40 * 10, 16.7, 12)
    expect(governor.tier).toBe(2)
    feed(governor, 40 * 8, 16.7, 3)
    expect(governor.tier).toBe(1)
  })

  it('backs off upgrading after an upgrade fails, so tiers do not flicker', () => {
    const governor = new QualityGovernor(1)
    feed(governor, 40 * 8, 16.7)
    expect(governor.tier).toBe(0)
    feed(governor, 40 * 2, 30)
    expect(governor.tier).toBe(1)
    feed(governor, 40 * 8, 16.7)
    expect(governor.tier).toBe(1)
    feed(governor, 40 * 8, 16.7)
    expect(governor.tier).toBe(0)
  })

  it('ignores stalls from a hidden or paused tab', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 200, 1500)
    expect(governor.tier).toBe(0)
  })

  it('honours a tier pinned from the grown-up overlay until released', () => {
    const governor = new QualityGovernor(0)
    governor.force(3)
    feed(governor, 40 * 20, 16.7)
    expect(governor.tier).toBe(3)
    governor.force(null)
    expect(governor.forced).toBe(false)
    feed(governor, 40 * 8, 16.7)
    expect(governor.tier).toBe(2)
  })

  it('reports frame stats per window', () => {
    const governor = new QualityGovernor(0)
    feed(governor, 40, 20, 4)
    expect(governor.stats.fps).toBeCloseTo(50, 0)
    expect(governor.stats.workMs).toBeCloseTo(4, 5)
  })
})
