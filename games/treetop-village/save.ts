import { deserialize as readBase, isReadable, serialize as writeBase, type GameState } from './state'
import { FOLK, HOME, LANDINGS, PLACE_COUNT, type Folk } from './tree'
import { KINDS, type Errand, type Kind } from './ways'

// What Treetop Village keeps in ctx.storage beside the template's fields: the
// piece in each place, the end each bucket rests at, where each walker stands
// and where it is going, the newest piece, and whether it is night. Each
// field is repaired by itself, so one damaged field costs only itself.

export type Standing = { at: number; errand: Errand }

export type Saved = GameState & {
  /** For each of the twelve places, the kind of piece in it, or null. */
  places: (Kind | null)[]
  /** For each place, which end a bucket there rests at: 0 the lower or left end, 1 the other. */
  lifts: (0 | 1)[]
  /** Where each walker stands (the twins share an entry) and its errand. */
  folk: Record<Folk, Standing>
  /** The place whose piece was fitted last, or null. */
  newest: number | null
  night: boolean
}

/** From this age a first visit finds a bare tree; younger, and with no age, three pieces are already in it. */
export const BARE_TREE_FROM_AGE = 6

/** The three pieces a younger child's first visit finds: a ladder up from the meadow, a plank across the low limbs, lanterns on the left. */
export const STARTING_PIECES: readonly { place: number; kind: Kind }[] = [
  { place: 0, kind: 'ladder' },
  { place: 7, kind: 'plank' },
  { place: 10, kind: 'lanterns' },
]

const atHome = (): Record<Folk, Standing> => Object.fromEntries(FOLK.map((folk) => [folk, { at: HOME[folk].landing, errand: 'none' }])) as Record<Folk, Standing>

export function freshSaved(childAge: number | null): Saved {
  const places: (Kind | null)[] = Array.from({ length: PLACE_COUNT }, () => null)
  if (childAge === null || childAge < BARE_TREE_FROM_AGE) for (const { place, kind } of STARTING_PIECES) places[place] = kind
  return { ...readBase(null, childAge), places, lifts: Array.from({ length: PLACE_COUNT }, () => 0), folk: atHome(), newest: null, night: false }
}

const isPlace = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < PLACE_COUNT

/** Saved state is untrusted: anything unreadable gives a first visit's tree, and inside a record each field takes its default by itself. */
export function deserialize(raw: unknown, childAge: number | null = null): Saved {
  if (!isReadable(raw)) return freshSaved(childAge)
  const base = readBase(raw, childAge)
  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
  const rawPlaces = list(raw.places), rawLifts = list(raw.lifts)
  const places = Array.from({ length: PLACE_COUNT }, (_, index) => (KINDS.includes(rawPlaces[index] as Kind) ? (rawPlaces[index] as Kind) : null))
  const lifts = Array.from({ length: PLACE_COUNT }, (_, index): 0 | 1 => (rawLifts[index] === 1 && places[index] === 'bucket' ? 1 : 0))
  const folk = atHome()
  const rawFolk = typeof raw.folk === 'object' && raw.folk !== null ? (raw.folk as Record<string, unknown>) : {}
  for (const name of FOLK) {
    const one = rawFolk[name]
    if (typeof one !== 'object' || one === null) continue
    const { at, errand } = one as { at?: unknown; errand?: unknown }
    if (typeof at === 'number' && Number.isInteger(at) && at >= 0 && at < LANDINGS.length) folk[name].at = at
    // An errand to a place with nothing in it is no errand.
    if (errand === 'home' || (isPlace(errand) && places[errand] !== null)) folk[name].errand = errand
  }
  const newest = isPlace(raw.newest) && places[raw.newest] !== null ? raw.newest : null
  // Open play has no finished cycle.
  return { ...base, finished: false, places, lifts, folk, newest, night: raw.night === true }
}

export function serialize(state: Saved): Saved {
  const folk = Object.fromEntries(FOLK.map((name) => [name, { at: state.folk[name].at, errand: state.folk[name].errand }])) as Record<Folk, Standing>
  return { ...writeBase(state), finished: false, places: [...state.places], lifts: [...state.lifts], folk, newest: state.newest, night: state.night }
}
