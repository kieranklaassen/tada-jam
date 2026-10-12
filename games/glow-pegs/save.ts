import { BLUE, GREEN, HOLES, RED, WHITE, YELLOW, holeAt, isColour, type Colour, type Mirror } from './board'
import { FULLER_FIRST_BOARD_FROM } from './config'
import { deserialize as readBase, isReadable, serialize as writeBase, type GameState } from './state'

// What Glow Pegs keeps in ctx.storage: the template's fields (state.ts) and
// its own. Every field is in the design sheet (ART.md, "The designed order,
// and what is stored"). Each is read by itself, so one damaged field takes
// its default and the rest of the board is kept.

export type Save = GameState & {
  /** One number a hole, row by row from the top left: 0 for an empty hole, 1 to 5 for a peg's colour. */
  board: number[]
  /** The colour in hand. */
  hand: Colour
  /** The mirror button that is down. */
  mirror: Mirror
  /** The hole the moth sits beside, or null when it is at its bulb. */
  moth: number | null
}

/**
 * What a first visit lays on the board: a rising step of pegs, three for a child of 5 and younger or of no
 * known age, and one of each colour from 6. It is a default and never a gate: a saved board wins.
 */
export function firstBoard(childAge: number | null): { board: number[]; moth: number } {
  const board = new Array<number>(HOLES).fill(0)
  const fuller = childAge !== null && childAge >= FULLER_FIRST_BOARD_FROM
  const step: readonly Colour[] = fuller ? [RED, BLUE, YELLOW, WHITE, GREEN] : [RED, BLUE, RED]
  const startCol = fuller ? 2 : 3
  const startRow = fuller ? 5 : 4
  let last = 0
  step.forEach((colour, i) => {
    last = holeAt(startCol + i, startRow - i)
    board[last] = colour
  })
  return { board, moth: last }
}

export function freshSave(childAge: number | null): Save {
  return { ...readBase(null, childAge), ...firstBoard(childAge), hand: RED, mirror: 0 }
}

export function deserialize(raw: unknown, childAge: number | null = null): Save {
  // Anything that is not this game's record at this version is a first visit.
  if (!isReadable(raw)) return freshSave(childAge)
  const fresh = freshSave(childAge)
  // A board of another length cannot be laid out: the first-visit board stands in. A cell that is not a colour is an empty hole.
  const board = Array.isArray(raw.board) && raw.board.length === HOLES ? raw.board.map((cell) => (isColour(cell) ? cell : 0)) : fresh.board
  const moth = raw.moth
  return {
    ...readBase(raw, childAge),
    // Open play has no judged cycle, so the stored ending is never taken up.
    finished: false,
    board,
    hand: isColour(raw.hand) ? raw.hand : RED,
    mirror: raw.mirror === 1 || raw.mirror === 2 ? raw.mirror : 0,
    moth: typeof moth === 'number' && Number.isInteger(moth) && moth >= 0 && moth < HOLES ? moth : null,
  }
}

export function serialize(save: Save): Save {
  return { ...writeBase(save), board: save.board.slice(), hand: save.hand, mirror: save.mirror, moth: save.moth }
}
