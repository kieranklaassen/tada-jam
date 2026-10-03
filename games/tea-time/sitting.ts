import type { GuestState, Party } from './party'
import type { CycleOutcome } from './state'
import type { Lift } from './tastes'
import type { GuestId } from './world'

// One sitting, and how it went. A sitting is one cycle of the game: a party
// sits at the table until every guest has drunk a cup to its taste. Each
// guest is noted once in a sitting, as to taste or not, and when the sitting
// ends the notes say how it went; state.ts moves the position by that.
// Nothing here is shown to the child.
//
// What is noted, and what is not:
// - Not to taste: the first time a guest finds, after a pour, more tea than
//   it likes, or tea in a cup too small for it. For a Duckling, more than it
//   likes is more than its twin's cup holds, once the twin's cup holds tea.
// - Too little in a cup of the right size is never noted. A child may pour in
//   as many presses as it likes, and creeping up to a ring is never a miss.
// - To taste: a guest that drinks a cup to its taste without having been
//   noted.
//
// Every function returns a new list and leaves the one it was given alone, so
// the saved copy and the one on screen never share a guest.

/** A party sits down: seats left to right in the party's order, nothing is noted, nobody has drunk. */
export function seatParty(party: Party): GuestState[] {
  return party.guests.map((guest, seat) => ({ who: guest.who, seat, note: null, content: false }))
}

/** What a lift adds to a guest's note when nothing is noted yet: a miss, a hit, or nothing at all. */
function noteOf(lift: Lift): GuestState['note'] {
  if (lift.taste === 'over' || lift.details.includes('cup-too-small')) return 'not-to-taste'
  if (lift.taste === 'right' && lift.drinks) return 'to-taste'
  return null
}

/**
 * A guest lifted its cup and found the tea this way (`judgeLift` in
 * tastes.ts). A note is made once and stays as it was made. A guest that has
 * drunk a cup to its taste stays content, whatever it lifts afterwards. A
 * guest who is not at the table changes nothing.
 */
export function noteLift(guests: readonly GuestState[], who: GuestId, lift: Lift): GuestState[] {
  return guests.map((guest) => guest.who !== who
    ? { ...guest }
    : { ...guest, note: guest.note ?? noteOf(lift), content: guest.content || (lift.taste === 'right' && lift.drinks) })
}

/** The sitting is over when every guest has drunk a cup to its taste. An empty table is never a finished sitting. */
export function sittingEnded(guests: readonly GuestState[]): boolean {
  return guests.length > 0 && guests.every((guest) => guest.content)
}

/** How many guests are noted as to taste. */
export function notedToTaste(guests: readonly GuestState[]): number {
  return guests.filter((guest) => guest.note === 'to-taste').length
}

/**
 * How the sitting went, by the notes alone: well when every guest was noted
 * as to taste, badly when there were two or more guests and none was, and
 * mixed for anything else. One guest alone never goes badly, and a table
 * where some guest has no note yet is mixed, so a sitting that is judged
 * early moves nothing.
 */
export function outcomeOf(guests: readonly GuestState[]): CycleOutcome {
  if (guests.length === 0 || guests.some((guest) => guest.note === null)) return 'mixed'
  const hits = notedToTaste(guests)
  if (hits === guests.length) return 'well'
  return hits === 0 && guests.length >= 2 ? 'badly' : 'mixed'
}
