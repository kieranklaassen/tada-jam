// The yard on screen as a model: the things in it, the water each holds, the
// wet sand, and what one gulp of the hose does. No renderer and no DOM. A yard
// is plain JSON, so it is what is saved (ART.md, "The designed order, and what
// is stored"). Every function returns a new yard with the events that
// happened, and leaves the yard it was given as it was.
//
// Water given stays: the fire does not grow back and the pool does not drain.
// Water is water whichever way it came. A gulp passed on by a neighbour fills
// a thing as an aimed one does, and only the result that is named differs.

import { cellOf } from './grid'
import { cellAt, levelAt, levelOf, pour, type Ground, type Level } from './ground'
import { SPOTS, type Place } from './layout'
import { THINGS, actionOf, type Action, type Kind } from './things'

/** Where a thing is: a spot by its index in layout.ts, or the truck's roof (the cat only). */
export type Spot = number | 'roof'

export type Thing = {
  readonly kind: Kind
  readonly spot: Spot
  /** Gulps of water it holds, from 0 to its most. For the wheel, gulps in a row. */
  readonly gulps: number
  /** The index of the thing it is in: the boat in the pool, the cat in the boat. It shares that thing's spot. */
  readonly in?: number
}

export type Yard = {
  readonly place: string
  readonly arrangement: number
  readonly things: readonly Thing[]
  /** The index of the thing that holds the want. */
  readonly want: number
  /** The index of the thing a pool's overflow runs to. */
  readonly runsTo?: number
  /** The indices the wheel's flung ring reaches. */
  readonly flingsTo?: readonly number[]
  readonly ground: Ground
  /** The want has been met. It is said once. */
  readonly met: boolean
}

/** A result is a cell of the grid. On open ground `thing` is -1 and `cell` is the ground cell. */
export type YardEvent =
  | { type: 'result'; thing: number; kind: Kind; action: Action; id: string; cell?: number }
  | { type: 'want-met'; thing: number }
  | { type: 'secret'; id: 'worm' | 'cat-on-roof' | 'marooned-cat' }
  | { type: 'honk' }
  | { type: 'moved'; thing: number; to: Spot }

export type Step = { readonly yard: Yard; readonly events: YardEvent[] }

/** A pool this deep lifts what is in it off the bottom. */
export const FLOATS_AT = 3

/** With nothing below a pool, its overflow lands this far toward the near edge, just past the rim. */
export const RUN_OFF_REACH = 1.5

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Draft = Omit<Mutable<Yard>, 'things'> & { things: Mutable<Thing>[] }

function open(yard: Yard): Draft {
  return { ...yard, things: yard.things.map((thing) => ({ ...thing })) }
}

function placeOf(thing: Thing): Place | null {
  return typeof thing.spot === 'number' ? (SPOTS[thing.spot] ?? null) : null
}

/** A thing is afloat when the pool it is in is deep enough. */
export function afloat(yard: Yard, index: number): boolean {
  const pool = yard.things[yard.things[index]?.in ?? -1]
  return pool?.kind === 'pool' && pool.gulps >= FLOATS_AT
}

/** The things at a spot, the one that stands there first and then what is in it. */
export function thingsAt(yard: Yard, spot: Spot): number[] {
  const at = yard.things.map((_, index) => index).filter((index) => yard.things[index].spot === spot)
  return at.sort((a, b) => Number(yard.things[a].in !== undefined) - Number(yard.things[b].in !== undefined))
}

/** The free spot with the driest sand under it, or null when every spot is taken. */
export function driestFreeSpot(yard: Yard): number | null {
  const taken = new Set(yard.things.filter((thing) => thing.in === undefined).map((thing) => thing.spot))
  const wetAt = (spot: number) => yard.ground[cellAt(SPOTS[spot].x, SPOTS[spot].z)] ?? 0
  let best: number | null = null
  for (let spot = 0; spot < SPOTS.length; spot++) {
    if (!taken.has(spot) && (best === null || wetAt(spot) < wetAt(best))) best = spot
  }
  return best
}

/** The want is met when the thing that holds it has had its fill. The snail's is also met by a puddle or mud under it. */
export function wantMet(yard: Yard): boolean {
  const thing = yard.things[yard.want]
  if (!thing || THINGS[thing.kind].with === null) return false
  if (thing.gulps >= THINGS[thing.kind].fill) return true
  const at = thing.kind === 'patch' ? placeOf(thing) : null
  return at !== null && ['puddle', 'mud'].includes(levelAt(yard.ground, at.x, at.z))
}

function say(d: Draft, events: YardEvent[], index: number, action: Action): void {
  const { kind } = d.things[index]
  events.push({ type: 'result', thing: index, kind, action, id: cellOf(kind, action).id })
}

function moveTo(d: Draft, events: YardEvent[], index: number, to: Spot): void {
  delete d.things[index].in
  d.things[index].spot = to
  events.push({ type: 'moved', thing: index, to })
}

/** The patch row's column for a gulp on open sand, by the level the sand is now at. */
const ACTION_AT: Readonly<Record<Level, Action>> = { dry: 'gulp', damp: 'gulp', puddle: 'fill', mud: 'too-much' }

/** A gulp lands on the sand. It is named as aimed, as run-off, or not at all, and the worm comes up the first moment a cell is mud. */
function wet(d: Draft, events: YardEvent[], at: Place, named: 'aimed' | 'neighbour' | null): void {
  const cell = cellAt(at.x, at.z)
  if (cell < 0) return
  const was = levelOf(d.ground[cell])
  d.ground = pour(d.ground, at.x, at.z, 1)
  const now = levelOf(d.ground[cell])
  const action = named === 'aimed' ? ACTION_AT[now] : 'neighbour'
  if (named) events.push({ type: 'result', thing: -1, kind: 'patch', action, id: cellOf('patch', action).id, cell })
  if (was !== 'mud' && now === 'mud') events.push({ type: 'secret', id: 'worm' })
}

