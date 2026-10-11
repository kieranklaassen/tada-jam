// The things of the game and their names in a save. Nothing here is drawn or
// heard; the grid these stand for is in ART.md.

/** The seven paper garments, in the order they hang on the rack. */
export const GARMENTS = ['raincoat', 'duffel', 'boots', 'hat', 'scarf', 'mittens', 'umbrella'] as const
export type Garment = (typeof GARMENTS)[number]

/** The three paper figures. */
export const FIGURES = ['child', 'grandfather', 'baby'] as const
export type Figure = (typeof FIGURES)[number]

/** Whoever can wear something: a figure, or the dog. */
export const WEARERS = [...FIGURES, 'dog'] as const
export type Wearer = (typeof WEARERS)[number]

/** The parts of a figure a garment can be tabbed onto, from the top down. */
export const PARTS = ['head', 'neck', 'body', 'hands', 'feet'] as const
export type Part = (typeof PARTS)[number]

/** A part of a figure, or the dog's one part. */
export type SpotPart = Part | 'back'
export type Spot = { who: Wearer; part: SpotPart }

/** Where a garment is: on the rack, or on a part of a wearer. */
export type Where = 'rack' | Spot

/** The part each garment was cut for. */
export const BELONGS: Record<Garment, Part> = { raincoat: 'body', duffel: 'body', boots: 'feet', hat: 'head', scarf: 'neck', mittens: 'hands', umbrella: 'hands' }

/** The garments that are a pair, drawn as two pieces. */
export const PAIRS: readonly Garment[] = ['boots', 'mittens']

/** The raincoat's zip has this many teeth. */
export const ZIP_TEETH = 12
/** The boots are fully on after this many tugs. */
export const TUG_STEPS = 3
/** The duffel coat's buttons. */
export const BUTTONS = 3
/** How many tabs each garment folds over when it goes on. */
export const TABS: Record<Garment, number> = { raincoat: 4, duffel: 4, boots: 2, hat: 2, scarf: 2, mittens: 2, umbrella: 1 }

/** Every spot there is: five parts on each figure, and the dog's back. */
export const SPOTS: readonly Spot[] = [...FIGURES.flatMap((who) => PARTS.map((part): Spot => ({ who, part }))), { who: 'dog', part: 'back' }]

export function partsOf(who: Wearer): readonly SpotPart[] {
  return who === 'dog' ? ['back'] : PARTS
}

export function sameSpot(a: Where, b: Where): boolean {
  if (a === 'rack' || b === 'rack') return a === b
  return a.who === b.who && a.part === b.part
}

/** Whether a garment on that spot is where it was cut for. The dog's back is nobody's place. */
export function belongsAt(garment: Garment, spot: Spot): boolean {
  return spot.part === BELONGS[garment]
}
