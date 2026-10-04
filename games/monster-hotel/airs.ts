import { awake, holds, isRoomAt, onEdge, roomOf, thing, type Arrangement, type Hung } from './arrangement'
import { TASTES, type GuestId, type Phase } from './guests'
import { edgesOf, fixtureEdge, fixtureHeat, fixtureRoom, type Edge } from './hotel'

// How each thing travels: the hotel's whole rule language, and it never
// changes. Every air starts in one room at a strength and loses a step each
// time it crosses into the next room.
// - Noise crosses every wall, floor and ceiling.
// - Warmth rises through ceilings; cold sinks through floors.
// - A smell drifts sideways along its own floor and crosses no floor.
// - A quilt on a wall or floor stops noise, warmth and cold there.
// - A pipe through a wall or floor lets smell, warmth and cold through, both ways.
// No renderer, no DOM, no clock: the same arrangement always gives the same airs.

export type Air = 'din' | 'pong' | 'warm' | 'cold'

/** Who or what an air starts from. */
export type Maker = { guest: GuestId } | { thing: 'stove' | 'ice' } | { fixture: 'boiler' | 'snow' }

export type Source = { air: Air; by: Maker; room: number; strength: number }

/** An air arriving in a room: how strong it still is there and the rooms it came through, from its own room to this one. */
export type Arrival = { source: Source; room: number; level: number; path: readonly number[] }

/** Whether this air can step from one room to the other across this wall or floor. */
export function crosses(air: Air, edge: Edge, from: number, hung: Hung): boolean {
  // Both may be there at once, and each does what it does: the quilt stops what goes through the wall or floor itself, and the pipe is a way through it.
  const quilt = hung === 'quilt' || hung === 'both', pipe = hung === 'pipe' || hung === 'both'
  if (air === 'din') return !quilt
  if (pipe) return true
  if (air === 'pong') return edge.kind === 'wall'
  if (quilt || edge.kind !== 'floor') return false
  // A floor edge has its lower room as `a`: warmth goes up from it, cold comes down to it.
  return air === 'warm' ? from === edge.a : from === edge.b
}

/** Every room one source reaches, its own included, with the level left there and the way it came. */
export function spread(arrangement: Arrangement, source: Source): Arrival[] {
  const edges = edgesOf(arrangement.house.shape)
  const arrivals: Arrival[] = [{ source, room: source.room, level: source.strength, path: [source.room] }]
  const seen = new Set<number>([source.room])
  // Breadth first, so each room is reached by a shortest way and keeps the strongest level.
  for (let next = 0; next < arrivals.length; next++) {
    const here = arrivals[next]
    if (here.level <= 1) continue
    for (const edge of edges) {
      if (edge.a !== here.room && edge.b !== here.room) continue
      const there = edge.a === here.room ? edge.b : edge.a
      if (seen.has(there) || !crosses(source.air, edge, here.room, onEdge(arrangement, edge.id))) continue
      seen.add(there)
      arrivals.push({ source, room: there, level: here.level - 1, path: [...here.path, there] })
    }
  }
  return arrivals
}

/** A guest blowing through the pipe carries one room further. */
function reachOf(arrangement: Arrangement, id: GuestId, strength: number): number {
  return strength + (holds(arrangement, id, 'pipe') ? 1 : 0)
}

/** What gives warmth or cold at every hour: what is built in, the stove, the ice box, and guests who bring their own. */
export function heatSources(arrangement: Arrangement): Source[] {
  const sources: Source[] = []
  for (const fixture of arrangement.house.fixtures) {
    // A quilt on the floor over the boiler, or on the ceiling under the snow hole, stops it there, as a quilt on any floor stops warmth and cold: nothing of it comes into the room. With the pipe let through the quilt, it comes through the pipe.
    if (onEdge(arrangement, fixtureEdge(arrangement.house, fixture)) === 'quilt') continue
    const heat = fixtureHeat(fixture)
    sources.push({ air: heat > 0 ? 'warm' : 'cold', by: { fixture: fixture.kind }, room: fixtureRoom(arrangement.house, fixture), strength: Math.abs(heat) })
  }
  for (const kind of ['stove', 'ice'] as const) {
    const item = thing(arrangement, kind)
    if (item && isRoomAt(item.at)) sources.push({ air: kind === 'stove' ? 'warm' : 'cold', by: { thing: kind }, room: item.at.room, strength: item.dial })
  }
  for (const guest of arrangement.guests) {
    const room = roomOf(arrangement, guest.id)
    const carries = TASTES[guest.id].carries
    if (room === null || carries === 0) continue
    sources.push({ air: carries > 0 ? 'warm' : 'cold', by: { guest: guest.id }, room, strength: reachOf(arrangement, guest.id, Math.abs(carries)) })
  }
  return sources
}

/** The noise and the smells being made at this hour: only by guests who are in a room and awake. A wrapped guest makes no noise. */
export function madeAt(arrangement: Arrangement, phase: Phase): Source[] {
  const sources: Source[] = []
  for (const guest of arrangement.guests) {
    const room = roomOf(arrangement, guest.id)
    if (room === null || !awake(arrangement, guest.id, phase)) continue
    const taste = TASTES[guest.id]
    if (taste.din > 0 && !holds(arrangement, guest.id, 'quilt')) sources.push({ air: 'din', by: { guest: guest.id }, room, strength: reachOf(arrangement, guest.id, taste.din) })
    if (taste.pong > 0) sources.push({ air: 'pong', by: { guest: guest.id }, room, strength: reachOf(arrangement, guest.id, taste.pong) })
  }
  return sources
}

/** Everything that arrives anywhere at this hour, room by room. */
export function arrivalsAt(arrangement: Arrangement, phase: Phase): Arrival[] {
  return [...heatSources(arrangement), ...madeAt(arrangement, phase)].flatMap((source) => spread(arrangement, source))
}

export const COLDEST = -3
export const WARMEST = 3

/** How warm a room is on the scale from -3 to 3: every warmth that reaches it less every cold. Zero is mild. */
export function temperature(arrangement: Arrangement, room: number): number {
  let sum = 0
  for (const source of heatSources(arrangement)) {
    for (const arrival of spread(arrangement, source)) if (arrival.room === room) sum += source.air === 'warm' ? arrival.level : -arrival.level
  }
  return Math.max(COLDEST, Math.min(WARMEST, sum))
}
