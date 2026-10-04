import { crosses, heatSources, madeAt, spread, type Air } from './airs'
import { awake, isEdgeAt, isGuestAt, isRoomAt, onEdge, placeOf, thing, type Arrangement, type ThingKind } from './arrangement'
import { PHASES, TASTES, type GuestId, type Phase } from './guests'
import { edgeById, fixtureEdge, fixtureHeat, fixtureRoom } from './hotel'
import type { Held } from './moves'

// The fifth column of the grid: what each guest and each thing does when it
// is left through a day and a night. Nothing here moves by itself: the hour
// is the wheel's, and the child turns the wheel. These are views of an
// arrangement, worked out each time and never stored.

export type Doing =
  // a guest
  | { kind: 'at-its-thing'; makes: Air[] }
  | { kind: 'asleep' }
  | { kind: 'waiting' }
  | { kind: 'away' }
  // the quilt: how many airs it is stopping at its wall or floor, the guest it muffles, or just lying there
  | { kind: 'stops'; airs: Air[] }
  | { kind: 'muffles'; guest: GuestId }
  // the pipe: what passes through it at this hour, the guest it carries further, or standing
  | { kind: 'carries'; airs: Air[] }
  | { kind: 'trumpets'; guest: GuestId }
  // the stove and the ice box burn and chill the same at every hour
  | { kind: 'burns' | 'chills'; dial: number }
  // the alarm clock: turning its keeper's hours round, or ticking to itself
  | { kind: 'turns-hours'; guest: GuestId }
  | { kind: 'idle' }

function guestAt(arrangement: Arrangement, id: GuestId, phase: Phase): Doing {
  const at = placeOf(arrangement, id)
  if (at === null || at === 'gone' || at === 'bench') return { kind: 'away' }
  if (at === 'lobby') return { kind: 'waiting' }
  if (!awake(arrangement, id, phase)) return { kind: 'asleep' }
  const makes = madeAt(arrangement, phase).filter((source) => 'guest' in source.by && source.by.guest === id).map((source) => source.air)
  return { kind: 'at-its-thing', makes }
}

/** What the quilt hung on this wall or floor is stopping at this hour, or what is passing through the pipe let through it. */
/** What is built in behind an outer side of the house and stopped there by the quilt alone: the boiler's warmth under a floor, the snow hole's cold over a ceiling. */
function stoppedOutside(arrangement: Arrangement, edgeId: string): { air: Air; room: number } | null {
  const fixture = arrangement.house.fixtures.find((one) => fixtureEdge(arrangement.house, one) === edgeId)
  if (!fixture || onEdge(arrangement, edgeId) !== 'quilt') return null
  return { air: fixtureHeat(fixture) > 0 ? 'warm' : 'cold', room: fixtureRoom(arrangement.house, fixture) }
}

function changedBy(arrangement: Arrangement, edgeId: string, phase: Phase, hung: 'quilt' | 'pipe'): Air[] {
  const outside = hung === 'quilt' ? stoppedOutside(arrangement, edgeId) : null
  if (outside) return [outside.air]
  // The pipe at the boiler's floor or the snow hole's ceiling carries what is built in behind it, at every hour, alone or let through the quilt there.
  const behind = arrangement.house.fixtures.find((one) => fixtureEdge(arrangement.house, one) === edgeId)
  const there = onEdge(arrangement, edgeId)
  if (behind && hung === 'pipe' && (there === 'pipe' || there === 'both')) return [fixtureHeat(behind) > 0 ? 'warm' : 'cold']
  const edge = edgeById(arrangement.house.shape, edgeId)
  if (!edge || (there !== hung && there !== 'both')) return []
  // With the pipe let through the quilt, the quilt is stopping only what the pipe does not carry.
  const without = hung === 'quilt' && there === 'both' ? 'pipe' : null
  const airs = new Set<Air>()
  for (const source of [...heatSources(arrangement), ...madeAt(arrangement, phase)]) {
    for (const arrival of spread(arrangement, source)) {
      // Strong enough to go one room further, standing on one side of this edge.
      if (arrival.level < 2 || (arrival.room !== edge.a && arrival.room !== edge.b)) continue
      // The quilt: what the bare wall or floor would let through and the quilt stops. The pipe: every smell, warmth or
      // cold that goes through here, also one the bare wall would have let through (a smell through a wall, warmth up
      // through a floor): with the pipe there, the pipe is where it passes. Noise goes through the wall, never the pipe.
      if (hung === 'pipe' ? source.air !== 'din' && crosses(source.air, edge, arrival.room, 'pipe') : crosses(source.air, edge, arrival.room, without) && !crosses(source.air, edge, arrival.room, there)) airs.add(source.air)
    }
  }
  return [...airs]
}

