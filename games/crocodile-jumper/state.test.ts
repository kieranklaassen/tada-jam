// template: cartridge/state.test.ts v3
import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { STATE_VERSION, beginCycle, deserialize, finishCycle, firstPosition, freshState, isReadable, isRecord, serialize, type CycleOutcome, type GameState } from './state'

/** A designed order long enough to walk ten steps along. */
const LONG = Array.from({ length: 12 }, (_, index) => `step-${index}`)

/** What ctx.storage hands back on the next visit. */
const stored = (state: GameState): unknown => JSON.parse(JSON.stringify(serialize(state)))

/** One visit: open the slot, play `cycles`, put the game away. Returns what was saved. */
function visit(saved: unknown, cycles: readonly CycleOutcome[], finishLast = true): unknown {
  let state = deserialize(saved, null, LONG)
  cycles.forEach((outcome, index) => {
    state = beginCycle(state)
    if (finishLast || index < cycles.length - 1) state = finishCycle(state, outcome, LONG)
  })
  return stored(state)
}

const at = (step: number): GameState => ({ v: STATE_VERSION, position: LONG[step], finished: false })

describe('saved state', () => {
  it('round-trips through serialize and deserialize', () => {
    const state: GameState = { v: STATE_VERSION, position: LADDER[LADDER.length - 1], finished: true }
    expect(deserialize(stored(state))).toEqual(state)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'position'],
    ['a number', 7],
    ['an array', [1, 2, 3]],
    ['a version above the current one', { v: STATE_VERSION + 1, position: LADDER[1], finished: true }],
    ['no version', { position: LADDER[1], finished: true }],
  ])('gives a fresh, usable state for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshState(null))
    expect(LADDER).toContain(deserialize(raw, null).position)
  })

  it('tells a wrapper whether a record was read, so it knows when to start its own fields fresh', () => {
    expect(isReadable(stored(freshState(null)))).toBe(true)
    // A damaged field is repaired inside a record that was read.
    expect(isReadable({ v: STATE_VERSION, position: 42 })).toBe(true)
    for (const raw of [undefined, null, 'position', 7, [1, 2, 3], { v: STATE_VERSION + 1, position: LADDER[0], finished: false }, { position: LADDER[0], finished: false }]) expect(isReadable(raw)).toBe(false)
    expect(isRecord({})).toBe(true)
    for (const value of [undefined, null, 'record', 7, [{ v: STATE_VERSION }]]) expect(isRecord(value)).toBe(false)
  })

  it('repairs one damaged field and keeps the other', () => {
    expect(deserialize({ v: STATE_VERSION, position: LADDER[1], finished: 'yes' })).toEqual({ v: STATE_VERSION, position: LADDER[1], finished: false })
    expect(deserialize({ v: STATE_VERSION, position: 42, finished: true })).toEqual({ v: STATE_VERSION, position: freshState(null).position, finished: true })
    expect(deserialize({ v: STATE_VERSION, finished: true, extra: { deep: [1, 2] } })).toEqual({ v: STATE_VERSION, position: freshState(null).position, finished: true })
  })

  it('keeps a largest legal state under half of the 64 KB cap', () => {
    const longest = [...LADDER].sort((a, b) => b.length - a.length)[0]
    const largest: GameState = { v: STATE_VERSION, position: longest, finished: true }
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(32 * 1024)
  })
})

