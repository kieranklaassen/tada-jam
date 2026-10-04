import { FRUITS, RAIL } from './measure'
import { ideasOf, layOut, tinParts, type Customer } from './orders'
import { serveOf, served, type Served } from './serve'
import { beginCycle, finishCycle, freshState, type CycleOutcome, type GameState } from './state'
import { pick } from './stream'
import { isGlider, tasteOf, type Taste } from './tastes'
import { clearTin, eat, eaten, emptyWorld, giveToTin, inTin, keepEaten, landFruit, pieceOf, remove, setOnShelf, tinTotal, type World } from './world'

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
 * How a tin is judged. Never shown, and used only to place the next customer in the designed order. Well: it
 * shut on a fit, and every piece in it was cut while no tin stood open, on a fruit the roller had not marked.
 * Mixed: it shut on a fit, but a piece in it was cut while a tin stood open, or carries roller marks. Badly:
 * the customer was sent off with a tin that held a misfit. A customer fed by hand is mixed whatever it was
 * fed (`feed`, below). A taste never enters into it.
 */
export function judge(result: Served): CycleOutcome {
  if (result.kind !== 'fit') return 'badly'
  return result.parts.every((part) => part.pieces.every((piece) => piece.blind && piece.ruled === 0)) ? 'well' : 'mixed'
}

/** How a cycle ended. `fed` says the customer was fed by hand: the tin had no part in it, so its serve has no lid and no lift. */
export type Ending = { result: Served; taste: Taste; outcome: CycleOutcome; glider: boolean; fed: boolean }

/**
 * Ends the cycle at the window, all at once, as the first beat of the serve starts: the cycle is finished, the
 * position takes the judged step, and the pieces eaten move to inside the customer in the order they are
 * eaten. Only the customer who carries the new thing of the position as it stands now moves the position; one
 * laid out for another position, who was still waiting when the position moved, moves nothing.
 */
function end(game: Game, result: Served, outcome: CycleOutcome, ate: readonly number[]): { game: Game; ending: Ending } {
  const customer = game.window!
  const state = finishCycle(game, customer.carries === game.position ? outcome : 'mixed')
  return { game: { ...game, position: state.position, finished: true, world: eat(game.world, ate) }, ending: { result, taste: tasteOf(customer, result), outcome, glider: false, fed: false } }
}

/** The ids of what lies in the tin at the window, compartment by compartment, in the order it lies. */
function tinIds(game: Game): number[] {
  return tinParts(game.window!).flatMap((_, part) => inTin(game.world, part).map((piece) => piece.id))
}

/**
 * The child sends the customer off with its tin as it is, and the customer eats it as it is. With nothing of
 * the ordered fruit in the tin there is nothing to send off, and nothing happens here: a touch on the
 * customer is then a poke.
 */
export function sendOff(game: Game): { game: Game; ending: Ending | null } {
  if (!game.window || game.finished) return { game, ending: null }
  const result = served(game.world, game.window)
  return result.kind === 'empty' ? { game, ending: null } : end(game, result, judge(result), tinIds(game))
}

/**
 * The customer at the window is fed a piece by hand, bypassing the tin, and eats it as it is. Fed by hand is
 * mixed whatever it was fed, so the position does not move. The piece goes inside the customer; what lay in its
 * tin is set on the shelf, since the tin goes with the customer. One that has already been served eats the
 * piece too, and nothing more is judged. `shelved` are the pieces that went from the tin to the shelf, and
 * `fell` what that pushed off the shelf's old end to the dog.
 *
 * A whole uncut fruit fed to the pelican is the glider, every time, served or not: the pelican leaves with it.
 * The fruit is gone, and so is anything the pelican had already eaten; any piece in its tin is set on the
 * shelf; and the window is empty, with the two still waiting.
 */
