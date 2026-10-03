import { NEAR, layOut, layOutCompanion } from './layouts'
import { readMark, tidy, type Mark } from './marks'
import { inside } from './path'
import { makeRng } from './rng'
import { beginCycle, freshState, type GameState } from './state'
import { noFeels, type Felt, type RiderKind } from './tastes'
import { DANDELION, ENGINE_PLACE, ENGINE_START, PLACES, PLACE_IDS, RAIL_DROP, distance, type PlaceId, type Pt } from './yard'

// The model of the world: the chalk on the tar, the train, the water, and the
// riders. It is always at rest. A ride is worked out whole when a mark is
// made, so the world a put-away finds is the world the ride leaves, and
// nothing is ever in the air.

/**
 * Where a rider is. The design sheet's three places, at the stop, aboard and
 * home, in a finer grain: `before` is home from the cycle before, `next` is
 * waiting at its stop for the cycle to come, and `coming` is the second rider
 * of a layout for two, laid out with the first and drawn in when its cycle begins.
 */
export type Where = 'before' | 'stop' | 'train' | 'home' | 'next' | 'coming'
export const WHERES: readonly Where[] = ['before', 'stop', 'train', 'home', 'next', 'coming']

export type Rider = {
  kind: RiderKind
  stop: PlaceId
  home: PlaceId
  at: Where
  /** How far its trip has gone on chalk and on bare tar, in tar units. */
  chalk: number
  tar: number
  /** What the ride has done to it so far. */
  felt: Felt
}

/** No chalk colour: no stripes, no tint, clear water. */
export const NONE = -1

export type Train = { x: number; y: number; face: 1 | -1; stripes: number; tint: number }

export type World = GameState & {
  /** The state of the one random stream that picks layouts. */
  seed: number
  marks: Mark[]
  /** The colour the next mark takes. */
  chalk: number
  train: Train
  /** The puddle's colour, or none. */
  water: number
  riders: Rider[]
  /** The first showing has played. */
  shown: boolean
}

export const MAX_RIDERS = 4
/** The train has two wagons. */
export const SEATS = 2
/** A place whose rail spot is this near the train has the train standing at it. */
const UNDER_TRAIN = 150

const rider = (l: { kind: RiderKind; stop: PlaceId; home: PlaceId }, at: Where): Rider => ({ ...l, at, chalk: 0, tar: 0, felt: noFeels() })

/** The spot on a rail that runs past a place. */
export const railAt = (place: PlaceId): Pt => ({ x: PLACES[place].x, y: PLACES[place].y + RAIL_DROP })

/** The places in use: every stop someone waits at, and every home that is drawn. */
export function busyPlaces(riders: readonly Rider[]): PlaceId[] {
  const busy: PlaceId[] = []
  for (const r of riders) {
    if (r.at === 'stop' || r.at === 'next' || r.at === 'coming') busy.push(r.stop)
    busy.push(r.home)
  }
  return busy
}

/** The engine's stub of rail on a first visit: a mark like any other. */
const STUB: Pt[] = [{ x: ENGINE_START.x - 64, y: ENGINE_START.y + 4 }, { x: ENGINE_START.x + 76, y: ENGINE_START.y }]

/** A first visit: the engine on its stub of rail, and one rider waiting, laid out for the starting position. */
export function freshWorld(childAge: number | null, seed: number): World {
  const base = freshState(childAge)
  const rng = makeRng(seed)
  const first = layOut(base.position, rng, ENGINE_START, [ENGINE_PLACE], [])
  const riders = [rider(first, 'stop')]
  if (base.position === 'two-at-once') riders.push(rider(layOutCompanion(rng, [ENGINE_PLACE, first.stop, first.home], [first.kind]), 'stop'))
  return {
    ...base,
    seed: rng.state,
    marks: [{ c: 0, p: tidy(STUB) }],
    chalk: 0,
    train: { x: ENGINE_START.x, y: ENGINE_START.y, face: 1, stripes: NONE, tint: NONE },
    water: NONE,
    riders,
    shown: false,
  }
}