describe('the position in the designed order', () => {
  // The ages come from the rows, so this holds for whatever band and rows the game declares.
  const firstRow = FIRST_VISIT[0], lastRow = FIRST_VISIT[FIRST_VISIT.length - 1]

  it('starts a first visit by age: the first row below its age, at its age or with no age, the last row from its age up', () => {
    expect(deserialize(null, firstRow.fromAge - 1).position).toBe(firstRow.position)
    expect(deserialize(null, firstRow.fromAge).position).toBe(firstRow.position)
    expect(deserialize(null, null).position).toBe(firstRow.position)
    expect(deserialize(null, lastRow.fromAge).position).toBe(lastRow.position)
    expect(deserialize(null, lastRow.fromAge + 1).position).toBe(lastRow.position)
    for (const row of FIRST_VISIT) expect(LADDER, 'every first-visit position is a step of the ladder').toContain(row.position)
  })

  it('has first-visit rows that ascend by age with no two at the same age, so a child of the band can reach each one', () => {
    for (const row of FIRST_VISIT) expect(firstPosition(row.fromAge), `the row from age ${row.fromAge}`).toBe(row.position)
    const ages = FIRST_VISIT.map((row) => row.fromAge)
    expect(ages).toEqual([...new Set(ages)].sort((a, b) => a - b))
  })

  it('picks the last row whose age the child has reached', () => {
    const rows = [{ fromAge: 4, position: 'a' }, { fromAge: 6, position: 'b' }, { fromAge: 8, position: 'c' }]
    expect([2, 4, 5, 6, 7, 8, 12].map((age) => firstPosition(age, rows))).toEqual(['a', 'a', 'a', 'b', 'b', 'c', 'c'])
    expect(firstPosition(null, rows)).toBe('a')
  })

  it('starts a visit at the stored position, which wins over the age', () => {
    expect(deserialize(stored(at(7)), 2, LONG).position).toBe(LONG[7])
    expect(deserialize(stored(at(0)), 12, LONG).position).toBe(LONG[0])
  })

  it('ends ten steps on after ten one-cycle visits that each go well', () => {
    let saved = stored(at(0))
    for (let i = 0; i < 10; i++) saved = visit(saved, ['well'])
    expect(deserialize(saved, null, LONG).position).toBe(LONG[10])
  })

  it('is unchanged by ten visits opened and put away with no finished cycle', () => {
    let saved = stored(at(5))
    for (let i = 0; i < 10; i++) saved = visit(saved, ['well'], false)
    expect(deserialize(saved, null, LONG).position).toBe(LONG[5])
    for (let i = 0; i < 10; i++) saved = visit(saved, [])
    expect(deserialize(saved, null, LONG).position).toBe(LONG[5])
  })

  it('moves down one step after a cycle that goes badly, and stays after a mixed one', () => {
    expect(deserialize(visit(stored(at(5)), ['badly']), null, LONG).position).toBe(LONG[4])
    expect(deserialize(visit(stored(at(5)), ['mixed']), null, LONG).position).toBe(LONG[5])
  })

  it('moves between cycles only, one step for each finished cycle', () => {
    const playing = beginCycle(at(5))
    expect(playing.position).toBe(LONG[5])
    const finished = finishCycle(playing, 'well', LONG)
    expect(finished).toEqual({ v: STATE_VERSION, position: LONG[6], finished: true })
    // The same cycle finished twice still moved once.
    expect(finishCycle(finished, 'well', LONG)).toEqual(finished)
    expect(finishCycle(beginCycle(finished), 'well', LONG).position).toBe(LONG[7])
  })

  it('hands a larger state back whole, with only the position and the ending changed', () => {
    const world = { ...at(5), guests: ['owl', 'mole'], seed: 7 }
    const judged = finishCycle(world, 'well', LONG)
    expect(judged).toEqual({ ...world, position: LONG[6], finished: true })
    expect(beginCycle(judged)).toEqual({ ...world, position: LONG[6], finished: false })
    // The type is the wrapper's own, so its fields are still there to read.
    expect(beginCycle(judged).guests).toEqual(['owl', 'mole'])
  })

  it('stops at either end of the ladder', () => {
    expect(finishCycle(at(LONG.length - 1), 'well', LONG).position).toBe(LONG[LONG.length - 1])
    expect(finishCycle(at(0), 'badly', LONG).position).toBe(LONG[0])
  })

  it('falls back to the default for an id the ladder no longer has', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'retired-step', finished: false }, lastRow.fromAge).position).toBe(lastRow.position)
    expect(deserialize({ v: STATE_VERSION, position: 'retired-step', finished: false }, null).position).toBe(firstRow.position)
  })
})
