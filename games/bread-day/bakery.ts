// The bakery: the peel and what lies on it, the rack, the customer at the
// hatch and those waiting in the lane, and the child's place in the designed
// order. Pure rules over plain data: every act returns the bakery after it and
// what happened, for the view and the sound to play. Nothing here reads a
// clock, draws, or keeps anything in the air: a thing in the hand is still
// where it came from until an act puts it somewhere.

import { LADDER } from './config'
import { STATE_VERSION, beginCycle, finishCycle, firstPosition, type CycleOutcome, type GameState } from './state'
import { darker, gather, kindOf, pull, push, rest, tip, type Bread, type Effect, type Ingredient, type Load, type Place } from './stuff'
import { IDEAS, POOLS, ideasOf, judge, type Animal, type Group, type Idea, type Verdict } from './tastes'

/** Places on the rack; customers or groups laid out to wait in the lane; and the most the lane holds, once one has been sent back from the hatch. */
export const RACK_PLACES = 4, LANE_PLACES = 2, LANE_MOST = 3

/** A customer or a group, with the position that laid them out and the breads they have handed back so far. */
export type Visitor = { group: Group; from: string; handedBack: number }

export type Bakery = {
  /** The place in the designed order where the next cycle is judged: an id from the ladder. */
  position: string
  /** Nobody is at the hatch, after an ending or after the child sent someone back, and it stays so until the child calls someone in. */
  finished: boolean
  /** Ideas the badger has shown, so none is shown twice. */
  shown: readonly Idea[]
  /** Tools that have come out. Once out they stay. */
  tools: { jar: boolean; seeds: boolean }
  peel: { at: Place; load: Load }
  rack: readonly (Bread | null)[]
  hatch: Visitor | null
  lane: readonly Visitor[]
  /** The state of the seeded stream that fills the lane. Nothing else draws from it. */
  seed: number
}

export type Happening =
  /** An act on the stuff was answered. */
  | { type: 'effect'; effect: Effect }
  /** The peel arrived somewhere with its load. */
  | { type: 'carried'; to: Place }
  /** A bread went back into the oven and is a step darker. */
  | { type: 'darkened'; bread: Bread }
  /** The oven finished with raw stuff. `bread` is null when only steam was left. */
  | { type: 'baked'; bread: Bread | null }
  /** The customer does not want it and hands it back, unharmed. */
  | { type: 'handed-back'; verdict: Verdict; by: Visitor }
  /** The customer leaves with it. The outcome is already in the bakery when this is returned. */
  | { type: 'ending'; visitor: Visitor; taken: NonNullable<Load>; secret: boolean; outcome: CycleOutcome | null }
  /** Someone stepped up to the hatch. `showing` lists the ideas the badger now shows once, in order: the first is already marked as shown, each later one is marked as its showing starts. `cameOut` lists the tools that are new. */
  | { type: 'stepped-up'; visitor: Visitor; showing: Idea[]; cameOut: ('jar' | 'seeds')[] }
  /** The one at the hatch went back to the lane. Nothing is judged. */
  | { type: 'sent-back'; visitor: Visitor }
  /** A bread was set on the rack, or taken from it onto the peel. */
  | { type: 'racked'; place: number } | { type: 'unracked'; place: number }
  /** The badger was handed something and ate it or cleared it away. */
  | { type: 'eaten'; thing: NonNullable<Load> }

export type Step = { bakery: Bakery; happened: Happening[] }

const same = (bakery: Bakery): Step => ({ bakery, happened: [] })

/** The part of the bakery that state.ts moves: its rules for the position are used as they are. */
const cycleOf = (bakery: Bakery): GameState => ({ v: STATE_VERSION, position: bakery.position, finished: bakery.finished })
const withCycle = (bakery: Bakery, cycle: GameState): Bakery => ({ ...bakery, position: cycle.position, finished: cycle.finished })

// --- The seeded stream ------------------------------------------------------

/** One draw: the next state of the stream and a whole number below `below`. */
export function draw(seed: number, below: number): { seed: number; value: number } {
  const next = (seed + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { seed: next, value: Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * below) }
}

// --- The lane ----------------------------------------------------------------

const present = (bakery: Bakery): Set<Animal> => new Set([...(bakery.hatch?.group ?? []), ...bakery.lane.flatMap((visitor) => visitor.group)])

/** Who could join the lane now: first those of the current position, otherwise those of earlier ones, and never an animal already here. */
export function candidates(bakery: Bakery): Visitor[] {
  const here = present(bakery), at = Math.max(0, LADDER.indexOf(bakery.position))
  const free = (id: string): Visitor[] => (POOLS[id] ?? []).filter((group) => group.every((animal) => !here.has(animal))).map((group) => ({ group, from: id, handedBack: 0 }))
  const own = free(LADDER[at])
  return own.length > 0 ? own : LADDER.slice(0, at).flatMap(free)
}

