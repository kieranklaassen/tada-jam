import { freeBeds, present, type Arrangement } from './arrangement'
import { demandOf } from './demand'
import { otherPhase, type GuestId } from './guests'
import { roomCount } from './hotel'
import { moodOf } from './mood'
import { arrangementOf, type Stay } from './stay'

// What the idle ladder may show (guidance.ts): one move the child could make
// now, chosen from the house as it stands, and never a solution. For this age
// help is something the child fetches, so the move shown is always one of the
// game's verbs and never where anything should go: a waiting guest is carried
// to the door it asks for, which is its own wish and often the wrong room; a
// cross guest is touched, which only draws the page from its place.

export type Hint =
  /** Carry a waiting guest to a room: the one it stares at if it has a bed free, or the nearest that has. */
  | { kind: 'carry'; guest: GuestId; room: number }
  /** Touch a cross guest, to see the house from its place. */
  | { kind: 'look'; guest: GuestId }
  /** Turn the wheel: everyone is content at this hour and somebody is not at the other. */
  | { kind: 'wheel' }
  /** Touch the coach: the cycle has been judged and the next coach-load waits. */
  | { kind: 'coach' }

function roomWithBed(arrangement: Arrangement, wanted: number): number | null {
  const rooms = roomCount(arrangement.house.shape)
  // The room asked for, then the others nearest to it by number.
  const order = Array.from({ length: rooms }, (_, room) => room).sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || b - a)
  return order.find((room) => freeBeds(arrangement, room) > 0) ?? null
}

/** The one move to show an idle child, or null when there is nothing to show. */
export function hintFor(stay: Stay): Hint | null {
  if (stay.finished) return { kind: 'coach' }
  const arrangement = arrangementOf(stay)
  const staying = present(arrangement)
  for (const id of staying) {
    if (arrangement.guests.find((guest) => guest.id === id)!.at !== 'lobby') continue
    const room = roomWithBed(arrangement, demandOf(arrangement.house, id))
    if (room !== null) return { kind: 'carry', guest: id, room }
  }
  const cross = (phase: Arrangement['phase']) => staying.filter((id) => !moodOf(arrangement, id, phase).content)
  const now = cross(arrangement.phase)
  // Not the guest the page is already drawn from: the child is looking from there.
  const next = now.find((id) => id !== stay.from)
  if (next) return { kind: 'look', guest: next }
  if (now.length === 0 && cross(otherPhase(arrangement.phase)).length > 0) return { kind: 'wheel' }
  return null
}
