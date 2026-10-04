import { describe, expect, it } from 'vitest'
import { ACTIONS, WRONG_USES, cellOf, grid } from './grid'
import { INSIDE, KINDS, VOICES } from './voices'

describe('the object-by-action grid', () => {
  it('is six by five', () => {
    expect(KINDS).toHaveLength(6)
    expect(ACTIONS).toHaveLength(5)
    expect(grid()).toHaveLength(30)
  })

  it('gives every cell a move of its own', () => {
    const moves = grid().map(({ cell }) => cell.move)
    expect(new Set(moves).size).toBe(30)
    for (const move of moves) expect(move).toMatch(/^[a-z]+(-[a-z]+)+$/)
  })

  it('gives every cell a sound that differs from every other cell of its row and of its column', () => {
    const heard = ({ cell }: ReturnType<typeof grid>[number]) => JSON.stringify([cell.notes, cell.sounds])
    for (const kind of KINDS) {
      const row = grid().filter((one) => one.kind === kind)
      // Along a row the voice is the same and what differs is where it comes from and whom it sounds with.
      expect(new Set(row.map(heard)).size).toBe(5)
    }
    for (const action of ACTIONS) {
      const column = grid().filter((one) => one.action === action)
      expect(new Set(column.map(heard)).size).toBe(6)
    }
  })

  it('makes every cell look or sound different from every other', () => {
    const cells = grid().map(({ cell }) => JSON.stringify(cell))
    expect(new Set(cells).size).toBe(30)
  })

  it('calls softer through the shell on the first tap and in the open ever after, at the same pitch', () => {
    for (const kind of KINDS) {
      const inside = cellOf(kind, 'firstTap').notes
      for (const action of ACTIONS.slice(1)) {
        const out = cellOf(kind, action).notes
        expect(out.map((note) => note.pitch)).toEqual(inside.map((note) => note.pitch))
        expect(out[0].peak).toBe(VOICES[kind].peak)
        expect(inside[0].peak).toBe(VOICES[kind].peak * INSIDE)
      }
    }
  })

  it('lets the wrong uses work like any other', () => {
    for (const kind of KINDS) for (const action of WRONG_USES) {
      const cell = cellOf(kind, action)
      expect(cell.notes.length).toBeGreaterThan(0)
      expect(cell.move.length).toBeGreaterThan(0)
    }
  })

  it('shows the shape of the call in every cell', () => {
    for (const { kind, cell } of grid()) expect(cell.shape.hops).toBe(VOICES[kind].notes)
  })
})
