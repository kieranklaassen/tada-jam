// template: cartridge/rng.test.ts v3
import { describe, expect, it } from 'vitest'
import { below, makeRng, pick, seedOf } from './rng'

const run = (seed: number, length: number): number[] => {
  const rng = makeRng(seed)
  return Array.from({ length }, () => rng.next())
}

describe('a seeded stream', () => {
  it('gives the same numbers for the same seed, and others for another', () => {
    expect(run(7, 20)).toEqual(run(7, 20))
    expect(run(7, 20)).not.toEqual(run(8, 20))
  })

  it('stays from 0 up to but not including 1, and spreads over the range', () => {
    const numbers = run(12345, 4000)
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...numbers)).toBeLessThan(1)
    const tenths = Array.from({ length: 10 }, (_, tenth) => numbers.filter((n) => Math.floor(n * 10) === tenth).length)
    for (const count of tenths) expect(Math.abs(count - 400)).toBeLessThan(100)
  })

  it('carries on from a saved state where it stopped', () => {
    const first = makeRng(99)
    for (let i = 0; i < 5; i++) first.next()
    const saved: unknown = JSON.parse(JSON.stringify({ rng: first.state }))
    const again = makeRng((saved as { rng: number }).rng)
    expect([again.next(), again.next(), again.next()]).toEqual([first.next(), first.next(), first.next()])
  })

  it('takes any number as a seed', () => {
    for (const seed of [0, -1, 1.5, 2 ** 40, NaN, Infinity]) {
      const rng = makeRng(seed)
      const n = rng.next()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
      expect(Number.isInteger(rng.state)).toBe(true)
    }
  })

  it('picks whole numbers below a count and items of a list, each of them in turn', () => {
    const rng = makeRng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const n = below(rng, 6)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(6)
      seen.add(n)
    }
    expect(seen.size).toBe(6)
    const items = ['owl', 'mole', 'hare'] as const
    const picked = new Set(Array.from({ length: 60 }, () => pick(rng, items)))
    expect([...picked].sort()).toEqual(['hare', 'mole', 'owl'])
    expect(pick(rng, ['only'])).toBe('only')
  })
})

describe('the seed of a visit', () => {
  it('is the one pinned in the address, so a still can be taken again', () => {
    expect(seedOf('?seed=7')).toBe(7)
    expect(seedOf('?tier=0&seed=4294967295&fps=1')).toBe(4294967295)
    expect(seedOf('?seed=0', () => 0.5)).toBe(0)
  })

  it('is a new whole number when none is pinned, or when what is pinned is no whole number', () => {
    for (const search of ['', '?tier=0', '?seed=', '?seed=seven', '?seed=-3', '?seed=1.5']) {
      expect(seedOf(search, () => 0.25)).toBe(2 ** 30)
      const drawn = seedOf(search)
      expect(Number.isInteger(drawn)).toBe(true)
      expect(drawn).toBeGreaterThanOrEqual(0)
      expect(drawn).toBeLessThan(2 ** 32)
    }
  })
})
