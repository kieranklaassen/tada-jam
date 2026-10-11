import { CLOTH_COL, COLS, ROWS } from './board'
import { STAGE } from './stage'

// Where the board lies on the stage, in stage units. The board is one long folding strip seen from above at a
// slight angle, so a square is a little wider than it is deep. It fills the stage from side to side: ten lanes
// show, and the strip runs on under both side edges. Above it the far edge of the table shows, where the cards
// stand at the ends of the lanes and the cat looks over them, and below it the near edge.

export const SQUARE = { w: STAGE.width / COLS, h: 104 } as const
/** The top left corner of the first square. */
export const ORIGIN = { x: 0, y: 122 } as const
/** The lanes' own rectangle, and the board's linen border along its far and near edges. */
export const LANES = { x: ORIGIN.x, y: ORIGIN.y, w: COLS * SQUARE.w, h: ROWS * SQUARE.h } as const
export const BORDER = 14
/** How far below the middle of its square a pawn's base stands. */
export const FEET = 24
/** A mover that leaves its lane goes under a card that stands at the lane's end: the card is this tall at the far end, and this tall at the near end. */
export const COVER = { far: 70, near: 66 } as const
/** Where the things at the two ends of a lane stand on the table: the foot of a far card, and the foot of a near one. */
export const ENDS = { far: ORIGIN.y - 2, near: STAGE.height - 6 } as const
/** The middle of a tunnel's mouth, far and near: where the train's face shows. */
export const MOUTH = { far: ENDS.far - 4 - (COVER.far - 16) * 0.44, near: ENDS.near - 4 - (COVER.near - 16) * 0.44 } as const
/** Where a mover goes out of sight: the foot of the far card and the top of the near one. */
export const SIGHT = { top: ORIGIN.y - 4, bottom: ORIGIN.y + ROWS * SQUARE.h + 6 } as const
/** The fold of the board runs between the last lane of a crossing and its cloth: the leaf behind it is the one that lifts. */
export const FOLD_X = ORIGIN.x + CLOTH_COL * SQUARE.w
/** How far the board slides from one crossing to the next: the cloth becomes the home bank. */
export const SLIDE = CLOTH_COL * SQUARE.w

/** The middle of square (c, r); `r` may be a fraction or off the board, for a mover on its way. */
export function centreX(c: number): number {
  return ORIGIN.x + (c + 0.5) * SQUARE.w
}
export function centreY(r: number): number {
  return ORIGIN.y + (r + 0.5) * SQUARE.h
}

/** The square a point of the stage is in, or the nearest one for a point off the board, so every tap asks for a hop. */
export function squareAt(x: number, y: number): { c: number; r: number } {
  const c = Math.floor((x - ORIGIN.x) / SQUARE.w), r = Math.floor((y - ORIGIN.y) / SQUARE.h)
  return { c: Math.min(COLS - 1, Math.max(0, c)), r: Math.min(ROWS - 1, Math.max(0, r)) }
}

/**
 * The square a tap asks for: as `squareAt`, but a tap past the far or the near rim asks for the row beyond it,
 * so that from her own edge row it is a hop at the rim.
 */
export function askedAt(x: number, y: number): { c: number; r: number } {
  const square = squareAt(x, y)
  return { c: square.c, r: y < LANES.y ? -1 : y >= LANES.y + LANES.h ? ROWS : square.r }
}

/** The cat looks over the cards at the far edge, left of the middle: its eyes and ears show above them. */
export const CAT = { x: 2.5 * SQUARE.w, y: 44, rx: 118, ry: 62 } as const
/** The cards hide the cat from here down. */
export const CAT_SHOWS_TO = ORIGIN.y - COVER.far

/** Whether a point of the stage is on the cat, which answers a touch as itself. */
export function onCat(x: number, y: number): boolean {
  return y < CAT_SHOWS_TO && Math.abs(x - CAT.x) <= CAT.rx
}

/** How high above the far edge of the lanes an onlooker's head and the hamper reach: what a touch on one has to land in. */
export const FAR_REACH = 76
/** How far to each side of the duck's post a touch is still on the duck. */
export const DUCK_REACH = 54
/** The duck's post: at the near edge of the board, beside the home bank, on the table. */
export const DUCK_POST = { x: centreX(0) - 4, y: STAGE.height - 14 } as const

/** How much narrower the leaf behind the fold shows when it is lifted as far as it goes, seen from above. */
export const LEAF_SQUEEZE = 0.2
