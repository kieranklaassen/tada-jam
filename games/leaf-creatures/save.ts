import { BEDS, EARTH, EARTH_MARGIN, GROUND, HOLLOW, inEllipse, ontoGround } from './clearing'
import { MAX_CAPS, MAX_CREATURES, MAX_LOOSE, MAX_PARTS, MAX_REACH, STARTER_UP_TO_AGE } from './config'
import { SHAPES, isKind, type Kind } from './parts'
import { makeRng } from './rng'
import { deserialize, isReadable, isRecord, serialize, type GameState } from './state'

// What the clearing keeps in ctx.storage, round the template's own three
// fields (state.ts): the things that lie on the earth, the creatures where
// they stand, and the three buried acorns. It is plain JSON in whole stage
// units and whole degrees, read back field by field, so a damaged thing is
// dropped and the rest of the clearing is kept.

export type SavedPart = { kind: Kind; x: number; y: number; turn: number }

export type SavedThing = {
  id: number
  x: number
  y: number
  /** Whole degrees it is turned from the way it was laid. */
  turn: number
  awake: boolean
  woke: number
  drowsy: boolean
  bedded: boolean
  parts: SavedPart[]
}

export type SavedAcorn = { x: number; y: number; dug: boolean }

export type Saved = GameState & {
  /** The number the clearing was first laid out from: it fixes where the acorns were buried. */
  seed: number
  things: SavedThing[]
  acorns: SavedAcorn[]
  /** The id of the thing never woken that the child last added to, or 0: where a tapped part goes next. */
  focus: number
  /** The creature that walked off last and waits behind the trees, with the edge it left by (-1 left, 1 right), or null. */
  waiting: { side: -1 | 1; thing: SavedThing } | null
}

export const ACORNS = 3

/**
 * The thing a youngest child finds begun on a first visit: a round leaf for a body, one twig out to the side by its
 * end like a tail, and one cap on the leaf that wants a second. It is laid as taps on the heaps would lay it
 * (placing.ts), which a test holds.
 */
function starter(): SavedThing {
  return {
    id: 1, x: EARTH.x - 6, y: EARTH.y + 4, turn: 0, awake: false, woke: 0, drowsy: false, bedded: false,
    parts: [
      { kind: 'round', x: -13, y: -7, turn: 0 },
      { kind: 'twig', x: 66, y: 14, turn: 23 },
      { kind: 'cap', x: -53, y: -7, turn: 0 },
    ],
  }
}

/** Where the three acorns were buried in a clearing laid out from `seed`: one in each third of the ground, clear of the rim. */
export function buried(seed: number): SavedAcorn[] {
  const rng = makeRng(seed ^ 0x51ed)
  return Array.from({ length: ACORNS }, (_, i) => {
    const angle = ((i + 0.2 + rng.next() * 0.6) / ACORNS) * Math.PI * 2, reach = 0.5 + rng.next() * 0.3
    return { x: Math.round(GROUND.x + Math.cos(angle) * GROUND.rx * reach), y: Math.round(GROUND.y + Math.sin(angle) * GROUND.ry * reach), dug: false }
  })
}

export function fresh(childAge: number | null, seed: number): Saved {
  const base = deserialize(null, childAge)
  const youngest = childAge === null || childAge <= STARTER_UP_TO_AGE
  return { ...base, seed: seed >>> 0, things: youngest ? [starter()] : [], acorns: buried(seed >>> 0), focus: 0, waiting: null }
}

/** The nearest point of the earth to a point off it. */
function ontoRim(x: number, y: number): { x: number; y: number } {
  const dx = (x - EARTH.x) / EARTH.rx, dy = (y - EARTH.y) / EARTH.ry, d = Math.hypot(dx, dy) || 1
  return { x: EARTH.x + (dx / d) * EARTH.rx, y: EARTH.y + (dy / d) * EARTH.ry }
}

const whole = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function readPart(raw: unknown): SavedPart | null {
  if (!isRecord(raw) || !isKind(raw.kind) || !whole(raw.x) || !whole(raw.y) || !whole(raw.turn)) return null
  // No part lies further from its thing's middle than a thing may reach: one that is said to is kept, and brought in.
  const far = Math.hypot(raw.x, raw.y), most = MAX_REACH - SHAPES[raw.kind].half - SHAPES[raw.kind].r, by = far > most ? most / far : 1
  return { kind: raw.kind, x: Math.round(raw.x * by), y: Math.round(raw.y * by), turn: Math.round(raw.turn) % 360 }
}

