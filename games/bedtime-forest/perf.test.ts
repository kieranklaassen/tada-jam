import { describe, expect, it } from 'vitest'
import { FrameGovernor, perfOptions, Ring, TOP_TIER } from './perf'

function feed(governor: FrameGovernor, ms: number, frames: number, clock: { t: number }): number {
  let changes = 0
  for (let i = 0; i < frames; i++) {
    clock.t += ms / 1000
    if (governor.sample(ms, clock.t)) changes += 1
  }
  return changes
}

describe('the frame governor', () => {
  it('steps down after two slow windows, not one', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(TOP_TIER)
    feed(governor, 30, 45, clock)
    expect(governor.tier).toBe(TOP_TIER)
    feed(governor, 30, 45, clock)
    expect(governor.tier).toBe(TOP_TIER - 1)
  })

  it('keeps stepping down on a slow device, down to the lightest tier and no further', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(TOP_TIER)
    feed(governor, 40, 45 * 20, clock)
    expect(governor.tier).toBe(0)
  })

  it('steps back up only after a long fast stretch', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(1)
    feed(governor, 10, 45 * 5, clock)
    expect(governor.tier).toBe(1)
    feed(governor, 10, 45 * 2, clock)
    expect(governor.tier).toBe(2)
  })

  it('a failed step up blocks the next one for a while (no flicker)', () => {
    const clock = { t: 2 }
    const governor = new FrameGovernor(1)
    feed(governor, 10, 45 * 7, clock)
    expect(governor.tier).toBe(2)
    feed(governor, 30, 45 * 3, clock)
    expect(governor.tier).toBe(1)
    const changes = feed(governor, 10, 45 * 12, clock)
    expect(changes).toBe(0)
    feed(governor, 10, 45 * 60, clock)
    expect(governor.tier).toBe(TOP_TIER)
  })

  it('ignores warm-up, stalls, and pinned tiers', () => {
    const early = new FrameGovernor(TOP_TIER)
    feed(early, 40, 30, { t: 0 })
    expect(early.tier).toBe(TOP_TIER)
    const stalls = new FrameGovernor(TOP_TIER)
    feed(stalls, 500, 400, { t: 2 })
    expect(stalls.tier).toBe(TOP_TIER)
    const pinned = new FrameGovernor(TOP_TIER, true)
    feed(pinned, 40, 900, { t: 2 })
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