/**
 * Makes sure someone is waiting for the cycle to come. A second rider already
 * laid out steps up; otherwise one is laid out from the position as it stands,
 * with a second behind it where the position is for two. The home from the
 * cycle before goes when the tar would hold more than four riders.
 */
export function ensureNext(world: World): World {
  if (world.riders.some((r) => r.at === 'next')) return world
  const coming = world.riders.findIndex((r) => r.at === 'coming')
  if (coming >= 0) return { ...world, riders: world.riders.map((r, i) => (i === coming ? { ...r, at: 'next' } : r)) }
  let riders = world.riders
  const pair = world.position === 'two-at-once'
  const room = () => MAX_RIDERS - riders.length
  if (room() < (pair ? 2 : 1)) riders = riders.filter((r) => r.at !== 'before')
  if (room() < 1) return { ...world, riders }
  const rng = makeRng(world.seed)
  // The train will stand at the home of the rider it takes home last.
  const last = [...riders].reverse().find((r) => r.at === 'stop' || r.at === 'train')
  const trainThen = last ? railAt(last.home) : { x: world.train.x, y: world.train.y }
  const kinds = riders.map((r) => r.kind)
  // The place the train stands at now is in use too.
  const under = PLACE_IDS.filter((id) => distance(railAt(id), world.train) <= UNDER_TRAIN)
  const first = layOut(world.position, rng, trainThen, [...busyPlaces(riders), ...under], kinds)
  riders = [...riders, rider(first, 'next')]
  if (pair && room() >= 1) riders = [...riders, rider(layOutCompanion(rng, [...busyPlaces(riders), ...under], [...kinds, first.kind]), 'coming')]
  return { ...world, seed: rng.state, riders }
}

/** A rider near enough to the train climbs aboard, if a wagon is free. Returns who boarded, by index. */
export function walkOver(world: World): { world: World; boarded: number[] } {
  let aboard = world.riders.filter((r) => r.at === 'train').length
  const boarded: number[] = []
  const riders = world.riders.map((r, i) => {
    if (r.at !== 'stop' || aboard >= SEATS || distance(PLACES[r.stop], world.train) > NEAR) return r
    aboard++
    boarded.push(i)
    return { ...r, at: 'train' as const }
  })
  return { world: { ...world, riders }, boarded }
}

/**
 * The child's touch begins a cycle. After an ending the tar turns over: the
 * rider who waited steps into play with any second rider laid out with it,
 * the last rider home stays as the home from before, and older homes go. Then
 * someone new is laid out to wait, and a rider beside the train climbs aboard.
 * On any other mark this does nothing.
 */
export function settleIn(world: World): { world: World; began: boolean; boarded: number[] } {
  const first = !world.finished && !world.riders.some((r) => r.at === 'next')
  if (!world.finished && !first) return { world, began: false, boarded: [] }
  let next = world
  if (world.finished) {
    const lastHome = world.riders.map((r) => r.at).lastIndexOf('home')
    const riders = world.riders
      .filter((r, i) => r.at !== 'before' && (r.at !== 'home' || i === lastHome))
      .map((r): Rider => (r.at === 'home' ? { ...r, at: 'before' } : r.at === 'next' || r.at === 'coming' ? { ...r, at: 'stop' } : r))
    next = { ...world, ...beginCycle(world), riders }
  }
  next = ensureNext(next)
  // Where the rider who waited was fetched early and is home already, nobody is in play: the one just laid out
  // steps straight in, and another is laid out to wait.
  if (!next.riders.some((r) => r.at === 'stop' || r.at === 'train')) {
    next = ensureNext({ ...next, riders: next.riders.map((r): Rider => (r.at === 'next' || r.at === 'coming' ? { ...r, at: 'stop' } : r)) })
  }
  const walked = walkOver(next)
  return { world: walked.world, began: true, boarded: walked.boarded }
}

/** Whether the dandelion is in flower: some ring of chalk goes round it. Read from the marks, never stored. */
export function inFlower(marks: readonly Mark[]): boolean {
  const head = { x: DANDELION.x, y: DANDELION.y - 28 }
  return marks.some((m) => m.p.length > 8 && readMark(m.p).kind === 'loop' && inside(m.p, head))
}
