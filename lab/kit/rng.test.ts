import { describe, expect, it } from 'vitest'
import { between, chance, createRng, deriveSeed, hashText, int, pick } from './rng.ts'

function take(seed: number, n: number): number[] {
  const rng = createRng(seed)
  return Array.from({ length: n }, () => rng())
}

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(42, 50)).toEqual(take(42, 50))
  })

  it('gives different sequences for different seeds', () => {
    expect(take(1, 20)).not.toEqual(take(2, 20))
  })

  it('stays inside [0, 1)', () => {
    for (const value of take(7, 2000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('has helpers that stay in range and replay by seed', () => {
    const a = createRng(9)
    const b = createRng(9)
    for (let i = 0; i < 200; i++) {
      const n = int(a, 3, 6)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(6)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBe(int(b, 3, 6))
      const x = between(a, -2, 2)
      expect(x).toBeGreaterThanOrEqual(-2)
      expect(x).toBeLessThan(2)
      expect(x).toBe(between(b, -2, 2))
      expect(chance(a, 0.5)).toBe(chance(b, 0.5))
    }
    expect(() => pick(a, [])).toThrow()
    expect(pick(a, ['only'])).toBe('only')
  })
})

describe('deriveSeed', () => {
  it('is deterministic', () => {
    expect(deriveSeed(12, 3)).toBe(deriveSeed(12, 3))
  })

  it('spreads over indices 0..20 with no repeats', () => {
    const seeds = Array.from({ length: 21 }, (_, i) => deriveSeed(12, i))
    expect(new Set(seeds).size).toBe(21)
    // Neighbouring indices land far apart, not one apart.
    for (let i = 1; i < seeds.length; i++) {
      expect(Math.abs(seeds[i]! - seeds[i - 1]!)).toBeGreaterThan(1000)
    }
    // Spread over the whole 32-bit range, in both halves.
    const high = seeds.filter((s) => s >= 2 ** 31).length
    expect(high).toBeGreaterThan(3)
    expect(high).toBeLessThan(18)
  })

  it('differs for different base seeds at the same index', () => {
    expect(deriveSeed(1, 0)).not.toBe(deriveSeed(2, 0))
  })

  it('always returns an unsigned 32-bit integer', () => {
    for (let i = 0; i < 50; i++) {
      const seed = deriveSeed(i * 7919, i)
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThan(2 ** 32)
    }
  })
})

describe('hashText', () => {
  it('is stable and separates different text', () => {
    expect(hashText('kaia')).toBe(hashText('kaia'))
    expect(hashText('kaia')).not.toBe(hashText('tess'))
    expect(hashText('')).toBe(0x811c9dc5)
  })

  it('returns an unsigned 32-bit integer', () => {
    const h = hashText('pebble-table')
    expect(Number.isInteger(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(2 ** 32)
  })
})
