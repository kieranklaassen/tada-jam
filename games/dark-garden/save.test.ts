import { describe, expect, it } from 'vitest'
import { CARRIERS } from './cast'
import { LENGTH } from './garden'
import { allSet, deserialize, fresh, serialize, setDown } from './save'

describe('the save', () => {
  it('comes back as it went, at any stage', () => {
    let save = { ...fresh(), shown: true }
    for (let i = 0; i < 10; i++) {
      save = setDown(save, (i * 3) % 10)
      expect(deserialize(JSON.parse(JSON.stringify(serialize(save))))).toEqual(serialize(save))
    }
    expect(allSet(save)).toBe(true)
    expect(JSON.stringify(serialize(save)).length).toBeLessThan(1000)
  })
  it('opens on anything', () => {
    for (const bad of [null, undefined, 4, 'x', [], {}, { v: 2 }, { v: 1, set: 'no', queue: 9, u: 'far', lit: 1, to: {} }, { v: 1, set: ['wolf', 'gnome'], queue: ['bear', 'bear', 'wolf'], u: -5, to: 77 }, { v: 1, u: NaN }]) {
      const save = deserialize(bad)
      expect(save.set).toHaveLength(10)
      expect([...save.queue].sort()).toEqual([...CARRIERS].sort())
      expect(save.u >= 0 && save.u <= LENGTH).toBe(true)
    }
    expect(deserialize({ v: 1, set: ['wolf', 'gnome'], queue: ['bear', 'bear'] }).set[1]).toBe('gnome')
  })
  it('finds a light set that was on its way to be set', () => {
    const save = deserialize({ ...fresh(), lit: true, u: 900, to: 4, shown: true })
    expect(save.set[4]).toBe('gnome')
    expect(save.queue).toEqual(['goose', 'hare', 'bear', 'gnome'])
    expect(save).toMatchObject({ u: 0, lit: false, to: null })
  })
})
