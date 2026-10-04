import { freeBeds, isEdgeAt, isGuestAt, isRoomAt, occupants, placeOf, roomOf, thing, type Arrangement, type Dial, type GuestAt, type Lodger, type Thing, type ThingAt, type ThingKind } from './arrangement'
import { TASTES, otherPhase, type GuestId } from './guests'
import { anyEdgeById, roomCount } from './hotel'

// The object-by-action grid as rules: what happens when a guest or a thing is
// set down somewhere or tapped. Every cell works, none is refused, and each
// has a name of its own, which the view answers with its own sight and sound
// (pack: game-design, depth-from-combinations.md). The "wrong" uses change the
// house as truly as the right ones.

export type Held = { guest: GuestId } | { thing: ThingKind }

/** Where something is set down. A wall or a floor comes with the room on the nearer side of the finger. */
export type Target = { room: number } | { guest: GuestId } | { edge: string; nearer: number } | 'cupboard' | 'lobby' | 'bench' | 'coach'

export type Outcome =
  // a guest: set down in a room, given to a guest, fixed to a wall, tapped
  | 'moves-in' | 'shares' | 'swaps' | 'through-the-wall' | 'looks-from'
  // the quilt
  | 'quilt-on-bed' | 'wraps' | 'quilt-hangs' | 'feathers'
  // the pipe
  | 'pipe-stands' | 'trumpet' | 'pipe-joins' | 'toots'
  // the stove
  | 'stove-warms' | 'stove-to-guest' | 'stove-scorches' | 'stove-dial'
  // the ice box
  | 'ice-chills' | 'ice-to-guest' | 'ice-frosts' | 'ice-dial'
  // the alarm clock: kept by a guest who will change its hours, shrugged off by one who will not
  | 'clock-by-bed' | 'clock-kept' | 'clock-shrugged-off' | 'clock-on-wall' | 'clock-rings'
  // around the grid
  | 'to-lobby' | 'to-bench' | 'to-cupboard' | 'handed-back' | 'sent-away' | 'wheel-turns' | 'nothing'

export type Move = {
  arrangement: Arrangement
  outcome: Outcome
  /** A set-down that changed who or what is where. Only these are counted when a cycle is judged; taps and the wheel never are. */
  changed: boolean
}

const same = (arrangement: Arrangement, outcome: Outcome = 'nothing'): Move => ({ arrangement, outcome, changed: false })

function withGuests(arrangement: Arrangement, places: Partial<Record<GuestId, GuestAt>>): Arrangement {
  return { ...arrangement, guests: arrangement.guests.map((guest): Lodger => (guest.id in places ? { id: guest.id, at: places[guest.id]! } : guest)) }
}

function withThing(arrangement: Arrangement, kind: ThingKind, change: Partial<Thing>): Arrangement {
  return { ...arrangement, things: arrangement.things.map((item) => (item.kind === kind ? { ...item, ...change } : item)) }
}

function sameAt(a: ThingAt, b: ThingAt): boolean {
  if (a === 'cupboard' || b === 'cupboard') return a === b
  if (isRoomAt(a)) return isRoomAt(b) && a.room === b.room
  if (isEdgeAt(a)) return isEdgeAt(b) && a.edge === b.edge
  return isGuestAt(b) && a.guest === b.guest
}

/** Whether a room number or an edge id is one of this house's. A target that is not is answered with `nothing`. */
function knownRoom(arrangement: Arrangement, room: number): boolean {
  return Number.isInteger(room) && room >= 0 && room < roomCount(arrangement.house.shape)
}

function guestToRoom(arrangement: Arrangement, id: GuestId, room: number): Move {
  if (!knownRoom(arrangement, room)) return same(arrangement)
  const from = placeOf(arrangement, id)!
  if (from === room) return same(arrangement)
  if (freeBeds(arrangement, room) > 0) return { arrangement: withGuests(arrangement, { [id]: room }), outcome: 'moves-in', changed: true }
  const there = occupants(arrangement, room)
  // A room that is full: the newcomer changes places with the one who lodges there, and where two do, with the second of them. Nobody is turned back.
  return guestToGuest(arrangement, id, there[there.length - 1])
}

