import { LOVES } from './cast'
import type { Point } from './input'
import { BOWLS, CELL, COLS, COMB, COMB_HAND, FELT, FOLK, LOOP, PEGS } from './layout'
import { freePeg, type Picture } from './wall'
import { middle, type Sheet } from './wool'

// What the idle ladder shows (guidance.ts), from the state of play. It is one
// move a child could make now and never a picture to copy: lay wool; once
// something lives on the sheet, set a figure on it; and in the evening, touch
// the felt that waits. The hand shows a bowl before it ever shows a figure:
// with the comb chosen it taps the bowl last chosen, which is the way back to
// wool, and otherwise its first move of a visit lays wool from the bowl. One next act at a time, and only after the child has
// been idle. Two moves are shown once in a visit and no more. The hand points
// at the comb once: at the first showing after wool lies on the felt, while
// the comb has not been used, with the glow on the comb before it. And
// hanging the picture ends it and cannot be undone, so the hand goes to the
// loop only as the fourth and last showing of an idle stretch, which begins
// 84 idle seconds in (guidance.ts: 5, 18, 41, 84), once, when a thing lives
// on the sheet and a figure stands in it, and a touch never brings it back.

export type Hint = {
  /** Which move it is. */
  kind: 'felt' | 'figure' | 'wool' | 'bowl' | 'loop' | 'comb'
  /** Where the glow sits: the thing to take hold of. */
  glow: Point
  /** The move the ghost hand shows: from, by way of, to. */
  path: readonly [Point, Point, Point]
  /** The hand drags along the path, or taps where it starts. */
  drag: boolean
  /** The hand lays wool along the second half of its way. */
  wool: boolean
}

/** What the hint is read from: the toy, or anything that holds the same. */
export type Play = { sheet: Sheet; hand: number; lastBowl?: number; finished: boolean; folk: readonly { at: unknown }[]; wall: readonly Picture[] }

/** How bare a place is: the number of shapes whose box holds it. */
function crowd(sheet: Sheet, col: number, row: number): number {
  let n = 0
  for (const shape of sheet.shapes) if (col >= shape.x0 - 3 && col <= shape.x1 + 3 && row >= shape.y0 - 3 && row <= shape.y1 + 3) n++
  return n
}

const tap = (kind: Hint['kind'], at: Point): Hint => ({ kind, glow: at, path: [at, at, at], drag: false, wool: false })
const drag = (kind: Hint['kind'], from: Point, to: Point): Hint => ({ kind, glow: from, path: [from, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 30 }, to], drag: true, wool: false })

/** Which showing of the idle stretch this is (0 the first, -1 for the glow alone), and what this visit has already had. */
export type Asked = { demo: number; loopShown: boolean; combPointed: boolean; combUsed: boolean; bowlShown: boolean }
/** The showing that goes to the loop: the fourth, which is the last. The comb has no number: it is the next showing once wool lies on the felt. */
export const LOOP_DEMO = 3

export function hintFor(play: Play, asked: Asked | null = null): Hint {
  const { sheet, hand } = play
  // In the evening the felt that waits is the one thing to touch.
  if (play.finished) return tap('felt', { x: FELT.x + FELT.w / 2, y: FELT.y + FELT.h / 2 })
  const living = sheet.shapes.filter((shape) => shape.kind !== 'fluff'), stands = play.folk.some((figure) => figure.at)
  // Once in a visit, as the last showing: a picture with a figure in it can be hung, and the loop goes to the lowest free peg.
  if (asked && asked.demo === LOOP_DEMO && !asked.loopShown && living.length > 0 && stands) return drag('loop', LOOP, PEGS[freePeg(play.wall)])
  // Once in a visit, at the first showing after wool lies on the felt, and in the glow before it: the comb, while it has not been used.
  if (asked && !asked.combPointed && !asked.combUsed && sheet.shapes.length > 0 && hand !== COMB_HAND) return tap('comb', { x: COMB.x, y: COMB.y - 10 })
  // With the comb in the hand the hand shows the way back to wool, before anything else: the bowl last chosen is the thing to tap.
  if (hand === COMB_HAND) { const back = BOWLS[play.lastBowl ?? 0]; return tap('bowl', { x: back.x, y: back.y - 30 }) }
  if (living.length > 0 && !stands && asked && asked.bowlShown) {
    // Something lives, nobody stands in it yet, and the hand has shown a bowl in this visit: the figure that loves it, or the sheep.
    let who = 0, home = living[living.length - 1]
    search: for (let i = 0; i < FOLK.length; i++) for (const shape of living) if (LOVES[i].includes(shape.kind)) { who = i; home = shape; break search }
    const at = middle(home)
    return drag('figure', { x: FOLK[who].x, y: FOLK[who].y - FOLK[who].h / 2 }, { x: FELT.x + (at.col + 0.5) * CELL, y: FELT.y + (at.row + 0.5) * CELL })
  }
  const bowl = BOWLS[hand]
  // A few places low on the sheet, nearest the bowl first; the barest wins. Low, because that is where a hand
  // coming up from the bowls arrives, and not because anything belongs there.
  const col = Math.max(8, Math.min(COLS - 22, Math.round((bowl.x - FELT.x) / CELL)))
  const places: [number, number][] = [[col, 40], [col, 30], [col + 14, 36], [col - 14 < 8 ? col + 24 : col - 14, 36], [col, 20], [col, 10]]
  let best = places[0], least = Infinity
  for (const place of places) {
    const n = crowd(sheet, place[0], place[1]) + crowd(sheet, place[0] + 12, place[1] - 2)
    if (n < least) { least = n; best = place }
  }
  const start = { x: FELT.x + best[0] * CELL, y: FELT.y + best[1] * CELL }
  return { kind: 'wool', glow: { x: bowl.x, y: bowl.y - 40 }, path: [{ x: bowl.x, y: bowl.y - 30 }, start, { x: start.x + 130, y: start.y - 22 }], drag: true, wool: true }
}

/** Where the hand is along the move, for a travel of 0 to 1: the way to the middle point is the first half. */
export function along(path: Hint['path'], travel: number): Point {
  const [a, b, c] = path
  const t = Math.max(0, Math.min(1, travel))
  if (t < 0.5) return { x: a.x + (b.x - a.x) * (t * 2), y: a.y + (b.y - a.y) * (t * 2) }
  return { x: b.x + (c.x - b.x) * (t * 2 - 1), y: b.y + (c.y - b.y) * (t * 2 - 1) }
}
