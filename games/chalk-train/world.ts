import { LADDER } from './config'
import { NEAR, layOut, layOutCompanion, roomFor } from './layouts'
import { readMark, tidy, type Mark } from './marks'
import { inside, middle, nearestOn } from './path'
import { makeRng } from './rng'
import { beginCycle, freshState, type GameState } from './state'
import { noFeels, type Felt, type RiderKind } from './tastes'
import { clearance, DANDELION, ENGINE_PLACE, ENGINE_START, PLACES, PLACE_IDS, RAIL_DROP, distance, inPuddle, type PlaceId, type Pt, FIGURE_DOWN, FIGURE_HALF } from './yard'

// The model of the world: the chalk on the tar, the train, the water, and the
// riders. It is always at rest. A ride is worked out whole when a mark is
// made, so the world a put-away finds is the world the ride leaves, and
// nothing is ever in the air.

/**
 * Where a rider is. The design sheet's three places, at the stop, aboard and
 * home, in a finer grain: `before` is home from the cycle before, and `next`
 * is waiting at its stop for the cycle to come.
 */
export type Where = 'before' | 'stop' | 'train' | 'home' | 'next'
export const WHERES: readonly Where[] = ['before', 'stop', 'train', 'home', 'next']

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
  /**
   * The ladder id of the layout the rider waiting ahead was laid out from. The
   * position may have moved since, so this is what says whether a second rider
   * of that layout is drawn in when its cycle begins.
   */
  ahead: string
  /** The first showing has played. */
  shown: boolean
}

/** Never more than four riders: two of the layout in play, one waiting, one at home. */
export const MAX_RIDERS = 4
/** The train has two wagons. */
export const SEATS = 2
/** A place whose rail spot is this near the train has the train standing at it. */
const UNDER_TRAIN = 190
/** A place the engine stands this far into is right under it. */
const DEEP = -40
/** How far behind the engine its two wagons stand when the train has drawn up at rest, and how near one a place is in use. */
const WAGONS_BEHIND = [168, 322] as const
const UNDER_WAGON = 120
/** A place this near the straight way from the train to where it goes next is on the way. */
const ON_THE_WAY = 170

const rider = (l: { kind: RiderKind; stop: PlaceId; home: PlaceId }, at: Where): Rider => ({ ...l, at, chalk: 0, tar: 0, felt: noFeels() })

/** Waiting at its stop for the cycle to come. */
export const waitsAhead = (r: Rider): boolean => r.at === 'next'
/** In play: waiting to be taken, or aboard. */
export const inPlay = (r: Rider): boolean => r.at === 'stop' || r.at === 'train'

/** The spot on a rail that runs past a place. */
export const railAt = (place: PlaceId): Pt => ({ x: PLACES[place].x, y: PLACES[place].y + RAIL_DROP })

/** The places in use: every stop someone waits at, and every home that is drawn. */
export function busyPlaces(riders: readonly Rider[]): PlaceId[] {
  const busy: PlaceId[] = []
  for (const r of riders) {
    if (r.at === 'stop' || waitsAhead(r)) busy.push(r.stop)
    busy.push(r.home)
  }
  return busy
}

/** The first showing's line ends at least this clear of the home it points to: the last stretch is the child's. */
export const SHOWING_CLEAR = 60

/**
 * The line of the first showing: from just ahead of the engine, about a
 * third of the way toward the rail of the home, and never less than a short
 * stroke.
 */
export function showingLine(train: { x: number; y: number; face: 1 | -1 }, home: PlaceId): { from: Pt; to: Pt; far: number; reach: number; end: Pt } {
  const from = { x: train.x + 60 * train.face, y: train.y }, to = railAt(home)
  const far = Math.max(1, distance(from, to)), reach = Math.max(120, far / 3)
  return { from, to, far, reach, end: { x: from.x + ((to.x - from.x) * reach) / far, y: from.y + ((to.y - from.y) * reach) / far } }
}

/** The rail the train stands on at a first visit, long enough for its wagons: a mark like any other. */
const STUB: Pt[] = [{ x: ENGINE_START.x - 410, y: ENGINE_START.y + 4 }, { x: ENGINE_START.x + 76, y: ENGINE_START.y }]

/**
 * A first visit: the engine on its stub of rail, and one rider waiting, laid
 * out for the starting position. With `cycle` off, as at the toy stage, the
 * engine is alone on the tar.
 */
export function freshWorld(childAge: number | null, seed: number, cycle = true): World {
  const base = freshState(childAge)
  const rng = makeRng(seed)
  const riders: Rider[] = []
  if (cycle) {
    // The first home lies ahead of the engine, so that the first line is drawn the way the engine faces.
    let first = layOut(base.position, rng, ENGINE_START, [ENGINE_PLACE], [])
    // And far enough off that the first showing can scrape a third of the way there and leave the rest to the child.
    const tooNear = (home: PlaceId): boolean => PLACES[home].x < ENGINE_START.x + 200 || clearance([home], showingLine({ ...ENGINE_START, face: 1 }, home).end) < SHOWING_CLEAR
    for (let tries = 0; tries < 60 && tooNear(first.home); tries++) first = layOut(base.position, rng, ENGINE_START, [ENGINE_PLACE], [])
    riders.push(rider(first, 'stop'))
    if (base.position === 'two-at-once') riders.push(rider(layOutCompanion(rng, [ENGINE_PLACE, first.stop, first.home], [first.kind]), 'stop'))
  }
  return {
    ...base,
    seed: rng.state,
    marks: [{ c: 0, p: tidy(STUB) }],
    chalk: 0,
    train: { x: ENGINE_START.x, y: ENGINE_START.y, face: 1, stripes: NONE, tint: NONE },
    water: NONE,
    riders,
    ahead: base.position,
    shown: false,
  }
}