function readThing(raw: unknown, taken: Set<number>): SavedThing | null {
  if (!isRecord(raw) || !whole(raw.id) || !Number.isInteger(raw.id) || raw.id < 1 || taken.has(raw.id)) return null
  if (!whole(raw.x) || !whole(raw.y) || !Array.isArray(raw.parts)) return null
  const parts: SavedPart[] = []
  let caps = 0, others = 0
  for (const entry of raw.parts) {
    const part = readPart(entry)
    if (!part) continue
    // More than a thing may carry is not read back.
    if (part.kind === 'cap' ? caps >= MAX_CAPS : others >= MAX_PARTS) continue
    if (part.kind === 'cap') caps++
    else others++
    parts.push(part)
  }
  if (parts.length === 0) return null
  // Two caps make a creature, whatever the record says: the two can never disagree.
  const awake = caps >= 2, bedded = awake && raw.bedded === true
  // Everything is found where it was left. The game keeps each thing where it may lie at the time (a sleeper in
  // its bed, a creature on the ground or on its way back from the fern, a thing never woken on the earth), so
  // only a record that says otherwise is brought in here, to the nearest place of its kind.
  const rx = raw.x, ry = raw.y
  let at = { x: rx, y: ry }
  const bed = BEDS.reduce((best, one) => (Math.hypot(one.x - rx, one.y - ry) < Math.hypot(best.x - rx, best.y - ry) ? one : best))
  const byBed = Math.hypot(bed.x - rx, bed.y - ry)
  if (bedded) { if (byBed > 2) at = { x: bed.x, y: bed.y } }
  else if (awake) { if (!inEllipse(rx, ry, GROUND) && !inEllipse(rx, ry, HOLLOW)) at = ontoGround(rx, ry) }
  else if (!inEllipse(rx, ry, EARTH, EARTH_MARGIN + 2)) at = ontoRim(rx, ry)
  taken.add(raw.id)
  return {
    id: raw.id, x: Math.round(at.x), y: Math.round(at.y), turn: whole(raw.turn) ? Math.round(raw.turn) % 360 : 0, awake,
    woke: awake && whole(raw.woke) && raw.woke >= 1 ? Math.floor(raw.woke) : 0,
    drowsy: awake && raw.drowsy === true, bedded, parts,
  }
}

function readAcorns(raw: unknown, seed: number): SavedAcorn[] {
  const laid = buried(seed)
  if (!Array.isArray(raw) || raw.length !== ACORNS) return laid
  return laid.map((acorn, i) => {
    const entry: unknown = raw[i]
    if (!isRecord(entry) || !whole(entry.x) || !whole(entry.y) || !inEllipse(entry.x, entry.y, GROUND, 30)) return acorn
    return { x: Math.round(entry.x), y: Math.round(entry.y), dug: entry.dug === true }
  })
}

/**
 * Reads a slot. Anything that is not this game's record gives a fresh
 * clearing for the age; inside a record each field is repaired by itself.
 * `seed` is the seed of this visit, used only when the record holds none.
 */
export function read(raw: unknown, childAge: number | null, seed: number): Saved {
  if (!isReadable(raw)) return fresh(childAge, seed)
  const base = deserialize(raw, childAge)
  const kept = whole(raw.seed) && raw.seed >= 0 ? Math.floor(raw.seed) >>> 0 : seed >>> 0
  const taken = new Set<number>()
  let things: SavedThing[] = []
  if (Array.isArray(raw.things)) for (const entry of raw.things) { const thing = readThing(entry, taken); if (thing) things.push(thing) }
  // A creature with no place in the order of waking takes the next one.
  let order = things.reduce((most, thing) => Math.max(most, thing.woke), 0)
  for (const thing of things) if (thing.awake && thing.woke === 0) thing.woke = ++order
  // More creatures than the clearing holds: the ones woken last stay.
  const creatures = things.filter((thing) => thing.awake).sort((a, b) => b.woke - a.woke)
  const over = creatures.slice(MAX_CREATURES)
  const gone = new Set(over.map((thing) => thing.id))
  things = things.filter((thing) => !gone.has(thing.id))
  // More loose parts than may lie about: the things begun first go.
  let loose = things.reduce((sum, thing) => sum + (thing.awake ? 0 : thing.parts.length), 0)
  things = things.filter((thing) => {
    if (thing.awake || loose <= MAX_LOOSE) return true
    loose -= thing.parts.length
    return false
  })
  // The thing being made: one that is there and was never woken, or none.
  const focus = whole(raw.focus) && things.some((thing) => thing.id === raw.focus && !thing.awake) ? raw.focus : 0
  // The one that waits behind the trees: a creature with an id of its own, or nobody.
  let waiting: Saved['waiting'] = null
  if (isRecord(raw.waiting)) {
    const thing = readThing(raw.waiting.thing, taken)
    if (thing && thing.awake) waiting = { side: raw.waiting.side === 1 ? 1 : -1, thing: { ...thing, bedded: false, drowsy: false } }
  }
  // A record with more creatures than the clearing holds and nobody waiting: the one that went last waits, at the
  // edge nearer to it, as it would have in the game. (The game itself never writes such a record.)
  if (!waiting && over.length > 0) waiting = { side: over[0].x >= GROUND.x ? 1 : -1, thing: { ...over[0], bedded: false, drowsy: false } }
  // No cycle ends in open play, so `finished` is false whatever the record says.
  return { ...base, finished: false, seed: kept, things, acorns: readAcorns(raw.acorns, kept), focus, waiting }
}

function one(thing: SavedThing): SavedThing {
  return {
    id: thing.id, x: Math.round(thing.x), y: Math.round(thing.y), turn: Math.round(thing.turn), awake: thing.awake, woke: thing.woke, drowsy: thing.drowsy, bedded: thing.bedded,
    parts: thing.parts.map((part) => ({ kind: part.kind, x: Math.round(part.x), y: Math.round(part.y), turn: Math.round(part.turn) })),
  }
}

export function write(saved: Saved): Saved {
  return {
    ...serialize(saved),
    seed: saved.seed,
    things: saved.things.map(one),
    acorns: saved.acorns.map((acorn) => ({ x: Math.round(acorn.x), y: Math.round(acorn.y), dug: acorn.dug })),
    focus: saved.focus,
    waiting: saved.waiting ? { side: saved.waiting.side, thing: one(saved.waiting.thing) } : null,
  }
}
