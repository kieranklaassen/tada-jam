import { describe, expect, it } from 'vitest'
import { draw, pickFrom, shuffled, weighted } from './rng'

const isUint32 = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 0xffffffff

/** The first `count` values of the stream that starts at `seed`. */
function run(seed: number, count: number): number[] {
  const values: number[] = []
  let rng = seed
  for (let i = 0; i < count; i++) {
    const drawn = draw(rng)
    values.push(drawn.value)
    rng = drawn.rng
  }
  return values
}

describe('the seeded stream', () => {
  it('gives the same values for the same seed, and other values for another', () => {
    expect(run(7, 50)).toEqual(run(7, 50))
    expect(run(7, 50)).not.toEqual(run(8, 50))
  })

  it('keeps every value from 0 up to but not 1, and its state a uint32', () => {
    for (const seed of [0, 1, 7, 0x7fffffff, 0xffffffff]) {
      let rng = seed
      for (let i = 0; i < 2000; i++) {
        const drawn = draw(rng)
        expect(drawn.value).toBeGreaterThanOrEqual(0)
        expect(drawn.value).toBeLessThan(1)
        expect(isUint32(drawn.rng)).toBe(true)
        rng = drawn.rng
      }
    }
  })

  it('takes any number as a state', () => {
    for (const odd of [-1, 1.5, 2 ** 40, Number.NaN, Number.POSITIVE_INFINITY]) {
      const drawn = draw(odd)
      expect(isUint32(drawn.rng)).toBe(true)
      expect(drawn.value).toBeGreaterThanOrEqual(0)
      expect(drawn.value).toBeLessThan(1)
    }
  })

  it('spreads its values over the whole range', () => {
    const values = run(42, 4000)
    const tenths = Array.from({ length: 10 }, (_, tenth) => values.filter((value) => Math.floor(value * 10) === tenth).length)
    for (const count of tenths) expect(count).toBeGreaterThan(300)
  })
})

describe('the helpers that thread the stream', () => {
  it('picks a member, the same one for the same state, and reaches every member', () => {
    const items = ['a', 'b', 'c', 'd'] as const
    const seen = new Set<string>()
    let rng = 3
    for (let i = 0; i < 200; i++) {
      const picked = pickFrom(items, rng)
      expect(items).toContain(picked.value)
      expect(pickFrom(items, rng)).toEqual(picked)
      expect(isUint32(picked.rng)).toBe(true)
      seen.add(picked.value)
      rng = picked.rng
    }
    expect(seen.size).toBe(items.length)
  })

  it('shuffles into the same members, leaves the list it was handed alone, and repeats for the same state', () => {
    const items = [1, 2, 3, 4, 5, 5]
    const orders = new Set<string>()
    let rng = 11
    for (let i = 0; i < 200; i++) {
      const mixed = shuffled(items, rng)
      expect([...mixed.items].sort()).toEqual([1, 2, 3, 4, 5, 5])
      expect(shuffled(items, rng)).toEqual(mixed)
      expect(isUint32(mixed.rng)).toBe(true)
      orders.add(mixed.items.join(''))
      rng = mixed.rng
    }
    expect(items).toEqual([1, 2, 3, 4, 5, 5])
    expect(orders.size).toBeGreaterThan(20)
    expect(shuffled([], 5)).toEqual({ items: [], rng: 5 })
  })

  it('draws by weight: never a weight of zero, and the heavier the more often', () => {
    const items = [{ item: 'never', weight: 0 }, { item: 'light', weight: 1 }, { item: 'heavy', weight: 3 }]
    const counts: Record<string, number> = { never: 0, light: 0, heavy: 0 }
    let rng = 99
    for (let i = 0; i < 4000; i++) {
      const drawn = weighted(items, rng)
      expect(weighted(items, rng)).toEqual(drawn)
      counts[drawn.value]++
      rng = drawn.rng
    }
    expect(counts.never).toBe(0)
    expect(counts.light).toBeGreaterThan(800)
    expect(counts.light).toBeLessThan(1200)
    expect(counts.heavy).toBeGreaterThan(2800)
  })
})
