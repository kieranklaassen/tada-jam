import { present, type Arrangement } from './arrangement'
import { otherPhase, type GuestId } from './guests'
import { moodOf } from './mood'
import { arrangementOf, type Stay } from './stay'

// What the idle ladder may show (guidance.ts): what can be touched, or one
// possible move, chosen from the house as it stands, and never an arrangement
// that settles the house. For this age help is something the child fetches:
// touching a guest shows what reaches it and where from. So a move shown here
// is one of the game's verbs and never says where anything should go: a
// waiting guest is lifted a little and put back, a cross guest is touched,
// the wheel is turned, the coach is touched. None of them changes who or
// what is where.

export type Hint =
  /** Lift a waiting guest a little and put it back where it stands: how a guest is picked up, and nothing about where it goes. */
  | { kind: 'lift'; guest: GuestId }
  /** Touch a cross guest, to see the house from its place. */
  | { kind: 'look'; guest: GuestId }
  /** Turn the wheel: everyone is content at this hour and somebody is not at the other. */
  | { kind: 'wheel' }
  /** Touch the coach: the cycle has been judged and the next coach-load waits. */
  | { kind: 'coach' }

/** The one move to show an idle child, or null when there is nothing to show. */
export function hintFor(stay: Stay): Hint | null {
  if (stay.finished) return { kind: 'coach' }
  const arrangement = arrangementOf(stay)
  const staying = present(arrangement)
  const waiting = staying.find((id) => arrangement.guests.some((guest) => guest.id === id && guest.at === 'lobby'))
  if (waiting) return { kind: 'lift', guest: waiting }
  const cross = (phase: Arrangement['phase']) => staying.filter((id) => !moodOf(arrangement, id, phase).content)
  const now = cross(arrangement.phase)
  // Not the guest the page is already drawn from: the child is looking from there.
  const next = now.find((id) => id !== stay.from)
  if (next) return { kind: 'look', guest: next }
  if (now.length === 0 && cross(otherPhase(arrangement.phase)).length > 0) return { kind: 'wheel' }
  return null
}
