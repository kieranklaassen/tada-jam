import { describe, expect, it } from 'vitest'
import { below, between, makeRng, pick } from './rng'

describe('the seeded stream', () => {
  it('gives the same numbers for the same seed', () => {
    const a = makeRng(7), b = makeRng(7)
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next())
  })

  it('gives different numbers for different seeds', () => {
    const a = makeRng(1), b = makeRng(2)
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean)
    expect(same.length).toBeLessThan(2)
  })

  it('carries on from a stored state', () => {
    const a = makeRng(99)
    for (let i = 0; i < 5; i++) a.next()
    const b = makeRng(a.state)
    // The stored state is the generator's whole memory.
    expect(b.next()).toBe(a.next())
  })

  it('stays inside its ranges', () => {
    const rng = makeRng(3)
    for (let i = 0; i < 500; i++) {
      const n = rng.next()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
      const k = below(rng, 5)
      expect(Number.isInteger(k) && k >= 0 && k < 5).toBe(true)
      const x = between(rng, -2, 3)
      expect(x >= -2 && x < 3).toBe(true)
      expect(['a', 'b', 'c']).toContain(pick(rng, ['a', 'b', 'c']))
    }
  })
})