/** A pool got a gulp. At three gulps what is in it floats, and past its fill it runs over to what is below. */
function poolRose(d: Draft, events: YardEvent[], index: number, before: number): void {
  const pool = d.things[index]
  const inIt = d.things.map((_, at) => at).filter((at) => d.things[at].in === index)
  if (before < FLOATS_AT && pool.gulps >= FLOATS_AT) {
    for (const at of inIt) {
      say(d, events, at, 'neighbour')
      // The cat who naps in the boat is floated out to the middle.
      if (d.things.some((thing) => thing.kind === 'cat' && thing.in === at)) events.push({ type: 'secret', id: 'marooned-cat' })
    }
  }
  if (before < THINGS.pool.fill) return
  // What floats rides out over the rim and is left aground beside the pool.
  for (const at of inIt) {
    say(d, events, at, 'neighbour')
    moveTo(d, events, at, pool.spot)
  }
  const below = d.runsTo
  const beside = placeOf(pool)
  if (below !== undefined && below !== index && d.things[below]) reach(d, events, below, false, true)
  else if (beside) wet(d, events, { x: beside.x, z: beside.z + RUN_OFF_REACH }, 'neighbour')
}

/** Water reaches a thing: aimed by the child, or passed on by a neighbour as a whole gulp or as drops. */
function reach(d: Draft, events: YardEvent[], index: number, aimed: boolean, water: boolean): void {
  const thing = d.things[index]
  const { fill, most } = THINGS[thing.kind]
  if (thing.spot === 'roof') {
    // The truck's roof takes no water. The cat there goes on washing her paw.
    if (aimed) say(d, events, index, 'too-much')
    return
  }
  const before = thing.gulps
  // Run-off turns the wheel from below, and is not a stream on it.
  if (water && (aimed || thing.kind !== 'wheel')) thing.gulps = Math.min(most, before + 1)
  say(d, events, index, aimed ? actionOf(thing.kind, before, thing.gulps) : 'neighbour')
  if (!water) return
  const over = before >= fill
  const at = placeOf(thing)
  if (thing.kind === 'pool') poolRose(d, events, index, before)
  if (thing.kind === 'patch' && at) wet(d, events, at, null)
  // A boat full of water sinks where it floats, empties itself and pops up.
  if (thing.kind === 'boat' && aimed && over && afloat(d, index)) thing.gulps = 0
  if (thing.kind === 'wheel' && aimed && thing.gulps >= fill) {
    // At its fill the ring is drops. Past it every neighbour gets a whole gulp.
    for (const to of d.flingsTo ?? []) if (to !== index && d.things[to]) reach(d, events, to, false, over)
  }
  if (thing.kind === 'cat' && over) {
    moveTo(d, events, index, 'roof')
    events.push({ type: 'secret', id: 'cat-on-roof' })
  } else if (thing.kind === 'cat' && thing.gulps >= fill) {
    const dry = driestFreeSpot(d)
    if (dry !== null) moveTo(d, events, index, dry)
  }
}

/** The wheel keeps no water. A gulp anywhere else ends its row. */
function still(d: Draft): void {
  for (const thing of d.things) if (thing.kind === 'wheel') thing.gulps = 0
}

/** The first gulp that meets the want says so, and it is never said twice. */
function close(before: Yard, d: Draft, events: YardEvent[]): Step {
  if (!before.met && wantMet(d)) {
    d.met = true
    events.push({ type: 'want-met', thing: d.want })
  }
  return { yard: d, events }
}

/** One gulp from the hose lands on a thing. */
export function gulpOn(yard: Yard, index: number): Step {
  if (!yard.things[index]) return { yard, events: [] }
  const d = open(yard)
  const events: YardEvent[] = []
  if (d.things[index].kind !== 'wheel') still(d)
  reach(d, events, index, true, true)
  return close(yard, d, events)
}

/** A moving stream crossed a thing. No water is kept. */
export function sweepOver(yard: Yard, index: number): Step {
  const thing = yard.things[index]
  if (!thing) return { yard, events: [] }
  return { yard, events: [{ type: 'result', thing: index, kind: thing.kind, action: 'sweep', id: cellOf(thing.kind, 'sweep').id }] }
}

/** A gulp on open ground, at a point in yard units. Outside the yard it is lost. */
export function gulpOnGround(yard: Yard, x: number, z: number): Step {
  if (cellAt(x, z) < 0) return { yard, events: [] }
  const d = open(yard)
  const events: YardEvent[] = []
  still(d)
  wet(d, events, { x, z }, 'aimed')
  return close(yard, d, events)
}

/** The stream stopped: the wheel runs down. */
export function rest(yard: Yard): Step {
  if (!yard.things.some((thing) => thing.kind === 'wheel' && thing.gulps !== 0)) return { yard, events: [] }
  const d = open(yard)
  still(d)
  return { yard: d, events: [] }
}

/** A touch on the truck. It takes no water and honks, and the cat on its roof jumps off to the driest free spot. */
export function honk(yard: Yard): Step {
  const events: YardEvent[] = [{ type: 'honk' }]
  if (!yard.things.some((thing) => thing.spot === 'roof')) return { yard, events }
  const d = open(yard)
  d.things.forEach((thing, index) => {
    const dry = thing.spot === 'roof' ? driestFreeSpot(d) : null
    if (dry !== null) moveTo(d, events, index, dry)
  })
  return { yard: d, events }
}
