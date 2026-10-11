import type { CreatureKind, HatKind } from './kinds'
import type { Mood } from './voices'

// The characters' fixed tastes (ART.md, "The characters and their fixed
// tastes"). Each creature loves one kind of hat, cannot stand one and simply
// wears the third, and this never changes, so a child can learn it and test
// it on purpose. A taste never changes what counts: a hat a creature cannot
// stand is still its one hat and stays on its head.

export type Taste = 'loves' | 'cannot-stand' | 'wears'

export const TASTES: Record<CreatureKind, Record<HatKind, Taste>> = {
  bop: { cone: 'loves', brim: 'cannot-stand', dome: 'wears' },
  lanky: { brim: 'loves', dome: 'cannot-stand', cone: 'wears' },
  flop: { dome: 'loves', cone: 'cannot-stand', brim: 'wears' },
  wig: { dome: 'loves', cone: 'cannot-stand', brim: 'wears' },
  pip: { cone: 'loves', dome: 'cannot-stand', brim: 'wears' },
}

export function tasteFor(creature: CreatureKind, hat: HatKind): Taste {
  return TASTES[creature][hat]
}

/**
 * The act a creature does when exactly this hat lands on it: its own, by
 * name, for the view and the sound to play. Fifteen acts, no two the same,
 * and every one ends with the hat on the head.
 */
export const ACTS: Record<CreatureKind, Record<HatKind, string>> = {
  bop: { cone: 'spins-until-dizzy', brim: 'walks-as-a-hat-with-legs', dome: 'bounces-twice' },
  lanky: { brim: 'stretches-and-struts', dome: 'goes-cross-eyed', cone: 'nods-slowly' },
  flop: { dome: 'flaps-ears-out', cone: 'huffs-it-askew', brim: 'tucks-ears-under' },
  wig: { dome: 'drums-its-belly', cone: 'pops-it-back-up-with-a-belly-bounce', brim: 'wobbles-once' },
  pip: { cone: 'tap-dances', dome: 'runs-a-circle-under-it', brim: 'peeks-from-under' },
}

/** The tune of the babble that goes with a taste: heard, never said. */
export function moodFor(taste: Taste): Mood {
  return taste === 'loves' ? 'glad' : taste === 'cannot-stand' ? 'grump' : 'plain'
}
