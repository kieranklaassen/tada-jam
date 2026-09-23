import { describe, expect, it } from 'vitest'
import { parseTier, PERF_FRAMES, PerfRecorder, SETTLE_SECONDS, STALL_MS, startingTier, TierController, TIERS, UPGRADE_AFTER_SECONDS } from './perf'

/** Feed `seconds` of frames at `intervalMs`, starting at `from`; returns the end time. */
function feed(tiers: TierController, from: number, seconds: number, intervalMs: number): number {
  let now = from
  const end = from + seconds
  while (now < end) {
    now += intervalMs / 1000
    tiers.frame(intervalMs, now)
  }
  return now
}

describe('quality tiers', () => {
  it('step down in cost: pixels, then post, then fuzz shells', () => {
    expect(TIERS.length).toBeGreaterThanOrEqual(3)
    expect(TIERS[0]).toMatchObject({ dpr: 2, post: true, blur: true, msaa: true, fuzz: 3 })
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].dpr).toBeLessThan(TIERS[i - 1].dpr)
      expect(TIERS[i].fuzz).toBeLessThan(TIERS[i - 1].fuzz)
      expect(TIERS[i].msaa).toBe(false)
      if (TIERS[i - 1].post === false) expect(TIERS[i].post).toBe(false)
    }
    expect(TIERS[TIERS.length - 1]).toMatchObject({ dpr: 1, post: false, fuzz: 0 })
  })
})

describe('TierController', () => {
  it('stays at the top tier at a steady 60 fps', () => {
    const tiers = new TierController(null)
    feed(tiers, 0, 30, 16.7)
    expect(tiers.tier).toBe(0)
  })

  it('drops one tier after a slow second and two after a very slow one', () => {
    const slow = new TierController(null)
    feed(slow, 0, 1.2, 25)
    expect(slow.tier).toBe(1)
    const verySlow = new TierController(null)
    feed(verySlow, 0, 1.2, 50)
    expect(verySlow.tier).toBe(2)
  })

  it('ignores the settling frames right after a change', () => {
    const tiers = new TierController(null)
    const now = feed(tiers, 0, 1.2, 25)
    expect(tiers.tier).toBe(1)
    feed(tiers, now, SETTLE_SECONDS * 0.9, 80)
    expect(tiers.tier).toBe(1)
  })

  it('tries the next tier up after a long run at full rate, and stops trying after two failures', () => {
    const tiers = new TierController(null)
    let now = feed(tiers, 0, 1.2, 25)
    now = feed(tiers, now, UPGRADE_AFTER_SECONDS + 2, 16.7)
    expect(tiers.tier).toBe(0)
    now = feed(tiers, now, 1.2, 25)
    expect(tiers.tier).toBe(1)
    now = feed(tiers, now, UPGRADE_AFTER_SECONDS * 4, 16.7)
    expect(tiers.tier).toBe(1)
  })

  it('never goes below the lowest tier', () => {
    const tiers = new TierController(null)
    feed(tiers, 0, 20, 90)
    expect(tiers.tier).toBe(TIERS.length - 1)
  })

  it('holds a pinned tier whatever the frame rate', () => {
    const tiers = new TierController(2)
    feed(tiers, 0, 5, 90)
    feed(tiers, 5, 30, 16.7)
    expect(tiers.tier).toBe(2)
  })

  it('never steps down for a stall (a paused debugger, a missed tab switch)', () => {
    const tiers = new TierController(null)
    let now = feed(tiers, 0, 3, 16.7)
    for (const gap of [STALL_MS + 1, 4000, 30000]) {
      now += gap / 1000
      tiers.frame(gap, now)
      now = feed(tiers, now, 0.5, 16.7)
    }
    feed(tiers, now, 3, 16.7)
    expect(tiers.tier).toBe(0)
  })

  it('learns nothing from a paced rest: no step down for its long intervals, no upgrade for its length', () => {
    const tiers = new TierController(null, 0, 1)
    let now = feed(tiers, 0, 3, 16.7)
    for (let i = 0; i < 30 * 60; i++) {
      now += 0.0334
      tiers.skip(now)
    }
    now += 0.12
    tiers.frame(120, now)
    expect(tiers.tier).toBe(1)
    now = feed(tiers, now, UPGRADE_AFTER_SECONDS - 3, 16.7)
    expect(tiers.tier).toBe(1)
    feed(tiers, now, 6, 16.7)
    expect(tiers.tier).toBe(0)
  })

  it('starts touch devices one tier down, and a fast one earns the top tier', () => {
    expect(startingTier(false)).toBe(0)
    const tiers = new TierController(null, 0, startingTier(true))
    expect(tiers.tier).toBe(1)
    feed(tiers, 0, UPGRADE_AFTER_SECONDS + 2, 16.7)
    expect(tiers.tier).toBe(0)
    expect(new TierController(3, 0, startingTier(true)).tier).toBe(3)
  })
})

describe('parseTier', () => {
  it('reads ?tier=N only when it names a real tier', () => {
    expect(parseTier('?tier=0')).toBe(0)
    expect(parseTier('?fps=1&tier=3')).toBe(3)
    for (const bad of ['', '?tier=', '?tier=9', '?tier=-1', '?tier=1.5', '?tier=x']) expect(parseTier(bad)).toBeNull()
  })
})

describe('PerfRecorder', () => {
  it('keeps the newest PERF_FRAMES samples, oldest first', () => {
    const recorder = new PerfRecorder()
    for (let i = 0; i < PERF_FRAMES + 5; i++) recorder.push(i)
    const list = recorder.list()
    expect(list).toHaveLength(PERF_FRAMES)
    expect(list[0]).toBe(5)
    expect(list[list.length - 1]).toBe(PERF_FRAMES + 4)
    const recent = new Float32Array(3)
    expect(recorder.recent(recent)).toBe(3)
    expect([...recent]).toEqual([PERF_FRAMES + 2, PERF_FRAMES + 3, PERF_FRAMES + 4])
    recorder.reset()
    expect(recorder.list()).toEqual([])
  })
})
