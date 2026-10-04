import { LADDER } from './config'
import { FIRST_SEED, freshGame, type Game } from './cycle'
import { FRUITS, RAIL, WHOLE, giveOf, type Fruit } from './measure'
import { inRange, layOut, tinParts, type Customer, type Who } from './orders'
import { STATE_VERSION, deserialize as readState } from './state'
import { seedOf } from './stream'
import { LANES, SHELF, eat, emptyWorld, giveToTin, onLane, setOnBoard, setOnShelf, type Piece, type Place, type World } from './world'

// What goes into ctx.storage for this game, and how it is read back. The
// template's state.ts keeps the version, the place in the designed order and
// whether the cycle on screen is finished; this module wraps it, as that file
// says to, and adds the game's own fields, each repaired by itself. Saved
// state is untrusted: whatever comes back, the game opens, and what it opens
// with is a state the rules could have made.

/** The saved record: plain JSON, every field named in ART.md under "What is stored". */
export type Saved = {
  v: typeof STATE_VERSION
  position: string
  finished: boolean
  seed: number
  window: Customer | null
  queue: Customer[]
  tinOpen: boolean
  pieces: Piece[]
  nextId: number
  shown: string[]
}

export function serialize(game: Game): Saved {
  return {
    v: STATE_VERSION,
    position: game.position,
    finished: game.finished,
    seed: game.seed,
    window: game.window,
    queue: game.queue,
    tinOpen: game.world.tinOpen,
    pieces: game.world.pieces,
    nextId: game.world.nextId,
    shown: game.shown,
  }
}

const WHOS: readonly Who[] = ['pelican', 'twins', 'ants', 'cat', 'boa']
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

/** A saved customer, if it is one the rules could have laid out; otherwise nothing. */
function readCustomer(raw: unknown): Customer | null {
  if (!isRecord(raw) || !WHOS.includes(raw.who as Who) || !FRUITS.includes(raw.fruit as Fruit) || !Array.isArray(raw.shares)) return null
  const shares = raw.shares.map((share) => (isRecord(share) && isCount(share.num) && isCount(share.den) && share.den > 0 ? { num: share.num, den: share.den } : null))
  if (shares.length === 0 || shares.some((share) => share === null)) return null
  const customer: Customer = { who: raw.who as Who, fruit: raw.fruit as Fruit, shares: shares as Customer['shares'], carries: typeof raw.carries === 'string' && LADDER.includes(raw.carries) ? raw.carries : null, written: raw.written === true, lined: raw.lined !== false }
  return inRange(customer).length === 0 ? customer : null
}

function readPlace(raw: unknown): Place | null {
  if (!isRecord(raw)) return null
  if (raw.on === 'board' && isCount(raw.lane) && raw.lane < LANES && isCount(raw.x)) return { on: 'board', lane: raw.lane, x: raw.x }
  if (raw.on === 'shelf' && isCount(raw.slot)) return { on: 'shelf', slot: raw.slot }
  if (raw.on === 'tin' && isCount(raw.part) && isCount(raw.turn)) return { on: 'tin', part: raw.part, turn: raw.turn }
  if (raw.on === 'eaten' && isCount(raw.turn)) return { on: 'eaten', turn: raw.turn }
  return null
}

/** A saved piece, if it is one a cut could have made. A piece whose marks cannot be read counts as cut with help. */
function readPiece(raw: unknown): Piece | null {
  if (!isRecord(raw) || !isCount(raw.id) || raw.id < 1 || !FRUITS.includes(raw.fruit as Fruit) || !isCount(raw.length)) return null
  const fruit = raw.fruit as Fruit, place = readPlace(raw.place)
  if (!place || raw.length < giveOf(fruit) || raw.length > WHOLE[fruit]) return null
  // Marks that cannot be read are no marks, but a piece that had some still counts as cut with help: one part as long as the piece.
  const isLength = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
  const ruled = isLength(raw.ruled) ? raw.ruled : raw.ruled === undefined ? 0 : raw.length
  const mark = isLength(raw.mark) && raw.mark < ruled ? raw.mark : 0
  return { id: raw.id, fruit, length: raw.length, place, blind: raw.blind === true, ruled, mark }
}

/** The most pieces the rules can leave in the world: two full lanes, a full shelf and two full compartments of the shortest pieces. */
export const MOST_PIECES = (LANES + 2) * (RAIL / giveOf('short')) + SHELF

