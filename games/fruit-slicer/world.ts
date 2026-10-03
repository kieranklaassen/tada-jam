import { RAIL, WHOLE, giveOf, type Fruit } from './measure'

// The things on the counter and where each lies: the pieces, the two lanes of
// the board, the shelf and the tin. Pure: every function takes a world and
// returns a new one, and nothing here knows about drawing, sound or time.
//
// A fruit is a piece that has not been cut: its length is its fruit's whole.
// Nothing is ever in the air. A piece being carried stays where it was picked
// up until it is set down, so a put-away in the middle of a carry loses nothing.

/** The board has two lanes, so two lengths can lie edge to edge from the same left end. */
export const LANES = 2
/** The shelf keeps this many leftovers, oldest first, each on a row of its own from one left edge. One more, and the oldest drops to the dog. */
export const SHELF = 4

export type Place =
  /** On the board: which lane, and how far its left end is from the board's left end, in points. */
  | { on: 'board'; lane: number; x: number }
  /** On the shelf: its turn there, 0 the oldest. */
  | { on: 'shelf'; slot: number }
  /** In the tin: which compartment, and its turn in it from the left. */
  | { on: 'tin'; part: number; turn: number }

export type Piece = {
  id: number
  fruit: Fruit
  /** In points. */
  length: number
  place: Place
  /** Cut before the tin at the window opened, that is, before the truth of this order was shown. */
  blind: boolean
  /** The parts the roller pressed into the fruit this piece came from, or 0. */
  ruled: number
}

export type World = {
  pieces: Piece[]
  nextId: number
  /** The tin at the window has been opened, which is when the truth was shown. */
  tinOpen: boolean
}

export const emptyWorld = (): World => ({ pieces: [], nextId: 1, tinOpen: false })

export const pieceOf = (world: World, id: number): Piece | undefined => world.pieces.find((piece) => piece.id === id)
export const isWhole = (piece: Piece): boolean => piece.length === WHOLE[piece.fruit]
export const onLane = (world: World, lane: number): Piece[] =>
  world.pieces.filter((piece) => piece.place.on === 'board' && piece.place.lane === lane).sort((a, b) => boardX(a) - boardX(b))
export const onShelf = (world: World): Piece[] => world.pieces.filter((piece) => piece.place.on === 'shelf').sort((a, b) => shelfSlot(a) - shelfSlot(b))
/** The pieces in one compartment of the tin, in the order they lie. */
export const inTin = (world: World, part: number): Piece[] =>
  world.pieces.filter((piece) => piece.place.on === 'tin' && piece.place.part === part).sort((a, b) => tinTurn(a) - tinTurn(b))
/** The total length lying in one compartment of the tin. */
export const tinTotal = (world: World, part: number): number => inTin(world, part).reduce((sum, piece) => sum + piece.length, 0)

const boardX = (piece: Piece): number => (piece.place.on === 'board' ? piece.place.x : 0)
const shelfSlot = (piece: Piece): number => (piece.place.on === 'shelf' ? piece.place.slot : 0)
const tinTurn = (piece: Piece): number => (piece.place.on === 'tin' ? piece.place.turn : 0)

/** The piece on a lane of the board that covers this point of it, if any. */
export function pieceAt(world: World, lane: number, x: number): Piece | undefined {
  return onLane(world, lane).find((piece) => x >= boardX(piece) && x <= boardX(piece) + piece.length)
}

/** What moving things about leaves behind: shelf slots and tin turns closed up, with no gaps. */
function tidy(world: World): World {
  const slots = new Map(onShelf(world).map((piece, slot) => [piece.id, slot]))
  const turns = new Map<number, number>()
  const seen = new Map<number, number>()
  for (const piece of [...world.pieces].sort((a, b) => tinTurn(a) - tinTurn(b))) {
    if (piece.place.on !== 'tin') continue
    const turn = seen.get(piece.place.part) ?? 0
    turns.set(piece.id, turn)
    seen.set(piece.place.part, turn + 1)
  }
  return {
    ...world,
    pieces: world.pieces.map((piece) =>
      piece.place.on === 'shelf' ? { ...piece, place: { on: 'shelf', slot: slots.get(piece.id)! } } : piece.place.on === 'tin' ? { ...piece, place: { ...piece.place, turn: turns.get(piece.id)! } } : piece,
    ),
  }
}

/** Puts pieces at the end of the shelf, in the order given. Whatever no longer fits drops off the old end: `fell`. */
function shelve(world: World, ids: readonly number[]): { world: World; fell: number[] } {
  const others = onShelf(world).filter((piece) => !ids.includes(piece.id)).map((piece) => piece.id)
  const order = [...others, ...ids]
  const fell = order.slice(0, Math.max(0, order.length - SHELF))
  const kept = order.slice(fell.length)
  const pieces = world.pieces
    .filter((piece) => !fell.includes(piece.id))
    .map((piece) => (kept.includes(piece.id) ? { ...piece, place: { on: 'shelf' as const, slot: kept.indexOf(piece.id) } } : piece))
  return { world: tidy({ ...world, pieces }), fell }
}

/** A piece is set down on the shelf. */
export function setOnShelf(world: World, id: number): { world: World; fell: number[] } {
  return pieceOf(world, id) ? shelve(world, [id]) : { world, fell: [] }
}

/**
 * A fresh fruit lands on the board from the crate: on the first empty lane, at its left end. With both lanes in
 * use it lands on the far lane and shoves what lay there onto the shelf. It never refuses.
 */
