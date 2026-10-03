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
  /** Inside the served customer: its turn among the pieces eaten. It stays there until the next customer steps up. */
  | { on: 'eaten'; turn: number }

export type Piece = {
  id: number
  fruit: Fruit
  /** In points. */
  length: number
  place: Place
  /** Cut while no tin stood open, that is, by eye, with no true length on show to trim against. An uncut fruit counts as such. */
  blind: boolean
  /** What the roller pressed into it: the length of one pressed part, in points, or 0 when it carries no marks. */
  ruled: number
  /** And where those marks begin: how far the first one is from its left end, from 0 up to one part. */
  mark: number
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
  const piece: Piece = { id, fruit, length: WHOLE[fruit], place: { on: 'board', lane, x: 0 }, blind: true, ruled: 0, mark: 0 }
  return { world: { ...next, pieces: [...next.pieces, piece], nextId: id + 1 }, id, swept, fell }
}

export type Cut =
  /** Two pieces where there was one. The left one keeps its place. */
  | { kind: 'cut'; world: World; left: number; right: number; fell: number[] }
  /** The stroke was too near an end to make a piece: a curl of peel comes off and nothing changes. */
  | { kind: 'curl'; world: World; end: 'left' | 'right' }
  | { kind: 'none'; world: World }

/** How far the two parts of a cut hop apart on the board, as a share of the give: enough to see, and to tell a cut from two pieces set end to end. */
export const HOP_PARTS = 4

/**
 * A stroke crosses a piece `at` points from its left end and cuts it square there. Neither piece may be
 * thinner than the give of its fruit. On the board the left part stays where it lies and the right part hops
 * a little way off it, as far as there is room; from the shelf or the tin the left part stays and the right
 * part goes to the end of the shelf. Roller marks stay where they were pressed, on both parts.
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
  let beside: Place = { on: 'shelf', slot: SHELF }
  if (piece.place.on === 'board') {
    const lane = piece.place.lane, end = piece.place.x + piece.length
    const next = onLane(world, lane).find((other) => other.id !== id && boardX(other) >= end)
    const room = (next ? boardX(next) : RAIL) - end
    beside = { on: 'board', lane, x: piece.place.x + where + Math.max(0, Math.min(least / HOP_PARTS, room)) }
  }
  const mark = piece.ruled > 0 ? (((piece.mark - where) % piece.ruled) + piece.ruled) % piece.ruled : 0
  const right: Piece = { ...piece, id: rightId, length: piece.length - where, blind, place: beside, mark }
  const made: World = { ...world, pieces: [...world.pieces.map((other) => (other.id === id ? left : other)), right], nextId: rightId + 1 }
  if (beside.on === 'board') return { kind: 'cut', world: made, left: id, right: rightId, fell: [] }
  const shelved = shelve(made, [rightId])
  return { kind: 'cut', world: shelved.world, left: id, right: rightId, fell: shelved.fell }
}

/** The free stretches of a lane, ignoring the pieces being set down. */
function gaps(world: World, lane: number, ignore: readonly number[]): { from: number; to: number }[] {
  const free: { from: number; to: number }[] = []
  let from = 0
  for (const piece of onLane(world, lane)) {
    if (ignore.includes(piece.id)) continue
    if (boardX(piece) > from) free.push({ from, to: boardX(piece) })
    from = Math.max(from, boardX(piece) + piece.length)
  }
  if (from < RAIL) free.push({ from, to: RAIL })
  return free
}

/**
 * A row: pieces on one lane of the board that lie exactly end to end, as a child sets them. Taking hold of a
 * piece takes the row with it on one side: `side` is the side of the piece the row is taken from, so a piece
 * at the end of a row comes away alone when it is held by its outer half. Left to right, the piece included.
 */
export function rowOf(world: World, id: number, side: 'left' | 'right'): number[] {
  const piece = pieceOf(world, id)
  if (!piece || piece.place.on !== 'board') return piece ? [id] : []
  const lane = onLane(world, piece.place.lane)
  const row = [piece]
  for (;;) {
    const end = side === 'right' ? row[row.length - 1] : row[0]
    const next = lane.find((other) => (side === 'right' ? boardX(other) === boardX(end) + end.length : boardX(other) + other.length === boardX(end)) && !row.includes(other))
    if (!next) break
    if (side === 'right') row.push(next)
    else row.unshift(next)
  }
  return row.map((one) => one.id)
}

