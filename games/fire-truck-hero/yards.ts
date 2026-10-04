// The designed order as arrangements: for each place of the ladder, a few
// yards that take turns, so a return visit meets the same idea in a slightly
// different yard (ART.md, "The designed order, and what is stored"). No
// renderer and no DOM. This module lays a yard out, picks the one that comes
// next, and judges a yard that is left.
//
// A place adds one new thing to the places before it. Nothing here is drawn
// or shown: an arrangement is where things stand and which one holds the want.

import { LADDER } from './config'
import { PUDDLE_AT, dryGround } from './ground'
import type { CycleOutcome } from './state'
import { THINGS, type Kind } from './things'
import { wantMet, type Thing, type Yard } from './world'

/** One thing of an arrangement. A thing in another shares its spot. */
export type Placed = { readonly kind: Kind; readonly spot: number; readonly in?: number }

export type Arrangement = {
  /** At most five, in the order a save stores them. */
  readonly things: readonly Placed[]
  /** The index of the thing that holds the want. */
  readonly want: number
  /** The index of the thing below the pool, which its overflow runs to. */
  readonly runsTo?: number
  /** The indices the wheel's flung ring reaches. */
  readonly flingsTo?: readonly number[]
  /** The index of the wheel that stands on the way from the pool to what it runs to: the run-off passes under it. */
  readonly runsPast?: number
}

/** A yard by name: its place in the order and the number of its arrangement. */
export type YardSpec = { readonly place: string; readonly arrangement: number }

const on = (kind: Kind, spot: number): Placed => ({ kind, spot })
const inside = (kind: Kind, spot: number, index: number): Placed => ({ kind, spot, in: index })

/**
 * The spots are those of layout.ts, by index. In a downhill yard the pool
 * stands on a far spot and what it runs to on a nearer one. In one whole
 * garden a wheel stands on the way down, and the run-off bends past it.
 */
export const ARRANGEMENTS: Readonly<Record<string, readonly Arrangement[]>> = {
  /** One thing alone with the truck. Water does something to a thing. */
  'one-thing': [
    { things: [on('fire', 2)], want: 0 },
    { things: [on('seed', 1)], want: 0 },
    { things: [on('pool', 3)], want: 0 },
    { things: [on('patch', 2)], want: 0 },
  ],
  /** One thing that wants water and one that answers differently: the cat or the wheel. */
  'two-things': [
    { things: [on('seed', 2), on('cat', 1)], want: 0 },
    { things: [on('pool', 2), on('wheel', 4)], want: 0 },
    { things: [on('fire', 1), on('cat', 4)], want: 0 },
    { things: [on('patch', 3), on('wheel', 0)], want: 0 },
  ],
  /** The pool with the boat and the duck in it. In the last the cat naps in the dry boat. */
  afloat: [
    { things: [on('pool', 2), inside('boat', 2, 0)], want: 0 },
    { things: [on('pool', 3), inside('boat', 3, 0), on('cat', 0)], want: 0 },
    { things: [on('pool', 1), inside('boat', 1, 0), inside('cat', 1, 1)], want: 0 },
  ],
  /** The pool stands above the thing that wants water, with its low side toward it. */
  downhill: [
    { things: [on('pool', 1), on('seed', 3)], want: 1, runsTo: 1 },
    { things: [on('pool', 0), on('patch', 2)], want: 1, runsTo: 1 },
    { things: [on('pool', 1), on('fire', 2)], want: 1, runsTo: 1 },
  ],
  /** The wheel stands beside the thing that wants water, with the cat near by. */
  'round-and-round': [
    { things: [on('seed', 1), on('wheel', 0), on('cat', 2)], want: 0, flingsTo: [0, 2] },
    { things: [on('fire', 3), on('wheel', 2), on('cat', 4)], want: 0, flingsTo: [0, 2] },
    { things: [on('patch', 1), on('wheel', 4), on('cat', 3)], want: 0, flingsTo: [0, 2] },
  ],
  /** Four or five things, one want, and every earlier idea at hand. */
  'whole-garden': [
    { things: [on('pool', 1), inside('boat', 1, 0), on('seed', 3), on('wheel', 2), on('cat', 0)], want: 2, runsTo: 2, flingsTo: [2, 4] },
    { things: [on('pool', 0), on('fire', 3), on('wheel', 2), on('cat', 1)], want: 1, runsTo: 1, flingsTo: [1, 3], runsPast: 2 },
    { things: [on('pool', 1), inside('boat', 1, 0), inside('cat', 1, 1), on('patch', 3), on('wheel', 4)], want: 3, runsTo: 3, flingsTo: [3, 0] },
    // The snail in a garden with a fire: it keeps its feelers in from the heat for as long as the fire burns.
    { things: [on('pool', 1), on('fire', 0), on('patch', 3), on('wheel', 4)], want: 2, runsTo: 2, flingsTo: [2, 1] },
  ],
}

