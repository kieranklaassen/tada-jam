import { below, pick, type Rng } from './rng'
import { RIDERS, type RiderKind } from './tastes'
import { PLACES, PLACE_IDS, crossesPuddle, distance, type PlaceId, type Pt } from './yard'

// The designed order as layouts: where a rider waits and where its home is,
// for each place in the ladder of config.ts. A layout offers a stretch of
// bare tar and demands nothing; a position only decides how that stretch
// lies. One new thing at a time, then combinations.

export type Layout = { kind: RiderKind; stop: PlaceId; home: PlaceId }

/** A rider whose stop is this near the train walks over and boards when its cycle begins. */
export const NEAR = 480
const SHORT = 480
const LONG = 550
const LEVEL = 60
const RISE = 200
const APART = 300

/**
 * Whether a stop and a home lie as a position sets them out, with the train
 * standing at `train` when the layout comes into play.
 */
export function fits(position: string, stop: Pt, home: Pt, train: Pt): boolean {
  const way = distance(stop, home), rise = Math.abs(stop.y - home.y), near = distance(stop, train) <= NEAR, wet = crossesPuddle(stop, home)
  switch (position) {
    case 'short-hop': return near && way <= SHORT && rise <= LEVEL && !wet
    case 'long-way': return near && way >= LONG && rise <= LEVEL && !wet
    case 'up-and-down': return near && rise >= RISE && !wet
    case 'round-the-water': return near && wet
    case 'far-rider':
    case 'two-at-once': return !near && way >= APART
    default: return false
  }
}

/** Every pair of free places, as stop and home. */
function pairs(busy: readonly PlaceId[]): { stop: PlaceId; home: PlaceId }[] {
  const free = PLACE_IDS.filter((id) => !busy.includes(id))
  return free.flatMap((stop) => free.filter((home) => home !== stop).map((home) => ({ stop, home })))
}

/**
 * Lays out one rider for a position: a kind not already on the tar, and a
 * stop and a home on free places. Where the tar is too full for the position
 * to lie as designed, the nearest thing is laid out instead: first without
 * the rule on how near the train the rider waits, then any free pair.
 */
export function layOut(position: string, rng: Rng, train: Pt, busy: readonly PlaceId[], taken: readonly RiderKind[]): Layout {
  const all = pairs(busy)
  const anywhere: Pt = { x: -9999, y: -9999 }
  const wanted = all.filter((p) => fits(position, PLACES[p.stop], PLACES[p.home], train))
  // Without the train: a near position takes the stop as if the train stood on it, a far one as if it stood nowhere near.
  const loosened = all.filter((p) => fits(position, PLACES[p.stop], PLACES[p.home], PLACES[p.stop]) || fits(position, PLACES[p.stop], PLACES[p.home], anywhere))
  const from = wanted.length ? wanted : loosened.length ? loosened : all
  const kinds = RIDERS.filter((kind) => !taken.includes(kind))
  const kind = kinds.length ? pick(rng, kinds) : RIDERS[below(rng, RIDERS.length)]
  return { kind, ...pick(rng, from) }
}

/** The second rider of a layout for two: any free pair a fair way apart. */
export function layOutCompanion(rng: Rng, busy: readonly PlaceId[], taken: readonly RiderKind[]): Layout {
  const all = pairs(busy)
  const apart = all.filter((p) => distance(PLACES[p.stop], PLACES[p.home]) >= APART)
  const kinds = RIDERS.filter((kind) => !taken.includes(kind))
  const kind = kinds.length ? pick(rng, kinds) : RIDERS[below(rng, RIDERS.length)]
  return { kind, ...pick(rng, apart.length ? apart : all) }
}
