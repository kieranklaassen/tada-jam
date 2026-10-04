import { heatSources, madeAt, spread, temperature, type Arrival, type Maker } from './airs'
import { awake, holds, present, roomOf, type Arrangement } from './arrangement'
import { PHASES, TASTES, type GuestId, type Minds, type Phase } from './guests'
import { edgesOf, floorOf } from './hotel'

// Who is content, who is cross, and exactly why. There is no wrong move, only
// an arrangement that leaves somebody cross, and a cross guest always has a
// place and a path: the thing it minds, who or what makes it, and the wall or
// floor it came through (pack: game-design, errors-show-as-consequences.md).
// The child changes one thing on that path and the house answers again.
// Nothing here is a score or a verdict, and nothing here is ever shown as one.

/** One thing a guest is cross about. */
export type Grievance =
  /** It stands in the lobby with its bag. */
  | { kind: 'no-room' }
  /** Its room is warmer or colder than it can bear. `from` is what pushes it the wrong way; empty when the room simply lacks what the guest needs. */
  | { kind: 'too-warm' | 'too-cold'; temperature: number; from: readonly Arrival[] }
  /** A noise or a smell reaches it at an hour when it minds. */
  | { kind: 'din' | 'pong'; arrival: Arrival }
  /** It lives to make its noise and is wrapped in the quilt. */
  | { kind: 'wrapped' }
  /** Nobody awake hears it without minding. */
  | { kind: 'unheard' }

/** One thing that makes a content guest plainly happier. Never needed. */
export type Delight = { kind: 'din' | 'pong'; arrival: Arrival } | { kind: 'wrap' }

export type Mood = { content: boolean; grievances: readonly Grievance[]; delights: readonly Delight[] }

function mindsNow(minds: Minds, isAwake: boolean): boolean {
  return minds === 'always' || (minds === 'asleep' && !isAwake)
}

function madeBy(arrival: Arrival, id: GuestId): boolean {
  const by: Maker = arrival.source.by
  return 'guest' in by && by.guest === id
}

/** How one guest takes the house at one hour. */
export function moodOf(arrangement: Arrangement, id: GuestId, phase: Phase): Mood {
  const room = roomOf(arrangement, id)
  if (room === null) return { content: false, grievances: [{ kind: 'no-room' }], delights: [] }
  const taste = TASTES[id]
  const isAwake = awake(arrangement, id, phase)
  const grievances: Grievance[] = []
  const delights: Delight[] = []

  // What others make comes first, loudest first: it is what a cross guest turns to.
  const reaching = madeAt(arrangement, phase)
    .flatMap((source) => spread(arrangement, source))
    .filter((arrival) => arrival.room === room && !madeBy(arrival, id))
    .sort((a, b) => b.level - a.level)
  for (const arrival of reaching) {
    const air = arrival.source.air
    if (air !== 'din' && air !== 'pong') continue
    if (isAwake && taste.loves.includes(air)) delights.push({ kind: air, arrival })
    else if (mindsNow(air === 'din' ? taste.mindsDin : taste.mindsPong, isAwake)) grievances.push({ kind: air, arrival })
  }

  const warmth = temperature(arrangement, room)
  if (warmth < taste.comfort[0] || warmth > taste.comfort[1]) {
    const tooWarm = warmth > taste.comfort[1]
    // What pushes the wrong way, strongest first; a guest's own warmth or cold is never what it minds.
    const from = heatSources(arrangement)
      .filter((source) => source.air === (tooWarm ? 'warm' : 'cold'))
      .flatMap((source) => spread(arrangement, source))
      .filter((arrival) => arrival.room === room && !madeBy(arrival, id))
      .sort((a, b) => b.level - a.level)
    grievances.push({ kind: tooWarm ? 'too-warm' : 'too-cold', temperature: warmth, from })
  }

  if (holds(arrangement, id, 'quilt')) {
    if (taste.mustPlay) grievances.push({ kind: 'wrapped' })
    else if (taste.loves.includes('wrap')) delights.push({ kind: 'wrap' })
  }

  if (taste.needsListener && isAwake && !heard(arrangement, id, phase)) grievances.push({ kind: 'unheard' })

  return { content: grievances.length === 0, grievances, delights: grievances.length === 0 ? delights : [] }
}