/** The arrangements of a place. An unknown place id falls back to the first place. */
export function arrangementsOf(place: string): readonly Arrangement[] {
  return (Object.hasOwn(ARRANGEMENTS, place) ? ARRANGEMENTS[place] : undefined) ?? ARRANGEMENTS[LADDER[0]]
}

/** A place of the ladder and one of its arrangements by number. */
export function isYardSpec(place: unknown, arrangement: unknown): boolean {
  if (typeof place !== 'string' || !LADDER.includes(place) || !Object.hasOwn(ARRANGEMENTS, place)) return false
  return Number.isInteger(arrangement) && (arrangement as number) >= 0 && (arrangement as number) < ARRANGEMENTS[place].length
}

/** A fresh yard: dry sand and no water in anything. An unknown place is the first place, and an unknown number its first arrangement. */
export function layOut(place: string, arrangement: number): Yard {
  const known = isYardSpec(place, 0) ? place : LADDER[0]
  const number = isYardSpec(known, arrangement) ? arrangement : 0
  const plan = arrangementsOf(known)[number]
  const things = plan.things.map((placed): Thing => ({ kind: placed.kind, spot: placed.spot, gulps: 0, ...(placed.in === undefined ? {} : { in: placed.in }) }))
  return {
    place: known,
    arrangement: number,
    things,
    want: plan.want,
    ...(plan.runsTo === undefined ? {} : { runsTo: plan.runsTo }),
    ...(plan.flingsTo === undefined ? {} : { flingsTo: [...plan.flingsTo] }),
    ...(plan.runsPast === undefined ? {} : { runsPast: plan.runsPast }),
    ground: dryGround(),
    met: false,
  }
}

// --- Which yard comes next --------------------------------------------------

/**
 * The turn wraps here. It picks an arrangement and is not a tally of play.
 * Every place has a number of arrangements that divides it, so the wrap never
 * brings the same arrangement twice running.
 */
export const TURNS = 12

function wholeTurn(turn: number): number {
  return Number.isInteger(turn) && turn >= 0 ? turn % TURNS : 0
}

export function nextTurn(turn: number): number {
  return (wholeTurn(turn) + 1) % TURNS
}

/** The yard a position lays out on this turn. The arrangements of a place take turns. */
export function nextYardSpec(position: string, turn: number): YardSpec {
  const place = isYardSpec(position, 0) ? position : LADDER[0]
  return { place, arrangement: wholeTurn(turn) % arrangementsOf(place).length }
}

// --- How a yard went ----------------------------------------------------------

/**
 * How a yard went, when the child leaves it or its want is met. Well: the want
 * was met, by any route. Mixed: it was not, and some other thing is at its
 * fill or beyond, a puddle on the sand among them: the child was busy with an
 * idea of their own. Badly: it was not, and nothing is at its fill. `busy`
 * says that some other thing was brought to its fill and holds it no longer:
 * a wheel that has run down, a boat that sank and emptied itself. The yard
 * cannot say that itself, so the game remembers it while the yard is played.
 */
export function judge(yard: Yard, busy = false): CycleOutcome {
  if (yard.met || wantMet(yard)) return 'well'
  const filled = yard.things.some((thing, index) => index !== yard.want && thing.gulps >= THINGS[thing.kind].fill)
  return filled || busy || yard.ground.some((gulps) => gulps >= PUDDLE_AT) ? 'mixed' : 'badly'
}