export function landFruit(world: World, fruit: Fruit): { world: World; id: number; swept: number[]; fell: number[] } {
  let lane = [...Array(LANES).keys()].find((index) => onLane(world, index).length === 0)
  let next = world, swept: number[] = [], fell: number[] = []
  if (lane === undefined) {
    lane = LANES - 1
    swept = onLane(world, lane).map((piece) => piece.id)
    ;({ world: next, fell } = shelve(world, swept))
  }
  const id = next.nextId
  const piece: Piece = { id, fruit, length: WHOLE[fruit], place: { on: 'board', lane, x: 0 }, blind: !next.tinOpen, ruled: 0 }
  return { world: { ...next, pieces: [...next.pieces, piece], nextId: id + 1 }, id, swept, fell }
}

export type Cut =
  /** Two pieces where there was one. The left one keeps its place. */
  | { kind: 'cut'; world: World; left: number; right: number; fell: number[] }
  /** The stroke was too near an end to make a piece: a curl of peel comes off and nothing changes. */
  | { kind: 'curl'; world: World; end: 'left' | 'right' }
  | { kind: 'none'; world: World }

/**
 * A stroke crosses a piece `at` points from its left end and cuts it square there. Neither piece may be
 * thinner than the give of its fruit. On the board both stay where they lie; from the shelf or the tin the
 * left part stays and the right part goes to the end of the shelf.
 */
export function cut(world: World, id: number, at: number): Cut {
  const piece = pieceOf(world, id)
  if (!piece) return { kind: 'none', world }
  const where = Math.round(at), least = giveOf(piece.fruit)
  if (where < least) return { kind: 'curl', world, end: 'left' }
  if (piece.length - where < least) return { kind: 'curl', world, end: 'right' }
  const blind = !world.tinOpen
  const left: Piece = { ...piece, length: where, blind }
  const rightId = world.nextId
  const onBoard = piece.place.on === 'board'
  const beside: Place = piece.place.on === 'board' ? { on: 'board', lane: piece.place.lane, x: piece.place.x + where } : { on: 'shelf', slot: SHELF }
  const right: Piece = { ...piece, id: rightId, length: piece.length - where, blind, place: beside }
  const made: World = { ...world, pieces: [...world.pieces.map((other) => (other.id === id ? left : other)), right], nextId: rightId + 1 }
  if (onBoard) return { kind: 'cut', world: made, left: id, right: rightId, fell: [] }
  const shelved = shelve(made, [rightId])
  return { kind: 'cut', world: shelved.world, left: id, right: rightId, fell: shelved.fell }
}

/** The free stretches of a lane, ignoring one piece (the one being set down). */
function gaps(world: World, lane: number, ignore: number): { from: number; to: number }[] {
  const free: { from: number; to: number }[] = []
  let from = 0
  for (const piece of onLane(world, lane)) {
    if (piece.id === ignore) continue
    if (boardX(piece) > from) free.push({ from, to: boardX(piece) })
    from = Math.max(from, boardX(piece) + piece.length)
  }
  if (from < RAIL) free.push({ from, to: RAIL })
  return free
}

/**
 * A piece is set down on the board with its left end at `x` on a lane. It goes to the nearest place on that
 * lane where it lies whole, and butts against a neighbour or the board's end when it is within the give of it,
 * so two pieces set end to end touch exactly and their lengths add. With no room on that lane it goes to the
 * other, and with no room on either, to the shelf.
 */
export function setOnBoard(world: World, id: number, lane: number, x: number): { world: World; fell: number[] } {
  const piece = pieceOf(world, id)
  if (!piece) return { world, fell: [] }
  const snap = giveOf(piece.fruit)
  const first = Math.max(0, Math.min(LANES - 1, Math.round(lane)))
  for (const tryLane of [first, ...[...Array(LANES).keys()].filter((index) => index !== first)]) {
    let best: number | null = null
    for (const gap of gaps(world, tryLane, id)) {
      if (gap.to - gap.from < piece.length) continue
      let at = Math.max(gap.from, Math.min(gap.to - piece.length, Math.round(x)))
      if (at - gap.from <= snap) at = gap.from
      else if (gap.to - (at + piece.length) <= snap && gap.to < RAIL) at = gap.to - piece.length
      if (best === null || Math.abs(at - x) < Math.abs(best - x)) best = at
    }
    if (best !== null) return { world: tidy({ ...world, pieces: world.pieces.map((other) => (other.id === id ? { ...other, place: { on: 'board', lane: tryLane, x: best! } } : other)) }), fell: [] }
  }
  return shelve(world, [id])
}

/** A piece is laid in a compartment of the tin, after whatever lies there. The first piece opens the tin. */
export function giveToTin(world: World, id: number, part: number): World {
  if (!pieceOf(world, id)) return world
  const turn = inTin(world, part).filter((piece) => piece.id !== id).length
  return tidy({ ...world, tinOpen: true, pieces: world.pieces.map((piece) => (piece.id === id ? { ...piece, place: { on: 'tin', part, turn } } : piece)) })
}

/** A piece leaves the counter for good: to the dog, into the crate, or eaten from the hand. */
export function remove(world: World, id: number): World {
  return tidy({ ...world, pieces: world.pieces.filter((piece) => piece.id !== id) })
}

/** The roller presses equal parts into a piece: the marks stay, and every piece cut from it carries them. */
export function roll(world: World, id: number, parts: number): World {
  return { ...world, pieces: world.pieces.map((piece) => (piece.id === id ? { ...piece, ruled: Math.max(0, Math.round(parts)) } : piece)) }
}

/**
 * The next customer steps up. What lay in the tin has gone with the one who was served, the new tin is shut,
 * and everything still on the counter was cut before this tin opened.
 */
export function clearTin(world: World): World {
  return tidy({ ...world, tinOpen: false, pieces: world.pieces.filter((piece) => piece.place.on !== 'tin').map((piece) => ({ ...piece, blind: true })) })
}
