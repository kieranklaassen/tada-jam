import { describe, expect, it } from 'vitest'
import { draw, pick, seedOf } from './stream'

describe('the seeded stream', () => {
  it('gives the same run from the same state', () => {
    const run = (state: number) => {
      const values: number[] = []
      for (let i = 0; i < 20; i++) {
        const drawn = draw(state)
        values.push(drawn.value)
        state = drawn.state
      }
      return values
    }
    expect(run(7)).toEqual(run(7))
    expect(run(7)).not.toEqual(run(8))
  })

  it('stays from 0 up to 1 and spreads out', () => {
    let state = 1, low = 0
    for (let i = 0; i < 4000; i++) {
      const drawn = draw(state)
      expect(drawn.value).toBeGreaterThanOrEqual(0)
      expect(drawn.value).toBeLessThan(1)
      if (drawn.value < 0.5) low++
      state = drawn.state
      expect(Number.isInteger(state)).toBe(true)
    }
    expect(low / 4000).toBeGreaterThan(0.45)
    expect(low / 4000).toBeLessThan(0.55)
  })

  it('picks every member of a list in time, and repairs a bad state', () => {
    const seen = new Set<string>()
    let state = 3
    for (let i = 0; i < 200; i++) {
      const picked = pick(state, ['a', 'b', 'c'])
      seen.add(picked.value)
      state = picked.state
    }
    expect(seen.size).toBe(3)
    expect(seedOf(Number.NaN)).toBe(0)
    expect(seedOf(-5.7)).toBe(5)
    expect(seedOf(2 ** 40)).toBeLessThan(2 ** 32)
  })
})
