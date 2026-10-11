import { freshYard, type YardSave } from './model'
import { deserialize, isReadable, isRecord, serialize, type GameState } from './state'
import { HOME, LAST_ROW, PLACES, PLACE_IDS, ROUND, START, THINGS, clampToRow, freeSpot, type Loc, type PlaceId, type Spot, type ThingId } from './yard'

// The whole of what goes into ctx.storage: the template's fields (state.ts)
// and the yard. The record is read a second time here for the yard's fields,
// each repaired by itself, as the header of state.ts describes.

export type Save = GameState & YardSave

export function freshSave(childAge: number | null): Save {
  return { ...deserialize(null, childAge), ...freshYard() }
}

const whole = (value: unknown, from: number, to: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= from && value <= to

function readSpot(raw: unknown): Spot | null {
  if (!isRecord(raw) || !whole(raw.row, 0, LAST_ROW) || typeof raw.x !== 'number' || !Number.isFinite(raw.x)) return null
  return { x: clampToRow(raw.row, raw.x), row: raw.row }
}

function readLoc(raw: unknown): Loc | null {
  if (!isRecord(raw)) return null
  if (raw.at === 'paws') return { at: 'paws' }
  if (raw.at === 'floor') {
    const spot = readSpot(raw)
    return spot ? { at: 'floor', x: spot.x, row: spot.row } : null
  }
  return PLACE_IDS.includes(raw.at as PlaceId) ? { at: raw.at as PlaceId } : null
}

/** Reads the things, each by itself. One thing at most is in the paws and one in each place: the first read keeps its spot. */
function readThings(raw: unknown): Record<ThingId, Loc> {
  const record = isRecord(raw) ? raw : {}
  const things = {} as Record<ThingId, Loc>
  const taken = new Set<string>()
  const homeless: ThingId[] = []
  for (const id of THINGS) {
    const loc = readLoc(record[id])
    if (!loc || (loc.at !== 'floor' && taken.has(loc.at))) { homeless.push(id); continue }
    if (loc.at !== 'floor') taken.add(loc.at)
    things[id] = loc
  }
  const lying = (): Spot[] => {
    const spots: Spot[] = []
    for (const other of THINGS) { const loc = things[other]; if (loc && loc.at === 'floor') spots.push({ x: loc.x, row: loc.row }) }
    return spots
  }
  /** Sends a thing to its starting spot on the floor, or to the nearest free spot when another thing lies there. */
  const home = (id: ThingId, start: Spot): void => {
    const spot = freeSpot(start.x, start.row, lying())
    things[id] = { at: 'floor', x: spot.x, row: spot.row }
  }
  for (const id of homeless) {
    const start = START[id]
    if (start.at === 'floor') { home(id, start); continue }
    if (start.at === 'paws') { things[id] = { at: 'floor', x: HOME.x + 70, row: HOME.row }; continue }
    // Its starting spot is a place (the egg's nest): it goes there, and a thing that was read into that place
    // goes to its own starting spot, as the rest of a place that held two would.
    const place = start.at
    const there = THINGS.find((other) => things[other]?.at === place)
    things[id] = { at: place }
    taken.add(place)
    if (there) {
      const own = START[there]
      if (own.at === 'floor') home(there, own)
      else { const stand = PLACES[place].stand; home(there, { x: stand.x + 120, row: stand.row }) }
    }
  }
  return things
}

/** Saved state is untrusted: anything unreadable gives a fresh yard, and inside a record each field is repaired by itself. */
export function deserializeSave(raw: unknown, childAge: number | null): Save {
  const base = deserialize(raw, childAge)
  if (!isReadable(raw)) return { ...base, ...freshYard() }
  const goose = isRecord(raw.goose) && whole(raw.goose.leg, 0, ROUND.length - 1) && typeof raw.goose.along === 'number' && raw.goose.along >= 0 && raw.goose.along <= 1
    ? { leg: raw.goose.leg, along: raw.goose.along }
    : { leg: 0, along: 0 }
  // Open play has no finished cycle, whatever the record says.
  return { ...base, finished: false, raccoon: readSpot(raw.raccoon) ?? { ...HOME }, things: readThings(raw.things), goose }
}

export function serializeSave(state: GameState, yard: YardSave): Save {
  return { ...serialize(state), finished: false, raccoon: yard.raccoon, things: yard.things, goose: yard.goose }
}
