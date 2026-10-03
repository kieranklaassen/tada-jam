import { TASTES, otherPhase, type GuestId, type Phase } from './guests'
import { bedsIn, type House } from './hotel'

// An arrangement: who is where, what is where, and the hour. It is the whole
// of what the child has made, and everything else (what travels where, who is
// cross and why) is worked out from it. Plain data, so a save can hold it.

export const THING_KINDS = ['quilt', 'pipe', 'stove', 'ice', 'clock'] as const

export type ThingKind = (typeof THING_KINDS)[number]

/** A room number, or one of the places outside the rooms. Only the bench guest sits on the bench. */
export type GuestAt = number | 'lobby' | 'bench' | 'gone'

export type ThingAt = 'cupboard' | { room: number } | { edge: string } | { guest: GuestId }

export type Dial = 1 | 2 | 3

export type Thing = {
  kind: ThingKind
  at: ThingAt
  /** The step the child set on the stove or the ice box. The other things carry 1 and never use it. */
  dial: Dial
}

export type Lodger = { id: GuestId; at: GuestAt }

export type Arrangement = {
  house: House
  guests: readonly Lodger[]
  /** At most one of each kind. */
  things: readonly Thing[]
  /** The one guest who may sit on the bench outside, or none. */
  bench: GuestId | null
  phase: Phase
}

export function placeOf(arrangement: Arrangement, id: GuestId): GuestAt | null {
  return arrangement.guests.find((guest) => guest.id === id)?.at ?? null
}

/** The room a guest is in, or null when it is in the lobby, on the bench or gone. */
export function roomOf(arrangement: Arrangement, id: GuestId): number | null {
  const at = placeOf(arrangement, id)
  return typeof at === 'number' ? at : null
}

export function occupants(arrangement: Arrangement, room: number): GuestId[] {
  return arrangement.guests.filter((guest) => guest.at === room).map((guest) => guest.id)
}

export function freeBeds(arrangement: Arrangement, room: number): number {
  return bedsIn(arrangement.house, room) - occupants(arrangement, room).length
}

export function thing(arrangement: Arrangement, kind: ThingKind): Thing | null {
  return arrangement.things.find((item) => item.kind === kind) ?? null
}

export function isRoomAt(at: ThingAt): at is { room: number } {
  return typeof at === 'object' && 'room' in at
}

export function isEdgeAt(at: ThingAt): at is { edge: string } {
  return typeof at === 'object' && 'edge' in at
}

export function isGuestAt(at: ThingAt): at is { guest: GuestId } {
  return typeof at === 'object' && 'guest' in at
}

/** Whether a guest holds the thing: wrapped in the quilt, blowing through the pipe, keeping the alarm clock. */
export function holds(arrangement: Arrangement, id: GuestId, kind: ThingKind): boolean {
  const item = thing(arrangement, kind)
  return item !== null && isGuestAt(item.at) && item.at.guest === id
}

/** What hangs on a wall or floor: the quilt, the pipe, or nothing. The alarm clock on a wall changes nothing. */
export function onEdge(arrangement: Arrangement, edge: string): 'quilt' | 'pipe' | null {
  for (const kind of ['quilt', 'pipe'] as const) {
    const item = thing(arrangement, kind)
    if (item && isEdgeAt(item.at) && item.at.edge === edge) return kind
  }
  return null
}

/** The hours a guest keeps: its own, or the other way round while a guest who will change holds the alarm clock. */
export function wakes(arrangement: Arrangement, id: GuestId): Phase {
  const taste = TASTES[id]
  return taste.flexible && holds(arrangement, id, 'clock') ? otherPhase(taste.wakes) : taste.wakes
}

export function awake(arrangement: Arrangement, id: GuestId, phase: Phase): boolean {
  return wakes(arrangement, id) === phase
}

/** The guests who count: in a room or waiting in the lobby. The one on the bench and those gone with the coach do not. */
export function present(arrangement: Arrangement): GuestId[] {
  return arrangement.guests.filter((guest) => typeof guest.at === 'number' || guest.at === 'lobby').map((guest) => guest.id)
}

/** Builds an arrangement from short notes: who is where, and what is where (with the dial for the stove and the ice box). */
export function arrange(
  house: House,
  guests: Partial<Record<GuestId, GuestAt>>,
  things: Partial<Record<ThingKind, ThingAt>> = {},
  options: { phase?: Phase; bench?: GuestId | null; dials?: Partial<Record<ThingKind, Dial>> } = {},
): Arrangement {
  return {
    house,
    guests: (Object.keys(guests) as GuestId[]).map((id) => ({ id, at: guests[id]! })),
    things: (Object.keys(things) as ThingKind[]).map((kind) => ({ kind, at: things[kind]!, dial: options.dials?.[kind] ?? 1 })),
    bench: options.bench ?? null,
    phase: options.phase ?? 'day',
  }
}
