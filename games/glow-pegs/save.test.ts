import { describe, expect, it } from 'vitest'
import { BLUE, GREEN, HOLES, RED, WHITE, YELLOW, holeAt } from './board'
import { deserialize, firstBoard, freshSave, serialize, type Save } from './save'
import { STATE_VERSION } from './state'

const count = (board: readonly number[]) => board.filter((cell) => cell !== 0).length

describe('what a first visit lays on the board', () => {
  it('is three pegs in a rising step for a child of 5 and younger, and for a child of no known age', () => {
    for (const age of [null, 2, 4, 5]) {
      const { board, moth } = firstBoard(age)
      expect(count(board), `age ${age}`).toBe(3)
      expect(board[holeAt(3, 4)]).toBe(RED)
      expect(board[holeAt(4, 3)]).toBe(BLUE)
      expect(board[holeAt(5, 2)]).toBe(RED)
      // The moth sits by the last of them, so it is where the next peg would carry the step on.
      expect(moth).toBe(holeAt(5, 2))
    }
  })

  it('is one peg of each colour from 6, with no upper end', () => {
    for (const age of [6, 8, 12, 40]) {
      const { board, moth } = firstBoard(age)
      expect(count(board), `age ${age}`).toBe(5)
      expect([2, 3, 4, 5, 6].map((col, i) => board[holeAt(col, 5 - i)])).toEqual([RED, BLUE, YELLOW, WHITE, GREEN])
      expect(moth).toBe(holeAt(6, 1))
    }
  })

  it('starts with red in hand and no mirror, in the one open place', () => {
    const fresh = freshSave(null)
    expect(fresh).toMatchObject({ v: STATE_VERSION, position: 'open', finished: false, hand: RED, mirror: 0 })
    expect(fresh.board).toHaveLength(HOLES)
  })
})

describe('the saved board', () => {
  const played = (): Save => {
    const save = freshSave(4)
    save.board.fill(0)
    save.board[0] = WHITE
    save.board[HOLES - 1] = GREEN
    save.board[30] = YELLOW
    return { ...save, hand: BLUE, mirror: 2, moth: 30 }
  }

  it('round-trips through JSON as it stands', () => {
    const save = played()
    expect(deserialize(JSON.parse(JSON.stringify(serialize(save))), 4)).toEqual(save)
  })

  it('wins over the age: a saved board is never laid again for an older or a younger child', () => {
    const stored = JSON.parse(JSON.stringify(serialize(played())))
    for (const age of [null, 2, 6, 12]) expect(deserialize(stored, age).board).toEqual(played().board)
  })

  it('keeps an empty board empty: the first-visit pegs do not come back', () => {
    const save = { ...played(), board: new Array<number>(HOLES).fill(0), moth: null }
    const back = deserialize(JSON.parse(JSON.stringify(serialize(save))), 4)
    expect(count(back.board)).toBe(0)
    expect(back.moth).toBeNull()
  })

  it('reads anything that is not its record as a first visit, and never throws', () => {
    for (const raw of [null, undefined, 7, 'board', [], {}, { v: 99 }, { v: STATE_VERSION - 1, board: [] }]) {
      expect(deserialize(raw, null), JSON.stringify(raw)).toEqual(freshSave(null))
    }
  })

  it('repairs one damaged field and keeps the rest', () => {
    const good = JSON.parse(JSON.stringify(serialize(played()))) as Record<string, unknown>
    expect(deserialize({ ...good, hand: 9 }, 4)).toEqual({ ...played(), hand: RED })
    expect(deserialize({ ...good, mirror: 'both' }, 4)).toEqual({ ...played(), mirror: 0 })
    expect(deserialize({ ...good, moth: 400 }, 4)).toEqual({ ...played(), moth: null })
    expect(deserialize({ ...good, moth: 2.5 }, 4)).toEqual({ ...played(), moth: null })
    expect(deserialize({ ...good, position: 'nowhere' }, 4)).toEqual(played())
    // The ending of a judged cycle is not this game's: it is never taken up.
    expect(deserialize({ ...good, finished: true }, 4).finished).toBe(false)
  })

  it('reads a cell that is no colour as an empty hole, and a board of another length as the first-visit board', () => {
    const good = JSON.parse(JSON.stringify(serialize(played()))) as { board: unknown[] }
    const holed = good.board.slice()
    holed[0] = 6
    holed[30] = 'yellow'
    holed[HOLES - 1] = -1
    const back = deserialize({ ...good, board: holed }, 4)
    expect(count(back.board)).toBe(0)
    expect(deserialize({ ...good, board: [1, 2, 3] }, 4).board).toEqual(firstBoard(4).board)
    expect(deserialize({ ...good, board: 'full' }, 6).board).toEqual(firstBoard(6).board)
  })

  it('stays far under the 64 KB cap with every hole full', () => {
    const full: Save = { ...freshSave(null), board: new Array<number>(HOLES).fill(WHITE), moth: HOLES - 1, mirror: 2 }
    expect(JSON.stringify(serialize(full)).length).toBeLessThan(1024)
  })

  it('hands storage a copy: a peg pushed after the save does not change what was saved', () => {
    const save = played()
    const out = serialize(save)
    save.board[5] = RED
    expect(out.board[5]).toBe(0)
  })
})
