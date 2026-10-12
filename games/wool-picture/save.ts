import { FIRST_TUFT } from './config'
import type { Cell } from './folk'
import { COLS, COMB_HAND, ROWS } from './layout'
import { deserialize, isReadable, isRecord, serialize, type GameState } from './state'
import { readWall, type Picture } from './wall'
import { DYES, decode, encode, makeSheet, type SavedShape, type Sheet } from './wool'

// What this game saves, round the template's fields (state.ts): the wool on
// the sheet, what the finger works with and the size of its tuft, where the
// four figures stand and what they wear, and the pictures on the wall. Each
// field is repaired by itself: a damaged one takes its default and the rest
// is kept. The wool in the hand, loose fibres, the weather, every walk and
// every pose are views of these and are not saved.

export type SavedFigure = { at: Cell | null; coat: number | null }

export type Saved = GameState & {
  /** The shapes on the sheet, oldest first (wool.ts). */
  felt: SavedShape[]
  /** What the finger works with: 0 to 4 for a bowl, by dye, and 5 for the comb. */
  hand: number
  /** The tuft drawn up: 0 a handful, 1 a tuft, 2 a wisp. */
  size: number
  /** The four figures in a fixed order: sheep, goose, shepherd, pig. */
  folk: SavedFigure[]
  /** The last three hung pictures, oldest first (wall.ts). */
  wall: Picture[]
}

/** What a visit starts from: the template's fields, and the game's own as the toy holds them. */
export type Opened = { state: GameState; sheet: Sheet; hand: number; size: number; folk: SavedFigure[]; wall: Picture[] }

/** The size of a first visit's first tuft, by age: the last row the child has reached, and the first row for a younger child or no age. */
export function firstTuft(childAge: number | null): number {
  let size: number = FIRST_TUFT[0].size
  if (childAge !== null) for (const row of FIRST_TUFT) if (childAge >= row.fromAge) size = row.size
  return size
}

const whole = (value: unknown, least: number, most: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= least && value <= most
const inDish = (): SavedFigure[] => [0, 1, 2, 3].map(() => ({ at: null, coat: null }))

/** The four figures from what a save holds: a figure that is not one is in the dish with no coat, and so is each damaged part. */
function readFolk(raw: unknown): SavedFigure[] {
  const folk = inDish()
  if (!Array.isArray(raw)) return folk
  for (let who = 0; who < folk.length; who++) {
    const entry: unknown = raw[who]
    if (!isRecord(entry)) continue
    const at = entry.at
    if (isRecord(at) && whole(at.col, 0, COLS - 1) && whole(at.row, 0, ROWS - 1)) folk[who].at = { col: at.col, row: at.row }
    if (whole(entry.coat, 0, DYES - 1)) folk[who].coat = entry.coat
  }
  return folk
}

/** Reads a slot. Anything that is not this game's record gives a first visit: a bare sheet, the four figures in the dish, the green bowl, and a tuft sized by age. */
export function open(raw: unknown, childAge: number | null): Opened {
  const state = deserialize(raw, childAge)
  if (!isReadable(raw)) return { state, sheet: makeSheet(), hand: 0, size: firstTuft(childAge), folk: inDish(), wall: [] }
  const wall = readWall(raw.wall), folk = readFolk(raw.folk)
  // The evening is what the wall and the sheet show: with no picture hung there is no evening to come back to,
  // and in the evening the sheet is bare and every figure is in the dish.
  const finished = state.finished && wall.length > 0
  return {
    state: { ...state, finished },
    sheet: finished ? makeSheet() : decode(raw.felt),
    hand: whole(raw.hand, 0, COMB_HAND) ? raw.hand : 0,
    size: whole(raw.size, 0, 2) ? raw.size : firstTuft(childAge),
    folk: finished ? folk.map((figure) => ({ at: null, coat: figure.coat })) : folk,
    wall,
  }
}

/** The record to save, from the template's fields and the toy as it stands. A figure in the hand is saved where it was taken from: nothing is saved in the air. */
export function record(state: GameState, toy: { sheet: Sheet; hand: number; size: number; finished: boolean; folk: readonly { at: Cell | null; coat: number | null }[]; wall: readonly Picture[]; held?: unknown }): Saved {
  const held = toy.held as { kind?: string; who?: number; origin?: Cell | null; lifted?: boolean } | null | undefined
  return {
    ...serialize({ ...state, finished: toy.finished }),
    felt: encode(toy.sheet),
    hand: toy.hand,
    size: toy.size,
    folk: toy.folk.map((figure, who) => ({ at: held && held.kind === 'figure' && held.who === who && held.lifted ? (held.origin ? { ...held.origin } : null) : figure.at ? { ...figure.at } : null, coat: figure.coat })),
    wall: toy.wall.map((picture) => ({ peg: picture.peg, veils: picture.veils })),
  }
}