/** Where a guest goes when another takes its room: back to where that one came from, or the lobby if that was the bench and it may not sit there. */
function placeFor(arrangement: Arrangement, id: GuestId, at: GuestAt): GuestAt {
  return at === 'bench' && arrangement.bench !== id ? 'lobby' : at
}

function guestToGuest(arrangement: Arrangement, id: GuestId, other: GuestId): Move {
  const from = placeOf(arrangement, id), to = placeOf(arrangement, other)
  if (from === null || to === null || id === other || from === to || to === 'gone') return same(arrangement)
  // Given to the guest on the bench, the two change places as any two do: the bench guest comes in and takes the carried one's place, and the carried one, who may not sit on the bench, waits in the lobby.
  if (to === 'bench') return { arrangement: withGuests(arrangement, { [other]: from, [id]: 'lobby' }), outcome: 'swaps', changed: true }
  if (typeof to === 'number' && freeBeds(arrangement, to) > 0) return { arrangement: withGuests(arrangement, { [id]: to }), outcome: 'shares', changed: true }
  return { arrangement: withGuests(arrangement, { [id]: to, [other]: placeFor(arrangement, other, from) }), outcome: 'swaps', changed: true }
}

function guestTo(arrangement: Arrangement, id: GuestId, target: Target): Move {
  const from = placeOf(arrangement, id)
  if (from === null || from === 'gone') return same(arrangement)
  if (target === 'coach') return sendAway(arrangement)
  if (target === 'cupboard') return same(arrangement)
  if (target === 'lobby' || target === 'bench') {
    const to: GuestAt = target === 'bench' && arrangement.bench === id ? 'bench' : 'lobby'
    return from === to ? same(arrangement) : { arrangement: withGuests(arrangement, { [id]: to }), outcome: to === 'bench' ? 'to-bench' : 'to-lobby', changed: true }
  }
  if ('guest' in target) return guestToGuest(arrangement, id, target.guest)
  if ('edge' in target) {
    // It sticks half through the plaster, then steps out into the nearer room, by the same rules as being set down there.
    if (!anyEdgeById(arrangement.house.shape, target.edge)) return same(arrangement)
    const after = guestToRoom(arrangement, id, target.nearer)
    return { ...after, outcome: 'through-the-wall' }
  }
  return guestToRoom(arrangement, id, target.room)
}

/** Every guest of the cast leaves with the coach, the one on the bench included, and the things go back to the cupboard. */
export function sendAway(arrangement: Arrangement): Move {
  const guests = arrangement.guests.map((guest): Lodger => ({ id: guest.id, at: 'gone' }))
  const things = arrangement.things.map((item): Thing => ({ ...item, at: 'cupboard' }))
  return { arrangement: { ...arrangement, guests, things }, outcome: 'sent-away', changed: true }
}

const IN_ROOM: Record<ThingKind, Outcome> = { quilt: 'quilt-on-bed', pipe: 'pipe-stands', stove: 'stove-warms', ice: 'ice-chills', clock: 'clock-by-bed' }
const ON_EDGE: Record<ThingKind, Outcome> = { quilt: 'quilt-hangs', pipe: 'pipe-joins', stove: 'stove-scorches', ice: 'ice-frosts', clock: 'clock-on-wall' }

