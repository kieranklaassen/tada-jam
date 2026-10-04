import { arrivalsAt, temperature, type Arrival } from './airs'
import { awake, holds, placeOf, type Arrangement } from './arrangement'
import { castById } from './casts'
import { LADDER, WHOLE_PATHS_UNTIL } from './config'
import { demandOf } from './demand'
import { bunchedAt, doingAt } from './hours'
import { TASTES, type GuestId } from './guests'
import type { InkAir, InkGuest, InkScene, InkTaken, InkView } from './inkScene'
import { leansTo, moodOf, turnsTo } from './mood'
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
  // Warmth and cold are minded only when they have pushed the room out of the guest's comfort, as the rules of its mood say: a warmth that a cold
  // cancels troubles nobody. Loved, by a creature that needs them, whenever they are not that.
  const [coldest, warmest] = taste.comfort
  // The room as it would be with this guest in it: a guest held over another room brings what it carries.
  const temp = temperature(arrangement, arrival.room) + (placeOf(arrangement, viewer) === arrival.room ? 0 : taste.carries)
  if (air === 'warm') return temp > warmest ? 'minded' : coldest >= 1 ? 'loved' : 'faint'
  return temp < coldest ? 'minded' : warmest <= -1 ? 'loved' : 'faint'
}

/** Whether an air arriving in a room is minded or loved by a guest who lodges there. */
function mattersThere(arrangement: Arrangement, arrival: Arrival): boolean {
  return arrangement.guests.some((guest) => guest.at === arrival.room && takes(arrangement, guest.id, arrival) !== 'faint')
}

/**
 * Each air of this hour, by the rooms it passes through: the one room it is
 * made in, and every way it crosses a wall or a floor from there. Warmth and
 * cold that share a way add up; noise and smell keep the strongest. On a page drawn from a guest's place, an air that ends
 * in that guest's room (or in the room it is held over) is marked by how the
 * guest takes it, and every other air is nothing to it.
 */
function airsOf(arrangement: Arrangement, wholePaths: boolean, view: InkView | null): InkAir[] {
  const airs = new Map<string, InkAir>()
  const rank: Record<InkTaken, number> = { plain: 0, faint: 1, loved: 2, minded: 3 }
  for (const arrival of arrivalsAt(arrangement, arrangement.phase)) {
    // A guest's own making is on its page even before it crosses a wall: it is what it is proud of.
    const own = view !== null && 'guest' in arrival.source.by && arrival.source.by.guest === view.from
    // Past the early places the plain page thins: a crossing is drawn only where it is somebody's trouble or
    // somebody's delight, and it is the last one, into that guest's room. The whole way is seen from the guest's own place.
    if (view === null && !wholePaths && arrival.path.length > 1 && !mattersThere(arrangement, arrival)) continue
    // What has crossed nothing is kept too, as an air of one room: a trouble can be made in the very room it is minded in
    // (the boiler under the yeti, a room-mate's stew, the fly's buzz), and from the cross guest's place it is inked there.
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
  // From a guest's place, what it minds or loves is marked the whole way back: every stretch of the way that
  // air came by, and the room it is made in, take the same hand as the last crossing, back to the guest or thing it starts from.
  if (view !== null) {
    for (const arrival of arrivalsAt(arrangement, arrangement.phase)) {
      if (arrival.room !== view.room || arrival.path.length < 2) continue
      const taken = takes(arrangement, view.from, arrival)
      if (taken !== 'minded' && taken !== 'loved') continue
      for (let length = 1; length < arrival.path.length; length++) {
        const stretch = airs.get(`${arrival.source.air}:${arrival.path.slice(0, length).join('-')}`)
        if (stretch && rank[taken] > rank[stretch.taken ?? 'plain']) stretch.taken = taken
      }
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
  const kinds = mood.grievances.map((grievance) => grievance.kind)
  return {
    id,
    place: { room: at },
    awake: isAwake,
    mood: !mood.content ? 'cross' : mood.delights.length > 0 ? 'happier' : 'content',
    // A cross guest turns to where its trouble comes through; a happier one leans to where its delight does.
    // The cook, with its cauldron at its back, hums where it stands: turned about, the cauldron would be in the wall.
    turnedTo: !mood.content ? turnsTo(arrangement, id, arrangement.phase) : mood.delights.length > 0 && id !== 'cook' ? leansTo(arrangement, id, arrangement.phase) : null,
    wrapped,
    staresAt: null,
    ...(kinds.includes('din') && !kinds.includes('too-cold') && !kinds.includes('too-warm') ? { woken: true } : {}),
  }
}

/**
 * What the guest whose page it is must have and has not got, when there is
 * nothing in the house to blame for it: a warm room for a guest that needs
 * one, a listener for the singer. Its worry is on its own page even then.
 */
function wantsOf(arrangement: Arrangement, id: GuestId): InkScene['wants'] {
  const room = placeOf(arrangement, id)
  if (typeof room !== 'number') return null
  const kinds = moodOf(arrangement, id, arrangement.phase).grievances.map((grievance) => grievance.kind)
  if (kinds.includes('unheard')) return { room, kind: 'heard' }
  return kinds.includes('too-cold') && TASTES[id].comfort[0] >= 1 ? { room, kind: 'warm' } : null
}

/** Whether the pipe, let through a wall or a floor, is carrying something at this hour that would not pass without it. */
function carrying(arrangement: Arrangement): boolean {
  const doing = doingAt(arrangement, { thing: 'pipe' }, arrangement.phase)
  return doing.kind === 'carries' && doing.airs.length > 0
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
    bunches: bunchedAt(arrangement, arrangement.phase),
    passing: carrying(arrangement),
    ...(from !== null ? { wants: wantsOf(arrangement, from) } : {}),
    ...(roomed && from !== null && demandOf(arrangement.house, from) !== placeOf(arrangement, from) ? { asked: demandOf(arrangement.house, from) } : {}),
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
