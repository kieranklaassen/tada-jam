import { copy, emptyArrangement, putInSand, type Arrangement } from './arrangement'
import { MOVES_CAP } from './config'
import { marksFromText, marksToText, rakedSand, type Marks } from './marks'
import { KINDS, countMove, isKind, isMove, judge, kindAt, layout, rideOf, wantMet, wrapTurn, type Kind } from './rides'
import { beginCycle, deserialize, finishCycle, freshState, serialize, type GameState } from './state'
import { FRIEND_IDS, FRIENDS, GRID, TRAY, gridLine, homeOn, type FriendId, type Spot } from './world'

// Everything the game keeps, and the three things that change it between
// rides. Pure. It wraps the template's state.ts, which holds the position and
// whether the ride on screen has ended, and adds this game's own fields, each
// read and repaired by itself. Found as left: what is saved is who is where,
// never a friend in the air or a plank in mid-swing.

export type World = {
  state: GameState
  /** The kind of ride on screen. */
  kind: Kind
  /** The turn the ride on screen was laid out on. */
  turn: number
  arrangement: Arrangement
  /** Moves made in the ride on screen. */
  moves: number
  /** The kinds whose one showing has played. */
  shown: Kind[]
  marks: Marks
  /** The child has touched the game at least once, ever. Until then no tool is on screen: the rake stays away. */
  touched: boolean
}

/** The saved shape: plain JSON. A place in the sand is two whole numbers, in hundredths of the tray's width. */
export type Saved = GameState & {
  kind: Kind
  turn: number
  left: FriendId[]
  right: FriendId[]
  sand: Partial<Record<FriendId, [number, number]>>
  waiting: FriendId | null
  moves: number
  shown: Kind[]
  marks: string
  touched: boolean
}

function toCell(spot: Spot): [number, number] {
  return [Math.round((spot.x + TRAY.halfWidth) / GRID), Math.round((spot.z + TRAY.halfDepth) / GRID)]
}

function fromCell(cell: unknown): Spot | null {
  if (!Array.isArray(cell) || cell.length !== 2) return null
  const [i, j] = cell as unknown[]
  if (typeof i !== 'number' || typeof j !== 'number' || !Number.isFinite(i) || !Number.isFinite(j)) return null
  return { x: gridLine(Math.round(i), -TRAY.halfWidth), z: gridLine(Math.round(j), -TRAY.halfDepth) }
}

function isFriend(value: unknown): value is FriendId {
  return typeof value === 'string' && (FRIEND_IDS as readonly string[]).includes(value)
}

/** A first visit: the ride of the starting position, as it opens. */
export function freshWorld(childAge: number | null): World {
  const state = freshState(childAge)
  const kind = kindAt(state.position, 0)
  return { state, kind, turn: 0, arrangement: layout(rideOf(kind, 0)), moves: 0, shown: [], marks: rakedSand(), touched: false }
}

export function save(world: World): Saved {
  const sand: Partial<Record<FriendId, [number, number]>> = {}
  for (const id of FRIEND_IDS) if (world.arrangement.sand[id]) sand[id] = toCell(world.arrangement.sand[id]!)
  return {
    ...serialize(world.state),
    kind: world.kind,
    turn: world.turn,
    left: [...world.arrangement.left],
    right: [...world.arrangement.right],
    sand,
    waiting: world.arrangement.waiting,
    moves: world.moves,
    shown: [...world.shown],
    marks: marksToText(world.marks),
    touched: world.touched,
  }
}

/**
 * Saved state is untrusted. What is not this game's record gives a first
 * visit. Inside a record every field is repaired by itself, and the result
 * is always a sound arrangement: each friend in exactly one place.
 */
/** A slot holds a world this build can read: the game was put away before and is now found, not opened for the first time. */
export function wasSaved(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) && (raw as Record<string, unknown>).v === freshWorld(null).state.v
}