function thingTo(arrangement: Arrangement, kind: ThingKind, target: Target): Move {
  const item = thing(arrangement, kind)
  if (!item) return same(arrangement)
  const place = (at: ThingAt, outcome: Outcome): Move => {
    const changed = !sameAt(item.at, at)
    return { arrangement: changed ? withThing(arrangement, kind, { at }) : arrangement, outcome, changed }
  }
  if (target === 'cupboard' || target === 'lobby' || target === 'bench' || target === 'coach') return place('cupboard', 'to-cupboard')
  if ('room' in target) return knownRoom(arrangement, target.room) ? place({ room: target.room }, IN_ROOM[kind]) : same(arrangement)
  if ('guest' in target) {
    const room = roomOf(arrangement, target.guest)
    // A guest with no room yet holds the thing for a moment and hands it back.
    if (room === null) return place('cupboard', 'handed-back')
    if (kind === 'stove' || kind === 'ice') return place({ room }, kind === 'stove' ? 'stove-to-guest' : 'ice-to-guest')
    if (kind === 'quilt') return place({ guest: target.guest }, 'wraps')
    if (kind === 'pipe') return place({ guest: target.guest }, 'trumpet')
    return place({ guest: target.guest }, TASTES[target.guest].flexible ? 'clock-kept' : 'clock-shrugged-off')
  }
  if (!anyEdgeById(arrangement.house.shape, target.edge) || !knownRoom(arrangement, target.nearer)) return same(arrangement)
  // The stove and the ice box mark the wall and slide into the nearer room.
  if (kind === 'stove' || kind === 'ice') return place({ room: target.nearer }, ON_EDGE[kind])
  // A wall or floor takes whatever is fixed to it, and nothing that was there is taken away: the quilt and the pipe may share one, the pipe let through the quilt.
  return place({ edge: target.edge }, ON_EDGE[kind])
}

/**
 * A thing stays only with a guest who has a room. A guest who is carried or
 * changed out to the lobby or the bench hands back what it held: the quilt
 * it was wrapped in, the pipe, the alarm clock go to the cupboard, as a thing
 * given to a guest with no room does. So the house found again is the house
 * that was left.
 */
function handsBack(move: Move): Move {
  const { arrangement } = move
  const things = arrangement.things.map((item): Thing => (isGuestAt(item.at) && typeof placeOf(arrangement, item.at.guest) !== 'number' ? { ...item, at: 'cupboard' } : item))
  return things.some((item, index) => item !== arrangement.things[index]) ? { ...move, arrangement: { ...arrangement, things } } : move
}

/** What happens when the child sets a guest or a thing down. */
export function setDown(arrangement: Arrangement, held: Held, target: Target): Move {
  return 'guest' in held ? handsBack(guestTo(arrangement, held.guest, target)) : thingTo(arrangement, held.thing, target)
}

const TAPPED: Record<ThingKind, Outcome> = { quilt: 'feathers', pipe: 'toots', stove: 'stove-dial', ice: 'ice-dial', clock: 'clock-rings' }

/**
 * What happens when the child taps a guest or a thing. A tapped guest is the
 * toy: the page is drawn again from where it stands, which changes nothing in
 * the house. A tapped stove or ice box turns its dial a step, and that does.
 */
export function tap(arrangement: Arrangement, held: Held): Move {
  if ('guest' in held) return same(arrangement, placeOf(arrangement, held.guest) === null ? 'nothing' : 'looks-from')
  const item = thing(arrangement, held.thing)
  if (!item) return same(arrangement)
  if (held.thing !== 'stove' && held.thing !== 'ice') return same(arrangement, TAPPED[held.thing])
  const dial = ((item.dial % 3) + 1) as Dial
  return { arrangement: withThing(arrangement, held.thing, { dial }), outcome: TAPPED[held.thing], changed: false }
}

/** The child turns the day-and-night wheel. Nothing else turns it. */
export function turnWheel(arrangement: Arrangement): Move {
  return { arrangement: { ...arrangement, phase: otherPhase(arrangement.phase) }, outcome: 'wheel-turns', changed: false }
}

/**
 * Every numeral the page may draw: the step on the dial of the stove and of
 * the ice box, each laid beside the flames or icicles it counts. No other
 * numeral exists in the game, and play never depends on reading one.
 */
export function numerals(arrangement: Arrangement): { value: Dial; on: 'stove' | 'ice' }[] {
  return (['stove', 'ice'] as const).flatMap((kind) => {
    const item = thing(arrangement, kind)
    return item ? [{ value: item.dial, on: kind }] : []
  })
}
