import { LADDER } from './config'
import { CHALK_COUNT, MAX_MARK_POINTS, addMark, type Mark } from './marks'
import { deserialize as readBase, serialize as writeBase, STATE_VERSION } from './state'
import { FEELS, FELT_CAP, isRiderKind, noFeels, type Felt } from './tastes'
import { MAX_RIDERS, NONE, SEATS, WHERES, busyPlaces, ensureNext, freshWorld, inPlay, stepIn, type Rider, type Train, type Where, type World } from './world'
import { ENGINE_START, isPlaceId, onTar, type Pt } from './yard'

// The saved world: small plain JSON, versioned, and read defensively. The
// position, the version and the finished mark are the template's (state.ts)
// and are read by it; the rest is read here from the same record, each field
// repaired by itself, so one damaged field costs only that field.

/** A mark is saved as its colour and its points in one flat run: x, y, x, y. */
type SavedMark = { c: number; p: number[] }
/** A rider is saved under short keys; `f` is its tally of feels in the order of `FEELS`. */
type SavedRider = { k: string; s: string; h: string; a: string; c: number; t: number; f: number[] }

export type Saved = {
  v: number
  position: string
  finished: boolean
  seed: number
  marks: SavedMark[]
  chalk: number
  train: { x: number; y: number; f: number; s: number; t: number }
  water: number
  riders: SavedRider[]
  ahead: string
  shown: boolean
}

/** No trip is longer than this, so a damaged number cannot grow without end. */
const TRIP_CAP = 99999

export function serialize(world: World): Saved {
  return {
    ...writeBase(world),
    seed: world.seed >>> 0,
    marks: world.marks.map((m) => ({ c: m.c, p: m.p.flatMap((q) => [Math.round(q.x), Math.round(q.y)]) })),
    chalk: world.chalk,
    train: { x: Math.round(world.train.x), y: Math.round(world.train.y), f: world.train.face, s: world.train.stripes, t: world.train.tint },
    water: world.water,
    riders: world.riders.map((r) => ({ k: r.kind, s: r.stop, h: r.home, a: r.at, c: Math.min(TRIP_CAP, Math.round(r.chalk)), t: Math.min(TRIP_CAP, Math.round(r.tar)), f: FEELS.map((f) => r.felt[f]) })),
    ahead: world.ahead,
    shown: world.shown,
  }
}

const whole = (value: unknown, lo: number, hi: number): number | null => (typeof value === 'number' && Number.isInteger(value) && value >= lo && value <= hi ? value : null)
const amount = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(TRIP_CAP, value) : 0)
const record = (value: unknown): Record<string, unknown> | null => (typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null)
const colour = (value: unknown): number => whole(value, NONE, CHALK_COUNT - 1) ?? NONE

function readMarks(value: unknown): Mark[] {
  if (!Array.isArray(value)) return []
  let marks: Mark[] = []
  for (const item of value) {
    const m = record(item)
    if (!m || !Array.isArray(m.p) || m.p.length < 2 || m.p.length % 2 !== 0) continue
    if (!m.p.every((n) => typeof n === 'number' && Number.isFinite(n))) continue
    const p: Pt[] = []
    for (let i = 0; i < m.p.length && p.length < MAX_MARK_POINTS; i += 2) {
      const at = onTar({ x: m.p[i] as number, y: m.p[i + 1] as number })
      p.push({ x: Math.round(at.x), y: Math.round(at.y) })
    }
    // Laid one by one, so the caps on the chalk the tar holds are kept whatever the record says.
    marks = addMark(marks, { c: whole(m.c, 0, CHALK_COUNT - 1) ?? 0, p })
  }
  return marks
}

function readTrain(value: unknown): Train {
  const t = record(value)
  const rest: Train = { x: ENGINE_START.x, y: ENGINE_START.y, face: 1, stripes: NONE, tint: NONE }
  if (!t || typeof t.x !== 'number' || typeof t.y !== 'number' || !Number.isFinite(t.x) || !Number.isFinite(t.y)) return rest
  const at = onTar({ x: t.x, y: t.y })
  return { x: Math.round(at.x), y: Math.round(at.y), face: t.f === -1 ? -1 : 1, stripes: colour(t.s), tint: colour(t.t) }
}

function readFelt(value: unknown): Felt {
  const felt = noFeels()
  if (!Array.isArray(value)) return felt
  FEELS.forEach((f, i) => { felt[f] = whole(value[i], 0, FELT_CAP) ?? 0 })
  return felt
}

function readRiders(value: unknown): Rider[] {
  if (!Array.isArray(value)) return []
  const riders: Rider[] = []
  let aboard = 0
  for (const item of value) {
    const r = record(item)
    if (!r || riders.length >= MAX_RIDERS) continue
    if (!isRiderKind(r.k) || !isPlaceId(r.s) || !isPlaceId(r.h) || r.s === r.h) continue
    if (typeof r.a !== 'string' || !(WHERES as readonly string[]).includes(r.a)) continue
    let at = r.a as Where
    if (at === 'train' && ++aboard > SEATS) at = 'stop'
    // No kind twice, and no place in use by two riders.
    const waits = at === 'stop' || at === 'next'
    const busy = busyPlaces(riders)
    if (riders.some((x) => x.kind === r.k) || busy.includes(r.h) || (waits && busy.includes(r.s))) continue
    riders.push({ kind: r.k, stop: r.s, home: r.h, at, chalk: amount(r.c), tar: amount(r.t), felt: readFelt(r.f) })
  }
  return riders
}

/**
 * Reads a saved world. Anything that is not this game's record, or that a
 * newer build wrote, gives a first visit. Inside a record each field is
 * repaired by itself, and a world left with nobody in play is given a rider,
 * so the game always opens on something to do.
 */
export function deserialize(raw: unknown, childAge: number | null, seed: number): World {
  const r = record(raw)
  if (!r || r.v !== STATE_VERSION) return freshWorld(childAge, seed)
  const base = readBase(raw, childAge)
  let world: World = {
    ...base,
    seed: whole(r.seed, 0, 0xffffffff) ?? seed >>> 0,
    marks: readMarks(r.marks),
    chalk: whole(r.chalk, 0, CHALK_COUNT - 1) ?? 0,
    train: readTrain(r.train),
    water: colour(r.water),
    riders: readRiders(r.riders),
    // An unknown id is read as the position.
    ahead: typeof r.ahead === 'string' && LADDER.includes(r.ahead) ? r.ahead : base.position,
    shown: r.shown === true,
  }
  const someoneInPlay = (w: World) => w.riders.some(inPlay)
  // Someone waiting steps in, or a rider is laid out for the position as it stands.
  if (!world.finished && !someoneInPlay(world)) world = stepIn(ensureNext(world))
  // A finished cycle with nobody home and someone still in play has no ending to stand.
  if (world.finished && someoneInPlay(world) && !world.riders.some((x) => x.at === 'home')) world = { ...world, finished: false }
  return world
}
