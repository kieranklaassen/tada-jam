import { describe, expect, it } from 'vitest'
import { SAVE_VERSION, deserialize, serialize } from './snapshot'

describe('snapshot', () => {
  it('round-trips through JSON', () => {
    const saved = serialize(2.5, true, false, { lat: -0.59, lon: 2.64 }, 21.5)
    expect(deserialize(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })

  it('still reads version 1 slots, without a home or a time', () => {
    expect(deserialize({ v: 1, elongation: 1.2, pov: true, halves: true })).toEqual({ v: SAVE_VERSION, elongation: 1.2, pov: true, halves: true, home: null, hours: null })
  })

  it('reads empty, unknown and damaged slots safely', () => {
    for (const value of [null, undefined, 3, 'x', [], {}, { v: 0 }, { v: 9 }]) expect(deserialize(value)).toBeNull()
    const damaged = deserialize({ v: SAVE_VERSION, elongation: 'x', pov: 'yes', home: { lat: 9, lon: 1 }, hours: Number.NaN })
    expect(damaged).toEqual({ v: SAVE_VERSION, elongation: 0, pov: false, halves: false, home: null, hours: null })
    expect(deserialize({ v: SAVE_VERSION, elongation: -1, hours: 30 })?.elongation).toBeCloseTo(Math.PI * 2 - 1)
    expect(deserialize({ v: SAVE_VERSION, hours: 30 })?.hours).toBeCloseTo(6)
  })
})
