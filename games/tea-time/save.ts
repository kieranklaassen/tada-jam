import { LADDER } from './config'
import { CUP_HOLDS, type CupSize } from './forms'
import { SEAT_COUNT, onCloth } from './layout'
import { FIRST_SEED, partyFor, setTable } from './order'
import { GUEST_IDS, SHOWINGS, type GuestState, type LiftTaste, type Party, type PartyGuest, type Showing } from './party'
import { STATE_VERSION, deserialize, freshState, serialize, type GameState } from './state'
import { CELL_HOLDS, PUDDLE_COLS, PUDDLE_ROWS, holds, type GuestId, type Thing, type ThingKind, type World } from './world'

// Everything that goes into ctx.storage, and how it is read back. state.ts
// keeps the version, the position and whether the sitting has ended; this
// module wraps it, as its top comment says, and adds the table: the seed of
// the designed order, the showings already played, the guests, every thing
// with its tea, the puddles, and the party that waits at the gate.
//
// What is read is untrusted. Each field is repaired by itself and the rest is
// kept, and whatever comes back can be played: someone always sits at the
// table, the table has its pot, and after an ended sitting someone waits.
// Amounts are stored to a thousandth of a cupful and spots to a hundredth of
// a unit, and a read brings them back at that grain.

export type TeaState = GameState & {
  /** The state of the seeded stream in order.ts, as left by the last party laid out. */
  seed: number
  /** The ideas a guest has already shown once. */
  shown: Showing[]
  guests: GuestState[]
  things: Thing[]
  /** Whether the sponge and the bowl have come out of the tray. */
  tools: { sponge: boolean; bowl: boolean }
  /** The tea on the cloth, cell by cell, as in world.ts. */
  puddles: number[]
  /** The next party at the gate after an ended sitting, or null while a sitting is open. */
  waiting: Party | null
}

/** A table never has more things than this: the most the designed order lays is fifteen. */
export const MOST_THINGS = 40

const KINDS: readonly ThingKind[] = ['pot', 'cup', 'saucer', 'spoon', 'sponge', 'bowl']
const SIZES = Object.keys(CUP_HOLDS) as CupSize[]
const TASTES: readonly LiftTaste[] = ['right', 'short', 'over']
const CUPS: readonly PartyGuest['cup'][] = ['own', 'none']
const CELLS = PUDDLE_COLS * PUDDLE_ROWS

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === 'string' && (list as readonly string[]).includes(value)
const between = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value))
/** To a thousandth or a hundredth. The `+ 0` turns a rounded -0 into 0, which is what the stored text reads back as. */
const rounded = (value: number, parts: 100 | 1000): number => Math.round(value * parts) / parts + 0

/** A party seated: left to right in its order, nobody has lifted a cup or drunk. */
const seated = (party: Party): GuestState[] => party.guests.map((guest, seat) => ({ who: guest.who, seat, firstLift: null, content: false }))

/** A first load opens on a guest who is already sitting and wanting tea: the party for the starting position, at a dry table. */
export function freshTeaState(childAge: number | null): TeaState {
  const base = freshState(childAge)
  const laid = partyFor(base.position, FIRST_SEED)
  const world = setTable(laid.party)
  return { ...base, seed: laid.seed, shown: [], guests: seated(laid.party), things: world.things, tools: { sponge: false, bowl: false }, puddles: world.puddles, waiting: null }
}

/** The guests at the table, or null when the list is no use at all. A record of nobody we know, or of a guest already seated, is left out. */
function readGuests(raw: unknown): GuestState[] | null {
  if (!Array.isArray(raw) || raw.length > SEAT_COUNT) return null
  const guests: GuestState[] = []
  for (const item of raw) {
    if (!isRecord(item) || !oneOf(GUEST_IDS, item.who) || guests.some((guest) => guest.who === item.who)) continue
    guests.push({ who: item.who, seat: isNumber(item.seat) ? item.seat : -1, firstLift: oneOf(TASTES, item.firstLift) ? item.firstLift : null, content: item.content === true })
  }
  if (guests.length === 0) return null
  // Seats that are 0 to n - 1, each taken once, are as the child left them. Anything else is numbered again in the order of the list.
  const taken = new Set(guests.map((guest) => guest.seat))
  const whole = taken.size === guests.length && guests.every((guest) => Number.isInteger(guest.seat) && guest.seat >= 0 && guest.seat < guests.length)
  if (!whole) guests.forEach((guest, index) => (guest.seat = index))
  return guests
}