function thingAt(arrangement: Arrangement, kind: ThingKind, phase: Phase): Doing {
  const item = thing(arrangement, kind)
  if (!item || item.at === 'cupboard') return { kind: 'idle' }
  if (kind === 'stove' || kind === 'ice') return isRoomAt(item.at) ? { kind: kind === 'stove' ? 'burns' : 'chills', dial: item.dial } : { kind: 'idle' }
  if (kind === 'quilt') {
    if (isGuestAt(item.at)) return { kind: 'muffles', guest: item.at.guest }
    return isEdgeAt(item.at) ? { kind: 'stops', airs: changedBy(arrangement, item.at.edge, phase, 'quilt') } : { kind: 'idle' }
  }
  if (kind === 'pipe') {
    if (isGuestAt(item.at)) return { kind: 'trumpets', guest: item.at.guest }
    return isEdgeAt(item.at) ? { kind: 'carries', airs: changedBy(arrangement, item.at.edge, phase, 'pipe') } : { kind: 'idle' }
  }
  return isGuestAt(item.at) && TASTES[item.at.guest].flexible ? { kind: 'turns-hours', guest: item.at.guest } : { kind: 'idle' }
}

/** What a guest or a thing is doing at one hour. */
export function doingAt(arrangement: Arrangement, held: Held, phase: Phase): Doing {
  return 'guest' in held ? guestAt(arrangement, held.guest, phase) : thingAt(arrangement, held.thing, phase)
}

/** The same through a day and a night. */
export function overTheDay(arrangement: Arrangement, held: Held): Record<Phase, Doing> {
  const [day, night] = PHASES.map((phase) => doingAt(arrangement, held, phase))
  return { day, night }
}

/**
 * The rooms on whose side of the hung quilt something is pressed up at this
 * hour: an air that has reached that room with strength to go one room
 * further, would cross this wall or floor if it were bare, and does not
 * because the quilt hangs there. Where the quilt stops nothing, nothing
 * bunches against it.
 */
export function bunchedAt(arrangement: Arrangement, phase: Phase): number[] {
  const quilt = thing(arrangement, 'quilt')
  if (!quilt || !isEdgeAt(quilt.at)) return []
  // On an outer side with something built in behind it, that is pressed against the quilt from outside the room.
  const outside = stoppedOutside(arrangement, quilt.at.edge)
  if (outside) return [outside.room]
  const edge = edgeById(arrangement.house.shape, quilt.at.edge)
  if (!edge) return []
  const rooms = new Set<number>(), there = onEdge(arrangement, quilt.at.edge)
  for (const source of [...heatSources(arrangement), ...madeAt(arrangement, phase)]) {
    for (const arrival of spread(arrangement, source)) {
      if (arrival.level < 2 || (arrival.room !== edge.a && arrival.room !== edge.b)) continue
      if (crosses(source.air, edge, arrival.room, there === 'both' ? 'pipe' : null) && !crosses(source.air, edge, arrival.room, there)) rooms.add(arrival.room)
    }
  }
  return [...rooms].sort((a, b) => a - b)
}
