import { describe, expect, it } from 'vitest'
import { FrameGovernor, perfOptions, Ring, startingTier, TOP_TIER } from './perf'

/** Feed frames of `ms` each for `seconds`; returns how many times the tier changed. */
function feed(governor: FrameGovernor, ms: number, seconds: number, clock: { t: number }): number {
  let changes = 0
  const frames = Math.round((seconds * 1000) / ms)
  for (let i = 0; i < frames; i++) {
    clock.t += ms / 1000
    if (governor.sample(ms, clock.t)) changes += 1
  }
  return changes
}

describe('starting tier', () => {
  it('starts touch devices one tier down, and a fast one earns the top tier at 60 Hz', () => {
    expect(startingTier(false)).toBe(TOP_TIER)
    const governor = new FrameGovernor(startingTier(true))
    expect(governor.tier).toBe(TOP_TIER - 1)
    feed(governor, 16.7, 20, { t: 0 })
    expect(governor.tier).toBe(TOP_TIER)
  })
})

describe('the frame governor', () => {
  it('steps down after two slow windows, not one', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(TOP_TIER)
    feed(governor, 30, 0.51, clock)
    expect(governor.tier).toBe(TOP_TIER)
    feed(governor, 30, 0.51, clock)
    expect(governor.tier).toBe(TOP_TIER - 1)
  })

  it('keeps stepping down on a slow device, down to the lightest tier and no further', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(TOP_TIER)
    feed(governor, 30, 20, clock)
    expect(governor.tier).toBe(0)
  })

  it('reaches the lightest tier within a few seconds when frames crawl', () => {
    const clock = { t: 0 }
    const governor = new FrameGovernor(TOP_TIER)
    feed(governor, 140, 4, clock)
    expect(governor.tier).toBe(0)
    const glacial = new FrameGovernor(TOP_TIER)
    feed(glacial, 650, 12, { t: 0 })
    expect(glacial.tier).toBe(0)
  })

  it('a lone long frame now and then is a hiccup, not a slow device', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(TOP_TIER)
    for (let i = 0; i < 20; i++) {
      feed(governor, 16.7, 1.2, clock)
      clock.t += 0.6
      governor.sample(600, clock.t)
    }
    expect(governor.tier).toBe(TOP_TIER)
  })

  it('steps back up after a long clean stretch at 60 Hz', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(1)
    feed(governor, 16.7, 2.5, clock)
    expect(governor.tier).toBe(1)
    feed(governor, 16.7, 1.5, clock)
    expect(governor.tier).toBe(2)
  })

  it('a failed step up blocks the next one, longer each time (no flicker)', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(1)
    feed(governor, 16.7, 4, clock)
    expect(governor.tier).toBe(2)
    feed(governor, 30, 1.6, clock)
    expect(governor.tier).toBe(1)
    expect(feed(governor, 16.7, 25, clock)).toBe(0)
    feed(governor, 16.7, 6, clock)
    expect(governor.tier).toBe(2)
    feed(governor, 30, 1.6, clock)
    expect(governor.tier).toBe(1)
    expect(feed(governor, 16.7, 55, clock)).toBe(0)
    feed(governor, 16.7, 7, clock)
    expect(governor.tier).toBe(2)
  })

  it('ignores warm-up, stalls, and pinned tiers', () => {
    const early = new FrameGovernor(TOP_TIER)
    feed(early, 40, 1.2, { t: 0 })
    expect(early.tier).toBe(TOP_TIER)
    const stalls = new FrameGovernor(TOP_TIER)
    feed(stalls, 1500, 60, { t: 2 })
    expect(stalls.tier).toBe(TOP_TIER)
    const pinned = new FrameGovernor(TOP_TIER, true)
    feed(pinned, 140, 30, { t: 2 })
    expect(pinned.tier).toBe(TOP_TIER)
  })
})

describe('the ring of frame times', () => {
  it('keeps the newest values, oldest first', () => {
    const ring = new Ring(3)
    for (const v of [1, 2, 3, 4, 5]) ring.push(v)
    expect(ring.values()).toEqual([3, 4, 5])
    expect(ring.recent(0)).toBe(5)
    ring.reset()
    expect(ring.values()).toEqual([])
  })
})

describe('perf options', () => {
  it('reads the tier pin and the overlay flag from the query', () => {
    expect(perfOptions('?chrome=0&tier=1&fps=1')).toEqual({ tier: 1, overlay: true, walk: false })
    expect(perfOptions('?tier=9&walk=1')).toEqual({ tier: TOP_TIER, overlay: false, walk: true })
    expect(perfOptions('?tier=x')).toEqual({ tier: null, overlay: false, walk: false })
    expect(perfOptions('')).toEqual({ tier: null, overlay: false, walk: false })
  })
})