/** Whenever fewer than two wait in the lane and an animal is free, a place is filled, one seeded pick each. */
export function fillLane(bakery: Bakery): Bakery {
  let filled = bakery
  while (filled.lane.length < LANE_PLACES) {
    const from = candidates(filled)
    if (from.length === 0) break
    const pick = draw(filled.seed, from.length)
    filled = { ...filled, seed: pick.seed, lane: [...filled.lane, from[pick.value]] }
  }
  return filled
}

// --- Stepping up -------------------------------------------------------------

/** The visitor is at the hatch: the tools its wants need come out, and the ideas not yet shown are marked as shown as their showing starts. */
function stepUp(bakery: Bakery, visitor: Visitor): Step {
  const ideas = ideasOf(visitor.group), showing = ideas.filter((idea) => !bakery.shown.includes(idea))
  const jar = bakery.tools.jar || ideas.includes('rising'), seeds = bakery.tools.seeds || ideas.includes('seeds')
  const cameOut = [...(jar && !bakery.tools.jar ? (['jar'] as const) : []), ...(seeds && !bakery.tools.seeds ? (['seeds'] as const) : [])]
  // A showing is marked as shown when it starts. The first starts now; any other waits its turn and is marked then (`markShown`).
  const shown = IDEAS.filter((idea) => bakery.shown.includes(idea) || idea === showing[0])
  const next = fillLane({ ...withCycle(bakery, beginCycle(cycleOf(bakery))), hatch: visitor, shown, tools: { jar, seeds } })
  return { bakery: next, happened: [{ type: 'stepped-up', visitor, showing, cameOut }] }
}

/** A showing that waited its turn starts now: it is marked, so that it is never played again. */
export function markShown(bakery: Bakery, idea: Idea): Bakery {
  return bakery.shown.includes(idea) ? bakery : { ...bakery, shown: IDEAS.filter((each) => each === idea || bakery.shown.includes(each)) }
}

/** A first visit: the first customer of the starting position is already at the hatch, wanting something. */
export function freshBakery(childAge: number | null, seed = 1): Step {
  const position = firstPosition(childAge)
  const empty: Bakery = { position, finished: false, shown: [], tools: { jar: false, seeds: false }, peel: { at: 'board', load: null }, rack: Array<Bread | null>(RACK_PLACES).fill(null), hatch: null, lane: [], seed: seed >>> 0 }
  return stepUp(empty, { group: POOLS[position][0], from: position, handedBack: 0 })
}

/**
 * The child touched the one at the hatch. They go back to the lane as they
 * are, with the position they were laid out from and their count of breads
 * handed back. Nothing is judged, the hatch stands empty, and no pick is made.
 */
export function sendBack(bakery: Bakery): Step {
  const back = bakery.hatch
  if (!back) return same(bakery)
  return { bakery: { ...bakery, hatch: null, finished: true, lane: [...bakery.lane, back] }, happened: [{ type: 'sent-back', visitor: back }] }
}

/**
 * The child touched someone in the lane. They step up; whoever was at the
 * hatch first goes back to the lane without a word and nothing is judged.
 */
export function callIn(bakery: Bakery, place: number): Step {
  const visitor = bakery.lane[place]
  if (!visitor) return same(bakery)
  const sent = sendBack(bakery)
  const step = stepUp({ ...sent.bakery, lane: sent.bakery.lane.filter((_, at) => at !== place) }, visitor)
  return { bakery: step.bakery, happened: [...sent.happened, ...step.happened] }
}

// --- The peel ----------------------------------------------------------------

/** The bakery with this on the peel: the same bakery when nothing changed, so that nothing is saved for an act that left it as it was. */
const withLoad = (bakery: Bakery, load: Load): Bakery => (load === bakery.peel.load ? bakery : { ...bakery, peel: { ...bakery.peel, load } })
const empty = (load: Load): load is null => load === null || (load.raw && kindOf(load) === 'nothing')

/** Tip an ingredient. With the peel away it lands on the bare bench and runs off, and nothing changes. */
export function tipOnto(bakery: Bakery, what: Ingredient): Step {
  if ((what === 'bubbly' && !bakery.tools.jar) || (what === 'seeds' && !bakery.tools.seeds)) return same(bakery)
  if (bakery.peel.at !== 'board') {
    const effect: Effect = what === 'flour' ? 'flour-over' : what === 'water' ? 'water-over' : what === 'bubbly' ? 'burp' : 'slides-off'
    return { bakery, happened: [{ type: 'effect', effect }] }
  }
  const done = tip(bakery.peel.load, what)
  return { bakery: withLoad(bakery, done.load), happened: [{ type: 'effect', effect: done.effect }] }
}

/** The finger on what lies on the peel: a push, a pull out past the edge, or a push inwards. Behind the oven door nothing is reached. */
export function work(bakery: Bakery, how: 'push' | 'pull' | 'gather'): Step {
  if (bakery.peel.at === 'oven') return same(bakery)
  const done = (how === 'push' ? push : how === 'pull' ? pull : gather)(bakery.peel.load)
  return { bakery: withLoad(bakery, done.load), happened: [{ type: 'effect', effect: done.effect }] }
}

