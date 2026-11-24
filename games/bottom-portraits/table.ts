import { CAST, isId, type Id, type Turn } from './cast'
import { LADDER } from './config'
import { deserialize, freshState, isReadable, serialize, type GameState } from './state'

// What the game knows and saves: who stands where, which way each is turned,
// and what hangs on the wall. No browser, no clock.

/** One picture: who stood on each of the four places, and how each was turned. */
export type Arrangement = readonly (readonly [Id, Turn] | null)[]

export type Table = GameState & {
  spots: (Id | null)[]
  turns: Record<Id, Turn>
  homes: (Id | null)[]
  /** Six nails. A picture is its arrangement: the same arrangement always paints the same picture. */
  wall: (Arrangement | null)[]
  /** The nail of the newest picture, or -1. While `finished`, it stands on the easel and not yet on its nail. */
  last: number
  /** A picture has been painted, some time. */
  painted: boolean
}

export const SPOT_COUNT = 4, STEP_COUNT = 6, NAIL_COUNT = 6
/** Where each place goes when the table turns a quarter: near left to near right, and on round. */
export const ROUND: readonly number[] = [1, 3, 0, 2]

export const asTurn = (n: number): Turn => (((Math.round(n) % 4) + 4) % 4) as Turn

/** From this age a first visit has two on the table, one near the child and one near the painter; younger, and with no age, the elephant alone. */
export const PAIR_FROM = 5

export function freshTable(childAge: number | null): Table {
  const pair = childAge !== null && childAge >= PAIR_FROM
  const turns = Object.fromEntries(CAST.map((id) => [id, 0])) as Record<Id, Turn>
  const spots: (Id | null)[] = ['elephant', null, null, null]
  if (pair) spots[3] = 'pig'
  const homes: (Id | null)[] = ['hen', 'hippo', 'board', 'crocodile', pair ? null : 'pig', 'giraffe']
  return { ...freshState(childAge), spots, turns, homes, wall: new Array<Arrangement | null>(NAIL_COUNT).fill(null), last: -1, painted: false }
}

export const arrangementOf = (table: Table): Arrangement => table.spots.map((id) => (id ? [id, table.turns[id]] as const : null))

export type Place = { kind: 'spot' | 'step'; n: number }

export function placeOf(table: Table, id: Id): Place {
  const n = table.spots.indexOf(id)
  return n >= 0 ? { kind: 'spot', n } : { kind: 'step', n: table.homes.indexOf(id) }
}

export const at = (table: Table, place: Place): Id | null => (place.kind === 'spot' ? table.spots : table.homes)[place.n]
const set = (table: Table, place: Place, id: Id | null): void => { (place.kind === 'spot' ? table.spots : table.homes)[place.n] = id }
export const seated = (table: Table): Id[] => table.spots.filter((id): id is Id => id !== null)

export function turnOne(table: Table, id: Id): void {
  table.turns[id] = asTurn(table.turns[id] + 1)
}

/** The whole table goes a quarter round: everyone on it moves on and is turned with it. */
export function turnTable(table: Table): void {
  const next = new Array<Id | null>(SPOT_COUNT).fill(null)
  table.spots.forEach((id, n) => {
    if (!id) return
    next[ROUND[n]] = id
    turnOne(table, id)
  })
  table.spots = next
}

/**
 * Where a tap sends one from its step: an empty place, the near ones first (the board, which is for standing behind, the
 * far ones first), or the near place on its own side whoever stands there.
 */
export function sendTo(table: Table, id: Id): Place {
  const order = id === 'board' ? [2, 3, 0, 1] : [0, 1, 2, 3], n = order.find((spot) => table.spots[spot] === null)
  return { kind: 'spot', n: n ?? (placeOf(table, id).n < 3 ? 0 : 1) }
}

/** A quarter the other way round. */
export function turnTableBack(table: Table): void {
  for (let i = 0; i < 3; i++) turnTable(table)
}

