import { LADDER } from './config'

// What each place of the designed order lays out (ART.md, "The designed
// order"). The ids are the ones in `LADDER` in config.ts, which is what a
// save stores: they name a place in this game's own order and nothing else.
// Each place adds one new thing, or combines two that are known.

/**
 * The three ways of asking.
 * - `seek`: a grown one asks at the stone, and the child finds its own among the hides.
 * - `who`: the hidden one asks from an egg at the stone, and the child sends the grown one whose voice it is.
 * - `alike`: nobody asks; the first one the child lets out asks for the other that sounds like it.
 */
export type Form = 'seek' | 'who' | 'alike'

export const FORMS: readonly Form[] = ['seek', 'who', 'alike']

export type Place = {
  form: Form
  /** How many stand in the row when the clutch comes in. */
  row: 2 | 3 | 4
  /** `far`: every kind of another family. `near`: both kinds of one family, and one of another. */
  voices: 'far' | 'near'
  /** Leaf piles: a hide that rustles the same way whoever calls from it, so it is told by ear alone. */
  leaves: boolean
}

export const PLACES: Readonly<Record<string, Place>> = {
  'two-eggs': { form: 'seek', row: 2, voices: 'far', leaves: false },
  'three-eggs': { form: 'seek', row: 3, voices: 'far', leaves: false },
  'near-voice': { form: 'seek', row: 3, voices: 'near', leaves: false },
  'leaf-piles': { form: 'seek', row: 3, voices: 'far', leaves: true },
  'near-in-leaves': { form: 'seek', row: 3, voices: 'near', leaves: true },
  'who-is-inside': { form: 'who', row: 3, voices: 'near', leaves: false },
  'two-alike': { form: 'alike', row: 4, voices: 'far', leaves: false },
}

/** Never more than this many in the row: the child may tip one more egg in from the basket while there is room. */
export const ROW_MAX = 4

/** The place for an id, and the first place for an id this build does not know. */
export function placeOf(id: string): Place {
  return PLACES[id] ?? PLACES[LADDER[0]]
}

/**
 * What a place brings that no place before it has: a way of asking, a size of row, near voices, leaf piles.
 * An empty answer is a combination of things already met. Four in the row is what `alike` is (two pairs), so
 * there the size is part of the way of asking and is not counted beside it.
 */
export function newIn(id: string): string[] {
  const at = LADDER.indexOf(id)
  if (at <= 0) return ['the game']
  const features = (place: Place) => [`form:${place.form}`, ...(place.form === 'alike' ? [] : [`row:${place.row}`]), `voices:${place.voices}`, `leaves:${place.leaves}`]
  const met = new Set(LADDER.slice(0, at).flatMap((earlier) => features(PLACES[earlier])))
  return features(PLACES[id]).filter((feature) => !met.has(feature))
}
