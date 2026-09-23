import { describe, expect, it } from 'vitest'
import { FROG_COUNT, PAD_COUNT, PADS } from './layout'
import { defaultPond, deserialize, moveFrog, serialize, STATE_VERSION, tempoForAge } from './state'

const distinct = (frogs: number[]) => new Set(frogs).size === frogs.length

describe('pond state', () => {
  it('starts as a rising staircase: one frog per column, each a row higher', () => {
    const pond = defaultPond()
    expect(pond.frogs).toHaveLength(FROG_COUNT)
    expect(distinct(pond.frogs)).toBe(true)
    pond.frogs.forEach((pad, frog) => {
      expect(PADS[pad].column).toBe(frog)
      expect(PADS[pad].row).toBe(frog)
    })
  })

  it('sets tempo from age without gating anything', () => {
    expect(tempoForAge(3)).toBeLessThan(tempoForAge(5))
    expect(tempoForAge(8)).toBeGreaterThan(tempoForAge(5))
    expect(tempoForAge(null)).toBe(tempoForAge(5))
  })

  it('round-trips through serialize and deserialize', () => {
    const pond = defaultPond()
    moveFrog(pond, 0, 1)
    expect(deserialize(JSON.parse(JSON.stringify(serialize(pond))))).toEqual(pond)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'frogs'],
    ['an array', [1, 2, 3]],
    ['another version', { v: 99, frogs: [0, 1, 2, 3, 4] }],
    ['no frogs', { v: STATE_VERSION }],
    ['frogs not a list', { v: STATE_VERSION, frogs: 'x' }],
  ])('falls back to the default pond for %s', (_, raw) => {
    expect(deserialize(raw)).toEqual(defaultPond())
  })

  it('repairs duplicates, out-of-range, fractional and missing pads onto distinct free pads', () => {
    const pond = deserialize({ v: STATE_VERSION, frogs: [3, 3, -1, 2.5, PAD_COUNT] })
    expect(pond.frogs[0]).toBe(3)
    expect(distinct(pond.frogs)).toBe(true)
    for (const pad of pond.frogs) expect(pad >= 0 && pad < PAD_COUNT && Number.isInteger(pad)).toBe(true)
  })

  it('keeps valid frogs and fills short lists', () => {
    const pond = deserialize({ v: STATE_VERSION, frogs: [11, 10] })
    expect(pond.frogs.slice(0, 2)).toEqual([11, 10])
    expect(pond.frogs).toHaveLength(FROG_COUNT)
    expect(distinct(pond.frogs)).toBe(true)
  })

  it('moves a frog to an empty pad, and swaps with a frog already there', () => {
    const pond = defaultPond()
    const [a, b] = pond.frogs
    expect(moveFrog(pond, 0, 11)).toBeNull()
    expect(pond.frogs[0]).toBe(11)
    expect(moveFrog(pond, 0, b)).toBe(1)
    expect(pond.frogs[0]).toBe(b)
    expect(pond.frogs[1]).toBe(11)
    expect(moveFrog(pond, 0, b)).toBeNull()
    expect(a).not.toBe(b)
  })
})
