import type { BeadKey } from './palette'
import { LANE_WIDTH, STEP, TRAIL_HALF } from './trail'

// The beads the trail is laid in, peg by peg, with no canvas in it: sand
// from edge to edge, a brown edging, a darker row across at every step, and
// between two lanes a worn line of single darker beads at uneven steps. The
// view paints one tile of it and slides the picture as the fox runs.
//
// Every bead lying on the board is seen down its hole, as a ring. Two rings
// of one colour, one over the other on a ground of another colour, are a
// figure a child who reads can take for a numeral. So a bead of a lane line
// never has another bead of the line, or of a seam, beside it, over it,
// under it or cornerwise to it.

/** Pegs across the laid trail with its two edgings, and pegs along one tile of it: two steps. */
export const TRAIL_WIDE = TRAIL_HALF * 2
export const TRAIL_TILE = STEP * 2
/** Pegs of edging on each side. */
export const EDGING = 3

/** How far along a tile each bead of the two lane lines lies. The steps between them are uneven, three pegs or more, so the line is seen as a line and no two beads of it touch; none is next to a seam. */
export const LINE_MARKS: readonly (readonly number[])[] = [
  [3, 6, 10, 13, 17, 23, 27, 30, 34, 37],
  [4, 7, 11, 14, 18, 22, 25, 29, 32, 36],
]

/** Which lane line, 0 or 1, has a bead at this peg, or -1. A line's beads lie on one side of the seam between two lanes and then on the other, as a worn line does. */
export function lineAt(x: number, y: number): number {
  const across = x - EDGING
  for (let line = 0; line < LINE_MARKS.length; line++) {
    const n = LINE_MARKS[line].indexOf(((y % TRAIL_TILE) + TRAIL_TILE) % TRAIL_TILE)
    if (n < 0) continue
    if (across === LANE_WIDTH * (line + 1) - (n % 2 === 0 ? 1 : 0)) return line
  }
  return -1
}

/** The bead at a peg of the trail: `x` across from its left edge, `y` along it. */
export function trailBead(x: number, y: number): BeadKey {
  if (x < EDGING || x >= TRAIL_WIDE - EDGING) return (x + y) % 4 === 0 ? 'D' : 'B'
  if (y % STEP === 0) return 'T'
  return lineAt(x, y) >= 0 ? 'T' : 't'
}