/** The places where someone is still seen standing, among spots the world does not hold: taken, like a rider's own. */
const stoodOn = (also: readonly Pt[]): PlaceId[] => PLACE_IDS.filter((id) => also.some((at) => distance(PLACES[id], at) < 1))

/** The places a wagon standing at one of these spots would cover, by the boxes both take up as drawn. */
const underWagons = (spots: readonly Pt[]): PlaceId[] =>
  PLACE_IDS.filter((id) => spots.some((at) => Math.abs(at.x - PLACES[id].x) < FIGURE_HALF.w + 62 && Math.abs(at.y - 34 - (PLACES[id].y + FIGURE_DOWN)) < FIGURE_HALF.h + 40))

/** The places the train stands at, or is on its way to: in use too. */
const underTrain = (world: World, also: readonly Pt[] = []): PlaceId[] => {
  // Its wagons too, where they draw up behind it when it rests.
  const { x, y, face } = world.train, wagons = WAGONS_BEHIND.map((back) => ({ x: x - face * back, y }))
  return PLACE_IDS.filter((id) => [world.train, ...also].some((at) => distance(railAt(id), at) <= UNDER_TRAIN || distance(PLACES[id], at) <= UNDER_TRAIN || clearance([id], at) < 0)
    || wagons.some((at) => distance(PLACES[id], at) <= UNDER_WAGON || distance(railAt(id), at) <= UNDER_WAGON))
}

/**
 * Makes sure someone is waiting for the cycle to come: one rider, laid out
 * from the position as it stands, which is kept as `ahead`. Where the position
 * is for two, only this first rider waits. Where the tar already holds four, which only a
 * rider fetched early can bring about, the oldest home is rubbed away to make
 * room: the home from the cycle before, or else the first reached in this one.
 * `also` are spots a train in the middle of a ride is at or heading for, where
 * nobody is laid out.
 */
export function ensureNext(world: World, also: readonly Pt[] = [], mark: readonly Pt[] = []): World {
  if (world.riders.some(waitsAhead)) return world
  let riders = world.riders
  if (riders.length >= MAX_RIDERS) {
    const before = riders.findIndex((r) => r.at === 'before'), oldest = before >= 0 ? before : riders.findIndex((r) => r.at === 'home')
    if (oldest < 0) return world
    riders = riders.filter((_, i) => i !== oldest)
  }
  const rng = makeRng(world.seed)
  // The train will stand at the home of the rider it takes home last.
  const last = [...riders].reverse().find(inPlay)
  const trainThen = last ? railAt(last.home) : { x: world.train.x, y: world.train.y }
  // Where the train is, and the straight way from it to where it is going next, count as in use while there is room
  // elsewhere: nobody waits where the child's next line is likely to run. On a tar too full for that, only the
  // riders' own places are kept clear.
  const taken = [...busyPlaces(riders), ...stoodOn(also)], inWay = PLACE_IDS.filter((id) => nearestOn([world.train, trainThen], PLACES[id]).gap < ON_THE_WAY)
  // Nor where the mark now being made runs: the places an engine riding it would stand in.
  const onMark = PLACE_IDS.filter((id) => mark.some((at) => clearance([id], at) < 0))
  const wide = [...taken, ...underTrain(world, also), ...inWay, ...onMark]
  // On a tar fuller still, at least the places the engine itself stands in, and the mark's.
  const under = [...taken, ...underTrain(world, also), ...onMark], engine = [...taken, ...PLACE_IDS.filter((id) => clearance([id], world.train) < 0)]
  // And the places a wagon stands over, as it is seen: a wagon at rest covers nobody.
  const wagons = [...engine, ...underWagons(also)]
  const marked = [...engine, ...onMark], markedWagons = [...wagons, ...onMark]
  // And on the fullest, at least the place the engine stands right in.
  const deep = [...taken, ...PLACE_IDS.filter((id) => clearance([id], world.train) < DEEP)]
  const busy = [wide, under, markedWagons, wagons, marked, engine, deep].find((places) => roomFor(places)) ?? taken
  if (!roomFor(busy)) return { ...world, riders }
  const first = layOut(world.position, rng, trainThen, busy, riders.map((r) => r.kind))
  return { ...world, seed: rng.state, ahead: world.position, riders: [...riders, rider(first, 'next')] }
}

/**
 * Whoever waited steps into play. Where its layout was for two, its second
 * rider is laid out now and drawn in at its stop, while the tar has room for
 * it and for one more to wait.
 */
