// The model of the world: the room as it stands (ART.md, "The designed order,
// and what is stored"). Who is on the table, who waits at the door, who is in
// the carrier, who sits in the garden, where the things lie, what the pairs
// have made, and the child's place in the designed order.
//
// Every function takes a clinic and gives back a new one with what happened,
// so the view can play it. Pure: no renderer, no DOM, no clock.

import { carrierArrives, layOut } from './arrivals'
import type { Species } from './cast'
import { pairOf, type Secret } from './grid'
import { above, carrierCanStand, shownAtStart } from './ladder'
import { CARES, type Care } from './needs'
import { give, helpedBy, isWell, judge, stroke, type Answer, type Patient, type Stroke } from './patient'
import { beginCycle, finishCycle, freshState, type GameState } from './state'

/** The things that are one object each. A plaster comes off a sheet that never runs out. */
export type Movable = Exclude<Care, 'plaster'>
export const MOVABLES: readonly Movable[] = ['bowl', 'blanket', 'brush', 'basket']

/** Where a movable thing can lie. A thing in the hand is saved where it last lay. */
export const PLACES = ['cart', 'patient', 'table-left', 'table-right', 'floor-left', 'floor-right', 'on-basket'] as const
export type ThingPlace = (typeof PLACES)[number]

/** Where a plaster can be stuck, other than on a sore paw. */
export const PLASTER_SPOTS = ['patient', 'table', 'floor', 'mouse', 'waiting', 'lamp'] as const
export type PlasterSpot = (typeof PLASTER_SPOTS)[number]

export type Things = Record<Movable, ThingPlace> & {
  /** The plasters stuck about the room, oldest first: the two newest are kept. */
  plasters: PlasterSpot[]
}

/** What stands from the pairs of things. */
export type Made = { den: boolean; foam: boolean; boat: boolean; crackle: boolean; patches: 0 | 1 | 2 | 3 }

/** An animal that was made well, with the one or two things that helped it. */
export type Kept = { species: Species; keeps: Care[] }

export const GARDEN_HOLDS = 3
export const PLASTERS_KEPT = 2

export type Clinic = GameState & {
  /** The seed of the layout stream, set once at the first visit. */
  seed: number
  /** How many patients the stream has laid out. Never shown. */
  drawn: number
  table: Patient | null
  /** There is always one who waits. */
  waiting: Patient
  carrier: Patient | null
  /** The last three made well, oldest first. Nothing counts them. */
  garden: Kept[]
  /** The care things the mouse has shown. */
  shown: Care[]
  things: Things
  made: Made
}

const TIDY: Record<Movable, ThingPlace> = { bowl: 'cart', blanket: 'cart', brush: 'cart', basket: 'cart' }

/** A first visit: an empty table, the first patient at the door, every thing on the cart. */
export function freshClinic(childAge: number | null, seed: number): Clinic {
  const base = freshState(childAge)
  const shown = shownAtStart(base.position)
  return {
    ...base,
    seed,
    drawn: 1,
    table: null,
    waiting: layOut({ position: base.position, seed, drawn: 0, shown, recent: [] }),
    carrier: null,
    garden: [],
    shown,
    things: { ...TIDY, plasters: [] },
    made: { den: false, foam: false, boat: false, crackle: false, patches: 0 },
  }
}

/** What coming in did, for the view to play. */
export type CameIn = {
  from: 'door' | 'carrier'
  /** The animal that left for the garden, if the one on the table was well. */
  left: Kept | null
  /** The one on the table still had a need, so the two changed places and nothing was judged. */
  swapped: boolean
  /** The thing the mouse shows as the cart rolls in, once for each thing. */
  showing: Care | null
}

/**
 * The child touched the one who waits, or the carrier. The animal on the
 * table makes room: a well one goes out to the garden with what helped it,
 * and one that still has a need changes places with the newcomer and keeps
 * everything about it. The things go back on the cart. Then the one who takes
 * the waiting place is laid out from the stored position.
 */
export function comeIn(clinic: Clinic, from: 'door' | 'carrier'): { clinic: Clinic; cameIn: CameIn | null } {
  const newcomer = from === 'carrier' ? clinic.carrier : clinic.waiting
  if (!newcomer) return { clinic, cameIn: null }
  const leaving = clinic.table
  const swapped = leaving !== null && !isWell(leaving)
  const left: Kept | null = leaving && !swapped ? { species: leaving.species, keeps: helpedBy(leaving) } : null
  const showing = CARES.find((care) => newcomer.cart.includes(care) && !clinic.shown.includes(care)) ?? null
  const shown = showing ? CARES.filter((care) => care === showing || clinic.shown.includes(care)) : clinic.shown
  let next: Clinic = {
    ...clinic,
    finished: beginCycle(clinic).finished,
    table: newcomer,
    garden: left ? [...clinic.garden, left].slice(-GARDEN_HOLDS) : clinic.garden,
    shown,
    // The mouse puts the cart in order: every thing comes back, and the blanket comes off the basket.
    things: { ...TIDY, plasters: clinic.things.plasters },
    made: { ...clinic.made, den: false },
  }
  if (swapped) {
    next = from === 'carrier' ? { ...next, carrier: { ...leaving, fromCarrier: true } } : { ...next, waiting: { ...leaving, fromCarrier: false } }
  } else if (from === 'carrier') {
    next = { ...next, carrier: null }
  } else {
    const inView = next.carrier ? [newcomer, ...(leaving ? [leaving] : []), next.carrier] : [newcomer, ...(leaving ? [leaving] : [])]
    const waiting = layOut({ position: next.position, seed: next.seed, drawn: next.drawn, shown, recent: inView, justShown: showing })
    next = { ...next, waiting, drawn: next.drawn + 1 }
    if (!next.carrier && carrierCanStand(next.position) && carrierArrives(next.seed, next.drawn)) {
      const carrier = layOut({ position: above(next.position), seed: next.seed, drawn: next.drawn, shown, recent: [waiting, newcomer], fromCarrier: true })
      next = { ...next, carrier, drawn: next.drawn + 1 }
    }
  }
  return { clinic: next, cameIn: { from, left, swapped, showing } }
}

