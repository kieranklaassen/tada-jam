import { describe, expect, it } from 'vitest'
import { COLS, KINDS, PER_KIND, ROWS, type Placed } from './blocks'
import { deserialize, firstRug, serialize, type CastleState } from './castleState'
import { STATE_VERSION } from './state'

/** What ctx.storage hands back on the next visit. */
const stored = (state: CastleState): unknown => JSON.parse(JSON.stringify(serialize(state)))

const base = (blocks: unknown): unknown => ({ v: STATE_VERSION, position: 'open', finished: false, blocks })

describe('the first rug', () => {
  it('differs by age, with both ends open and no age read as the youngest', () => {
    const youngest = [{ kind: 'cube', col: 3, row: 1 }, { kind: 'round', col: 3, row: 1 }]
    expect(firstRug(3)).toEqual(youngest)
    expect(firstRug(2)).toEqual(youngest)
    expect(firstRug(null)).toEqual(youngest)
    expect(firstRug(4)).toEqual([{ kind: 'cube', col: 3, row: 1 }])
    expect(firstRug(5)).toEqual([{ kind: 'cube', col: 3, row: 1 }])
    expect(firstRug(6)).toEqual([])
    expect(firstRug(7)).toEqual([])
    expect(firstRug(12)).toEqual([])
  })

  it('is what an unreadable record gives', () => {
    for (const raw of [undefined, null, 'rug', 7, [1, 2], { v: STATE_VERSION + 1, position: 'open', finished: false, blocks: [] }, { blocks: [] }]) {
      expect(deserialize(raw, 4).blocks).toEqual(firstRug(4))
      expect(deserialize(raw, null).position).toBe('open')
    }
  })
})

describe('the saved rug', () => {
  it('round-trips, in the order the blocks were set down', () => {
    const blocks: Placed[] = [{ kind: 'long', col: 0, row: 2 }, { kind: 'arch', col: 5, row: 0 }, { kind: 'thin', col: 6, row: 2 }, { kind: 'cube', col: 0, row: 2 }]
    const state: CastleState = { v: STATE_VERSION, position: 'open', finished: true, blocks }
    expect(deserialize(stored(state), 3)).toEqual(state)
  })

  it('wins over the age: a child who cleared the rug finds it bare', () => {
    expect(deserialize(base([]), 3).blocks).toEqual([])
    expect(deserialize(base([{ kind: 'slope', col: 1, row: 0 }]), 7).blocks).toEqual([{ kind: 'slope', col: 1, row: 0 }])
  })

  it('reads a rug it cannot read as a bare rug, never as a first visit', () => {
    for (const blocks of [undefined, null, 'cube', 4, { kind: 'cube' }]) expect(deserialize(base(blocks), 3).blocks).toEqual([])
  })

  it('drops each block it cannot stand on the rug and keeps the rest', () => {
    const blocks = [
      { kind: 'cube', col: 1, row: 1 },
      { kind: 'door', col: 1, row: 1 },
      { kind: 'cube', col: -1, row: 1 },
      { kind: 'cube', col: 1, row: ROWS },
      { kind: 'long', col: COLS - 2, row: 0 },
      { kind: 'cube', col: 1.5, row: 1 },
      { kind: 'cube', col: '1', row: 1 },
      null,
      7,
      { kind: 'cube', col: 2, row: 1, level: 40 },
      { kind: 'cube', col: 3, row: 1 },
      { kind: 'cube', col: 4, row: 1 },
    ]
    expect(deserialize(base(blocks), 3).blocks).toEqual([{ kind: 'cube', col: 1, row: 1 }, { kind: 'cube', col: 2, row: 1 }, { kind: 'cube', col: 3, row: 1 }])
  })

  it('stays small with every block on the rug', () => {
    const blocks: Placed[] = KINDS.flatMap((kind) => Array.from({ length: PER_KIND }, () => ({ kind, col: 0, row: 2 })))
    const state: CastleState = { v: STATE_VERSION, position: 'open', finished: true, blocks }
    expect(deserialize(stored(state)).blocks).toHaveLength(KINDS.length * PER_KIND)
    expect(JSON.stringify(serialize(state)).length).toBeLessThan(32 * 1024)
  })

  it('saves nothing but plain fields', () => {
    const state = deserialize(null, 3)
    expect(Object.keys(serialize(state)).sort()).toEqual(['blocks', 'finished', 'position', 'v'])
    // A copy: changing what was saved does not change the game.
    serialize(state).blocks.push({ kind: 'cube', col: 0, row: 0 })
    expect(state.blocks).toEqual(firstRug(3))
  })
})
