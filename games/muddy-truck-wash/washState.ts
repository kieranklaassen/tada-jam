import { ROSTER, isVehicle, judge, vehicle, whoNext } from './cycle'
import { MAX_DIPS, arrive, next as draw, puddled } from './mud'
import type { VehicleId } from './roster'
import { keptForShowing } from './showing'
import { silhouette } from './silhouette'
import { beginCycle, deserialize, finishCycle, freshState, serialize, type CycleOutcome, type GameState } from './state'
import { CELLS, decode, encode, tally, type Surface } from './surface'

// The game's save: the template's state (version, position, finished) and the
// wash itself. Read defensively, field by field, and small: two grids of 84
// characters and a few numbers.

/** The first showings a save can hold a mark for. */
export const SHOWINGS = ['drip'] as const
export type Showing = (typeof SHOWINGS)[number]

/** Where the seeded stream starts on a first visit, so a first visit is the same scene every time. */
export const FIRST_SEED = 20261003

export type WashState = GameState & {
  /** The vehicle in the bay: who, its surface, and how many patches held mud when it rolled in. */
  bay: { who: VehicleId; cells: string; came: number }
  /** The vehicle that waits at the door, with whatever the puddle or a flying blob has put on it, and how many times it has been through the puddle (0 to 2). Nothing shows the number. */
  next: { who: VehicleId; cells: string; dips: number }
  /** The state of the seeded stream that lays out the mud of each vehicle as it comes to the door. It does not pick who comes: the roster comes in its own order. Not a count of anything. */
  seed: number
  /** The first showings that have played. */
  shown: Showing[]
}

/** A vehicle of the roster as it rolls in at `position`. */
function arrival(who: VehicleId, position: string, seed: number): string {
  return encode(arrive(silhouette(vehicle(who)), position, seed))
}

function mudOn(cells: string): number {
  return tally(decode(cells) ?? []).mud
}

export function freshWash(childAge: number | null): WashState {
  const base = freshState(childAge)
  let seed = FIRST_SEED
  const [, s1] = draw(seed)
  const [, s2] = draw(s1)
  seed = s2
  const cells = arrival(ROSTER[0].id, base.position, s1)
  return { ...base, bay: { who: ROSTER[0].id, cells, came: mudOn(cells) }, next: { who: ROSTER[1].id, cells: arrival(ROSTER[1].id, base.position, s2), dips: 0 }, seed, shown: [] }
}

/** A saved grid is kept only when it is a whole grid whose body is this vehicle's body. */
function grid(raw: unknown, who: VehicleId): string | null {
  const surface = decode(raw)
  if (!surface) return null
  const body = silhouette(vehicle(who))
  return surface.every((patch, cell) => (patch === '.') === (body[cell] === '.')) ? (raw as string) : null
}

/**
 * Saved state is untrusted. The template's part is read by the template's
 * `deserialize`; each field of the wash is then repaired by itself, so a
 * damaged grid costs that vehicle its mud and nothing else.
 */
export function deserializeWash(raw: unknown, childAge: number | null = null): WashState {
  const base = deserialize(raw, childAge)
  const fresh = freshWash(childAge)
  const record = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
  // Not this game's record, or one from a newer build: the template gave a fresh state, and so does the wash.
  if (!record || record.v !== base.v) return { ...fresh, ...base, finished: false }
  const seed = typeof record.seed === 'number' && Number.isInteger(record.seed) && record.seed > 0 && record.seed < 2 ** 32 ? record.seed : fresh.seed
  const shown = Array.isArray(record.shown) ? SHOWINGS.filter((id) => (record.shown as unknown[]).includes(id)) : []

  const rawBay = typeof record.bay === 'object' && record.bay !== null ? (record.bay as Record<string, unknown>) : {}
  const bayWho = isVehicle(rawBay.who) ? rawBay.who : fresh.bay.who
  const bayCells = (isVehicle(rawBay.who) ? grid(rawBay.cells, bayWho) : null) ?? arrival(bayWho, base.position, seed)
  // What it rolled in with can be less than what is on it now: a cloth smears mud wider. Only a number that cannot be a count is replaced.
  const came = typeof rawBay.came === 'number' && Number.isInteger(rawBay.came) && rawBay.came >= 0 && rawBay.came <= CELLS ? rawBay.came : mudOn(bayCells)

  const rawNext = typeof record.next === 'object' && record.next !== null ? (record.next as Record<string, unknown>) : {}
  // The one who waits is never the one in the bay.
  const nextWho = isVehicle(rawNext.who) && rawNext.who !== bayWho ? rawNext.who : whoNext(seed, [bayWho])[0]
  const kept = rawNext.who === nextWho ? grid(rawNext.cells, nextWho) : null
  const nextCells = kept ?? arrival(nextWho, base.position, draw(seed)[1])
  // A count that cannot be one, or one for a vehicle whose mud had to be laid out afresh, starts again at none.
  const dips = kept !== null && typeof rawNext.dips === 'number' && Number.isInteger(rawNext.dips) && rawNext.dips >= 0 && rawNext.dips <= MAX_DIPS ? rawNext.dips : 0

  // In this game the touch that ends a wash begins the next, so nothing is ever left finished.
  return { ...base, finished: false, bay: { who: bayWho, cells: bayCells, came }, next: { who: nextWho, cells: nextCells, dips }, seed, shown }
}

