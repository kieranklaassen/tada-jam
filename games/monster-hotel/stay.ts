import { THING_KINDS, type Arrangement, type Dial, type GuestAt, type ThingAt, type ThingKind } from './arrangement'
import { castById, castsAt, startOf, type Cast } from './casts'
import { LADDER, MOST_MOVES, ROUNDS } from './config'
import { isGuestId, type GuestId, type Phase } from './guests'
import { anyEdgeById, bedsIn, roomCount } from './hotel'
import { deserialize as readPlace, freshState, serialize as writePlace, type GameState } from './state'

// What is saved: the template's three fields (state.ts) and the house as the
// child left it. It wraps state.ts as that file asks: `readStay` calls its
// `deserialize` for the place in the designed order, then reads the same raw
// record again for the fields below, each repaired by itself, so an old or
// damaged slot never stops the game from opening and never loses more than
// the field that was damaged.
//
// Found as left: the same guests in the same rooms at the same hour, the page
// drawn from the same place. A guest or a thing in the hand is saved where it
// came from. The marks of noise, warmth and smell, every mood and the hour's
// goings-on are worked out from these fields and never stored.

export type KitEntry = { at: ThingAt; dial: Dial }

export type Stay = GameState & {
  /** The cast on screen, by its id in casts.ts. */
  cast: string
  /** Coach-loads begun, wrapped at ROUNDS. It only rotates the casts of a place. */
  round: number
  /** Where each guest of the cast is. */
  at: Record<string, GuestAt>
  /** Where each thing of the cast is, and the dial of the stove and the ice box. */
  kit: Record<string, KitEntry>
  /** Day or night, as the wheel was left. */
  phase: Phase
  /** The guest whose place the page is drawn from, or none. */
  from: GuestId | null
  /** Set-downs of this cycle that changed the arrangement. Kept only to judge the cycle; shown nowhere. */
  moves: number
  /** The places whose neat way the porter has already shown. */
  shown: string[]
}

/** The cast a place starts with on a given round. A place with no cast written yet falls back to the first cast there is. */
export function castFor(position: string, round: number): Cast {
  const casts = castsAt(position)
  const pool = casts.length > 0 ? casts : castsAt(LADDER[0])
  return pool[((round % pool.length) + pool.length) % pool.length]
}

function laidOut(cast: Cast): Pick<Stay, 'cast' | 'at' | 'kit'> {
  const start = startOf(cast)
  return {
    cast: cast.id,
    at: Object.fromEntries(start.guests.map((guest) => [guest.id, guest.at])),
    kit: Object.fromEntries(start.things.map((item) => [item.kind, { at: item.at, dial: item.dial }])),
  }
}

/** A first visit: the first coach-load of the starting place already stands in the lobby, by day, with nothing touched. */
export function freshStay(childAge: number | null): Stay {
  const place = freshState(childAge)
  return { ...place, ...laidOut(castFor(place.position, 0)), round: 0, phase: 'day', from: null, moves: 0, shown: [] }
}

/** The stay with a new coach-load laid out for its place: guests in the lobby, things in the cupboard, no moves yet. */
export function withCast(stay: Stay, cast: Cast): Stay {
  return { ...stay, ...laidOut(cast), from: null, moves: 0 }
}

/** The arrangement the stay holds, with its house from the cast. */
export function arrangementOf(stay: Stay): Arrangement {
  const cast = castById(stay.cast) ?? castFor(stay.position, stay.round)
  const start = startOf(cast)
  return {
    ...start,
    guests: start.guests.map((guest) => ({ id: guest.id, at: stay.at[guest.id] ?? guest.at })),
    things: start.things.map((item) => ({ kind: item.kind, at: stay.kit[item.kind]?.at ?? item.at, dial: stay.kit[item.kind]?.dial ?? item.dial })),
    phase: stay.phase,
  }
}

