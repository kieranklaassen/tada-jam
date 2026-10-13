import { BARE_STONE_FROM_AGE } from './config'
import { ALL_MAKINGS, HULL_KINDS, MAKINGS, MAX_DECK, bareBuild, copyBuild, type Build, type HullKind, type Making } from './build'
import { EDDY, LAID_OUT, PLACES, SEAT } from './layout'
import { freeSpot, newPiece, type Piece } from './pieces'
import { deserialize as readBase, isReadable, isRecord, serialize as writeBase, type GameState } from './state'
import { EDDY_IN, MAX_POND, type WorldSave } from './world'

// The saved state: the template's fields (state.ts) and the game's own, which
// are the rows of the table in the design sheet. Everything is read field by
// field: a damaged field takes its default, and whatever the record says,
// each of the twelve makings exists exactly once, on the boat or on the bank,
// and the fields agree with each other.

export type Save = GameState & WorldSave

/** What a first visit finds on the stone: 5 and younger, or no age, the bark hull with the short twig pressed in; 6 and older, a bare stone. */
export function firstBuild(childAge: number | null): Build {
  if (childAge !== null && childAge >= BARE_STONE_FROM_AGE) return bareBuild(null)
  const build = bareBuild('bark')
  build.masts[0] = 'twig'
  return build
}

function usedBy(build: Build): Set<Making> {
  const used = new Set<Making>()
  for (const kind of [build.hull, ...build.masts, ...build.sails, ...build.deck]) if (kind) used.add(kind)
  return used
}

/** Every making that is not on `build`, laid out as on a fresh bank. */
function laidOut(build: Build): WorldSave['loose'] {
  const used = usedBy(build)
  return ALL_MAKINGS.filter((kind) => !used.has(kind)).map((kind) => ({ kind, ...LAID_OUT[kind] }))
}

export function freshSave(childAge: number | null): Save {
  const build = firstBuild(childAge)
  return {
    ...readBase(undefined, childAge), place: 'bank', boat: { ...build, at: 'stone', x: SEAT.x, aboard: false }, loose: laidOut(build),
    journey: { reach: null, stuck: false, done: false }, pond: [],
  }
}

const isMaking = (value: unknown): value is Making => typeof value === 'string' && (ALL_MAKINGS as readonly string[]).includes(value)
const isHull = (value: unknown): value is HullKind => typeof value === 'string' && (HULL_KINDS as readonly string[]).includes(value)

/** A boat in a record: every making at most once, each only where its part may be, no sail without its mast, and nothing on no hull. */
function readBuild(raw: unknown): Build {
  if (!isRecord(raw) || !isHull(raw.hull)) return bareBuild(null)
  const build = bareBuild(raw.hull)
  const seen = new Set<Making>()
  const fresh = (value: unknown, part: string): Making | null => {
    if (!isMaking(value) || seen.has(value) || MAKINGS[value].part !== part) return null
    seen.add(value)
    return value
  }
  const masts = Array.isArray(raw.masts) ? raw.masts : []
  const sails = Array.isArray(raw.sails) ? raw.sails : []
  for (const index of [0, 1] as const) {
    build.masts[index] = fresh(masts[index], 'mast') as Build['masts'][number]
    if (build.masts[index]) build.sails[index] = fresh(sails[index], 'sail') as Build['sails'][number]
  }
  for (const value of Array.isArray(raw.deck) ? raw.deck : []) {
    if (build.deck.length >= MAX_DECK || !isMaking(value) || seen.has(value)) continue
    const part = MAKINGS[value].part
    if (part !== 'load' && part !== 'sail') continue
    seen.add(value)
    build.deck.push(value as Build['deck'][number])
  }
  return build
}

const whole = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null)

/** Where every making that is not on the boat lies: where the record has it when that spot is free, else the nearest free spot, else where a fresh bank has it. */
function readLoose(raw: unknown, build: Build): WorldSave['loose'] {
  const used = usedBy(build)
  const lying: Piece[] = []
  const lay = (kind: Making, x: number, y: number): void => {
    used.add(kind)
    lying.push(newPiece(kind, { on: 'bank', ...freeSpot({ x, y }, kind, null, lying) }))
  }
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!isRecord(item) || !isMaking(item.kind) || used.has(item.kind)) continue
    const x = whole(item.x), y = whole(item.y)
    if (x !== null && y !== null) lay(item.kind, x, y)
  }
  // A making the record lost lies where a fresh bank has it.
  for (const kind of ALL_MAKINGS) if (!used.has(kind)) lay(kind, LAID_OUT[kind].x, LAID_OUT[kind].y)
  return ALL_MAKINGS.flatMap((kind) => lying.filter((piece) => piece.kind === kind).map((piece) => ({ kind, x: piece.x, y: piece.y })))
}

/** Reads what storage handed back. Anything that is not this game's record gives a fresh game for the child's age. */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  if (!isReadable(raw)) return freshSave(childAge)
  const base = readBase(raw, childAge)
  // A record without a readable boat is a first visit's stone, and nothing replays.
  const build = isRecord(raw.boat) ? readBuild(raw.boat) : firstBuild(childAge)
  const boatRaw = isRecord(raw.boat) ? raw.boat : {}
  const pond = (Array.isArray(raw.pond) ? raw.pond : []).map(readBuild).filter((boat) => boat.hull !== null).slice(-MAX_POND)
  const journeyRaw = isRecord(raw.journey) ? raw.journey : {}
  const reachRaw = whole(journeyRaw.reach)
  const last = PLACES.length - 1
  // The fields agree: a finished cycle is a boat at the pond with its lamp lit; a boat on the brook has a place it has come to.
  const finished = base.finished && build.hull !== null
  const place = finished ? 'pond' : build.hull !== null && (raw.place === 'brook' || raw.place === 'pond') ? 'brook' : 'bank'
  if (finished && pond.length === 0) pond.push(copyBuild(build))
  const reach = place === 'bank' ? null : finished ? last : Math.min(last, Math.max(0, reachRaw ?? 0))
  const stuck = place === 'brook' && journeyRaw.stuck === true
  const afloat = place === 'bank' && boatRaw.at === 'eddy' && build.hull !== null
  const x = afloat ? Math.min(EDDY.right, Math.max(EDDY_IN, whole(boatRaw.x) ?? Math.round((EDDY_IN + EDDY.right) / 2))) : SEAT.x
  // A boat is only afloat, on the brook or at the pond with the gnome in it: he climbs aboard as it is lifted.
  const aboard = build.hull !== null && (boatRaw.aboard === true || afloat || place !== 'bank')
  return {
    ...base, finished, place, boat: { ...build, at: afloat || place !== 'bank' ? 'eddy' : 'stone', x: place === 'bank' ? x : EDDY_IN, aboard },
    loose: readLoose(raw.loose, build), journey: { reach, stuck, done: stuck || (place === 'brook' && journeyRaw.done === true) }, pond,
  }
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    place: save.place,
    boat: { ...copyBuild(save.boat), at: save.boat.at, x: Math.round(save.boat.x), aboard: save.boat.aboard },
    loose: save.loose.map((item) => ({ kind: item.kind, x: Math.round(item.x), y: Math.round(item.y) })),
    journey: { reach: save.journey.reach, stuck: save.journey.stuck, done: save.journey.done },
    pond: save.pond.map(copyBuild),
  }
}