/**
 * The things on the table, or null when the list is no use at all: not a
 * list, longer than a table can be, or without a pot. A record that cannot be
 * a thing (no id, an id already used, an unknown kind or size, no spot, a
 * second pot) is left out. Every other field takes its default by itself.
 */
function readThings(raw: unknown, guests: readonly GuestState[]): Thing[] | null {
  if (!Array.isArray(raw) || raw.length > MOST_THINGS) return null
  const atTable = guests.map((guest) => guest.who)
  const things: Thing[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id === '' || things.some((thing) => thing.id === item.id)) continue
    if (!oneOf(KINDS, item.kind) || !oneOf(SIZES, item.size) || !isNumber(item.x) || !isNumber(item.z)) continue
    if (item.kind === 'pot' && things.some((thing) => thing.kind === 'pot')) continue
    const spot = onCloth({ x: item.x, z: item.z })
    const thing: Thing = {
      id: item.id,
      kind: item.kind,
      size: item.size,
      ring: isNumber(item.ring) && item.ring >= 0 && item.ring <= 1 ? item.ring : null,
      owner: oneOf(GUEST_IDS, item.owner) ? item.owner : null,
      x: rounded(spot.x, 100),
      z: rounded(spot.z, 100),
      on: typeof item.on === 'string' && item.on !== item.id ? item.on : null,
      // Only a guest who is at the table can hold a cup in the air.
      heldBy: oneOf(atTable, item.heldBy) ? item.heldBy : null,
      tea: 0,
    }
    // The pot is where tea comes from: it has no amount of its own.
    if (thing.kind !== 'pot' && isNumber(item.tea)) thing.tea = rounded(between(item.tea, 0, holds(thing)), 1000)
    things.push(thing)
  }
  if (!things.some((thing) => thing.kind === 'pot')) return null
  const under = (id: string | null): Thing | undefined => things.find((thing) => thing.id === id)
  for (const thing of things) {
    if (thing.on !== null && !under(thing.on)) thing.on = null
    // A thing that stands on a ring of things which comes back to itself stands on the cloth instead.
    let below = under(thing.on), steps = 0
    while (below && below !== thing && steps++ < things.length) below = under(below.on)
    if (below === thing) thing.on = null
  }
  return things
}

/** A dry cloth, unless the stored grid is whole. */
function readPuddles(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length !== CELLS || !raw.every(isNumber)) return new Array<number>(CELLS).fill(0)
  return raw.map((amount: number) => rounded(between(amount, 0, CELL_HOLDS), 1000))
}

/** The party at the gate, or null for anything that is not a whole party: here nothing is mended, since a new one can always be laid out. */
function readParty(raw: unknown): Party | null {
  if (!isRecord(raw) || !Array.isArray(raw.guests) || !Array.isArray(raw.trayCups) || typeof raw.laysOwnPlace !== 'boolean') return null
  if (raw.guests.length < 1 || raw.guests.length > SEAT_COUNT || raw.trayCups.length > SEAT_COUNT) return null
  if (!raw.trayCups.every((size) => oneOf(SIZES, size))) return null
  const guests: PartyGuest[] = []
  for (const item of raw.guests) {
    if (!isRecord(item) || !oneOf(GUEST_IDS, item.who) || !oneOf(CUPS, item.cup) || guests.some((guest) => guest.who === item.who)) return null
    guests.push({ who: item.who, cup: item.cup })
  }
  return { guests, trayCups: [...raw.trayCups], laysOwnPlace: raw.laysOwnPlace }
}

/**
 * Saved state is untrusted. Anything that is not this game's record, and a
 * version above this one, gives a fresh state. Inside a record each field is
 * repaired by itself. The guests and the things are one table: when either
 * list is no use at all, a new party for the stored position sits down to a
 * newly set table, and its sitting is open. After an ended sitting a party
 * always waits; while a sitting is open nobody does.
 */
