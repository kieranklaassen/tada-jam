import { BOARD, CRATE, boxOf, type Box, type Point } from './stage'
import { LANES, onLane, type World } from './world'

// What the idle ladder shows, in its first form: a glow on the one thing a
// child would want next, and then a ghost hand making one move on it. The
// hand shows how a fruit is cut, never where: it strokes across a different
// place each time, and none of them would pass for a half, a third or a
// quarter. Nobody orders anything in the toy; when someone does, the hand
// keeps clear of the share on the ticket as well. Pure.

export type Guide = {
  /** What glows: the longest fruit or piece on the board, or the crate when the board is bare. */
  glow: Box
  on: 'fruit' | 'crate'
  /** The move the hand makes: a stroke from one point to the other, or a tap where it stands. */
  hand: { from: Point; to: Point; drag: boolean }
}

/** Where along a fruit the hand strokes, as a share of its length, for each showing in turn. Each is further than the give of a tin from a half, a third and a quarter. */
export const STROKE_AT: readonly number[] = [0.38, 0.62, 0.42, 0.58]

export function guideOf(world: World, showing = 0): Guide {
  let longest: Box | null = null
  for (let lane = 0; lane < LANES; lane++) {
    for (const piece of onLane(world, lane)) {
      const box = boxOf(piece)
      if (box && (!longest || box.w > longest.w)) longest = box
    }
  }
  if (!longest) {
    const at = { x: CRATE.x + CRATE.w / 2, y: CRATE.y + CRATE.h / 2 }
    return { glow: CRATE, on: 'crate', hand: { from: at, to: at, drag: false } }
  }
  const share = STROKE_AT[((showing % STROKE_AT.length) + STROKE_AT.length) % STROKE_AT.length]
  const x = longest.x + longest.w * share
  // From the bare counter above the board, straight down through the fruit and out below it.
  return { glow: longest, on: 'fruit', hand: { from: { x, y: Math.max(BOARD.y - 40, longest.y - 90) }, to: { x, y: longest.y + longest.h + 50 }, drag: true } }
}
