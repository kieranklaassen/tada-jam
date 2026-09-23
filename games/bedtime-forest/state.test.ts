import { describe, expect, it } from 'vitest'
import { ANIMAL_KEYS, inClearing } from './layout'
import { allAsleep, defaultForest, deserialize, serialize, STATE_VERSION } from './state'

describe('forest state', () => {
  it('starts with every animal awake in the clearing', () => {
    const state = defaultForest()
    for (const key of ANIMAL_KEYS) {
      expect(state.animals[key].asleep).toBe(false)
      expect(inClearing(state.animals[key], 0)).toBe(true)
    }
    expect(allAsleep(state)).toBe(false)
  })

  it('round-trips through JSON', () => {
    const state = defaultForest()
    state.animals.rabbit.asleep = true
    state.animals.bear.x = 12.345
    const again = deserialize(JSON.parse(JSON.stringify(serialize(state))))
    expect(again.animals.rabbit.asleep).toBe(true)
    expect(again.animals.bear.x).toBeCloseTo(12.3, 5)
  })

  it('survives garbage, other versions, and hostile values', () => {
    for (const raw of [null, undefined, 42, 'forest', [], { v: 99 }, { v: STATE_VERSION }, { v: STATE_VERSION, animals: [] }]) {
      expect(deserialize(raw)).toEqual(defaultForest())
    }
    const odd = deserialize({
      v: STATE_VERSION,
      animals: { owl: { asleep: 'yes', x: Number.NaN, z: 1e9 }, fox: 7, unicorn: { asleep: true }, bear: { asleep: true, x: -1e6, z: 0 } },
    })
    expect(odd.animals.owl.asleep).toBe(false)
    expect(Number.isFinite(odd.animals.owl.x)).toBe(true)
    expect(inClearing(odd.animals.owl, 0)).toBe(true)
    expect(odd.animals.fox).toEqual(defaultForest().animals.fox)
    expect(odd.animals.bear.asleep).toBe(true)
    expect(inClearing(odd.animals.bear, 0)).toBe(true)
    expect(Object.keys(odd.animals)).not.toContain('unicorn')
  })

  it('stays tiny', () => {
    expect(JSON.stringify(serialize(defaultForest())).length).toBeLessThan(1024)
  })

  it('knows when everyone is asleep', () => {
    const state = defaultForest()
    for (const key of ANIMAL_KEYS) state.animals[key].asleep = true
    expect(allAsleep(state)).toBe(true)
  })
})
