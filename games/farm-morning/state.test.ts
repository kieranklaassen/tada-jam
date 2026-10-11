// template: cartridge/state.test.ts v3
import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { ANIMALS, STATE_VERSION, deserialize, firstDoor, freshState, isReadable, isRecord, serialize, type GameState } from './state'

/** What ctx.storage hands back on the next visit. */
const stored = (state: GameState): unknown => JSON.parse(JSON.stringify(serialize(state)))

describe('saved state', () => {
  it('round-trips through serialize and deserialize', () => {
    const state: GameState = { v: STATE_VERSION, door: 'shut', content: ['pony', 'pig'] }
    expect(deserialize(stored(state))).toEqual(state)
    const full: GameState = { v: STATE_VERSION, door: 'open', content: [...ANIMALS] }
    expect(deserialize(stored(full), 5)).toEqual(full)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'door'],
    ['a number', 7],
    ['an array', [1, 2, 3]],
    ['a version above the current one', { v: STATE_VERSION + 1, door: 'shut', content: ['pig'] }],
    ['no version', { door: 'shut', content: ['pig'] }],
  ])('gives a fresh, usable state for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshState(null))
    expect(isReadable(raw)).toBe(false)
  })

  it('tells a record from everything else', () => {
    expect(isRecord({})).toBe(true)
    for (const value of [null, undefined, [], 'x', 3]) expect(isRecord(value)).toBe(false)
    expect(isReadable({ v: STATE_VERSION })).toBe(true)
  })

  it('repairs each field by itself', () => {
    expect(deserialize({ v: STATE_VERSION, door: 'ajar', content: ['goat'] }, 5)).toEqual({ v: STATE_VERSION, door: 'shut', content: ['goat'] })
    expect(deserialize({ v: STATE_VERSION, door: 'shut', content: 'all' })).toEqual({ v: STATE_VERSION, door: 'shut', content: [] })
    expect(deserialize({ v: STATE_VERSION, door: 'open' })).toEqual({ v: STATE_VERSION, door: 'open', content: [] })
  })

  it('keeps the animals it knows, each once and in yard order', () => {
    const raw = { v: STATE_VERSION, door: 'open', content: ['pig', 'cow', 7, 'hens', 'pig', null, 'hens'] }
    expect(deserialize(raw).content).toEqual(['hens', 'pig'])
    expect(serialize({ v: STATE_VERSION, door: 'open', content: ['pig', 'hens', 'pig'] }).content).toEqual(['hens', 'pig'])
  })

  it('stays far below half of the 64 KB cap in its largest legal state', () => {
    const largest: GameState = { v: STATE_VERSION, door: 'shut', content: [...ANIMALS] }
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(200)
  })
})

describe('the first morning', () => {
  it('keeps no position: the game has no designed order', () => {
    expect(LADDER).toEqual([])
    expect(Object.keys(freshState(null)).sort()).toEqual(['content', 'door', 'v'])
  })

  it('opens with the door open for a child of three and younger, and for no age', () => {
    for (const age of [null, 0, 1, 2, 3]) expect(firstDoor(age), `age ${age}`).toBe('open')
    expect(freshState(null)).toEqual({ v: STATE_VERSION, door: 'open', content: [] })
  })

  it('opens behind a shut door for a child of four and older, with no upper end', () => {
    for (const age of [4, 5, 6, 12, 40]) expect(firstDoor(age), `age ${age}`).toBe('shut')
  })

  it('has rows that ascend by age, each reached at its own age', () => {
    const ages = FIRST_VISIT.map((row) => row.fromAge)
    expect([...ages].sort((a, b) => a - b)).toEqual(ages)
    expect(new Set(ages).size).toBe(ages.length)
    for (const row of FIRST_VISIT) expect(firstDoor(row.fromAge)).toBe(row.door)
  })

  it('lets a saved game win over the age', () => {
    expect(deserialize({ v: STATE_VERSION, door: 'open', content: [] }, 5).door).toBe('open')
    expect(deserialize({ v: STATE_VERSION, door: 'shut', content: [] }, 2).door).toBe('shut')
  })
})
