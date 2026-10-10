import { describe, expect, it } from 'vitest'
import { CREATURE_KINDS, HAT_KINDS } from './kinds'
import { ACTS, TASTES, moodFor, tasteFor } from './tastes'

describe('the tastes', () => {
  it('give every creature one hat it loves, one it cannot stand and one it simply wears', () => {
    for (const creature of CREATURE_KINDS) {
      expect(HAT_KINDS.map((hat) => tasteFor(creature, hat)).sort()).toEqual(['cannot-stand', 'loves', 'wears'])
    }
  })

  it('leave no hat that nobody loves and none that nobody minds', () => {
    for (const hat of HAT_KINDS) {
      const tastes = CREATURE_KINDS.map((creature) => TASTES[creature][hat])
      expect(tastes).toContain('loves')
      expect(tastes).toContain('cannot-stand')
    }
  })

  it('are not the same for every creature, so who gets which hat matters', () => {
    expect(new Set(CREATURE_KINDS.map((creature) => JSON.stringify(TASTES[creature]))).size).toBeGreaterThanOrEqual(4)
  })

  it('give every creature an act of its own for every kind of hat', () => {
    const acts = CREATURE_KINDS.flatMap((creature) => HAT_KINDS.map((hat) => ACTS[creature][hat]))
    expect(acts.length).toBe(15)
    expect(new Set(acts).size).toBe(15)
  })

  it('are heard as a tune', () => {
    expect([moodFor('loves'), moodFor('cannot-stand'), moodFor('wears')]).toEqual(['glad', 'grump', 'plain'])
  })
})
