// What an animal can need, what the child can give, and which gives fit.
// Pure data and pure functions: no renderer, no DOM, no clock.
//
// Of the five cares, only water is named by a record (us-ca 3.7 and us-ca
// K-LS1-1; nl Groeien, bloeien en voortplanten / 1). The five signs and the
// pairing of each sign with its care are the game's own design and rest on
// no record (ART.md, "The records").

/** The care things, in the order the designed order brings them onto the cart. */
export const CARES = ['bowl', 'blanket', 'plaster', 'brush', 'basket'] as const
export type Care = (typeof CARES)[number]

/** The needs, in the order the designed order brings them into play: each arrives with the care at the same index. */
export const NEEDS = ['thirsty', 'cold', 'sore', 'itchy', 'scared'] as const
export type Need = (typeof NEEDS)[number]

/** The one care that fits each need, for every animal. A taste never changes this. */
export const FITS: Readonly<Record<Need, Care>> = {
  thirsty: 'bowl',
  cold: 'blanket',
  sore: 'plaster',
  itchy: 'brush',
  scared: 'basket',
}

/** What the body does for each need: the movement a child reads. */
export type Movement = 'droops' | 'shivers' | 'limps' | 'scratches' | 'hides'
export const MOVEMENT: Readonly<Record<Need, Movement>> = {
  thirsty: 'droops',
  cold: 'shivers',
  sore: 'limps',
  itchy: 'scratches',
  scared: 'hides',
}

/** Where on the body each need shows, which is also where the care that fits goes. */
export type Place = 'mouth' | 'body' | 'paw' | 'fur' | 'hiding'
export const PLACE: Readonly<Record<Need, Place>> = {
  thirsty: 'mouth',
  cold: 'body',
  sore: 'paw',
  itchy: 'fur',
  scared: 'hiding',
}

/** The face that goes with each need: a few simple feelings, never a mixed or a hidden one. */
export type Face = 'worn-out' | 'miserable' | 'hurting' | 'bothered' | 'afraid'
export const FACE: Readonly<Record<Need, Face>> = {
  thirsty: 'worn-out',
  cold: 'miserable',
  sore: 'hurting',
  itchy: 'bothered',
  scared: 'afraid',
}

/**
 * How plainly a sign is shown. Quiet is the movement alone and small; plain is
 * the movement large, with the face; open is the animal turned to the child,
 * showing the place itself. No step points at a care thing.
 */
export type Step = 0 | 1 | 2
export const QUIET: Step = 0
export const PLAIN: Step = 1
export const OPEN: Step = 2

/** One step plainer, staying at open. A sign never moves back down within a patient. */
export function plainer(step: Step): Step {
  return step === QUIET ? PLAIN : OPEN
}

export function fits(care: Care, need: Need): boolean {
  return FITS[need] === care
}

/** The need a care thing is for. */
export function needFor(care: Care): Need {
  return NEEDS[CARES.indexOf(care)]
}

export function isCare(value: unknown): value is Care {
  return typeof value === 'string' && (CARES as readonly string[]).includes(value)
}

export function isNeed(value: unknown): value is Need {
  return typeof value === 'string' && (NEEDS as readonly string[]).includes(value)
}

export function isStep(value: unknown): value is Step {
  return value === QUIET || value === PLAIN || value === OPEN
}