/** Whether someone else, awake at this hour and not minding noise, is within reach of this guest's voice. */
export function heard(arrangement: Arrangement, id: GuestId, phase: Phase): boolean {
  const voice = madeAt(arrangement, phase).find((source) => source.air === 'din' && 'guest' in source.by && source.by.guest === id)
  if (!voice) return false
  const rooms = new Set(spread(arrangement, voice).map((arrival) => arrival.room))
  return arrangement.guests.some((other) => {
    const room = roomOf(arrangement, other.id)
    return other.id !== id && room !== null && rooms.has(room) && awake(arrangement, other.id, phase) && TASTES[other.id].mindsDin !== 'always'
  })
}

/** Content by day and by night. */
export function contentAllDay(arrangement: Arrangement, id: GuestId): boolean {
  return PHASES.every((phase) => moodOf(arrangement, id, phase).content)
}

/**
 * The house is settled: somebody is staying, nobody waits in the lobby, and
 * every guest in the house is content by day and by night. The guest on the
 * bench is no part of it until the child carries it in.
 */
export function settled(arrangement: Arrangement): boolean {
  const staying = present(arrangement)
  return staying.length > 0 && staying.every((id) => contentAllDay(arrangement, id))
}

export type Side = 'left' | 'right' | 'up' | 'down'

/**
 * The side of its room an arrival came through, which is where a cross guest
 * turns. What is built into the house comes through the room's own floor or
 * ceiling: the boiler's warmth from below, the snow hole's cold from above.
 * Null when a guest or a thing in the same room makes it.
 */
export function sideOf(arrangement: Arrangement, arrival: Arrival): Side | null {
  const path = arrival.path
  if (path.length < 2) return 'fixture' in arrival.source.by ? (arrival.source.by.fixture === 'boiler' ? 'down' : 'up') : null
  const here = path[path.length - 1], before = path[path.length - 2]
  const shape = arrangement.house.shape
  if (floorOf(shape, here) !== floorOf(shape, before)) return floorOf(shape, before) > floorOf(shape, here) ? 'up' : 'down'
  return before < here ? 'left' : 'right'
}

/** The wall or floor an arrival crossed last, by its id, or null when it is made in the same room. */
export function lastCrossing(arrangement: Arrangement, arrival: Arrival): string | null {
  const path = arrival.path
  if (path.length < 2) return null
  const here = path[path.length - 1], before = path[path.length - 2]
  const a = Math.min(here, before), b = Math.max(here, before)
  return edgesOf(arrangement.house.shape).find((edge) => edge.a === a && edge.b === b)?.id ?? null
}

/** Where a cross guest turns at this hour: toward its first trouble that has a side. */
export function turnsTo(arrangement: Arrangement, id: GuestId, phase: Phase): Side | null {
  for (const grievance of moodOf(arrangement, id, phase).grievances) {
    const arrival = grievance.kind === 'din' || grievance.kind === 'pong' ? grievance.arrival : grievance.kind === 'too-warm' || grievance.kind === 'too-cold' ? grievance.from[0] : undefined
    const side = arrival ? sideOf(arrangement, arrival) : null
    if (side) return side
  }
  return null
}

/** Where a guest made happier leans at this hour: toward the wall, floor or ceiling its first delight comes through, or nowhere when it is made in its own room or is the quilt it is rolled in. */
export function leansTo(arrangement: Arrangement, id: GuestId, phase: Phase): Side | null {
  for (const delight of moodOf(arrangement, id, phase).delights) {
    const side = delight.kind === 'wrap' ? null : sideOf(arrangement, delight.arrival)
    if (side) return side
  }
  return null
}