export function feed(game: Game, id: number, row: readonly number[] = []): { game: Game; ending: Ending | null; ate: boolean; shelved: number[]; fell: number[] } {
  const customer = game.window, piece = pieceOf(game.world, id)
  if (!customer || !piece) return { game, ending: null, ate: false, shelved: [], fell: [] }
  // A row is fed as one serving: every piece of it is eaten, and the body makes of them what it makes of exactly those pieces.
  const more = row.map((other) => pieceOf(game.world, other)).filter((other): other is NonNullable<typeof other> => other !== undefined && other.id !== id)
  const all = [id, ...more.map((other) => other.id)]
  // What lies in the tin of a customer who is not yet served goes to the shelf, one piece after another.
  const emptied = (world: World): { world: World; shelved: number[]; fell: number[] } => {
    const fell: number[] = []
    const shelved = game.finished ? [] : tinIds(game).filter((left) => !all.includes(left))
    for (const left of shelved) {
      // The piece being fed is in the hand: it is not what the tin's pieces push off the shelf.
      const set = setOnShelf(world, left, all)
      fell.push(...set.fell)
      world = set.world
    }
    return { world, shelved: shelved.filter((left) => !fell.includes(left)), fell }
  }
  const result = serveOf(customer, tinParts(customer).map((_, part) => (part === 0 ? [piece, ...more] : [])))
  // A whole fruit first is the glider, and whatever came after it in the row stays where it lay.
  if (isGlider(customer, piece)) {
    let world = remove(game.world, id)
    for (const gone of eaten(world)) world = remove(world, gone.id)
    const tin = emptied(world)
    return { game: { ...game, window: null, finished: false, world: { ...tin.world, tinOpen: false } }, ending: { result, taste: tasteOf(customer, result, [piece]), outcome: 'mixed', glider: true, fed: true }, ate: true, shelved: tin.shelved, fell: tin.fell }
  }
  if (game.finished) {
    // It keeps no more inside it than the rail could ever hold: fed more than that, the oldest piece inside it is gone for good.
    return { game: { ...game, world: keepEaten(eat(game.world, all)) }, ending: null, ate: true, shelved: [], fell: [] }
  }
  const tin = emptied(game.world)
  const ended = end({ ...game, world: tin.world }, result, 'mixed', all)
  // Fed by hand it eats every piece as it is, one of another fruit too, and its body makes of them what it makes of exactly those.
  return { game: ended.game, ending: { ...ended.ending, fed: true, taste: tasteOf(customer, result, [piece, ...more]) }, ate: true, shelved: tin.shelved, fell: tin.fell }
}

/**
 * A piece is given to one of the two who wait. It is eaten there and then and is gone: nothing is judged, and
 * the customer goes on waiting with its order. A whole uncut fruit given to a waiting pelican is the glider all
 * the same: that pelican leaves, and another customer joins the queue in its place, laid out for the position
 * as it stands.
 */
export function treat(game: Game, index: 0 | 1, id: number): { game: Game; glider: boolean } {
  const customer = game.queue[index], piece = pieceOf(game.world, id)
  if (!piece) return { game, glider: false }
  const world = remove(game.world, id)
  if (!isGlider(customer, piece)) return { game: { ...game, world }, glider: false }
  const arrival = layOut(game.position, joinsAs(game, index), game.seed)
  const queue: [Customer, Customer] = index === 0 ? [arrival.customer, game.queue[1]] : [game.queue[0], arrival.customer]
  return { game: { ...game, world, queue, seed: arrival.seed }, glider: true }
}

/**
 * What the customer who joins the queue in place `index` is laid out as. One of the two who wait always carries
 * what is new at the position as it stands, and the other is drawn from everything before it: so the one who
 * joins carries the new thing unless the one it joins already does. That holds after the position has moved,
 * and after a customer has stepped back from an open tin carrying nothing.
 */
function joinsAs(game: Game, index: 0 | 1): 'new' | 'known' {
  return game.queue[index === 0 ? 1 : 0].carries === game.position ? 'known' : 'new'
}

/** A piece flung at any customer splats and is licked off: it is gone, and nothing is judged. */
export function splat(game: Game, id: number): Game {
  return pieceOf(game.world, id) ? { ...game, world: remove(game.world, id) } : game
}

