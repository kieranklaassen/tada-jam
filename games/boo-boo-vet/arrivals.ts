// Laying out the next patient (ART.md, "The designed order, and what is
// stored"). A patient is laid out from the stored position at the moment it
// takes the waiting place, by a seeded stream that nothing else draws from:
// the same seed and the same count always give the same patient.
// Pure: no renderer, no DOM, no clock, no Math.random.

import { SPECIES, type Species } from './cast'
import { rung } from './ladder'
import { FITS, needFor, type Care, type Need } from './needs'
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
  /** The thing the mouse is showing as this patient is laid out: this patient then has its need. */
  justShown?: Care | null
  fromCarrier?: boolean
}

export function layOut(input: LayOut): Patient {
  const step = rung(input.position)
  const next = streamFor(input.seed, input.drawn, input.fromCarrier ? 0x51ed270b : 0)
  const taken = input.recent.map((patient) => patient.species)
  const free = SPECIES.filter((species) => !taken.includes(species))
  const species: Species = pick(free.length > 0 ? free : SPECIES, next)

  const known = step.needs.filter((need) => input.shown.includes(FITS[need]))
  const allowed: readonly Need[] = known.length > 0 ? known : [step.needs[0]]
  const fresh = input.justShown ? needFor(input.justShown) : null
  let first: Need
  if (fresh !== null && allowed.includes(fresh)) {
    first = fresh
  } else {
    // The same need does not come three times in a row where another is in play.
    const [last, before] = input.recent
    const twice = last && before && last.needs[0].need === before.needs[0].need ? last.needs[0].need : null
    const open = allowed.filter((need) => need !== twice)
    first = pick(open.length > 0 ? open : allowed, next)
  }
  const needs: Need[] = [first]
  const others = allowed.filter((need) => need !== first)
  if (step.perPatient === 2 && others.length > 0) needs.push(pick(others, next))

  return {
    species,
    at: step.id,
    needs: needs.map((need) => ({ need, step: step.start, met: false })),
    wrong: 0,
    cart: [...step.cart],
    fromCarrier: input.fromCarrier === true,
  }
}

/** Whether a carrier stands beside the one who waits after this layout: about every other time, by the same seed. */
export function carrierArrives(seed: number, drawn: number): boolean {
  return streamFor(seed, drawn, 0x2c1b3c6d)() < 0.5
}
