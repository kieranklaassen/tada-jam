import { AUTUMN_FROM_AGE } from './config'
import { deserialize as readBase, isReadable, serialize as writeBase, type GameState } from './state'
import { PLACES, THINGS, isPlace, isSeason, isThing, type PlaceId, type Season, type ThingId } from './wood'

// The wrapper round state.ts, as its header describes: the template's fields
// are read by `deserialize` there, and the wood's own fields are read from
// the same raw record a second time, each repaired by itself.

/** Where a thing is. */
export type Where =
  | { at: 'home' }
  | { at: 'path'; x: number; y: number }
  | { at: 'stone' }
  | { at: 'puddle' }
  | { at: 'nest' }
  | { at: 'hedgehog' }
  | { at: 'table'; x: number; y: number }
  | { at: 'bowl' }

/** Where the toad sits. */
export type ToadAt =
  | { at: 'stone' }
  | { at: 'seat'; place: PlaceId }
  | { at: 'path'; x: number; y: number }
  | { at: 'foot' }
  | { at: 'table'; x: number; y: number }

export type World = {
  season: Season
  /** The places whose covers stand open, in the order of `PLACES`, each once. */
  open: PlaceId[]
  /** Whether the hedgehog is rolled up. */
  rolled: boolean
  things: Record<ThingId, Where>
  /** The things that are wet, in the order of `THINGS`, each once. */
  wet: ThingId[]
  /** Whether the snail has eaten its hole in the apple. */
  bitten: boolean
  toad: ToadAt
}

export type Saved = GameState & World

/** The season a first visit opens in: autumn from five, spring for a younger child or no age. A saved season wins. */
export function firstSeason(childAge: number | null): Season {
  return childAge !== null && childAge >= AUTUMN_FROM_AGE ? 'autumn' : 'spring'
}

const allHome = (): Record<ThingId, Where> => ({ worm: { at: 'home' }, snail: { at: 'home' }, feather: { at: 'home' }, acorn: { at: 'home' }, button: { at: 'home' }, apple: { at: 'home' } })

export function freshWorld(childAge: number | null): World {
  return { season: firstSeason(childAge), open: [], rolled: false, things: allHome(), wet: [], bitten: false, toad: { at: 'stone' } }
}

export function freshSaved(childAge: number | null): Saved {
  return { ...readBase(null, childAge), ...freshWorld(childAge) }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
/** A coordinate a save may hold: a finite number within a frame and a half of the stage. */
const isCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > -2000 && value < 4000

function readWhere(raw: unknown, thing: ThingId): Where {
  if (!isRecord(raw)) return { at: 'home' }
  switch (raw.at) {
    case 'stone': case 'puddle': case 'nest': case 'bowl': return { at: raw.at }
    // Only the apple is worn.
    case 'hedgehog': return thing === 'apple' ? { at: 'hedgehog' } : { at: 'home' }
    case 'path': case 'table': return isCoordinate(raw.x) && isCoordinate(raw.y) ? { at: raw.at, x: raw.x, y: raw.y } : { at: 'home' }
    default: return { at: 'home' }
  }
}

function readToad(raw: unknown): ToadAt {
  if (!isRecord(raw)) return { at: 'stone' }
  switch (raw.at) {
    case 'foot': return { at: 'foot' }
    case 'seat': return isPlace(raw.place) ? { at: 'seat', place: raw.place } : { at: 'stone' }
    case 'path': case 'table': return isCoordinate(raw.x) && isCoordinate(raw.y) ? { at: raw.at, x: raw.x, y: raw.y } : { at: 'stone' }
    default: return { at: 'stone' }
  }
}

/** Only one thing lies on the stone, in the puddle, in the bowl: a second one a damaged save puts there goes home. */
function oneEach(things: Record<ThingId, Where>): Record<ThingId, Where> {
  const taken = new Set<string>()
  for (const thing of THINGS) {
    const at = things[thing].at
    if (at !== 'stone' && at !== 'puddle' && at !== 'bowl') continue
    if (taken.has(at)) things[thing] = { at: 'home' }
    taken.add(at)
  }
  return things
}

/** Saved state is untrusted: anything unreadable gives a first visit, and inside a record each field is repaired by itself. */
export function deserialize(raw: unknown, childAge: number | null = null): Saved {
  if (!isReadable(raw)) return freshSaved(childAge)
  const base = readBase(raw, childAge)
  const listed = Array.isArray(raw.open) ? raw.open.filter(isPlace) : []
  const wet = Array.isArray(raw.wet) ? raw.wet.filter(isThing) : []
  const held = isRecord(raw.things) ? raw.things : {}
  const things = allHome()
  for (const thing of THINGS) things[thing] = readWhere(held[thing], thing)
  return {
    ...base,
    season: isSeason(raw.season) ? raw.season : firstSeason(childAge),
    open: PLACES.filter((place) => listed.includes(place)),
    rolled: raw.rolled === true,
    things: oneEach(things),
    wet: THINGS.filter((thing) => wet.includes(thing)),
    bitten: raw.bitten === true,
    toad: readToad(raw.toad),
  }
}

export function serialize(state: Saved): Saved {
  const things = allHome()
  for (const thing of THINGS) things[thing] = { ...state.things[thing] }
  return {
    ...writeBase(state), season: state.season, open: PLACES.filter((place) => state.open.includes(place)), rolled: state.rolled,
    things, wet: THINGS.filter((thing) => state.wet.includes(thing)), bitten: state.bitten, toad: { ...state.toad },
  }
}