export function stepIn(world: World, also: readonly Pt[] = []): World {
  const laidFrom = LADDER.includes(world.ahead) ? world.ahead : world.position
  const two = laidFrom === 'two-at-once' && world.riders.some(waitsAhead)
  const riders = world.riders.map((r): Rider => (waitsAhead(r) ? { ...r, at: 'stop' } : r))
  if (!two || riders.length > MAX_RIDERS - 2) return { ...world, riders }
  const rng = makeRng(world.seed)
  const taken = [...busyPlaces(riders), ...stoodOn(also)], under = [...taken, ...underTrain(world, also)]
  const engine = [...taken, ...PLACE_IDS.filter((id) => clearance([id], world.train) < 0)], wagons = [...engine, ...underWagons(also)]
  const deep = [...taken, ...PLACE_IDS.filter((id) => clearance([id], world.train) < DEEP)]
  const busy = [under, wagons, engine, deep].find((places) => roomFor(places)) ?? taken
  if (!roomFor(busy)) return { ...world, riders }
  const second = layOutCompanion(rng, busy, riders.map((r) => r.kind))
  return { ...world, seed: rng.state, riders: [...riders, rider(second, 'stop')] }
}

/** A rider near enough to the train climbs aboard, if a wagon is free. Returns who boarded, by index. */
export function walkOver(world: World, stays: RiderKind | null = null): { world: World; boarded: number[] } {
  let aboard = world.riders.filter((r) => r.at === 'train').length
  const boarded: number[] = []
  const riders = world.riders.map((r, i) => {
    if (r.at !== 'stop' || r.kind === stays || aboard >= SEATS || distance(PLACES[r.stop], world.train) > NEAR) return r
    aboard++
    boarded.push(i)
    return { ...r, at: 'train' as const }
  })
  return { world: { ...world, riders }, boarded }
}

/**
 * The child's touch begins a cycle. After an ending the tar turns over:
 * earlier homes are rubbed away until only the home reached last is left, and
 * whoever waited steps into play. Then someone new is laid out to wait, and a
 * rider beside the train climbs aboard. On any other mark this does nothing.
 * `also` are spots where something stands that the world does not hold, such
 * as the wagons as they are seen, or a rider still seen at a place it has
 * left: nobody is laid out there. `stays` is a rider the mark itself is laid
 * on: it stays at its stop to be chalked, and does not walk over. `mark` is
 * the mark being made: whoever is laid out is laid clear of it, where the tar
 * has room.
 */
export function settleIn(world: World, also: readonly Pt[] = [], stays: RiderKind | null = null, mark: readonly Pt[] = []): { world: World; began: boolean; boarded: number[] } {
  const first = !world.finished && !world.riders.some(waitsAhead)
  if (!world.finished && !first) return { world, began: false, boarded: [] }
  let next = world
  if (world.finished) {
    const lastHome = world.riders.map((r) => r.at).lastIndexOf('home')
    const riders = world.riders
      .filter((r, i) => r.at !== 'before' && (r.at !== 'home' || i === lastHome))
      .map((r): Rider => (r.at === 'home' ? { ...r, at: 'before' } : r))
    next = stepIn({ ...world, ...beginCycle(world), riders }, also)
  }
  next = ensureNext(next, also, mark)
  // Where the rider who waited was fetched early and is home already, nobody is in play: the one just laid out
  // steps straight in, and another is laid out to wait.
  if (!next.riders.some(inPlay)) next = ensureNext(stepIn(next, also), also, mark)
  const walked = walkOver(next, stays)
  return { world: walked.world, began: true, boarded: walked.boarded }
}

/** Whether the dandelion is in flower: some ring of chalk goes round it. Read from the marks, never stored. */
export function inFlower(marks: readonly Mark[]): boolean {
  const head = { x: DANDELION.x, y: DANDELION.y - 28 }
  return marks.some((m) => m.p.length > 8 && readMark(m.p).kind === 'loop' && inside(m.p, head))
}

/** Whether the dandelion wears a seed tuft: some scribble lies on it. Read from the marks, never stored. */
export function wearsTuft(marks: readonly Mark[]): boolean {
  const head = { x: DANDELION.x, y: DANDELION.y - 28 }
  return marks.some((m) => m.p.length > 8 && readMark(m.p).kind === 'scribble' && distance(middle(m.p), head) <= DANDELION.reach)
}

/** The stretches of a mark that lie in the water, where its chalk is dark: pairs of first and last point index. Read from the mark, never stored. */
export function wetStretches(mark: Mark): [number, number][] {
  const out: [number, number][] = []
  let from = -1
  mark.p.forEach((q, i) => {
    const wet = inPuddle(q)
    if (wet && from < 0) from = i
    if (!wet && from >= 0) { out.push([from, i - 1]); from = -1 }
  })
  if (from >= 0) out.push([from, mark.p.length - 1])
  return out
}

/** Stands the train somewhere else, as when it has ridden part of a line that is then gone. */
export function moveTrain(world: World, to: Pt, face: 1 | -1 = world.train.face): World {
  return { ...world, train: { ...world.train, x: Math.round(to.x), y: Math.round(to.y), face } }
}