/** The stay with a changed arrangement put back into it. */
export function withArrangement(stay: Stay, arrangement: Arrangement): Stay {
  return {
    ...stay,
    at: Object.fromEntries(arrangement.guests.map((guest) => [guest.id, guest.at])),
    kit: Object.fromEntries(arrangement.things.map((item) => [item.kind, { at: item.at, dial: item.dial }])),
    phase: arrangement.phase,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isWhole = (value: unknown, least: number, most: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= least && value <= most

/** Each guest's saved place if it is one this cast allows, and the lobby (or the bench, for the bench guest) if not. No room is given more guests than it has beds. */
function readPlaces(raw: unknown, cast: Cast): Record<string, GuestAt> {
  const record = isRecord(raw) ? raw : {}
  const rooms = roomCount(cast.house.shape)
  const taken = new Array<number>(rooms).fill(0)
  const places: Record<string, GuestAt> = {}
  for (const id of [...cast.guests, cast.bench]) {
    const fallback: GuestAt = id === cast.bench ? 'bench' : 'lobby'
    const saved = record[id]
    let at: GuestAt = fallback
    if (saved === 'lobby' || saved === 'gone' || (saved === 'bench' && id === cast.bench)) at = saved
    else if (isWhole(saved, 0, rooms - 1) && taken[saved] < bedsIn(cast.house, saved)) {
      taken[saved]++
      at = saved
    }
    places[id] = at
  }
  return places
}

/** A thing's saved place if the house has it and the thing can be there, and the cupboard if not. */
function readThingAt(raw: unknown, kind: ThingKind, cast: Cast, places: Record<string, GuestAt>): ThingAt {
  if (!isRecord(raw)) return 'cupboard'
  if (isWhole(raw.room, 0, roomCount(cast.house.shape) - 1)) return { room: raw.room }
  if (kind === 'stove' || kind === 'ice') return 'cupboard'
  if (typeof raw.edge === 'string' && anyEdgeById(cast.house.shape, raw.edge)) return { edge: raw.edge }
  // Only a guest who has a room holds a thing.
  if (isGuestId(raw.guest) && typeof places[raw.guest] === 'number') return { guest: raw.guest }
  return 'cupboard'
}

function readKit(raw: unknown, cast: Cast, places: Record<string, GuestAt>): Record<string, KitEntry> {
  const record = isRecord(raw) ? raw : {}
  const kit: Record<string, KitEntry> = {}
  for (const kind of THING_KINDS) {
    if (!cast.kit.includes(kind)) continue
    const saved = isRecord(record[kind]) ? (record[kind] as Record<string, unknown>) : {}
    kit[kind] = { at: readThingAt(saved.at, kind, cast, places), dial: isWhole(saved.dial, 1, 3) ? (saved.dial as Dial) : 1 }
  }
  return kit
}

/**
 * Saved state is untrusted. The place in the designed order is read by the
 * template; then each field of the house is repaired by itself. A cast the
 * game no longer knows cannot be laid out, so the first cast of the saved
 * place is laid out fresh, unfinished, with the place kept.
 */
export function readStay(raw: unknown, childAge: number | null = null): Stay {
  const place = readPlace(raw, childAge)
  if (!isRecord(raw) || raw.v !== place.v) return freshStay(childAge)
  const round = isWhole(raw.round, 0, ROUNDS - 1) ? raw.round : 0
  const shown = Array.isArray(raw.shown) ? LADDER.filter((id) => (raw.shown as unknown[]).includes(id)) : []
  const phase: Phase = raw.phase === 'night' ? 'night' : 'day'
  const cast = typeof raw.cast === 'string' ? castById(raw.cast) : null
  if (!cast) return { ...place, finished: false, ...laidOut(castFor(place.position, round)), round, phase, from: null, moves: 0, shown }
  const at = readPlaces(raw.at, cast)
  const from = isGuestId(raw.from) && raw.from in at && at[raw.from] !== 'gone' ? raw.from : null
  return { ...place, cast: cast.id, round, at, kit: readKit(raw.kit, cast, at), phase, from, moves: isWhole(raw.moves, 0, MOST_MOVES) ? raw.moves : 0, shown }
}

/** Exactly the saved fields, as plain JSON. */
export function writeStay(stay: Stay): Stay {
  return {
    ...writePlace(stay),
    cast: stay.cast,
    round: stay.round,
    at: { ...stay.at },
    // Only the stove and the ice box have a dial: nothing is written for the others.
    kit: Object.fromEntries(Object.entries(stay.kit).map(([kind, entry]) => { const at = typeof entry.at === 'object' ? { ...entry.at } : entry.at; return [kind, kind === 'stove' || kind === 'ice' ? { at, dial: entry.dial } : { at }] })) as Stay['kit'],
    phase: stay.phase,
    from: stay.from,
    moves: stay.moves,
    shown: [...stay.shown],
  }
}
