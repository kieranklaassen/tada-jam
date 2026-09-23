import { describe, expect, it } from 'vitest'
import { GOOD_WINDOWS_TO_RAISE, LOWEST_TIER, PERF_FRAMES, PerfRing, STALL_MS, TIERS, TierGovernor, WINDOW, startingTier, tierOverride } from './quality'

const FRAME = 1000 / 60

/** Feed `frames` frames of one interval and one amount of work; returns the seconds it took. */
function feed(governor: TierGovernor, frames: number, intervalMs: number, workMs = 2): number {
  for (let i = 0; i < frames; i++) governor.sample(intervalMs, workMs)
  return (frames * intervalMs) / 1000
}

describe('tiers', () => {
  it('step the pixel ratio from 2 to 1 and shed detail on the way, keeping the street alive at the bottom', () => {
    expect(TIERS.map((t) => t.dpr)).toEqual([2, 1.5, 1.25, 1])
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].livelyBuildings).toBeLessThanOrEqual(TIERS[i - 1].livelyBuildings)
      expect(TIERS[i].particles).toBeLessThanOrEqual(TIERS[i - 1].particles)
      expect(TIERS[i].maxSteps).toBeLessThanOrEqual(TIERS[i - 1].maxSteps)
    }
    expect(TIERS[LOWEST_TIER].walkers).toBeGreaterThan(0)
    expect(TIERS[LOWEST_TIER].livelyBuildings).toBeGreaterThan(0)
    // Two 120 Hz steps make one 60 Hz frame, so even the lowest tier keeps real time at 60 fps.
    expect(TIERS[LOWEST_TIER].maxSteps).toBeGreaterThanOrEqual(2)
  })

  it('?tier=N pins a tier, anything else is automatic', () => {
    expect(tierOverride('?tier=2')).toBe(2)
    expect(tierOverride('?chrome=0&tier=9')).toBe(LOWEST_TIER)
    expect(tierOverride('?tier=')).toBeNull()
    expect(tierOverride('?tier=abc')).toBeNull()
    expect(tierOverride('')).toBeNull()
  })

  it('touch devices start one tier down', () => {
    expect(startingTier(true)).toBe(1)
    expect(startingTier(false)).toBe(0)
  })
})

describe('TierGovernor', () => {
  it('climbs back on 60 Hz frames when the work is light, and not when it is heavy', () => {
    const light = new TierGovernor(1)
    const seconds = feed(light, WINDOW * (GOOD_WINDOWS_TO_RAISE + 1), FRAME, 3)
    expect(light.tier).toBe(0)
    expect(seconds).toBeLessThan(6)
    const heavy = new TierGovernor(1)
    feed(heavy, WINDOW * 60, FRAME, 12)
    expect(heavy.tier).toBe(1)
  })

  it('a few heavy frames in every window block the climb, even when the average is light', () => {
    const governor = new TierGovernor(1)
    for (let i = 0; i < WINDOW * 40; i++) governor.sample(FRAME, i % 5 === 4 ? 12 : 3)
    expect(governor.tier).toBe(1)
  })

  it('steady judder (one frame in five at 33 ms) steps down', () => {
    const governor = new TierGovernor(0)
    for (let i = 0; i < WINDOW * 4; i++) governor.sample(i % 5 === 4 ? FRAME * 2 : FRAME, 3)
    expect(governor.tier).toBe(1)
  })

  it('a single long frame (300 ms) changes nothing', () => {
    const governor = new TierGovernor(0)
    feed(governor, WINDOW * 2, FRAME)
    governor.sample(300, 250)
    feed(governor, WINDOW * 4, FRAME)
    expect(governor.tier).toBe(0)
  })

  it('400 ms frames reach the lowest tier within seconds', () => {
    const governor = new TierGovernor(0)
    let seconds = 0
    let firstStep = Infinity
    while (governor.tier < LOWEST_TIER && seconds < 30) {
      if (governor.sample(400, 380)) firstStep = Math.min(firstStep, seconds)
      seconds += 0.4
    }
    expect(governor.tier).toBe(LOWEST_TIER)
    expect(firstStep).toBeLessThan(3.5)
    expect(seconds).toBeLessThan(7)
  })

  it('a window far off the pace drops two tiers at once', () => {
    const governor = new TierGovernor(0)
    let changes = 0
    for (let i = 0; i < WINDOW * 2 && governor.tier === 0; i++) if (governor.sample(45, 20)) changes += 1
    expect(governor.tier).toBe(2)
    expect(changes).toBe(1)
  })

  it('an upgrade that fails becomes a ceiling for the session', () => {
    const governor = new TierGovernor(1)
    feed(governor, WINDOW * (GOOD_WINDOWS_TO_RAISE + 1), FRAME, 3)
    expect(governor.tier).toBe(0)
    feed(governor, WINDOW * 3, 22, 3)
    expect(governor.tier).toBe(1)
    expect(governor.ceiling).toBe(1)
    feed(governor, WINDOW * 60, FRAME, 3)
    expect(governor.tier).toBe(1)
  })

  it('ignores stalls, and a pinned tier holds until released', () => {
    const governor = new TierGovernor(0)
    expect(governor.sample(STALL_MS + 1, 1)).toBe(false)
    feed(governor, WINDOW * 4, STALL_MS + 1)
    expect(governor.tier).toBe(0)
    governor.force(3)
    feed(governor, WINDOW * 20, FRAME, 1)
    expect(governor.tier).toBe(3)
    governor.force(null)
    feed(governor, WINDOW * (GOOD_WINDOWS_TO_RAISE + 2), FRAME, 1)
    expect(governor.tier).toBe(2)
  })
})

describe('PerfRing', () => {
  it('keeps the last 600 samples in order', () => {
    const ring = new PerfRing()
    for (let i = 0; i < PERF_FRAMES + 25; i++) ring.push(i)
    const ordered = ring.ordered()
    expect(ordered).toHaveLength(PERF_FRAMES)
    expect(ordered[0]).toBe(25)
    expect(ordered.at(-1)).toBe(PERF_FRAMES + 24)
    ring.reset()
    expect(ring.ordered()).toEqual([])
  })
})
