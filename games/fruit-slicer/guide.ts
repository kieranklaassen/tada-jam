import type { Game } from './cycle'
import { GIVE_PARTS, WHOLE } from './measure'
import type { Customer } from './orders'
import { holdsMisfit, tinAt } from './moves'
import { tinParts, wanted } from './orders'
import { served } from './serve'
import { figureBox } from './seats'
import { BOARD, CRATE, LANE_H, boxOf, laneTop, shown, type Box, type Point } from './stage'
import { LANES, onLane, type Piece } from './world'

// What the idle ladder shows: a glow on the one thing a child would want
// next, and then a ghost hand making one move on it. The hand shows a move,
// never a solution: how a fruit is cut and never where, how a piece is taken
// to the tin and never which piece is the right one. Pure.

export type Guide = {
  /** What glows: one thing, or the two who wait when it is for the child to call one. */
  glow: Box[]
  on: 'fruit' | 'crate' | 'waiting' | 'tin' | 'board'
  /** The move the hand makes: from one point to the other, as a stroke or a carry, or a tap where it stands. */
  hand: { from: Point; to: Point; drag: boolean }
}

/** Places along a fruit where the hand might stroke, as shares of its length, in the order they are tried. */
export const STROKE_AT: readonly number[] = [0.38, 0.62, 0.42, 0.58, 0.3, 0.7, 0.46, 0.54, 0.27, 0.73, 0.34, 0.66]

/**
 * The pieces a customer could use, as shares of its fruit: what each compartment of its tin takes, less a whole
 * fruit where the order is longer than one, and for the ants one part. A stroke that left any of them, to its
 * left or to its right, would be showing where to cut.
 */
export function usefulPieces(customer: Customer): number[] {
  const whole = WHOLE[customer.fruit]
  const pieces = tinParts(customer).map((length) => (length % whole || whole) / whole)
  if (customer.who === 'ants') pieces.push(1 / wanted(customer).den)
  return pieces
}

/** The places the hand strokes for this customer, in turn: none leaves a useful piece on either side of it, by a good deal more than the give of a tin. */
export function strokePlaces(customer: Customer | null): number[] {
  if (!customer) return STROKE_AT.slice(0, 4)
  const useful = usefulPieces(customer)
  const off = (at: number): number => Math.min(...useful.flatMap((piece) => [Math.abs(at - piece), Math.abs(1 - at - piece)]))
  const clear = STROKE_AT.filter((at) => off(at) > 2 / GIVE_PARTS)
  if (clear.length > 0) return clear.slice(0, 4)
  return [[...STROKE_AT].sort((a, b) => off(b) - off(a))[0]]
}

const mid = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const tap = (glow: Box[], on: Guide['on'], at: Point): Guide => ({ glow, on, hand: { from: at, to: at, drag: false } })

/** The pieces on the board, each with its box: the near lane first. */
function onBoard(game: Game): { piece: Piece; box: Box }[] {
  const out: { piece: Piece; box: Box }[] = []
  for (let lane = 0; lane < LANES; lane++) for (const piece of onLane(game.world, lane)) out.push({ piece, box: boxOf(piece)! })
  return out
}

/** The stroke the hand shows across a fruit: straight down through it, at a place that leaves nothing the customer could use on either side. */
function strokeAcross(box: Box, showing: number, customer: Customer | null): Guide['hand'] {
  const places = strokePlaces(customer)
  const x = box.x + box.w * places[((showing % places.length) + places.length) % places.length]
  return { from: { x, y: Math.max(BOARD.y - 44, box.y - 90) }, to: { x, y: box.y + box.h + 50 }, drag: true }
}

/**
 * What to show now, for the `showing`-th demonstration of this idle stretch.
 * - Nobody at the window, or the one there has been served: the two who wait glow, and the hand taps one.
 * - A customer waits to be served and nothing of its fruit has been cut: its fruit glows and the hand strokes
 *   across it, or the crate glows and the hand taps it when no such fruit lies on the board.
 * - A piece of its fruit has been cut and the tin wants more: the tin glows and the hand carries a piece to it.
 * - What lies in the tin sticks out: the piece furthest along the tin glows and the hand carries it back to the board.
 *   The hand never shows a move that goes badly, so it never sends a customer off with a tin that will not shut.
 */
export function guideOf(game: Game, showing = 0): Guide {
  const customer = game.window
  if (!customer || game.finished) {
    const index = ((showing % 2) + 2) % 2
    // Each is touched on its figure, and that is what glows and where the hand taps: the street round it is not the customer.
    const figures = [figureBox(game.queue[0], 0), figureBox(game.queue[1], 1)]
    return tap(figures, 'waiting', mid(figures[index]))
  }
  const tin = tinAt(game)!
  if (holdsMisfit(game) && served(game.world, customer).kind === 'over') {
    // The piece furthest along the tin is carried straight down to the near lane, where it can be cut again: a move, and nothing is judged.
    const lying = shown(game.world, tin).filter(({ piece }) => piece.place.on === 'tin')
    const last = lying.reduce((far, one) => (one.box.x > far.box.x ? one : far))
    const lane = { x: BOARD.x, y: laneTop(0), w: BOARD.w, h: LANE_H }
    return { glow: [last.box], on: 'board', hand: { from: { x: last.box.x + Math.min(last.box.w / 2, 60), y: last.box.y + last.box.h / 2 }, to: { x: last.box.x + Math.min(last.box.w / 2, 60), y: lane.y + lane.h / 2 }, drag: true } }
  }
  const mine = onBoard(game).filter(({ piece }) => piece.fruit === customer.fruit)
  const cut = mine.filter(({ piece }) => piece.length < WHOLE[piece.fruit])
  if (cut.length > 0) {
    // The first piece along the near lane, taken by its middle, to the tin: a move, whichever piece is the right one.
    const first = cut[0]
    return { glow: [tin.body], on: 'tin', hand: { from: mid(first.box), to: { x: tin.body.x + Math.min(tin.body.w, first.box.w) / 2 + 8, y: tin.body.y + tin.body.h / 2 }, drag: true } }
  }
  const whole = mine.reduce<{ piece: Piece; box: Box } | null>((best, one) => (!best || one.box.w > best.box.w ? one : best), null)
  if (!whole) return tap([CRATE], 'crate', mid(CRATE))
  return { glow: [whole.box], on: 'fruit', hand: strokeAcross(whole.box, showing, customer) }
}
