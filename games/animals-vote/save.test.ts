import { describe, expect, it } from 'vitest'
import { deserialize, serialize } from './save'
import { ANIMALS } from './things'
import { bait, freshTown, hide, ring, tapAnimal } from './town'

describe('the save', () => {
  it('finds the town as it was left', () => {
    const town = { ...freshTown(null), count: 6 }
    tapAnimal(town, 'pig')
    hide(town, 'mouse')
    bait(town, 'cheese', 0)
    expect(deserialize(JSON.parse(JSON.stringify(serialize(town))), null)).toEqual(town)
    ring(town)
    expect(deserialize(JSON.parse(JSON.stringify(serialize(town))), 7)).toEqual(town)
  })
  it('starts by age, and a saved place wins', () => {
    expect(deserialize(null, null).position).toBe('mud-for-all')
    expect(deserialize(null, 3).position).toBe('mud-for-all')
    expect(deserialize(null, 12).position).toBe('one-over')
    expect(deserialize(serialize(freshTown(3)), 12).position).toBe('mud-for-all')
  })
  it('repairs what is broken', () => {
    for (const raw of [1, 'x', [], {}, { v: 9 }, { v: 1 }, { v: 1, columns: 'no' }, { v: 1, columns: [['pig', 'pig', 7], null] }, { v: 1, ballot: ['mud', 'mud', null] }, { v: 1, count: 400 }, { v: 1, snacks: { bun: 2 } }, { v: 1, finished: true }]) {
      const town = deserialize(raw, null)
      expect(new Set(town.columns.flat()).size).toBe(town.columns.flat().length)
      expect(town.finished).toBe(false)
      expect(town.snacks.bun).toBeNull()
    }
    // The pig cannot stand the bath.
    expect(deserialize({ v: 1, columns: [['pig'], ['cat'], []] }, null).columns).toEqual([[], ['cat'], []])
  })
  it('is small', () => {
    const town = { ...freshTown(null), count: 6, columns: [[...ANIMALS], [], []], finished: true }
    expect(JSON.stringify(serialize(town)).length).toBeLessThan(32_000)
  })
  it('leaves nobody short of animals for what the mole would like', () => {
    expect(deserialize({ v: 1, position: 'level-all', count: 4 }, null).count).toBe(6)
  })
  it('keeps that a vote missed and that nothing is changed since', () => {
    const raw = { v: 1, position: 'one-over', count: 5, ballot: ['dance', 'sleep', null], columns: [['pig', 'elephant', 'mouse'], ['cat', 'goat'], []], unmet: true, stale: true }
    expect(deserialize(raw, null)).toMatchObject({ unmet: true, stale: true })
    expect(deserialize({ ...raw, columns: [[], [], []] }, null).stale).toBe(false)
  })
})
