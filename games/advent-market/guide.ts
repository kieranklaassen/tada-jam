import type { Fair, Point } from './fair'
import { BASKET, POT, REST } from './hall'
import { BENCH, SNOW, WALK, isStall } from './places'
import { isMade } from './things'

// What the idle ladder shows, by where the child stands and what is made:
// what glows, and what the ghost hand does. Pure: the view paints it, and the
// tests hold every move it shows to a move that works.

export type Show = {
  /** Where the hand comes down. */
  from: Point
  /** Where it carries what it took, or null for a tap where it stands. */
  to: Point | null
  /** How many times a tap is pressed. One where a second tap would do something more: walk on, or start the next fair. */
  presses: 1 | 2
}

/** Where the hand takes the basket off its hook: its wicker, under the things that lie in it. */
export const HOOK = { x: BASKET.x, y: 668 } as const

/** Where the basket is let go to carry it out: past the sill, on the snow. */
export const OUT = { x: SNOW.x, y: SNOW.y - 80 } as const

/** The work of the place: the candle down into the wax, a fold, a twig, a line of icing. */
function work(fair: Fair): Show {
  if (fair.at === 'candle') return { from: { x: REST.x, y: REST.y }, to: { x: POT.x, y: POT.y - 60 }, presses: 2 }
  if (fair.at === 'wreath') return { from: { x: BENCH.wreath.x, y: BENCH.wreath.y - 100 }, to: { x: BENCH.wreath.x + 100, y: BENCH.wreath.y }, presses: 2 }
  if (fair.at === 'biscuit') return fair.pieces.biscuit.cut ? { from: { x: BENCH.biscuit.x - 60, y: BENCH.biscuit.y }, to: { x: BENCH.biscuit.x + 60, y: BENCH.biscuit.y }, presses: 2 } : { from: { ...BENCH.biscuit }, to: null, presses: 2 }
  return { from: { x: BENCH.star.x, y: BENCH.star.y }, to: null, presses: 2 }
}

/**
 * The demonstration for this idle stretch, `index` counting from 0. At a stall the hand shows the work first;
 * the time after, it shows the next thing there is to do: the made thing into the basket, or, once something
 * lies in the basket, the lantern that is walked by. At the door it carries the basket out, and once the
 * basket stands in the snow it shows nothing.
 */
export function showOf(fair: Fair, index: number): Show | null {
  if (!isStall(fair.at)) {
    // At the finished door the hand shows nothing: the one touch there is left empties the basket and every hand.
    if (fair.finished) return null
    // An empty basket is not carried out by the hand: it shows the way back to the stalls.
    if (fair.basket.length === 0) return { from: { x: WALK.right.x, y: WALK.right.y }, to: null, presses: 1 }
    return { from: { ...HOOK }, to: { ...OUT }, presses: 1 }
  }
  const piece = fair.pieces[fair.at]
  if (index % 2 === 1) {
    if (isMade(piece) && fair.room()) {
      const from = fair.at === 'candle' ? { x: REST.x, y: REST.y } : { x: BENCH[fair.at].x, y: BENCH[fair.at].y }
      return { from, to: fair.at === 'candle' ? { x: BASKET.x, y: 250 } : { x: BASKET.x, y: BASKET.y - 40 }, presses: 2 }
    }
    if (fair.basket.length > 0 || fair.finished) return { from: { x: WALK.right.x, y: WALK.right.y }, to: null, presses: 1 }
  }
  return work(fair)
}

/** What glows while the child is idle: the piece in work, and the way on once something is made. */
export function glowsOf(fair: Fair): Point[] {
  // The finished basket glows in the snow by itself; the ladder adds nothing to it.
  if (!isStall(fair.at)) return fair.finished ? [] : fair.basket.length === 0 ? [{ x: WALK.right.x, y: WALK.right.y }] : [{ x: BASKET.x, y: BASKET.y - 20 }]
  const d = fair.dipping
  const glows: Point[] = [fair.at === 'candle' ? { x: d.stick.x, y: d.stick.y + 120 } : { x: BENCH[fair.at].x, y: BENCH[fair.at].y }]
  if (fair.basket.length > 0 || fair.finished) glows.push({ x: WALK.right.x, y: WALK.right.y })
  return glows
}