export function load(raw: unknown, childAge: number | null): World {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return freshWorld(childAge)
  const record = raw as Record<string, unknown>
  const fresh = freshWorld(childAge)
  // The template's own fields. A version it cannot read gives a fresh state, and then so does everything else.
  if (record.v !== fresh.state.v) return fresh
  const state = deserialize(raw, childAge)
  const turn = typeof record.turn === 'number' && Number.isFinite(record.turn) ? wrapTurn(record.turn) : 0
  const kind = isKind(record.kind) ? record.kind : kindAt(state.position, turn)
  const moves = typeof record.moves === 'number' && Number.isFinite(record.moves) ? Math.max(0, Math.min(MOVES_CAP, Math.floor(record.moves))) : 0
  const shown = Array.isArray(record.shown) ? KINDS.filter((k) => (record.shown as unknown[]).includes(k)) : []
  const marks = marksFromText(record.marks)
  const touched = record.touched === true

  // Who is where. Without both stacks there is nothing to repair from: the ride is laid out as it opens.
  if (!Array.isArray(record.left) || !Array.isArray(record.right)) {
    return { state: { ...state, finished: false }, kind, turn, arrangement: layout(rideOf(kind, turn)), moves: 0, shown, marks, touched }
  }
  const placed = new Set<FriendId>()
  let arrangement: Arrangement = { left: [], right: [], sand: {}, waiting: null }
  for (const end of ['left', 'right'] as const) {
    for (const id of record[end] as unknown[]) if (isFriend(id) && !placed.has(id)) {
      placed.add(id)
      arrangement[end].push(id)
    }
  }
  // A friend waits only after a ride has ended, and a ride that has ended always has one waiting.
  if (state.finished) {
    const waiting = isFriend(record.waiting) ? record.waiting : rideOf(kindAt(state.position, turn + 1), turn + 1).asker
    arrangement = toWaiting(arrangement, waiting)
    placed.add(waiting)
  }
  // Everyone else stands in the sand: where they were left, or at the nearest free place to it.
  const sand = typeof record.sand === 'object' && record.sand !== null ? (record.sand as Record<string, unknown>) : {}
  for (const id of FRIEND_IDS) if (!placed.has(id)) arrangement = putInSand(arrangement, id, fromCell(sand[id]) ?? homeOn(id, 'right'))
  const world: World = { state, kind, turn, arrangement, moves, shown, marks, touched }
  // Put away after the move that carried the asker there and before the ending began: it is found ended, with the
  // next asker waiting. No scene starts by itself on load.
  return rideIsOver(world) ? endRide(world) : world
}

function toWaiting(a: Arrangement, id: FriendId): Arrangement {
  const next = copy(a)
  next.left = next.left.filter((other) => other !== id)
  next.right = next.right.filter((other) => other !== id)
  delete next.sand[id]
  next.waiting = id
  return next
}

/** The child moved a friend. While a ride runs, a friend arriving on an end or leaving one is counted. */
export function afterMove(world: World, arrangement: Arrangement): World {
  // The friend who waits is not moved by a carry or a tap: a touch on it begins the next ride (`beginRide`).
  if (world.arrangement.waiting !== arrangement.waiting) return world
  const counted = !world.state.finished && isMove(world.arrangement, arrangement)
  return { ...world, arrangement, moves: counted ? countMove(world.moves) : world.moves }
}

/** True when the ride on screen has just been carried through: the asker is where it wanted, and the ride has not ended yet. */
export function rideIsOver(world: World): boolean {
  return !world.state.finished && wantMet(rideOf(world.kind, world.turn), world.arrangement)
}

/**
 * The ride ends. It is judged, the position moves for the next one, the
 * friend who asks next leaves the plank or the sand for the waiting place,
 * and the count of moves is cleared. All of it is the outcome of the ending
 * scene and is saved when that scene starts: `finished`, `position`,
 * `waiting`, `left`, `right`, `sand` and `moves`.
 */
export function endRide(world: World): World {
  if (world.state.finished) return world
  const state = finishCycle(world.state, judge(world.kind, world.moves))
  const next = rideOf(kindAt(state.position, world.turn + 1), world.turn + 1)
  return { ...world, state, arrangement: toWaiting(world.arrangement, next.asker), moves: 0 }
}

/** The child touched the friend who waits: the next ride is laid out. Nothing happens while a ride runs. */
export function beginRide(world: World): World {
  if (!world.state.finished) return world
  const turn = wrapTurn(world.turn + 1)
  const kind = kindAt(world.state.position, turn)
  return { ...world, state: beginCycle(world.state), kind, turn, arrangement: layout(rideOf(kind, turn)), moves: 0 }
}

/** The one showing of this kind has played. */
export function markShown(world: World, kind: Kind): World {
  return world.shown.includes(kind) ? world : { ...world, shown: KINDS.filter((k) => k === kind || world.shown.includes(k)) }
}

/** The largest state the game can save: everyone in the sand at the longest numbers, every kind shown, every cell marked. */
export function largestSaved(): Saved {
  let arrangement = emptyArrangement()
  for (const id of FRIEND_IDS) arrangement = putInSand(arrangement, id, { x: -TRAY.halfWidth + FRIENDS[id].radius, z: TRAY.halfDepth })
  const world: World = { state: { ...freshState(null), position: 'middle-asks', finished: false }, kind: 'middle-asks', turn: 9, arrangement, moves: MOVES_CAP, shown: [...KINDS], marks: rakedSand().fill(9), touched: true }
  return save(world)
}