/**
 * Moves one to a place, changing places with whoever stands there. Returns who moved, or nothing when it may not:
 * the last one on the table is never taken off it for an empty step.
 */
export function move(table: Table, id: Id, to: Place): Id[] {
  const from = placeOf(table, id), other = at(table, to)
  if (from.kind === to.kind && from.n === to.n) return []
  if (from.kind === 'spot' && to.kind === 'step' && other === null && seated(table).length === 1) return []
  set(table, from, other)
  set(table, to, id)
  return other ? [id, other] : [id]
}

/** The next nail: round the wall in order, so a seventh picture takes the oldest one's. */
export const nextNail = (table: Table): number => (table.last + 1) % NAIL_COUNT

/** A picture is painted of the table as it stands. Everything the painting's scene changes is changed here. */
export function paint(table: Table): number {
  const nail = nextNail(table)
  table.wall[nail] = arrangementOf(table)
  table.last = nail
  table.finished = true
  table.painted = true
  return nail
}

export function saveTable(table: Table): object {
  return { ...serialize(table), spots: [...table.spots], turns: { ...table.turns }, homes: [...table.homes], wall: table.wall.map((a) => a && a.map((e) => e && [...e])), last: table.last, painted: table.painted }
}

function readArrangement(raw: unknown): Arrangement | null {
  if (!Array.isArray(raw) || raw.length !== SPOT_COUNT) return null
  const used = new Set<Id>()
  const read = raw.map((entry: unknown): readonly [Id, Turn] | null => {
    if (!Array.isArray(entry) || !isId(entry[0]) || used.has(entry[0])) return null
    used.add(entry[0])
    return [entry[0], typeof entry[1] === 'number' && Number.isFinite(entry[1]) ? asTurn(entry[1]) : 0]
  })
  return used.size > 0 ? read : null
}

/** A saved table is untrusted: each field is repaired by itself, and everyone ends up standing exactly once. */
export function loadTable(raw: unknown, childAge: number | null): Table {
  const fresh = freshTable(childAge)
  if (!isReadable(raw)) return fresh
  const base = deserialize(raw, childAge, LADDER)
  const used = new Set<Id>()
  const places = (value: unknown, count: number): (Id | null)[] => Array.from({ length: count }, (_, n) => {
    const id: unknown = Array.isArray(value) ? value[n] : null
    if (!isId(id) || used.has(id)) return null
    used.add(id)
    return id
  })
  const table: Table = { ...fresh, ...base, spots: places(raw.spots, SPOT_COUNT), homes: places(raw.homes, STEP_COUNT) }
  // Whoever the save has lost goes back to a step of the first visit, or wherever there is room.
  for (const id of CAST) {
    if (used.has(id)) continue
    const own = fresh.homes.indexOf(id), free = own >= 0 && table.homes[own] === null ? own : table.homes.indexOf(null)
    if (free >= 0) table.homes[free] = id
    else table.spots[table.spots.indexOf(null)] = id
  }
  // Seven of them and six steps: somebody is on the table.
  const turns = typeof raw.turns === 'object' && raw.turns !== null ? (raw.turns as Record<string, unknown>) : {}
  for (const id of CAST) table.turns[id] = typeof turns[id] === 'number' && Number.isFinite(turns[id]) ? asTurn(turns[id] as number) : 0
  table.wall = Array.from({ length: NAIL_COUNT }, (_, n) => readArrangement(Array.isArray(raw.wall) ? raw.wall[n] : null))
  table.last = typeof raw.last === 'number' && Number.isInteger(raw.last) && raw.last >= 0 && raw.last < NAIL_COUNT && table.wall[raw.last] ? raw.last : table.wall.reduce((best, a, n) => (a ? n : best), -1)
  // What stands shown is always the picture of the table as it stands.
  table.finished = base.finished && table.last >= 0 && JSON.stringify(table.wall[table.last]) === JSON.stringify(arrangementOf(table))
  table.painted = raw.painted === true || table.last >= 0
  return table
}
