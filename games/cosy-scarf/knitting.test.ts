import { describe, expect, it } from 'vitest'
import { canOffer, chooseRecipient, give, isFull, knitRow, mirrorColumn, paintStitch, summonIfReady, unravelRow } from './knitting'
import { initialState, MAX_ROWS, MAX_SCARVES, WIDTH } from './state'

const row = (colour: number) => new Array<number>(WIDTH).fill(colour)

describe('knitting and unravelling', () => {
  it('adds rows at the free end and takes the newest back', () => {
    const state = initialState()
    knitRow(state, 1)
    knitRow(state, 2)
    expect(state.loom).toEqual([row(1), row(2)])
    expect(unravelRow(state)).toEqual(row(2))
    expect(state.loom).toEqual([row(1)])
    expect(unravelRow(state)).toEqual(row(1))
    expect(unravelRow(state)).toBeNull()
  })

  it('stops at the rod', () => {
    const state = initialState()
    for (let i = 0; i < MAX_ROWS; i++) expect(knitRow(state, i % 3)).toBe(true)
    expect(isFull(state)).toBe(true)
    expect(knitRow(state, 0)).toBe(false)
    expect(state.loom).toHaveLength(MAX_ROWS)
  })
})

describe('painting', () => {
  it('re-colours one stitch', () => {
    const state = initialState()
    knitRow(state, 0)
    expect(paintStitch(state, 0, 1, 3)).toEqual([[0, 1]])
    expect(state.loom[0]).toEqual([0, 3, 0, 0, 0])
    expect(paintStitch(state, 0, 1, 3)).toEqual([])
  })

  it('mirrors across the width when the butterfly is open', () => {
    const state = initialState()
    knitRow(state, 0)
    state.mirror = true
    expect(mirrorColumn(1)).toBe(3)
    expect(paintStitch(state, 0, 1, 4)).toEqual([
      [0, 1],
      [0, 3],
    ])
    expect(state.loom[0]).toEqual([0, 4, 0, 4, 0])
  })

  it('ignores stitches that do not exist', () => {
    const state = initialState()
    expect(paintStitch(state, 0, 0, 1)).toEqual([])
    knitRow(state, 0)
    expect(paintStitch(state, 0, WIDTH, 1)).toEqual([])
  })
})

describe('giving', () => {
  it('offers only once the scarf is long enough', () => {
    const state = initialState()
    for (let i = 0; i < 7; i++) knitRow(state, 0)
    expect(canOffer(state, 8)).toBe(false)
    expect(give(state, 8)).toBeNull()
    knitRow(state, 1)
    expect(canOffer(state, 8)).toBe(true)
  })

  it('wraps the animal at the loom and calls the next cold one', () => {
    const state = initialState()
    for (let i = 0; i < 8; i++) knitRow(state, i % 2)
    const gift = give(state, 8)
    expect(gift?.to).toBe('bunny')
    expect(gift?.next).toBe('penguin')
    expect(state.loom).toEqual([])
    expect(state.scarves.bunny).toHaveLength(1)
    expect(state.scarves.bunny[0]).toHaveLength(8)
    expect(state.atLoom).toBe('penguin')
  })

  it('leaves the loom empty when everyone is cosy, then summons the one with fewest scarves', () => {
    const state = initialState()
    for (const _ of [0, 1, 2, 3]) {
      for (let i = 0; i < 8; i++) knitRow(state, 1)
      give(state, 8)
    }
    expect(state.atLoom).toBeNull()
    expect(summonIfReady(state, 8)).toBeNull()
    for (let i = 0; i < 8; i++) knitRow(state, 2)
    expect(summonIfReady(state, 8)).toBe('bunny')
    give(state, 8)
    expect(state.scarves.bunny).toHaveLength(2)
    expect(chooseRecipient(state)).toBe('penguin')
  })

  it('folds the oldest scarf away past the stack limit', () => {
    const state = initialState()
    state.scarves.penguin = [[row(0)]]
    state.scarves.fox = [[row(0)]]
    state.scarves.bear = [[row(0)]]
    state.scarves.bunny = Array.from({ length: MAX_SCARVES }, (_, i) => [row(i)])
    state.atLoom = 'bunny'
    for (let i = 0; i < 8; i++) knitRow(state, 5)
    const gift = give(state, 8)
    expect(gift?.folded).toEqual([row(0)])
    expect(state.scarves.bunny).toHaveLength(MAX_SCARVES)
    expect(state.scarves.bunny[MAX_SCARVES - 1][0]).toEqual(row(5))
  })
})
