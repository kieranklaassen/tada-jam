import { arrivalsAt, type Arrival } from './airs'
import { awake, holds, placeOf, type Arrangement } from './arrangement'
import { castById } from './casts'
import { LADDER, WHOLE_PATHS_UNTIL } from './config'
import { demandOf } from './demand'
import { TASTES, type GuestId } from './guests'
import type { InkAir, InkGuest, InkScene, InkTaken, InkView } from './inkScene'
import { moodOf, turnsTo } from './mood'
import { arrangementOf, type Stay } from './stay'

// From the rules to the page: everything the ink page draws is worked out
// here from an arrangement, and nothing is stored. The same arrangement
// always gives the same page.

/** How a guest in a room takes one arriving air at this hour: what it makes itself and what it loves are `loved`, what it minds is `minded`, and the rest is nothing to it. */
export function takes(arrangement: Arrangement, viewer: GuestId, arrival: Arrival): InkTaken {
  const air = arrival.source.air
  if ('guest' in arrival.source.by && arrival.source.by.guest === viewer) return 'loved'
  const taste = TASTES[viewer]
  const isAwake = awake(arrangement, viewer, arrangement.phase)
  if (air === 'din' || air === 'pong') {
    if (isAwake && taste.loves.includes(air)) return 'loved'
    const minds = air === 'din' ? taste.mindsDin : taste.mindsPong
    return minds === 'always' || (minds === 'asleep' && !isAwake) ? 'minded' : 'faint'
  }
  // Warmth and cold: loved by a creature that needs them, minded by one they push out of its comfort.
  const [coldest, warmest] = taste.comfort
  if (air === 'warm') return coldest >= 1 ? 'loved' : warmest <= 0 ? 'minded' : 'faint'
  return warmest <= -1 ? 'loved' : coldest >= 0 ? 'minded' : 'faint'
}

/**
 * Each air that crosses a wall or a floor at this hour, by the rooms it
 * passes through. Warmth and cold that share a way add up; noise and smell
 * keep the strongest. On a page drawn from a guest's place, an air that ends
 * in that guest's room (or in the room it is held over) is marked by how the
 * guest takes it, and every other air is nothing to it.
 */
function airsOf(arrangement: Arrangement, wholePaths: boolean, view: InkView | null): InkAir[] {
  const airs = new Map<string, InkAir>()
  const rank: Record<InkTaken, number> = { plain: 0, faint: 1, loved: 2, minded: 3 }
  for (const arrival of arrivalsAt(arrangement, arrangement.phase)) {
    // A guest's own making is on its page even before it crosses a wall: it is what it is proud of.
    const own = view !== null && 'guest' in arrival.source.by && arrival.source.by.guest === view.from
    if (arrival.path.length < 2) continue
    // Past the early places the plain page shows the last crossing only; the whole way is seen from the cross guest's own place.
    const rooms = wholePaths || view !== null ? [...arrival.path] : arrival.path.slice(-2)
    const kind = arrival.source.air
    const taken: InkTaken = view === null ? 'plain' : own ? 'loved' : arrival.room === view.room ? takes(arrangement, view.from, arrival) : 'faint'
    const key = `${kind}:${rooms.join('-')}`
    const known = airs.get(key)
    if (!known) airs.set(key, view === null ? { kind, rooms, level: arrival.level } : { kind, rooms, level: arrival.level, taken })
    else {
      known.level = kind === 'warm' || kind === 'cold' ? known.level + arrival.level : Math.max(known.level, arrival.level)
      if (view !== null && rank[taken] > rank[known.taken ?? 'plain']) known.taken = taken
    }
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

/** The room a guest's page is drawn large: its own, or the one it asks for while it has none. */
export function ownRoom(arrangement: Arrangement, id: GuestId): number | null {
  const at = placeOf(arrangement, id)
  if (typeof at === 'number') return at
  return at === 'lobby' || at === 'bench' ? demandOf(arrangement.house, id) : null
}

/**
 * The page for an arrangement, drawn from one guest's place or as the plain
 * page. `room` is the large room of the view when it is not the guest's own:
 * the room a carried guest is held over.
 */
export function pageOfArrangement(arrangement: Arrangement, from: GuestId | null, wholePaths: boolean, room?: number | null): InkScene {
  // Its own room is drawn large. A guest with no room yet has none to draw large: the room it asks for keeps its
  // ink, at its own size, and so does the room a carried guest is held over.
  const roomed = from !== null && typeof placeOf(arrangement, from) === 'number'
  const view: InkView | null = from === null ? null : room === undefined ? (roomed ? { from, room: ownRoom(arrangement, from) } : { from, room: ownRoom(arrangement, from), large: false }) : { from, room, large: false }
  return {
    house: arrangement.house,
    phase: arrangement.phase,
    guests: arrangement.guests.flatMap((guest) => guestOf(arrangement, guest.id) ?? []),
    things: arrangement.things.map((item) => ({ kind: item.kind, at: item.at, dial: item.dial })),
    airs: airsOf(arrangement, wholePaths, view),
    from,
    ...(view ? { view } : {}),
  }
}

/** The page for the stay as it was left. */
export function pageOf(stay: Stay): InkScene {
  const cast = castById(stay.cast)
  const early = cast ? LADDER.indexOf(cast.position) <= LADDER.indexOf(WHOLE_PATHS_UNTIL) : true
  return pageOfArrangement(arrangementOf(stay), stay.from, early)
}