/** What a give did in the room, on top of the patient's own answer. */
export type Gave = {
  answer: Answer
  /** The bowl was foamy: whoever drinks gets a foam beard, once. */
  beard: boolean
  /** The blanket crackled: whoever goes under it comes out with its fur on end, once. */
  furOnEnd: boolean
  /** A well animal was given the thing it loves: its own scene plays, every time. */
  signature: boolean
}

/**
 * The child gave a care thing to the animal on the table. When the last need
 * is met the cycle is judged at once and the position moves, so a put-away
 * during the scene that follows loses nothing. With nobody on the table
 * nothing is given.
 */
export function giveCare(clinic: Clinic, care: Care): { clinic: Clinic; gave: Gave | null } {
  if (!clinic.table) return { clinic, gave: null }
  const { patient, answer } = give(clinic.table, care)
  const takes = answer.kind !== 'misses'
  const beard = care === 'bowl' && clinic.made.foam && takes
  const furOnEnd = care === 'blanket' && clinic.made.crackle && takes
  const made: Made = { ...clinic.made, foam: clinic.made.foam && !beard, crackle: clinic.made.crackle && !furOnEnd, den: clinic.made.den && care !== 'blanket' }
  const things: Things =
    care === 'plaster'
      ? { ...clinic.things, plasters: answer.kind === 'helps' ? clinic.things.plasters : [...clinic.things.plasters, takes ? 'patient' : 'table'].slice(-PLASTERS_KEPT) as PlasterSpot[] }
      : { ...clinic.things, [care]: takes ? 'patient' : 'table-left' }
  let next: Clinic = { ...clinic, table: patient, things, made }
  // The outcome is saved when the scene starts: the cycle is judged here, once.
  if (answer.kind === 'helps' && answer.well) {
    const { position, finished } = finishCycle(clinic, judge(patient, clinic.position))
    next = { ...next, position, finished }
  }
  return { clinic: next, gave: { answer, beard, furOnEnd, signature: answer.kind === 'play' && answer.taste === 'loves' } }
}

/** The child stroked the animal on the table. It shows its sign again; nothing changes. */
export function strokePatient(clinic: Clinic): Stroke | null {
  return clinic.table ? stroke(clinic.table) : null
}

/** The child put a thing down somewhere. The blanket coming off the basket takes the den apart. */
export function putDown(clinic: Clinic, thing: Movable, place: Exclude<ThingPlace, 'patient' | 'on-basket'>): Clinic {
  return { ...clinic, things: { ...clinic.things, [thing]: place }, made: { ...clinic.made, den: clinic.made.den && thing !== 'blanket' } }
}

/** The child stuck a plaster somewhere other than on the animal on the table. The two newest are kept. */
export function stick(clinic: Clinic, spot: Exclude<PlasterSpot, 'patient'>): Clinic {
  return { ...clinic, things: { ...clinic.things, plasters: [...clinic.things.plasters, spot].slice(-PLASTERS_KEPT) } }
}

/**
 * The child put one thing on another. Five pairs make something, the same
 * every time; any other pair makes nothing and changes nothing. The brush
 * goes back to the cart when it has done its work.
 */
export function join(clinic: Clinic, one: Care, other: Care): { clinic: Clinic; secret: Secret | null } {
  const secret = pairOf(one, other)
  if (!secret) return { clinic, secret }
  const { things, made } = clinic
  switch (secret) {
    case 'den':
      return { clinic: { ...clinic, things: { ...things, blanket: 'on-basket' }, made: { ...made, den: true } }, secret }
    case 'foam':
      return { clinic: { ...clinic, things: { ...things, brush: 'cart' }, made: { ...made, foam: true } }, secret }
    case 'boat':
      return { clinic: { ...clinic, made: { ...made, boat: true } }, secret }
    case 'crackle':
      return { clinic: { ...clinic, things: { ...things, brush: 'cart' }, made: { ...made, crackle: true } }, secret }
    case 'patch':
      return { clinic: { ...clinic, made: { ...made, patches: Math.min(3, made.patches + 1) as Made['patches'] } }, secret }
  }
}