export type Given = {
  /** This piece opened the tin: the truth of the order is now shown. */
  opened: boolean
  /** The idea whose first showing plays now, once, or nothing. */
  firstShowing: string | null
  /** Pieces of another fruit, picked out and dropped to the dog. */
  strays: number[]
  /** The piece did not fit on the rail and slid off onto the shelf. `fell` is what that pushed off the shelf's old end to the dog. */
  slidOff: boolean
  fell: number[]
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
  // The rail is as long as the board: what would run off its end, counting every compartment, slides off onto the shelf.
  // Where what lies in the tin would end along the rail with this piece laid in: each compartment's pieces lie from its own left end, or
  // from where the compartment before it ends when that one sticks out. A piece that already lies in the tin and is laid in it again is
  // counted once. What would run past the end of the rail slides off onto the shelf.
  let reach = 0, from = 0
  tinParts(customer).forEach((ordered, part) => {
    const lying = tinTotal(game.world, part) - (piece.place.on === 'tin' && piece.place.part === part ? piece.length : 0) + (part === compartment ? piece.length : 0)
    reach = Math.max(from, reach) + lying
    from += ordered
  })
  // An order may be exactly as long as the rail. Its give is to either side there too: a piece that brings what lies in the tin to
  // within the give is taken, the jaw takes up the slack and the lid shuts, though it ends a little past the rail's end.
  const withinGive = reach > RAIL && piece.fruit === customer.fruit && served(giveToTin(game.world, id, compartment), customer).kind === 'fit'
  if (reach > RAIL && !withinGive) {
    const set = setOnShelf(game.world, id)
    return { game: { ...game, world: set.world }, given: { opened: false, firstShowing: null, strays: [], slidOff: true, fell: set.fell, result: served(set.world, customer), ending: null } }
  }
  const opened = !game.world.tinOpen
  let world = giveToTin(game.world, id, compartment)
  const strays = served(world, customer).strays.map((stray) => stray.id)
  for (const stray of strays) world = remove(world, stray)
  // Every idea this customer carries that has not been shown yet is shown now, in the one showing, and is marked as shown: the newest
  // of them names it. In the designed order that is one idea at a time; after a first visit that starts further up, it can be several.
  const fresh = opened ? ideasOf(customer).filter((idea) => !game.shown.includes(idea)) : []
  const firstShowing = fresh.length > 0 ? fresh[fresh.length - 1] : null
  const next: Game = { ...game, world, shown: fresh.length > 0 ? [...game.shown, ...fresh] : game.shown }
  const result = served(world, customer)
  if (result.kind !== 'fit') return { game: next, given: { opened, firstShowing, strays, slidOff: false, fell: [], result, ending: null } }
  const ended = end(next, result, judge(result), tinIds(next))
  return { game: ended.game, given: { opened, firstShowing, strays, slidOff: false, fell: [], result, ending: ended.ending } }
}

/**
 * The child touches one of the two who wait. With the window free, or its customer served, that one steps
 * up: the served one leaves with its tin, and a new customer joins the queue, laid out for the position as it
 * stands now. With an unserved customer at the window and an empty tin, the two change places, a tin that
 * stood open shuts, and nothing is judged. With something in the tin, the touch sends the customer at the
 * window off first.
 */
export function call(game: Game, index: 0 | 1): { game: Game; did: 'stepped' | 'swapped' | 'sentOff'; ending: Ending | null } {
  const called = game.queue[index]
  if (game.window && !game.finished) {
    const sent = sendOff(game)
    if (sent.ending) return { game: sent.game, did: 'sentOff', ending: sent.ending }
    // A tin that stood open shuts. The customer who steps back has had the truth of its order shown, so from
    // then on it carries the new thing of no position, and its cycle moves nothing.
    const back: Customer = game.world.tinOpen ? { ...game.window, carries: null } : game.window
    const queue: [Customer, Customer] = index === 0 ? [back, game.queue[1]] : [game.queue[0], back]
    return { game: { ...game, window: called, queue, world: { ...game.world, tinOpen: false } }, did: 'swapped', ending: null }
  }
  // The one who joins takes the place in the queue of the one who stepped up.
  const arrival = layOut(game.position, joinsAs(game, index), game.seed)
  const queue: [Customer, Customer] = index === 0 ? [arrival.customer, game.queue[1]] : [game.queue[0], arrival.customer]
  const state = beginCycle(game)
  return { game: { ...game, finished: state.finished, seed: arrival.seed, window: called, queue, world: clearTin(game.world) }, did: 'stepped', ending: null }
}

/**
 * A tap on the crate: a fresh fruit of the ordered kind lands on the board, as often as the child likes. With
 * nobody at the window there is no order, and the kind is drawn from the seeded stream, so all three lengths
 * come up over time.
 */
export function crate(game: Game): { game: Game; id: number; swept: number[]; fell: number[] } {
  let seed = game.seed, fruit = game.window?.fruit
  if (!fruit) {
    const drawn = pick(seed, FRUITS)
    fruit = drawn.value
    seed = drawn.state
  }
  const landed = landFruit(game.world, fruit)
  return { game: { ...game, seed, world: landed.world }, id: landed.id, swept: landed.swept, fell: landed.fell }
}

/**
 * What lies in the tin changed without a piece being laid in it: one was trimmed where it lay, or taken out.
 * If every compartment is now within the give the lid shuts, and that is the end of the cycle; otherwise
 * nothing happens.
 */
export function settle(game: Game): { game: Game; ending: Ending | null } {
  if (!game.window || game.finished || !game.world.tinOpen) return { game, ending: null }
  const result = served(game.world, game.window)
  return result.kind === 'fit' ? end(game, result, judge(result), tinIds(game)) : { game, ending: null }
}