/**
 * Lays the saved pieces out again, one at a time, each where it was saved if that place is free. A piece
 * saved over another, off the board, or in a tin that is not there goes to the nearest place the rules allow.
 * A piece saved inside a customer is kept only while a served customer stands at the window: otherwise it
 * was eaten and is gone.
 */
function readWorld(raw: Record<string, unknown>, compartments: number, served: boolean): World {
  const seen = new Set<number>()
  const pieces = (Array.isArray(raw.pieces) ? raw.pieces : [])
    .map(readPiece)
    .filter((piece): piece is Piece => piece !== null && !seen.has(piece.id) && !!seen.add(piece.id))
    .slice(0, MOST_PIECES)
  const order = (piece: Piece) => (piece.place.on === 'tin' ? piece.place.part * 1e6 + piece.place.turn : piece.place.on === 'shelf' ? piece.place.slot : piece.place.on === 'eaten' ? piece.place.turn : piece.place.x)
  let world = emptyWorld()
  for (const piece of [...pieces].sort((a, b) => order(a) - order(b))) {
    const place = piece.place
    if (place.on === 'eaten') {
      if (served) world = eat({ ...world, pieces: [...world.pieces, { ...piece, place: { on: 'shelf', slot: SHELF } }] }, [piece.id])
    } else if (place.on === 'board') {
      const free = place.x + piece.length <= RAIL && onLane(world, place.lane).every((other) => other.place.on !== 'board' || place.x >= other.place.x + other.length || place.x + piece.length <= other.place.x)
      world = { ...world, pieces: [...world.pieces, free ? piece : { ...piece, place: { on: 'shelf', slot: SHELF } }] }
      if (!free) world = setOnBoard(world, piece.id, place.lane, place.x).world
    } else {
      world = { ...world, pieces: [...world.pieces, { ...piece, place: { on: 'shelf', slot: SHELF } }] }
      world = place.on === 'tin' && place.part < compartments ? giveToTin(world, piece.id, place.part) : setOnShelf(world, piece.id).world
    }
  }
  const top = world.pieces.reduce((most, piece) => Math.max(most, piece.id), 0)
  const inTin = world.pieces.some((piece) => piece.place.on === 'tin')
  // Back in the order they were saved in, so a state read and written again is the same record.
  const turn = new Map(pieces.map((piece, index) => [piece.id, index]))
  const kept = [...world.pieces].sort((a, b) => turn.get(a.id)! - turn.get(b.id)!)
  // A served customer's tin stays as it was left; with nobody served, an open tin holds something or was opened.
  return { pieces: kept, nextId: Math.max(top + 1, isCount(raw.nextId) ? raw.nextId : 1), tinOpen: compartments > 0 && (inTin || raw.tinOpen === true) }
}

/**
 * Reads a saved record. Anything that is not this game's record, or was written by a newer version, gives a
 * first visit, whose stream starts from `firstSeed`. Inside a record each field is repaired by itself, and a
 * saved place wins over the child's age.
 */
/**
 * Whether what the slot held is anything other than this game as it would be saved: a first visit, an older
 * shape, or something that had to be repaired. Such a game is handed to storage as soon as it has been laid
 * out, so that one put away before its first change opens again with the same two waiting.
 */
export function differsFromSlot(raw: unknown, game: Game): boolean {
  return JSON.stringify(raw) !== JSON.stringify(serialize(game))
}

export function deserialize(raw: unknown, childAge: number | null = null, firstSeed = FIRST_SEED): Game {
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshGame(childAge, firstSeed)
  const state = readState(raw, childAge)
  let seed = typeof raw.seed === 'number' ? seedOf(raw.seed) : FIRST_SEED
  const atWindow = readCustomer(raw.window)
  const saved = Array.isArray(raw.queue) ? raw.queue : []
  const queue = ([0, 1] as const).map((index) => {
    const kept = readCustomer(saved[index])
    if (kept) return kept
    const laid = layOut(state.position, index === 0 ? 'new' : 'known', seed)
    seed = laid.seed
    return laid.customer
  }) as [Customer, Customer]
  const world = readWorld(raw, atWindow ? tinParts(atWindow).length : 0, atWindow !== null && state.finished)
  const shown = [...new Set(Array.isArray(raw.shown) ? raw.shown.filter((id): id is string => typeof id === 'string' && LADDER.includes(id)) : [])]
  // With nobody at the window no cycle is on screen, so none can be finished.
  return { ...state, finished: atWindow !== null && state.finished, seed, window: atWindow, queue, world, shown }
}