export function serializeWash(state: WashState): WashState {
  return { ...serialize(state), bay: { who: state.bay.who, cells: state.bay.cells, came: state.bay.came }, next: { who: state.next.who, cells: state.next.cells, dips: state.next.dips }, seed: state.seed, shown: [...state.shown] }
}

/** The surface of the vehicle in the bay changed. */
export function washed(state: WashState, surface: Surface): WashState {
  return { ...state, bay: { ...state.bay, cells: encode(surface) } }
}

/** Something landed on the vehicle that waits. */
export function landedOnNext(state: WashState, surface: Surface): WashState {
  return { ...state, next: { ...state.next, cells: encode(surface) } }
}

/** A first showing has started: it is marked at once, so it never plays twice. */
export function markShown(state: WashState, id: Showing): WashState {
  return state.shown.includes(id) ? state : { ...state, shown: [...state.shown, id] }
}

/**
 * The vehicle that waits goes through the puddle: more soft mud, up to twice.
 * The count of its trips is saved with it, so a third tap only splashes after
 * a put-away too. Returns the same state when the puddle has no more to add.
 */
export function throughPuddle(state: WashState): WashState {
  const before = decode(state.next.cells)
  if (!before || state.next.dips >= MAX_DIPS) return state
  // Where its splashes land is drawn from the saved seed and the trip's number, and the seed itself is left as it is:
  // the seed is for the mud of vehicles coming to the door, and the puddle changes only this vehicle's mud and its count of trips.
  const [, splash] = draw((state.seed ^ ((state.next.dips + 1) * 0x9e3779b1)) >>> 0)
  // Until the first showing has played, no mud lands on the dried patch it needs.
  const keep = keptForShowing(vehicle(state.next.who), before, state.shown)
  return { ...state, next: { ...state.next, cells: encode(puddled(before, state.next.dips, splash, keep)), dips: state.next.dips + 1 } }
}

export type SendOff = { state: WashState; outcome: CycleOutcome; left: VehicleId }

/**
 * The child sends the vehicle in the bay off as it is, and the one that
 * waits rolls in. The wash is judged, the position moves at most one step
 * for the vehicle that will wait next, and the cycle that begins is the
 * waiting vehicle's, with the mud it stands in. All of it happens here, at
 * once, so a put-away during the scene loses nothing.
 */
export function sendOff(state: WashState): SendOff {
  const outcome = judge(decode(state.bay.cells) ?? [], state.bay.came)
  const moved = beginCycle(finishCycle({ ...state, finished: false }, outcome))
  const left = state.bay.who
  const [who, s1] = whoNext(state.seed, [state.next.who, left])
  const [, s2] = draw(s1)
  const next: WashState = {
    ...state,
    position: moved.position,
    finished: false,
    bay: { who: state.next.who, cells: state.next.cells, came: mudOn(state.next.cells) },
    next: { who, cells: arrival(who, moved.position, s2), dips: 0 },
    seed: s2,
  }
  return { state: next, outcome, left }
}
