import { RAIL } from './measure'
import { ideaOf, layOut, tinParts, type Customer } from './orders'
import { serveOf, served, type Served } from './serve'
import { beginCycle, finishCycle, freshState, type CycleOutcome, type GameState } from './state'
import { isGlider, tasteOf, type Taste } from './tastes'
import { clearTin, emptyWorld, giveToTin, landFruit, pieceOf, remove, setOnShelf, tinTotal, type World } from './world'

// A cycle is one customer: called to the window, served, sent off. This module
// holds the game as a whole (the place in the designed order, the customers,
// the counter) and the few moves that begin, judge and end a cycle. Pure: each
// move returns the new game and what happened, for the view to act out.
//
// The position moves by the template's rules in state.ts, which this module
// calls and never restates: between cycles only, one step at a time.

export type Game = GameState & {
  /** The state of the seeded stream that lays out customers. */
  seed: number
  /** The customer at the window, or nobody: a first visit opens with a fruit on the board and two waiting. */
  window: Customer | null
  /** The two who wait. Each keeps its ticket showing and does nothing about waiting. */
  queue: [Customer, Customer]
  /** The pieces on the counter, and whether the tin at the window has been opened. */
  world: World
  /** The ideas whose first showing has played, by the id of the position that brings each. */
  shown: string[]
}

/** The stream every first visit starts from. */
export const FIRST_SEED = 2026

/** A first visit: two wait, and a fruit lies on the board to be sliced with nobody asking for anything. */
export function freshGame(childAge: number | null, seed = FIRST_SEED): Game {
  const state = freshState(childAge)
  const first = layOut(state.position, 'new', seed)
  const second = layOut(state.position, 'known', first.seed)
  return { ...state, seed: second.seed, window: null, queue: [first.customer, second.customer], world: landFruit(emptyWorld(), 'long').world, shown: [] }
}

/**
 * How a served order is judged. Never shown, and used only to place the next customer in the designed order.
 * Well: it fits, and every piece was cut before the tin opened, on a fruit the roller had not marked. Mixed:
 * it fits, with help from the open tin or the roller. Badly: it does not fit. A taste never enters into it.
 */
export function judge(result: Served): CycleOutcome {
  if (result.kind !== 'fit') return 'badly'
  return result.parts.every((part) => part.pieces.every((piece) => piece.blind && piece.ruled === 0)) ? 'well' : 'mixed'
}

export type Ending = { result: Served; taste: Taste; outcome: CycleOutcome; glider: boolean }

/** Ends the cycle at the window. Only a customer who carried the new thing moves the position. */
function end(game: Game, result: Served, glider = false): { game: Game; ending: Ending } {
  const customer = game.window!
  const outcome = judge(result)
  const state = finishCycle(game, customer.step ? outcome : 'mixed')
  return { game: { ...game, position: state.position, finished: true }, ending: { result, taste: tasteOf(customer, result), outcome, glider } }
}

/**
 * The child sends the customer off with its tin as it is, and the customer eats it as it is. With nothing of
 * the ordered fruit in the tin there is nothing to send off, and nothing happens here: a touch on the
 * customer is then a poke.
 */
export function sendOff(game: Game): { game: Game; ending: Ending | null } {
  if (!game.window || game.finished) return { game, ending: null }
  const result = served(game.world, game.window)
  return result.kind === 'empty' ? { game, ending: null } : end(game, result)
}

/** The customer is fed a piece by hand, bypassing the tin, and eats it as it is: judged by the same lengths. */
export function feed(game: Game, id: number): { game: Game; ending: Ending | null } {
  const piece = pieceOf(game.world, id)
  if (!game.window || game.finished || !piece) return { game, ending: null }
  const result = serveOf(game.window, tinParts(game.window).map((_, part) => (part === 0 ? [piece] : [])))
  return end({ ...game, world: remove(game.world, id) }, result, isGlider(game.window, piece))
}

export type Given = {
  /** This piece opened the tin: the truth of the order is now shown. */
  opened: boolean
  /** The idea whose first showing plays now, once, or nothing. */
  firstShowing: string | null
  /** Pieces of another fruit, picked out and dropped to the dog. */
  strays: number[]
  /** The piece did not fit on the rail and slid off onto the shelf. */
  slidOff: boolean
  result: Served
  /** The tin shut on a fit, which ends the cycle. */
  ending: Ending | null
}

/**
 * A piece is laid in a compartment of the tin at the window. The first piece opens the tin. A piece of
 * another fruit is picked out. When every compartment is within the give the lid shuts by itself, and that
 * is the end of the cycle; otherwise everything stays as it lies.
 */
export function give(game: Game, id: number, part: number): { game: Game; given: Given | null } {
  const customer = game.window, piece = pieceOf(game.world, id)
  if (!customer || game.finished || !piece) return { game, given: null }
  const compartment = Math.max(0, Math.min(tinParts(customer).length - 1, Math.round(part)))
  if (tinTotal(game.world, compartment) + piece.length > RAIL) {
    const world = setOnShelf(game.world, id).world
    return { game: { ...game, world }, given: { opened: false, firstShowing: null, strays: [], slidOff: true, result: served(world, customer), ending: null } }
  }
  const opened = !game.world.tinOpen
  let world = giveToTin(game.world, id, compartment)
  const strays = served(world, customer).strays.map((stray) => stray.id)
  for (const stray of strays) world = remove(world, stray)
  const idea = ideaOf(customer)
  const firstShowing = opened && !game.shown.includes(idea) ? idea : null
  const next: Game = { ...game, world, shown: firstShowing ? [...game.shown, firstShowing] : game.shown }
  const result = served(world, customer)
  if (result.kind !== 'fit') return { game: next, given: { opened, firstShowing, strays, slidOff: false, result, ending: null } }
  const ended = end(next, result)
  return { game: ended.game, given: { opened, firstShowing, strays, slidOff: false, result, ending: ended.ending } }
}

/**
 * The child touches one of the two who wait. With the window free, or its customer served, that one steps
 * up: the served one leaves with its tin, and a new customer joins the queue, laid out for the position as it
 * stands now. With an unserved customer at the window and an empty tin, the two change places. With something
 * in the tin, the touch sends the customer at the window off first.
 */
export function call(game: Game, index: 0 | 1): { game: Game; did: 'stepped' | 'swapped' | 'sentOff'; ending: Ending | null } {
  const called = game.queue[index]
  if (game.window && !game.finished) {
    const sent = sendOff(game)
    if (sent.ending) return { game: sent.game, did: 'sentOff', ending: sent.ending }
    const queue: [Customer, Customer] = index === 0 ? [game.window, game.queue[1]] : [game.queue[0], game.window]
    return { game: { ...game, window: called, queue }, did: 'swapped', ending: null }
  }
  const arrival = layOut(game.position, called.step ? 'new' : 'known', game.seed)
  const queue: [Customer, Customer] = index === 0 ? [arrival.customer, game.queue[1]] : [game.queue[0], arrival.customer]
  const state = beginCycle(game)
  return { game: { ...game, finished: state.finished, seed: arrival.seed, window: called, queue, world: clearTin(game.world) }, did: 'stepped', ending: null }
}

/** A tap on the crate: a fresh fruit of the ordered kind lands on the board, as often as the child likes. */
export function crate(game: Game): { game: Game; id: number; swept: number[]; fell: number[] } {
  const landed = landFruit(game.world, game.window?.fruit ?? 'long')
  return { game: { ...game, world: landed.world }, id: landed.id, swept: landed.swept, fell: landed.fell }
}
