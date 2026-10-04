import { describe, expect, it } from 'vitest'
import { curve, drift, hash, oval, seedOf } from './ink'

describe('the seeded hash', () => {
  it('gives the same number for the same seed and index', () => {
    for (const [seed, index] of [[0, 0], [1, 0], [20261003, 17], [-5, 900001]]) {
      expect(hash(seed, index)).toBe(hash(seed, index))
    }
  })

  it('stays from 0 up to 1', () => {
    for (let i = 0; i < 2000; i++) {
      const value = hash(i * 7919, i)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('is spread evenly over ten bins, along the index and along the seed', () => {
    for (const along of ['index', 'seed'] as const) {
      const bins = new Array<number>(10).fill(0)
      for (let i = 0; i < 10000; i++) bins[Math.floor((along === 'index' ? hash(42, i) : hash(i, 42)) * 10)]++
      for (const count of bins) {
        expect(count).toBeGreaterThan(850)
        expect(count).toBeLessThan(1150)
      }
    }
  })

  it('does not repeat between neighbouring seeds', () => {
    const seen = new Set<number>()
    for (let seed = 0; seed < 200; seed++) for (let index = 0; index < 20; index++) seen.add(hash(seed, index))
    expect(seen.size).toBeGreaterThan(3990)
  })

  it('makes a different seed from the same parts in another order', () => {
    expect(seedOf(1, 2, 3)).toBe(seedOf(1, 2, 3))
    expect(seedOf(1, 2, 3)).not.toBe(seedOf(3, 2, 1))
    expect(Number.isInteger(seedOf(4, 5))).toBe(true)
  })
})

describe('the hand', () => {
  it('wanders smoothly from -1 to 1 and the same way every time', () => {
    let last = drift(9, 0)
    for (let x = 0.05; x < 40; x += 0.05) {
      const value = drift(9, x)
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
      expect(Math.abs(value - last)).toBeLessThan(0.2)
      last = value
    }
    expect(drift(9, 12.34)).toBe(drift(9, 12.34))
  })

  it('draws a smooth line through its points, ends included', () => {
    const line = curve([[0, 0], [10, 0], [10, 10]])
    expect(line[0]).toEqual([0, 0])
    expect(line[line.length - 1]).toEqual([10, 10])
    expect(line.some(([x, y]) => Math.abs(x - 10) < 1e-9 && Math.abs(y) < 1e-9)).toBe(true)
    for (let i = 1; i < line.length; i++) expect(Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])).toBeLessThan(4)
  })

  it('closes an oval on itself', () => {
    const ring = oval(5, 5, 4, 2)
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0])
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1])
  })
})