/**
 * Pieces are set down on the board as one row, end to end in the order given, the left end of the first at
 * `x` on a lane. The row goes to the nearest place on that lane where it lies whole, and butts against a
 * neighbour or the board's end when it is within the give of it, so pieces set end to end touch exactly and
 * their lengths add. With no room on that lane it goes to the other, and with no room on either, to the shelf.
 */
export function setRowOnBoard(world: World, ids: readonly number[], lane: number, x: number): { world: World; fell: number[] } {
  const row = ids.map((id) => pieceOf(world, id)).filter((piece): piece is Piece => piece !== undefined)
  if (row.length === 0) return { world, fell: [] }
  const total = row.reduce((sum, piece) => sum + piece.length, 0)
  const snap = giveOf(row[0].fruit)
  const first = Math.max(0, Math.min(LANES - 1, Math.round(lane)))
  for (const tryLane of [first, ...[...Array(LANES).keys()].filter((index) => index !== first)]) {
    let best: number | null = null
    for (const gap of gaps(world, tryLane, ids)) {
      if (gap.to - gap.from < total) continue
      let at = Math.max(gap.from, Math.min(gap.to - total, Math.round(x)))
      if (at - gap.from <= snap) at = gap.from
      else if (gap.to - (at + total) <= snap && gap.to < RAIL) at = gap.to - total
      if (best === null || Math.abs(at - x) < Math.abs(best - x)) best = at
    }
    if (best === null) continue
    const places = new Map<number, number>()
    let next: number = best
    for (const piece of row) {
      places.set(piece.id, next)
      next += piece.length
    }
    return { world: tidy({ ...world, pieces: world.pieces.map((other) => (places.has(other.id) ? { ...other, place: { on: 'board', lane: tryLane, x: places.get(other.id)! } } : other)) }), fell: [] }
  }
  return shelve(world, row.map((piece) => piece.id))
}

/** One piece is set down on the board: a row of one. */
export function setOnBoard(world: World, id: number, lane: number, x: number): { world: World; fell: number[] } {
  return setRowOnBoard(world, [id], lane, x)
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

/**
 * The roller presses equal parts into a fruit or a piece, as if it were a whole of its own: so many parts of
 * its length, from its left end. The marks stay where they are pressed, and every piece cut from it carries
 * its share of them. No parts, or one, presses nothing and wipes nothing.
 */
export function roll(world: World, id: number, parts: number): World {
  const count = Math.round(parts)
  if (!(count >= 2)) return world
  return { ...world, pieces: world.pieces.map((piece) => (piece.id === id ? { ...piece, ruled: piece.length / count, mark: 0 } : piece)) }
}

/** Where the roller's marks lie on a piece, in points from its left end: every one strictly inside it. */
export function marksOf(piece: Piece): number[] {
  const marks: number[] = []
  if (piece.ruled <= 0) return marks
  for (let at = piece.mark; at < piece.length - 0.001; at += piece.ruled) if (at > 0.001) marks.push(at)
  return marks
}

/** The pieces inside the served customer, in the order they were eaten. */
export const eaten = (world: World): Piece[] =>
  world.pieces.filter((piece) => piece.place.on === 'eaten').sort((a, b) => (a.place.on === 'eaten' ? a.place.turn : 0) - (b.place.on === 'eaten' ? b.place.turn : 0))

/** The customer eats these pieces, in this order: each moves from where it lay to inside the customer. */
export function eat(world: World, ids: readonly number[]): World {
  const from = eaten(world).length
  return tidy({ ...world, pieces: world.pieces.map((piece) => (ids.includes(piece.id) ? { ...piece, place: { on: 'eaten', turn: from + ids.indexOf(piece.id) } } : piece)) })
}

/**
 * The next customer steps up. What the served one ate, and anything left in its tin, has gone with it, and
 * the new tin is shut. A piece on the counter keeps its mark: one cut while a tin stood open stays so.
 */
export function clearTin(world: World): World {
  return tidy({ ...world, tinOpen: false, pieces: world.pieces.filter((piece) => piece.place.on !== 'tin' && piece.place.on !== 'eaten') })
}
