import { describe, expect, it } from 'vitest'
import { PROBATION_MS, startingTier, TIER_COUNT, tierLook, TierMonitor, tierOverride } from './tiers'

function run(monitor: TierMonitor, frameMs: number, seconds: number, startMs: number): number {
  let now = startMs
  const frames = Math.round((seconds * 1000) / frameMs)
  for (let i = 0; i < frames; i++) {
    now += frameMs
    monitor.sample(frameMs, now)
  }
  return now
}

describe('quality tiers', () => {
  it('holds the top tier while frames are steady', () => {
    const monitor = new TierMonitor()
    run(monitor, 16.7, 30, 0)
    expect(monitor.tier).toBe(0)
  })

  it('starts touch devices one tier down, and climbs to the top once they keep up', () => {
    expect(startingTier(false)).toBe(0)
    const monitor = new TierMonitor({ start: startingTier(true) })
    expect(monitor.tier).toBe(1)
    const now = run(monitor, 16.7, 9, 0)
    expect(monitor.tier).toBe(1)
    run(monitor, 16.7, 3, now)
    expect(monitor.tier).toBe(0)
  })

  it('steps down after sustained slow frames, one tier at a time', () => {
    const monitor = new TierMonitor()
    let now = run(monitor, 28, 3.2, 0)
    expect(monitor.tier).toBe(1)
    now = run(monitor, 28, 3.2, now)
    expect(monitor.tier).toBe(2)
    run(monitor, 28, 30, now)
    expect(monitor.tier).toBe(TIER_COUNT - 1)
  })

  it('drops two tiers at once when a second is far over budget', () => {
    const monitor = new TierMonitor()
    let now = run(monitor, 100, 2.1, 0)
    expect(monitor.tier).toBe(2)
    now = run(monitor, 100, 2.1, now)
    expect(monitor.tier).toBe(TIER_COUNT - 1)
    run(monitor, 100, 10, now)
    expect(monitor.tier).toBe(TIER_COUNT - 1)
  })

  it('ignores a single slow second and long pauses', () => {
    const monitor = new TierMonitor()
    let now = run(monitor, 16.7, 2, 0)
    now = run(monitor, 30, 1, now)
    now = run(monitor, 16.7, 2, now)
    monitor.sample(4000, now + 4000)
    expect(monitor.tier).toBe(0)
  })

  it('treats a run of very long frames as a very slow device, not a pause', () => {
    const monitor = new TierMonitor()
    run(monitor, 380, 12, 0)
    expect(monitor.tier).toBeGreaterThan(0)
    const alternating = new TierMonitor()
    let now = 0
    for (let i = 0; i < 60; i++) {
      const frameMs = i % 2 ? 266 : 240
      now += frameMs
      alternating.sample(frameMs, now)
    }
    expect(alternating.tier).toBeGreaterThan(0)
  })

  it('climbs back only after a long steady stretch, and not into a tier that was just slow', () => {
    const monitor = new TierMonitor()
    let now = run(monitor, 28, 3.2, 0)
    expect(monitor.tier).toBe(1)
    now = run(monitor, 16.7, 15, now)
    expect(monitor.tier).toBe(1)
    run(monitor, 16.7, PROBATION_MS / 1000, now)
    expect(monitor.tier).toBe(0)
  })

  it('stays pinned by the override', () => {
    const monitor = new TierMonitor({ pinned: 2 })
    run(monitor, 60, 20, 0)
    expect(monitor.tier).toBe(2)
    expect(tierOverride('?tier=1')).toBe(1)
    expect(tierOverride('?chrome=0&tier=3')).toBe(3)
    expect(tierOverride('?tier=9')).toBeNull()
    expect(tierOverride('?tier=x')).toBeNull()
    expect(tierOverride('')).toBeNull()
  })

  it('caps DPR at the device and trims effects in lower tiers', () => {
    expect(tierLook(0, 3).dpr).toBe(2)
    expect(tierLook(0, 1).dpr).toBe(1)
    expect(tierLook(TIER_COUNT - 1, 2).ambientFireflies).toBeGreaterThan(0)
    expect(tierLook(TIER_COUNT - 1, 2).ambientFireflies).toBeLessThan(tierLook(0, 2).ambientFireflies)
    expect(tierLook(0, 2).trail).toBeGreaterThan(tierLook(TIER_COUNT - 1, 2).trail)
  })
})
