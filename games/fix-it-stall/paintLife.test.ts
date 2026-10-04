import { describe, expect, it } from 'vitest'
import { passing, PASSERS } from './paintLife'

describe('the lane', () => {
  it('has somebody going by in turn, one at a time, with the lane empty between two', () => {
    const seen: string[] = []
    let empty = 0, total = 0
    for (let t = 0; t < 400; t += 0.25) {
      const now = passing(t)
      total++
      if (!now) { empty++; continue }
      expect(now.along).toBeGreaterThanOrEqual(0)
      expect(now.along).toBeLessThan(1)
      if (seen.at(-1) !== now.who) seen.push(now.who)
    }
    expect(new Set(seen).size).toBe(PASSERS.length)
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    // More than a third of the time nobody is passing, and nobody is in view as the stall is first seen.
    expect(empty / total).toBeGreaterThan(0.35)
    expect(passing(0)).toBeNull()
  })

  it('is the same at the same moment, every time', () => {
    expect(passing(123.4)).toEqual(passing(123.4))
  })
})
