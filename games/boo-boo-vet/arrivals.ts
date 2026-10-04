// Laying out the next patient (ART.md, "The designed order, and what is
// stored"). A patient is laid out from the stored position at the moment it
// takes the waiting place, by a seeded stream that nothing else draws from:
// the same seed and the same count always give the same patient.
// Pure: no renderer, no DOM, no clock, no Math.random.

import { SPECIES, type Species } from './cast'
import { rung } from './ladder'
import { CARES, FITS, needFor, type Care, type Need } from './needs'
import type { Patient } from './patient'

/** A small seeded generator (mulberry32). Returns numbers from 0 up to, not including, 1. */
export function stream(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), state | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** The stream for one layout: its own, keyed by the seed, how many were laid out before it, and what it is for. */
function streamFor(seed: number, drawn: number, salt: number): () => number {
  return stream((Math.imul(seed >>> 0, 0x9e3779b1) ^ Math.imul((drawn >>> 0) + 1, 0x85ebca6b) ^ salt) >>> 0)
}

function pick<T>(from: readonly T[], next: () => number): T {
  return from[Math.min(from.length - 1, Math.floor(next() * from.length))]
}

export type LayOut = {
  /** The position to lay out from: the stored one, or the one above for the carrier. */
  position: string
  seed: number
  /** How many patients have been laid out before this one. */
  drawn: number
  /** The care things the mouse has shown. A patient never has a need whose thing has not been shown. */
  shown: readonly Care[]
  /** The patients still in view, newest first: the one who comes after them is a different animal. */
  recent: readonly Patient[]
  /**
   * The needs this patient may not have, where others are in play: those that would otherwise come three times in a
   * row onto the table, whichever of the door and the carrier the child takes next (`thirdInARow`).
   */
  avoid?: readonly Need[]
  /** The thing the mouse is showing as this patient is laid out: this patient then has its need. */
  justShown?: Care | null
  fromCarrier?: boolean
  /** The toy: an animal that needs nothing, come to play, with every thing on its cart. */
  visitor?: boolean
}

/**
 * The needs a patient laid out now may not have, so that no need comes three
 * times in a row onto the table: neither as a patient's only need nor as one
 * of its two. `table` is the one who has just come in, `before` the one it
 * took the place of, and `other` the one still to come from the other place
 * (the carrier's when the door's is laid out, the door's when the carrier's
 * is). The child may take either next, so the new one must not have a need
 * that the one on the table shares with the one before it, or with the other
 * who may come between or after. One that came only to play has no need, and
 * counts for nothing here.
 */
export function thirdInARow(table: Patient | null, before: Patient | null, other: Patient | null): Need[] {
  const has = (patient: Patient | null, need: Need) => patient?.needs.some((entry) => entry.need === need) ?? false
  return (table?.needs ?? []).map((entry) => entry.need).filter((need) => has(before, need) || has(other, need))
}

export function layOut(input: LayOut): Patient {
  const step = rung(input.position)
  const next = streamFor(input.seed, input.drawn, input.fromCarrier ? 0x51ed270b : 0)
  const taken = input.recent.map((patient) => patient.species)
  const free = SPECIES.filter((species) => !taken.includes(species))
  const species: Species = pick(free.length > 0 ? free : SPECIES, next)
  if (input.visitor) return { species, at: step.id, needs: [], wrong: 0, tried: [], cart: [...CARES], fromCarrier: false }

  const known = step.needs.filter((need) => input.shown.includes(FITS[need]))
  const allowed: readonly Need[] = known.length > 0 ? known : [step.needs[0]]
  const fresh = input.justShown ? needFor(input.justShown) : null
  const avoid = input.avoid ?? []
  let first: Need
  if (fresh !== null && allowed.includes(fresh)) {
    first = fresh
  } else {
    // The same need does not come three times in a row where another is in play.
    const open = allowed.filter((need) => !avoid.includes(need))
    first = pick(open.length > 0 ? open : allowed, next)
  }
  const needs: Need[] = [first]
  // A second need is held to the same: neither of a patient's needs is one that has just come twice.
  const others = allowed.filter((need) => need !== first), fresher = others.filter((need) => !avoid.includes(need))
  if (step.perPatient === 2 && others.length > 0) needs.push(pick(fresher.length > 0 ? fresher : others, next))

  return {
    species,
    at: step.id,
    needs: needs.map((need) => ({ need, step: step.start, met: false })),
    wrong: 0,
    tried: [],
    cart: [...step.cart],
    fromCarrier: input.fromCarrier === true,
  }
}