/** Carry the peel to a place. A bread that goes into the oven is a step darker as the door shuts. */
export function carry(bakery: Bakery, to: Place): Step {
  if (bakery.peel.at === to) return same(bakery)
  const load = bakery.peel.load, moved: Bakery = { ...bakery, peel: { at: to, load } }
  if (to !== 'oven' || !load || load.raw) return { bakery: moved, happened: [{ type: 'carried', to }] }
  const bread = darker(load)
  return { bakery: withLoad(moved, bread), happened: [{ type: 'carried', to }, { type: 'darkened', bread }] }
}

/** Attended time passing: dough rises where it is warm, and the oven bakes. */
export function tick(bakery: Bakery, seconds: number): Step {
  const before = bakery.peel.load, after = rest(before, bakery.peel.at, seconds)
  if (after === before) return same(bakery)
  const baked = before !== null && before.raw && (after === null || !after.raw)
  return { bakery: withLoad(bakery, after), happened: baked ? [{ type: 'baked', bread: after as Bread | null }] : [] }
}

// --- The rack, the badger and the hatch -------------------------------------

export type From = 'peel' | number

/** What is at a place the child can pick up from. The peel cannot be reached behind the oven door. */
export function thingAt(bakery: Bakery, from: From): Load {
  if (from === 'peel') return bakery.peel.at === 'oven' || empty(bakery.peel.load) ? null : bakery.peel.load
  return bakery.rack[from] ?? null
}

function without(bakery: Bakery, from: From): Bakery {
  return from === 'peel' ? withLoad(bakery, null) : { ...bakery, rack: bakery.rack.map((bread, at) => (at === from ? null : bread)) }
}

/** Set the bread on the peel onto the rack: at the place asked for, or the first free one. A full rack leaves it on the peel. */
export function toRack(bakery: Bakery, place: number): Step {
  const bread = thingAt(bakery, 'peel')
  if (!bread || bread.raw) return same(bakery)
  const free = bakery.rack[place] === null && place >= 0 && place < RACK_PLACES ? place : bakery.rack.indexOf(null)
  if (free < 0) return same(bakery)
  return { bakery: { ...withLoad(bakery, null), rack: bakery.rack.map((there, at) => (at === free ? bread : there)) }, happened: [{ type: 'racked', place: free }] }
}

/** Take a bread from the rack onto the peel, when the peel is on the board with nothing on it. */
export function fromRack(bakery: Bakery, place: number): Step {
  const bread = bakery.rack[place]
  if (!bread || bakery.peel.at !== 'board' || !empty(bakery.peel.load)) return same(bakery)
  return { bakery: withLoad(without(bakery, place), bread), happened: [{ type: 'unracked', place }] }
}

/** Hand something to the badger, who eats or clears away anything. This is how the peel and the rack are emptied. */
export function feedBadger(bakery: Bakery, from: From): Step {
  const thing = thingAt(bakery, from)
  return thing ? { bakery: without(bakery, from), happened: [{ type: 'eaten', thing }] } : same(bakery)
}

/** How a finished cycle went, from the breads handed back before the one that was wanted. */
export function outcomeOf(handedBack: number, secret: boolean): CycleOutcome {
  return secret || handedBack === 2 ? 'mixed' : handedBack <= 1 ? 'well' : 'badly'
}

/**
 * Hand what is on the peel, or a bread from the rack, to whoever is at the
 * hatch. Wanted, it leaves with them and the cycle ends: the position moves
 * here, before the ending plays, and only when they were laid out from the
 * current position. Unwanted, it stays exactly where it was.
 */
export function handOver(bakery: Bakery, from: From): Step {
  const visitor = bakery.hatch, thing = thingAt(bakery, from)
  if (!visitor || !thing) return same(bakery)
  const verdict = judge(visitor.group, thing)
  if (!verdict.wanted) {
    // Only a bread handed back counts towards how the cycle went: dust, a puddle, loose seeds and raw stuff are no bread.
    const loaf = !thing.raw && thing.crumb !== 'dust' && thing.crumb !== 'seeds'
    const by = loaf ? { ...visitor, handedBack: visitor.handedBack + 1 } : visitor
    return { bakery: { ...bakery, hatch: by }, happened: [{ type: 'handed-back', verdict, by }] }
  }
  const judged = visitor.from === bakery.position, outcome = judged ? outcomeOf(visitor.handedBack, verdict.secret) : null
  // A secret ends as an ending does, with the peel back on the board, empty.
  const cleared = without(bakery, from)
  const gone = { ...cleared, hatch: null, peel: verdict.secret ? { at: 'board' as const, load: null } : cleared.peel }
  // Where the lane has an empty place when the cycle is judged, as it has at `dough`, the pick fills it from the new position at once.
  const judgedBakery = fillLane(withCycle(gone, finishCycle(cycleOf(gone), outcome ?? 'mixed')))
  return { bakery: judgedBakery, happened: [{ type: 'ending', visitor, taken: thing, secret: verdict.secret, outcome }] }
}
