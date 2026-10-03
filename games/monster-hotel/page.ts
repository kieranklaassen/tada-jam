import { arrivalsAt } from './airs'
import { awake, holds, placeOf, type Arrangement } from './arrangement'
import { castById } from './casts'
import { LADDER, WHOLE_PATHS_UNTIL } from './config'
import { demandOf } from './demand'
import type { GuestId } from './guests'
import type { InkAir, InkGuest, InkScene } from './inkScene'
import { moodOf, turnsTo } from './mood'
import { arrangementOf, type Stay } from './stay'

// From the rules to the page: everything the ink page draws is worked out
// here from an arrangement, and nothing is stored. The same arrangement
// always gives the same page.

/** Each air that crosses a wall or a floor at this hour, by the rooms it passes through. Warmth and cold that share a way add up; noise and smell keep the strongest. */
function airsOf(arrangement: Arrangement, wholePaths: boolean): InkAir[] {
  const airs = new Map<string, InkAir>()
  for (const arrival of arrivalsAt(arrangement, arrangement.phase)) {
    if (arrival.path.length < 2) continue
    // Past the early places the plain page shows the last crossing only; the whole way is seen from the cross guest's own place.
    const rooms = wholePaths ? [...arrival.path] : arrival.path.slice(-2)
    const kind = arrival.source.air
    const key = `${kind}:${rooms.join('-')}`
    const known = airs.get(key)
    if (!known) airs.set(key, { kind, rooms, level: arrival.level })
    else known.level = kind === 'warm' || kind === 'cold' ? known.level + arrival.level : Math.max(known.level, arrival.level)
  }
  return [...airs.values()]
}

function guestOf(arrangement: Arrangement, id: GuestId): InkGuest | null {
  const at = placeOf(arrangement, id)
  if (at === null || at === 'gone') return null
  const isAwake = awake(arrangement, id, arrangement.phase)
  const wrapped = holds(arrangement, id, 'quilt')
  // A guest with no room yet is not cross with the house: it waits by its bag and stares at the door it wants.
  if (at === 'lobby') return { id, place: 'lobby', awake: true, mood: 'content', turnedTo: null, wrapped, staresAt: demandOf(arrangement.house, id) }
  if (at === 'bench') return { id, place: 'bench', awake: true, mood: 'content', turnedTo: null, wrapped, staresAt: null }
  const mood = moodOf(arrangement, id, arrangement.phase)
  return {
    id,
    place: { room: at },
    awake: isAwake,
    mood: !mood.content ? 'cross' : mood.delights.length > 0 ? 'happier' : 'content',
    turnedTo: turnsTo(arrangement, id, arrangement.phase),
    wrapped,
    staresAt: null,
  }
}

/** The page for an arrangement, drawn from one guest's place or as the plain page. */
export function pageOfArrangement(arrangement: Arrangement, from: GuestId | null, wholePaths: boolean): InkScene {
  return {
    house: arrangement.house,
    phase: arrangement.phase,
    guests: arrangement.guests.flatMap((guest) => guestOf(arrangement, guest.id) ?? []),
    things: arrangement.things.map((item) => ({ kind: item.kind, at: item.at, dial: item.dial })),
    airs: airsOf(arrangement, wholePaths),
    from,
  }
}

/** The page for the stay as it was left. */
export function pageOf(stay: Stay): InkScene {
  const cast = castById(stay.cast)
  const early = cast ? LADDER.indexOf(cast.position) <= LADDER.indexOf(WHOLE_PATHS_UNTIL) : true
  return pageOfArrangement(arrangementOf(stay), stay.from, early)
}
