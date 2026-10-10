import { isKind, type Kind } from './kinds'
import { laySky, layTroop, skyFits, type TroopPlan } from './order'
import { STATE_VERSION, deserialize, freshState, serialize, type GameState } from './state'
import { isCount, served, troopOf, type Bunch, type Count, type Troop } from './world'

// The whole saved state: the template's fields (state.ts) and this game's own,
// wrapped the way state.ts describes. `deserializeSave` calls its `deserialize`
// for the template's fields, then reads the same raw record again for the
// rest, each field repaired by itself: a damaged field takes its default and
// the others are kept.
//
// A balloon in flight is not stored. The outcome of a tap is decided when the
// finger lifts and stored then, and the flight is a view of it, so a save never
// holds a half-done move. Whatever is read back, the game opens into a world
// that can be played on: a sky that holds a single of the troop's colour, and a
// troop that either still reaches up or can be followed by the next.

/** A troop on the far hill, and how many balloons it carried off: from none to one each. */
export type Marched = { kind: Kind; size: Count; balloons: number }

/** One mark for each first showing that has played (showings.ts). */
export type Shown = { give: boolean; each: boolean; bunch: boolean }

export type Save = GameState & {
  /** The troop on screen. */
  troop: Troop
  /** The bunches on offer, each in its place: the place is the index. The same for a whole cycle. */
  sky: Bunch[]
  /** The troop that waits at the edge. */
  next: TroopPlan
  /** Bunches refused or got away in the cycle on screen, kept only up to two. It lets a cycle be judged after a put-away in the middle; it is never shown and never added up. */
  slips: 0 | 1 | 2
  /** The last troops served, oldest first, for the far hill. */
  parade: Marched[]
  shown: Shown
  /** The state of the seeded stream (rng.ts), so the same save always goes on in the same way. */
  rng: number
}

/** Where the stream starts, so a new game always opens the same way. */
export const FIRST_SEED = 0x3c6ef372

/** How many troops go round on the far hill. */
export const PARADE_LENGTH = 4

/** A new game: a troop reaching up, its sky, the troop that waits, and nothing shown or served yet. */
export function freshSave(childAge: number | null, seed: number = FIRST_SEED): Save {
  const state = freshState(childAge)
  const first = layTroop(state.position, null, seed >>> 0)
  const sky = laySky(state.position, first.troop, first.rng)
  const next = layTroop(state.position, first.troop.kind, sky.rng)
  return {
    ...state,
    troop: troopOf(first.troop.kind, first.troop.size),
    sky: sky.sky,
    next: next.troop,
    slips: 0,
    parade: [],
    shown: { give: false, each: false, bunch: false },
    rng: next.rng,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readPlan(value: unknown): TroopPlan | null {
  return isRecord(value) && isKind(value.kind) && isCount(value.size) ? { kind: value.kind, size: value.size } : null
}

/** Who holds a balloon. A list of the wrong length, or with anything but true and false in it, says nothing sure about anyone: nobody holds. */
function readHeld(value: unknown, size: Count): boolean[] {
  const whole = Array.isArray(value) && value.length === size && value.every((holds) => typeof holds === 'boolean')
  return whole ? [...(value as boolean[])] : Array.from({ length: size }, () => false)
}

function readSky(value: unknown): Bunch[] | null {
  if (!Array.isArray(value)) return null
  const bunches: Bunch[] = []
  for (const entry of value) {
    if (!isRecord(entry) || !isKind(entry.colour) || !isCount(entry.count)) return null
    bunches.push({ colour: entry.colour, count: entry.count })
  }
  return bunches
}

function readSlips(value: unknown): 0 | 1 | 2 {
  if (value === 1 || value === 2) return value
  return typeof value === 'number' && value > 2 ? 2 : 0
}

function readParade(value: unknown): Marched[] {
  if (!Array.isArray(value)) return []
  const marched: Marched[] = []
  for (const entry of value) {
    const plan = readPlan(entry)
    if (plan === null || !isRecord(entry) || typeof entry.balloons !== 'number' || Number.isNaN(entry.balloons)) continue
    marched.push({ ...plan, balloons: Math.max(0, Math.min(plan.size, Math.round(entry.balloons))) })
  }
  return marched.slice(-PARADE_LENGTH)
}

function readShown(value: unknown): Shown {
  const marks = isRecord(value) ? value : {}
  return { give: marks.give === true, each: marks.each === true, bunch: marks.bunch === true }
}

/**
 * Saved state is untrusted. Anything that is not this game's record gives a
 * new game, and so does a version above this one. Inside a record every field
 * is repaired by itself, and what cannot be kept is laid out afresh from the
 * position with the stored stream, so the repair is the same every time.
 */
export function deserializeSave(raw: unknown, childAge: number | null = null): Save {
  // The same test state.ts makes before it hands back a fresh state.
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return freshSave(childAge)
  const state = deserialize(raw, childAge)
  let rng = typeof raw.rng === 'number' && Number.isFinite(raw.rng) ? raw.rng >>> 0 : FIRST_SEED

  const savedNext = readPlan(raw.next)
  const savedTroop = readPlan(raw.troop)
  let troop: Troop
  let sky = savedTroop === null ? null : readSky(raw.sky)
  if (savedTroop === null) {
    // A new troop steers clear of the kind that waits, so a sound `next` is kept beside it.
    const laid = layTroop(state.position, savedNext === null ? null : savedNext.kind, rng)
    rng = laid.rng
    troop = troopOf(laid.troop.kind, laid.troop.size)
  } else {
    troop = { ...savedTroop, held: readHeld((raw.troop as Record<string, unknown>).held, savedTroop.size) }
  }
  if (sky === null || !skyFits(sky, troop.kind)) {
    const laid = laySky(state.position, troop, rng)
    rng = laid.rng
    sky = laid.sky
  }
  let next = savedNext
  if (next === null || next.kind === troop.kind) {
    const laid = layTroop(state.position, troop.kind, rng)
    rng = laid.rng
    next = laid.troop
  }

  return {
    ...state,
    // The next troop only steps in after a finished cycle, so a served troop whose cycle is not marked finished would
    // be a dead end. The position is not moved: the cycle is taken as judged.
    finished: state.finished || served(troop),
    troop,
    sky,
    next,
    slips: readSlips(raw.slips),
    parade: readParade(raw.parade),
    shown: readShown(raw.shown),
    rng,
  }
}

/** What goes into storage: plain JSON, these fields and no others. */
export function serializeSave(save: Save): Save {
  return {
    ...serialize(save),
    troop: { kind: save.troop.kind, size: save.troop.size, held: [...save.troop.held] },
    sky: save.sky.map((bunch) => ({ colour: bunch.colour, count: bunch.count })),
    next: { kind: save.next.kind, size: save.next.size },
    slips: save.slips,
    parade: save.parade.map((marched) => ({ kind: marched.kind, size: marched.size, balloons: marched.balloons })),
    shown: { give: save.shown.give, each: save.shown.each, bunch: save.shown.bunch },
    rng: save.rng,
  }
}
