import type { Game } from './cycle'
import { GIVE_PARTS, WHOLE } from './measure'
import { holdsMisfit, tinAt } from './moves'
import { wanted } from './orders'
import { served } from './serve'
import { BOARD, CRATE, QUEUE, WINDOW, boxOf, type Box, type Point } from './stage'
import { LANES, onLane, type Piece } from './world'

// What the idle ladder shows: a glow on the one thing a child would want
// next, and then a ghost hand making one move on it. The hand shows a move,
// never a solution: how a fruit is cut and never where, how a piece is taken
// to the tin and never which piece is the right one. Pure.

export type Guide = {
  /** What glows: one thing, or the two who wait when it is for the child to call one. */
  glow: Box[]
  on: 'fruit' | 'crate' | 'waiting' | 'tin' | 'customer'
  /** The move the hand makes: from one point to the other, as a stroke or a carry, or a tap where it stands. */
  hand: { from: Point; to: Point; drag: boolean }
}

/** Where along a fruit the hand strokes, as a share of its length, for each showing in turn. Each is further than the give of a tin from a half, a third and a quarter. */
export const STROKE_AT: readonly number[] = [0.38, 0.62, 0.42, 0.58]

const mid = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const tap = (glow: Box[], on: Guide['on'], at: Point): Guide => ({ glow, on, hand: { from: at, to: at, drag: false } })

/** The pieces on the board, each with its box: the near lane first. */
function onBoard(game: Game): { piece: Piece; box: Box }[] {
  const out: { piece: Piece; box: Box }[] = []
  for (let lane = 0; lane < LANES; lane++) for (const piece of onLane(game.world, lane)) out.push({ piece, box: boxOf(piece)! })
  return out
}

/** The stroke the hand shows across a fruit or a piece: straight down through it, at a place that is not the share on the ticket. */
function strokeAcross(box: Box, showing: number, share: number | null): Guide['hand'] {
  const clear = STROKE_AT.filter((at) => share === null || Math.abs(at - share) > 2 / GIVE_PARTS)
  const places = clear.length > 0 ? clear : STROKE_AT
  const x = box.x + box.w * places[((showing % places.length) + places.length) % places.length]
  return { from: { x, y: Math.max(BOARD.y - 44, box.y - 90) }, to: { x, y: box.y + box.h + 50 }, drag: true }
}

/**
 * What to show now, for the `showing`-th demonstration of this idle stretch.
 * - Nobody at the window, or the one there has been served: the two who wait glow, and the hand taps one.
 * - A customer waits to be served and nothing of its fruit has been cut: its fruit glows and the hand strokes
 *   across it, or the crate glows and the hand taps it when no such fruit lies on the board.
 * - A piece of its fruit has been cut and the tin wants more: the tin glows and the hand carries a piece to it.
 * - What lies in the tin sticks out: the customer glows and the hand taps it, which sends it off as it is.
 */
export function guideOf(game: Game, showing = 0): Guide {
  const customer = game.window
  if (!customer || game.finished) {
    const index = ((showing % 2) + 2) % 2
    return tap([QUEUE[0], QUEUE[1]], 'waiting', mid(QUEUE[index]))
  }
  const tin = tinAt(game)!
  if (holdsMisfit(game) && served(game.world, customer).kind === 'over') return tap([WINDOW], 'customer', { x: WINDOW.x + 110, y: WINDOW.y + 100 })
  const mine = onBoard(game).filter(({ piece }) => piece.fruit === customer.fruit)
  const cut = mine.filter(({ piece }) => piece.length < WHOLE[piece.fruit])
  if (cut.length > 0) {
    // The first piece along the near lane, taken by its middle, to the tin: a move, whichever piece is the right one.
    const first = cut[0]
    return { glow: [tin.body], on: 'tin', hand: { from: mid(first.box), to: { x: tin.body.x + Math.min(tin.body.w, first.box.w) / 2 + 8, y: tin.body.y + tin.body.h / 2 }, drag: true } }
  }
  const whole = mine.reduce<{ piece: Piece; box: Box } | null>((best, one) => (!best || one.box.w > best.box.w ? one : best), null)
  if (!whole) return tap([CRATE], 'crate', mid(CRATE))
  const share = wanted(customer)
  return { glow: [whole.box], on: 'fruit', hand: strokeAcross(whole.box, showing, share.num / share.den) }
}