export function deserializeTea(raw: unknown, childAge: number | null): TeaState {
  // The same test as state.ts makes, so that a fresh start also seats a party.
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshTeaState(childAge)
  const base = deserialize(raw, childAge)
  let finished = base.finished
  let seed = isNumber(raw.seed) && Number.isInteger(raw.seed) && raw.seed !== 0 ? raw.seed : FIRST_SEED
  const stored: unknown[] = Array.isArray(raw.shown) ? raw.shown : []
  const shown = SHOWINGS.filter((id) => stored.includes(id)).sort((a, b) => stored.indexOf(a) - stored.indexOf(b))

  let guests = readGuests(raw.guests)
  let things = guests && readThings(raw.things, guests)
  if (!guests || !things) {
    const laid = partyFor(base.position, seed)
    seed = laid.seed
    finished = false
    guests = seated(laid.party)
    things = setTable(laid.party).things
  }

  let waiting = finished ? readParty(raw.waiting) : null
  if (finished && !waiting) {
    const laid = partyFor(base.position, seed)
    seed = laid.seed
    waiting = laid.party
  }
  const tools: Record<string, unknown> = isRecord(raw.tools) ? raw.tools : {}
  return { v: base.v, position: base.position, finished, seed, shown, guests, things, tools: { sponge: tools.sponge === true, bowl: tools.bowl === true }, puddles: readPuddles(raw.puddles), waiting }
}

/** A copy that shares nothing with the state it was made from, with these keys and no others. `grain` rounds amounts and spots as they are stored. */
function copyOf(state: TeaState, grain: boolean): TeaState {
  const amount = (value: number) => (grain ? rounded(value, 1000) : value)
  const along = (value: number) => (grain ? rounded(value, 100) : value)
  return {
    ...serialize(state),
    seed: state.seed,
    shown: [...state.shown],
    guests: state.guests.map((guest) => ({ who: guest.who, seat: guest.seat, firstLift: guest.firstLift, content: guest.content })),
    things: state.things.map((thing) => ({
      id: thing.id, kind: thing.kind, size: thing.size, ring: thing.ring, owner: thing.owner,
      x: along(thing.x), z: along(thing.z), on: thing.on, heldBy: thing.heldBy,
      tea: grain && thing.kind === 'pot' ? 0 : amount(thing.tea),
    })),
    tools: { sponge: state.tools.sponge, bowl: state.tools.bowl },
    puddles: state.puddles.map(amount),
    waiting: state.waiting && {
      guests: state.waiting.guests.map((guest) => ({ who: guest.who, cup: guest.cup })),
      trayCups: [...state.waiting.trayCups],
      laysOwnPlace: state.waiting.laysOwnPlace,
    },
  }
}

/** What is handed to storage: a plain copy, amounts to a thousandth, spots to a hundredth, and no tea noted for the pot. */
export function serializeTea(state: TeaState): TeaState {
  return copyOf(state, true)
}

/** The world of world.ts as the state holds it. A copy: the rules change the world they are given, and the state is not touched until `withWorld`. */
export function worldOf(state: TeaState): World {
  const { things, puddles } = copyOf(state, false)
  return { things, puddles }
}

/** The state with a world put back into it, again as a copy. */
export function withWorld(state: TeaState, world: World): TeaState {
  return copyOf({ ...state, things: world.things, puddles: world.puddles }, false)
}

/**
 * The largest state the game can write, for the test that holds it under half
 * of the storage cap: four guests, as many things as a table may have, each
 * with every field at its longest, a cloth with every cell full, every
 * showing shown, and a party of four with four cups waiting.
 */
export function largestState(): TeaState {
  const who: GuestId[] = ['duckling-a', 'duckling-b', 'mouse', 'bear']
  // Ids as long as `cup-duckling-a`, the longest a table has.
  const id = (index: number) => `cup-plain-${String(index).padStart(4, '0')}`
  const things: Thing[] = [{ id: id(0), kind: 'pot', size: 'thimble', ring: 0.94, owner: 'duckling-a', x: -6.29, z: -2.69, on: null, heldBy: 'duckling-b', tea: 0 }]
  for (let index = 1; index < MOST_THINGS; index++) things.push({ ...things[0], id: id(index), kind: 'sponge', on: id(index - 1), tea: 0.299 })
  return {
    v: STATE_VERSION,
    position: [...LADDER].sort((a, b) => b.length - a.length)[0],
    finished: true,
    seed: 0xffffffff,
    shown: [...SHOWINGS],
    guests: who.map((guest, seat) => ({ who: guest, seat, firstLift: 'short', content: false })),
    things,
    tools: { sponge: false, bowl: false },
    puddles: new Array<number>(CELLS).fill(CELL_HOLDS),
    waiting: { guests: who.map((guest) => ({ who: guest, cup: 'none' })), trayCups: ['thimble', 'thimble', 'thimble', 'thimble'], laysOwnPlace: false },
  }
}
