import type { GuestState, LiftTaste, Party } from './party'
import type { CycleOutcome } from './state'
import type { GuestId } from './world'

// One sitting, and how it went. A sitting is one cycle of the game: a party
// sits at the table until every guest has drunk a cup to its taste. What is
// noted about each guest is its first lift of the cup and whether it has
// drunk; when the sitting ends, the first lifts say how it went, and state.ts
// moves the position by that. Nothing here is shown to the child.
//
// Every function returns a new list and leaves the one it was given alone, so
// the saved copy and the one on screen never share a guest.

/** A party sits down: seats left to right in the party's order, nobody has lifted a cup, nobody has drunk. */
export function seatParty(party: Party): GuestState[] {
  return party.guests.map((guest, seat) => ({ who: guest.who, seat, firstLift: null, content: false }))
}

/**
 * A guest lifted its cup and found the tea this way. The first lift of a
 * sitting is noted once and stays as it was noted. A guest that has drunk a
 * cup to its taste stays content, whatever it lifts afterwards. A guest who is
 * not at the table changes nothing.
 */
export function noteLift(guests: readonly GuestState[], who: GuestId, taste: LiftTaste): GuestState[] {
  return guests.map((guest) => guest.who !== who
    ? { ...guest }
    : { ...guest, firstLift: guest.firstLift ?? taste, content: guest.content || taste === 'right' })
}

/** The sitting is over when every guest has drunk a cup to its taste. An empty table is never a finished sitting. */
export function sittingEnded(guests: readonly GuestState[]): boolean {
  return guests.length > 0 && guests.every((guest) => guest.content)
}

/** How many guests found their first cup to their taste. */
export function firstLiftsRight(guests: readonly GuestState[]): number {
  return guests.filter((guest) => guest.firstLift === 'right').length
}

/**
 * How the sitting went, by the first lifts alone: well when every one was to
 * taste, badly when there were two or more guests and none was, and mixed for
 * anything else. One guest alone never goes badly, and a table where some
 * guest has not lifted a cup yet is mixed, so a sitting that is judged early
 * moves nothing.
 */
export function outcomeOf(guests: readonly GuestState[]): CycleOutcome {
  if (guests.length === 0 || guests.some((guest) => guest.firstLift === null)) return 'mixed'
  const right = firstLiftsRight(guests)
  if (right === guests.length) return 'well'
  return right === 0 && guests.length >= 2 ? 'badly' : 'mixed'
}
