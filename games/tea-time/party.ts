import type { CupSize } from './forms'
import type { GuestId } from './world'

// The words the rules share: who comes to the table, what each one brings,
// and what is noted about a guest during a sitting. Types and the few numbers
// that are a guest's own; the rules that use them are in tastes.ts, order.ts,
// sitting.ts and save.ts.

/** The size of cup that holds a guest's amount when it is full: the thimble for the Mouse's drop, the middle cup for the Hen's half, a house cup for the Bear. A Duckling has no amount of its own and takes a house cup. */
export function cupSizeFor(who: GuestId): CupSize {
  return who === 'mouse' ? 'thimble' : who === 'hen' ? 'small' : 'house'
}

export const GUEST_IDS: readonly GuestId[] = ['bear', 'mouse', 'hen', 'duckling-a', 'duckling-b']

/** One guest of a party: who it is, and whether it brings its own ringed cup or comes with empty paws. */
export type PartyGuest = { who: GuestId; cup: 'own' | 'none' }

/** A party as the designed order lays it out, before anyone sits. Seats are the order of `guests`, left to right. */
export type Party = {
  guests: PartyGuest[]
  /** Plain cups with no ring that stand on the tray for guests who bring none, left to right. */
  trayCups: CupSize[]
  /** At the first two positions a guest lays its own saucer and spoon as it sits. */
  laysOwnPlace: boolean
}

/**
 * The amount of tea each guest likes, in cupfuls. It never changes, in any
 * position and with any cup. The ring painted in a guest's own cup stands at
 * this amount. The Ducklings have no amount of their own: each wants what its
 * twin has.
 */
export const LIKES: Record<'bear' | 'mouse' | 'hen', number> = { bear: 0.94, mouse: 0.15, hen: 0.5 }

/** How a guest's lift of its cup went, as the guest finds it. Nothing here is shown to the child as a verdict: the view plays what this much tea does. */
export type LiftTaste = 'right' | 'short' | 'over'

/**
 * A guest is noted once in a sitting. Not to taste: the first time it finds,
 * after a pour, more tea than it likes or tea in a cup too small for it. To
 * taste: it drinks without having been noted. Too little in a cup of the right
 * size is never noted, so a pour made in several presses is never a miss.
 */
export type GuestNote = 'to-taste' | 'not-to-taste'

/** What is noted about one guest during a sitting. */
export type GuestState = {
  who: GuestId
  /** 0 at the left; a party of n uses seats 0 to n - 1. */
  seat: number
  /** What is noted about this guest for the sitting: once, and never changed after. Null while nothing is noted yet. */
  note: GuestNote | null
  /** It has drunk a cup to its taste in this sitting. */
  content: boolean
}

/** The ideas a guest shows once, each with its own stored mark. */
export const SHOWINGS = ['pour', 'lay', 'halfway', 'twins', 'sizes'] as const
export type Showing = (typeof SHOWINGS)[number]
