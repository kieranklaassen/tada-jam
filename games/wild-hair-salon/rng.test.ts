import { describe, expect, it } from 'vitest'
import { makeRng, nextSeed, toSeed } from './rng'

describe('the seeded stream', () => {
  it('gives the same values for the same seed', () => {
    const a = makeRng(7), b = makeRng(7)
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next())
  })

  it('gives different streams for different seeds', () => {
    const a = makeRng(1), b = makeRng(2)
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length
    expect(same).toBeLessThan(3)
  })

  it('stays inside its bounds', () => {
    const rng = makeRng(99)
    for (let i = 0; i < 2000; i++) {
      const v = rng.next(), n = rng.int(3, 9), r = rng.range(-2, 5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(Number.isInteger(n) && n >= 3 && n <= 9).toBe(true)
      expect(r >= -2 && r < 5).toBe(true)
    }
  })

  it('reaches both ends of a whole-number range', () => {
    const rng = makeRng(5), seen = new Set<number>()
    for (let i = 0; i < 400; i++) seen.add(rng.int(0, 3))
    expect([...seen].sort()).toEqual([0, 1, 2, 3])
  })

  it('picks only items of the list', () => {
    const rng = makeRng(11), items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items))
  })

  it('turns anything into a whole seed', () => {
    expect(toSeed(12.9)).toBe(12)
    expect(toSeed(-4)).toBe(4)
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 'x', null, undefined, {}]) expect(toSeed(bad)).toBe(0)
  })

  it('moves the seed on, to a whole number in range, without settling', () => {
    let seed = 0
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      seed = nextSeed(seed)
      expect(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff).toBe(true)
      seen.add(seed)
    }
    expect(seen.size).toBe(500)
  })
})
