import { describe, expect, it } from 'vitest'
import { SAVE_VERSION, deserialize, serialize } from './snapshot'

describe('snapshot', () => {
  it('round-trips through JSON', () => {
    const saved = serialize(2.5, true, false)
    expect(deserialize(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })

  it('reads empty, old and damaged slots safely', () => {
    for (const value of [null, undefined, 3, 'x', [], {}, { v: 0 }]) expect(deserialize(value)).toBeNull()
    expect(deserialize({ v: SAVE_VERSION, elongation: 'x', pov: 'yes' })).toEqual({ v: SAVE_VERSION, elongation: 0, pov: false, halves: false })
    expect(deserialize({ v: SAVE_VERSION, elongation: Number.POSITIVE_INFINITY })?.elongation).toBe(0)
    expect(deserialize({ v: SAVE_VERSION, elongation: -1 })?.elongation).toBeCloseTo(Math.PI * 2 - 1)
  })
})
