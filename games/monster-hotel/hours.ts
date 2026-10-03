import { crosses, heatSources, madeAt, spread, type Air } from './airs'
import { awake, isEdgeAt, isGuestAt, isRoomAt, onEdge, placeOf, thing, type Arrangement, type ThingKind } from './arrangement'
import { PHASES, TASTES, type GuestId, type Phase } from './guests'
import { edgeById } from './hotel'
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
  // the pipe: what passes through it only because it is there, the guest it carries further, or standing
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

/** The airs that would cross this wall or floor at this hour if `hung` were what hangs there, and do not as it is (or the other way round). */
function changedBy(arrangement: Arrangement, edgeId: string, phase: Phase, hung: 'quilt' | 'pipe'): Air[] {
  const edge = edgeById(arrangement.house.shape, edgeId)
  if (!edge || onEdge(arrangement, edgeId) !== hung) return []
  const airs = new Set<Air>()
  for (const source of [...heatSources(arrangement), ...madeAt(arrangement, phase)]) {
    for (const arrival of spread(arrangement, source)) {
      // Strong enough to go one room further, standing on one side of this edge.
      if (arrival.level < 2 || (arrival.room !== edge.a && arrival.room !== edge.b)) continue
      const bare = crosses(source.air, edge, arrival.room, null)
      const now = crosses(source.air, edge, arrival.room, hung)
      if (bare !== now) airs.add(source.air)
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
