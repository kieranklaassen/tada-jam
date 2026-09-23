import { describe, expect, it } from 'vitest'
import { CHANGE_SETTLE_MS, LOWEST, pinnedTier, STALL_MS, START_SETTLE_MS, TIERS, TierGovernor, WINDOW, WINDOW_MS } from './tiers'

function feed(governor: TierGovernor, windows: number, intervalMs: number, workMs = 2): number {
  let changes = 0
  for (let i = 0; i < windows * WINDOW; i++) if (governor.sample(intervalMs, workMs)) changes += 1
  return changes
}

/** Frames of one length for a stretch of time; returns the seconds into the stretch at which the tier changed. */
function feedFor(governor: TierGovernor, seconds: number, intervalMs: number, workMs = 2): number[] {
  const changes: number[] = []
  for (let t = 0; t < seconds * 1000; t += intervalMs) if (governor.sample(intervalMs, workMs)) changes.push((t + intervalMs) / 1000)
  return changes
}

describe('quality tiers', () => {
  it('has at least three tiers stepping DPR down from 2 to 1', () => {
    expect(TIERS.length).toBeGreaterThanOrEqual(3)
    expect(TIERS.map((tier) => tier.dpr)).toEqual([2, 1.5, 1.25, 1])
  })

  it('steps down on slow windows, one tier per window, after letting the page load settle', () => {
    const governor = new TierGovernor(0)
    const changes = feedFor(governor, 20, 30)
    expect(governor.tier).toBe(LOWEST)
    expect(changes).toHaveLength(LOWEST)
    expect(changes[0]).toBeGreaterThanOrEqual((START_SETTLE_MS + WINDOW_MS) / 1000)
    for (let i = 1; i < changes.length; i++) expect(changes[i] - changes[i - 1]).toBeGreaterThanOrEqual((CHANGE_SETTLE_MS + WINDOW_MS) / 1000 - 0.03)
  })

  it('brings a device that is slow at every tier to the lowest within the first demonstration', () => {
    const governor = new TierGovernor(0)
    const changes = feedFor(governor, 20, 50)
    expect(changes).toHaveLength(LOWEST)
    expect(changes[LOWEST - 1]).toBeLessThan(7.5)
  })

  it('ignores a few spikes because it judges the median', () => {
    const governor = new TierGovernor(0)
    for (let i = 0; i < WINDOW * 3; i++) governor.sample(i % 10 === 0 ? 60 : 16.7, 2)
    expect(governor.tier).toBe(0)
  })

  it('steps up only after a calm stretch that doubles after each drop', () => {
    const governor = new TierGovernor(0)
    const calm = (windows: number) => (CHANGE_SETTLE_MS + windows * WINDOW * 16.7) / 1000
    feedFor(governor, (START_SETTLE_MS + WINDOW_MS) / 1000 + 0.1, 30)
    expect(governor.tier).toBe(1)
    let up = feedFor(governor, 20, 16.7)
    expect(governor.tier).toBe(0)
    expect(up[0]).toBeGreaterThan(calm(8) - 0.2)
    expect(up[0]).toBeLessThan(calm(8) + 0.1)
    feedFor(governor, (CHANGE_SETTLE_MS + WINDOW_MS) / 1000 + 0.1, 30)
    expect(governor.tier).toBe(1)
    up = feedFor(governor, 40, 16.7)
    expect(governor.tier).toBe(0)
    expect(up[0]).toBeGreaterThan(calm(16) - 0.2)
    expect(up[0]).toBeLessThan(calm(16) + 0.1)
  })

  it('does not step up when the CPU is busy even if frames fit', () => {
    const governor = new TierGovernor(2)
    feed(governor, 40, 16.7, 9)
    expect(governor.tier).toBe(2)
  })

  it('judges a very slow device within seconds, not after ninety of its frames', () => {
    const governor = new TierGovernor(0)
    let seconds = 0
    while (governor.tier === 0 && seconds < 60) {
      governor.sample(110, 2)
      seconds += 0.11
    }
    expect(governor.tier).toBe(1)
    expect(seconds).toBeLessThan((START_SETTLE_MS + WINDOW_MS) / 1000 + 0.2)
  })

  it('still judges a device that takes a third of a second per frame', () => {
    const governor = new TierGovernor(0)
    let seconds = 0
    while (governor.tier === 0 && seconds < 60) {
      governor.sample(300, 2)
      seconds += 0.3
    }
    expect(governor.tier).toBe(1)
    expect(seconds).toBeLessThan(8)
  })

  it('ignores stalls and stays pinned when asked', () => {
    const governor = new TierGovernor(0)
    feed(governor, 5, STALL_MS + 200)
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
