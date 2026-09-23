import { describe, expect, it } from 'vitest'
import { COOLDOWN_S, DROP_AFTER_S, forcedTier, LIGHT_WORK_MS, RISE_AFTER_S, TierController, TIERS } from './tiers'

function run(controller: TierController, frameMs: number, from: number, seconds: number, workMs = 2): number[] {
  const changes: number[] = []
  for (let t = from; t < from + seconds; t += frameMs / 1000) {
    const changed = controller.sample(frameMs, t, workMs)
    if (changed >= 0) changes.push(changed)
  }
  return changes
}

describe('TierController', () => {
  it('keeps the top tier while frames are fast', () => {
    const c = new TierController(0)
    expect(run(c, 16.7, 0, 20)).toEqual([])
    expect(c.tier).toBe(0)
  })

  it('drops one tier after a sustained slow stretch, with a cooldown between drops', () => {
    const c = new TierController(0)
    const changes = run(c, 25, 0, DROP_AFTER_S + 0.6)
    expect(changes).toEqual([1])
    run(c, 25, DROP_AFTER_S + 0.6, 30)
    expect(c.tier).toBe(TIERS.length - 1)
  })

  it('does not drop on a short hitch', () => {
    const c = new TierController(0)
    run(c, 16.7, 0, 3)
    run(c, 60, 3, 0.3)
    run(c, 16.7, 3.3, 5)
    expect(c.tier).toBe(0)
  })

  it('climbs back only after a long on-time stretch, at 60 Hz as well as 120 Hz', () => {
    for (const frameMs of [16.7, 8.3]) {
      const c = new TierController(0)
      run(c, 25, 0, DROP_AFTER_S + 0.6)
      expect(c.tier).toBe(1)
      run(c, frameMs, 10, RISE_AFTER_S - 1)
      expect(c.tier).toBe(1)
      run(c, frameMs, 10 + RISE_AFTER_S - 1, 2)
      expect(c.tier).toBe(0)
    }
  })

  it('starts a touch device one tier down and lets it earn the top tier on a 60 Hz screen, but only with CPU headroom', () => {
    const light = new TierController(1)
    run(light, 16.7, 0, RISE_AFTER_S + 2)
    expect(light.tier).toBe(0)
    const busy = new TierController(1)
    run(busy, 16.7, 0, RISE_AFTER_S * 4, LIGHT_WORK_MS + 2)
    expect(busy.tier).toBe(1)
  })

  it('never retries an upgrade that failed right away', () => {
    const c = new TierController(1)
    run(c, 16.7, 0, RISE_AFTER_S + 1)
    expect(c.tier).toBe(0)
    run(c, 25, RISE_AFTER_S + 1, COOLDOWN_S + DROP_AFTER_S + 0.5)
    expect(c.tier).toBe(1)
    run(c, 16.7, 20, 120)
    expect(c.tier).toBe(1)
  })

  it('stops retrying a tier it had to leave twice', () => {
    const c = new TierController(0)
    let t = 0
    for (let round = 0; round < 2; round++) {
      run(c, 25, t, DROP_AFTER_S + 0.6)
      t += 20
      run(c, 10, t, RISE_AFTER_S + COOLDOWN_S + 1)
      t += 20
    }
    run(c, 25, t, DROP_AFTER_S + 0.6)
    t += 20
    run(c, 10, t, 60)
    expect(c.tier).toBe(1)
  })

  it('steps a very slow device all the way down, two tiers at a time: 400 ms frames are slow, not a stall', () => {
    const c = new TierController(0)
    const changes = run(c, 400, 0, 12)
    expect(changes[0]).toBe(2)
    expect(c.tier).toBe(TIERS.length - 1)
  })

  it('drops one tier when only a little slow', () => {
    const c = new TierController(0)
    expect(run(c, 25, 0, DROP_AFTER_S + 0.6)).toEqual([1])
  })

  it('ignores pauses such as a tab switch', () => {
    const c = new TierController(0)
    expect(c.sample(2000, 1)).toBe(-1)
    expect(c.smoothedMs).toBeLessThan(20)
  })

  it('honours a pinned tier', () => {
    const c = new TierController(0, 2)
    expect(run(c, 60, 0, 10)).toEqual([])
    expect(c.tier).toBe(2)
    expect(c.forced).toBe(true)
  })
})

describe('forcedTier', () => {
  it('reads ?tier=N and clamps it', () => {
    expect(forcedTier('?tier=2')).toBe(2)
    expect(forcedTier('?chrome=0&tier=9')).toBe(TIERS.length - 1)
    expect(forcedTier('?tier=')).toBeNull()
    expect(forcedTier('?tier=abc')).toBeNull()
    expect(forcedTier('')).toBeNull()
  })
})
