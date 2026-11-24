import { describe, expect, it } from 'vitest'
import { CAST, type Id } from './cast'
import { NAIL_COUNT, arrangementOf, freshTable, loadTable, move, nextNail, paint, placeOf, saveTable, seated, sendTo, turnOne, turnTable } from './table'

const everyone = (table: ReturnType<typeof freshTable>): Id[] => [...table.spots, ...table.homes].filter((id): id is Id => id !== null).sort()
const ALL = [...CAST].sort()

describe('the first visit', () => {
  it('stands the elephant alone with its back to the painter at three, at four and with no age, and a pair from five', () => {
    for (const age of [null, 3, 4]) expect(freshTable(age).spots).toEqual(['elephant', null, null, null])
    for (const age of [5, 7, 12]) expect(seated(freshTable(age))).toEqual(['elephant', 'pig'])
    expect(freshTable(null).turns.elephant).toBe(0)
    for (const age of [null, 3, 5]) expect(everyone(freshTable(age))).toEqual(ALL)
  })
})

describe('moving', () => {
  it('sends one to the empty places, the near ones first, and then swaps with the near left one', () => {
    const table = freshTable(null)
    for (const [id, n] of [['hen', 1], ['hippo', 2], ['pig', 3]] as const) {
      expect(sendTo(table)).toEqual({ kind: 'spot', n })
      move(table, id, sendTo(table))
    }
    expect(move(table, 'giraffe', sendTo(table))).toEqual(['giraffe', 'elephant'])
    expect(placeOf(table, 'elephant')).toEqual({ kind: 'step', n: 2 })
    expect(move(table, 'elephant', sendTo(table))).toEqual(['elephant', 'giraffe'])
    expect(everyone(table)).toEqual(ALL)
  })

  it('never takes the last one off the table, but lets it be changed for another', () => {
    const table = freshTable(null)
    const free = table.homes.indexOf(null)
    if (free >= 0) expect(move(table, 'elephant', { kind: 'step', n: free })).toEqual([])
    table.homes[0] = null; table.spots[3] = 'hen'
    expect(move(table, 'hen', { kind: 'step', n: 0 })).toEqual(['hen'])
    expect(move(table, 'elephant', { kind: 'step', n: 1 })).toEqual(['elephant', 'hippo'])
    expect(seated(table)).toEqual(['hippo'])
  })

  it('comes round to where it was after four turns of one, or of the table', () => {
    const table = freshTable(6), before = JSON.stringify(arrangementOf(table))
    for (let i = 0; i < 4; i++) { turnOne(table, 'elephant'); turnTable(table) }
    expect(JSON.stringify(arrangementOf(table))).toBe(before)
    turnTable(table)
    expect(table.spots.indexOf('elephant')).not.toBe(0)
    expect(table.turns.elephant).toBe(1)
    expect(table.turns.hen).toBe(0)
  })
})

describe('the wall', () => {
  it('fills six nails in order and gives the seventh picture the oldest one\'s', () => {
    const table = freshTable(null)
    for (let n = 0; n < NAIL_COUNT; n++) { expect(nextNail(table)).toBe(n); expect(paint(table)).toBe(n); turnOne(table, 'elephant') }
    const second = JSON.stringify(table.wall[1])
    expect(paint(table)).toBe(0)
    expect(JSON.stringify(table.wall[1])).toBe(second)
    expect(table.finished && table.painted).toBe(true)
  })

  it('keeps a picture as it was painted, whatever is done to the table afterwards', () => {
    const table = freshTable(null)
    paint(table)
    const was = JSON.stringify(table.wall[0])
    turnOne(table, 'elephant'); move(table, 'hen', { kind: 'spot', n: 1 })
    expect(JSON.stringify(table.wall[0])).toBe(was)
  })
})

describe('the save', () => {
  it('comes back as it was left, and is small', () => {
    const table = freshTable(7)
    for (let i = 0; i < 9; i++) { turnTable(table); turnOne(table, 'pig'); paint(table) }
    const text = JSON.stringify(saveTable(table))
    expect(text.length).toBeLessThan(2500)
    expect(saveTable(loadTable(JSON.parse(text), null))).toEqual(saveTable(table))
  })

  it('wins over the age', () => {
    expect(loadTable(saveTable(freshTable(null)), 7).spots).toEqual(['elephant', null, null, null])
  })

  it('repairs anything: everyone stands exactly once, and someone is on the table', () => {
    const bad: unknown[] = [
      null, 3, 'x', [], {}, { v: 9 }, { v: 1 }, { v: 1, spots: 'no', homes: 4, turns: [], wall: {}, last: 'b' },
      { v: 1, spots: ['hen', 'hen', 'hen', 'hen'], homes: ['hen', 'hen'] },
      { v: 1, spots: [null, null, null, null], homes: ['elephant', 'hen', 'hippo', 'pig', 'giraffe', 'crocodile'] },
      { v: 1, spots: [null, null, null, null], homes: [null, null, null, null, null, null] },
      { v: 1, spots: ['dog', 7, {}, []], homes: [1, 2, 3, 4, 5, 6] },
      { v: 1, turns: { elephant: NaN, hen: -1, pig: 1e9, hippo: 'two', giraffe: 2.4 }, finished: true, last: 40 },
      { v: 1, wall: [[['elephant', 0], ['elephant', 0], null, null], [null, null, null, null], [['dog', 1], null, null, null], [['hen', 'x'], null, null, null], 3, 'y'], last: 0, finished: true },
    ]
    for (const raw of bad) for (const age of [null, 3, 6]) {
      const table = loadTable(raw, age)
      expect(everyone(table)).toEqual(ALL)
      expect(seated(table).length).toBeGreaterThan(0)
      for (const id of CAST) expect([0, 1, 2, 3]).toContain(table.turns[id])
      expect(table.wall).toHaveLength(NAIL_COUNT)
      for (const a of table.wall) if (a) expect(a.filter(Boolean).length).toBeGreaterThan(0)
      if (table.finished) expect(table.wall[table.last]).not.toBeNull()
      expect(loadTable(saveTable(table), null)).toEqual(table)
    }
  })
})
