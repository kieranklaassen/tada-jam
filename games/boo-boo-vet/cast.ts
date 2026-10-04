// The six animals and the tastes that never change (ART.md, "The characters
// and their fixed tastes"). Pure data: the view maps these numbers onto
// drawings and the sound maps them onto voices.

import type { Care } from './needs'

export const SPECIES = ['bear', 'rabbit', 'cat', 'dog', 'hedgehog', 'duck'] as const
export type Species = (typeof SPECIES)[number]

/** Where a stroke of the hand can land. */
export type Spot = 'belly' | 'feet' | 'ears' | 'tail' | 'chin' | 'ear' | 'paws' | 'nose' | 'back' | 'head'

/** The part of each animal that the comedy lives in. */
export type Funniest = 'belly' | 'ears' | 'tail' | 'tongue' | 'spines' | 'feet'

export type Character = {
  /** Body size against the bear, which is 1. The pitch of a landing follows it. */
  size: number
  /** How fast it moves, in beats a second: every curve of this animal is timed in its own beat. */
  tempo: number
  /** How heavy it is from 0 to 1: how late a move arrives and how hard it lands. */
  weight: number
  /** How far it overshoots a stop, from 0 (exact) to 1 (bounces past). */
  overshoot: number
  funniest: Funniest
  /** The one thing it loves, with or without a need. */
  loves: Care
  /** The one thing it is wary of. It still helps when it fits, and no taste reaction uses the place and movement of a sign. */
  wary: Care
  /** A stroke here is the best thing there is. */
  strokeLoved: Spot
  /** A touch here makes it squirm. */
  strokeSquirms: Spot
}

export const CAST: Readonly<Record<Species, Character>> = {
  bear: { size: 1, tempo: 0.9, weight: 1, overshoot: 0.15, funniest: 'belly', loves: 'basket', wary: 'brush', strokeLoved: 'belly', strokeSquirms: 'feet' },
  rabbit: { size: 0.5, tempo: 2.6, weight: 0.2, overshoot: 0.35, funniest: 'ears', loves: 'blanket', wary: 'basket', strokeLoved: 'ears', strokeSquirms: 'tail' },
  cat: { size: 0.6, tempo: 1.3, weight: 0.4, overshoot: 0, funniest: 'tail', loves: 'brush', wary: 'bowl', strokeLoved: 'chin', strokeSquirms: 'tail' },
  dog: { size: 0.7, tempo: 2.1, weight: 0.55, overshoot: 0.9, funniest: 'tongue', loves: 'bowl', wary: 'plaster', strokeLoved: 'ear', strokeSquirms: 'paws' },
  hedgehog: { size: 0.3, tempo: 3.2, weight: 0.1, overshoot: 0.5, funniest: 'spines', loves: 'plaster', wary: 'blanket', strokeLoved: 'nose', strokeSquirms: 'back' },
  duck: { size: 0.4, tempo: 1.7, weight: 0.3, overshoot: 0.65, funniest: 'feet', loves: 'bowl', wary: 'brush', strokeLoved: 'head', strokeSquirms: 'feet' },
}

/** How an animal takes a care thing. It decides the manner of the reaction and never whether the care helps. */
export type Taste = 'loves' | 'wary' | 'plain'

export function taste(species: Species, care: Care): Taste {
  const character = CAST[species]
  return character.loves === care ? 'loves' : character.wary === care ? 'wary' : 'plain'
}

/** How an animal takes a stroke at a spot. */
export type StrokeTaste = 'loved' | 'squirms' | 'leans'

export function strokeTaste(species: Species, spot: Spot): StrokeTaste {
  const character = CAST[species]
  return character.strokeLoved === spot ? 'loved' : character.strokeSquirms === spot ? 'squirms' : 'leans'
}

export function isSpecies(value: unknown): value is Species {
  return typeof value === 'string' && (SPECIES as readonly string[]).includes(value)
}
