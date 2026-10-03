import type { Arrangement, Dial, ThingAt, ThingKind } from './arrangement'
import type { GuestId } from './guests'
import type { House } from './hotel'

// The designed order as data: the casts of each place, written by hand. A
// cast is one coach-load: the house and what is built into it, the guests,
// the things in the cupboard, and the one guest on the bench outside, who is
// never needed. `casts.test.ts` solves every cast and fails unless at least
// two different arrangements settle it, unless its neat arrangement is one of
// them and puts the place's new thing to use, and unless the house can also
// be settled with the bench guest carried in. Every house keeps a bed spare
// for that guest. The ids are what a save stores: never rename one that
// shipped.

export type Neat = {
  guests: Partial<Record<GuestId, number>>
  things?: Partial<Record<ThingKind, ThingAt>>
  dials?: Partial<Record<ThingKind, Dial>>
}

export type Cast = {
  id: string
  /** The place in the designed order this cast belongs to: an id from `LADDER` in config.ts. */
  position: string
  house: House
  /** Who gets off the coach, in the order they stand in the lobby. */
  guests: readonly GuestId[]
  /** Who waits on the bench outside with a mountain of luggage. */
  bench: GuestId
  /** What is in the cupboard. */
  kit: readonly ThingKind[]
  /** One arrangement the porter can show after the child's own has stood: it settles the house with the place's new thing put to use, and where the cast allows it somebody is plainly happier. */
  neat: Neat
  /** One arrangement that settles the house with the bench guest carried in: the harder option is always possible. */
  withBench: Neat
}

const plain = (shape: House['shape']): House => ({ shape, fixtures: [], twins: [] })
const heated = (shape: House['shape'], boiler: number, snow: number, twins: number[] = []): House => ({
  shape,
  fixtures: [{ kind: 'boiler', col: boiler }, { kind: 'snow', col: snow }],
  twins,
})

export const CASTS: readonly Cast[] = [
  // --- two-guests: four rooms; noise, and who sleeps when --------------------
  { id: 'two-guests/a', position: 'two-guests', house: plain('square'), guests: ['troll', 'bat'], bench: 'blob', kit: [],
    neat: { guests: { troll: 0, bat: 1 } },
    withBench: { guests: { troll: 0, bat: 1, blob: 3 } } },
  { id: 'two-guests/b', position: 'two-guests', house: plain('square'), guests: ['troll', 'blob'], bench: 'bat', kit: [],
    neat: { guests: { troll: 0, blob: 3 } },
    withBench: { guests: { troll: 0, blob: 3, bat: 1 } } },
  { id: 'two-guests/c', position: 'two-guests', house: plain('square'), guests: ['troll', 'bat', 'blob'], bench: 'fly', kit: [],
    neat: { guests: { troll: 0, bat: 1, blob: 3 } },
    withBench: { guests: { troll: 0, bat: 1, blob: 3, fly: 2 } } },

  // --- heat-and-snow: the boiler, the snow hole, the lizard and the yeti -----
  { id: 'heat-and-snow/a', position: 'heat-and-snow', house: heated('square', 0, 1), guests: ['lizard', 'yeti'], bench: 'troll', kit: [],
    neat: { guests: { lizard: 0, yeti: 1 } },
    withBench: { guests: { lizard: 0, yeti: 1, troll: 3 } } },
  { id: 'heat-and-snow/b', position: 'heat-and-snow', house: heated('square', 1, 0), guests: ['lizard', 'yeti', 'bat'], bench: 'troll', kit: [],
    neat: { guests: { lizard: 1, yeti: 0, bat: 2 } },
    withBench: { guests: { lizard: 1, yeti: 3, bat: 0, troll: 2 } } },
  { id: 'heat-and-snow/c', position: 'heat-and-snow', house: heated('square', 0, 1), guests: ['lizard', 'yeti', 'troll'], bench: 'bat', kit: [],
    neat: { guests: { lizard: 0, yeti: 1, troll: 3 } },
    withBench: { guests: { lizard: 0, yeti: 2, troll: 3, bat: 1 } } },

  // --- quilt: the first thing to place --------------------------------------
  { id: 'quilt/a', position: 'quilt', house: heated('square', 0, 1), guests: ['troll', 'lizard', 'yeti'], bench: 'bat', kit: ['quilt'],
    neat: { guests: { troll: 1, lizard: 0, yeti: 2 }, things: { quilt: { edge: '0-1' } } },
    withBench: { guests: { troll: 3, lizard: 0, yeti: 2, bat: 1 } } },
  // Here the quilt does two jobs at once on the troll's ceiling: it keeps the tuba and the boiler's warmth from the blob.
  { id: 'quilt/b', position: 'quilt', house: heated('square', 0, 1), guests: ['troll', 'blob', 'yeti'], bench: 'bat', kit: ['quilt'],
    neat: { guests: { troll: 0, blob: 2, yeti: 1 }, things: { quilt: { edge: '0-2' } } },
    withBench: { guests: { troll: 0, blob: 2, yeti: 1, bat: 3 }, things: { quilt: { edge: '0-2' } } } },
  { id: 'quilt/c', position: 'quilt', house: heated('square', 0, 1), guests: ['troll', 'lizard', 'bat'], bench: 'yeti', kit: ['quilt'],
    neat: { guests: { troll: 1, lizard: 0, bat: 3 }, things: { quilt: { edge: '0-1' } } },
    withBench: { guests: { troll: 3, lizard: 0, bat: 1, yeti: 2 } } },

  // --- corridor: the long house; a smell along a corridor; the cook and the fly
  { id: 'corridor/a', position: 'corridor', house: heated('long', 0, 2), guests: ['cook', 'fly', 'troll', 'lizard'], bench: 'blob', kit: [],
    neat: { guests: { cook: 0, fly: 1, troll: 2, lizard: 3 } },
    withBench: { guests: { cook: 0, fly: 1, troll: 2, lizard: 3, blob: 4 } } },
  { id: 'corridor/b', position: 'corridor', house: heated('long', 0, 2), guests: ['cook', 'fly', 'blob', 'troll'], bench: 'lizard', kit: ['quilt'],
    neat: { guests: { cook: 0, fly: 1, blob: 4, troll: 2 }, things: { quilt: { guest: 'blob' } } },
    withBench: { guests: { cook: 0, fly: 1, blob: 4, troll: 2, lizard: 3 } } },
  { id: 'corridor/c', position: 'corridor', house: heated('long', 0, 2), guests: ['cook', 'fly', 'blob', 'lizard'], bench: 'troll', kit: ['quilt'],
    neat: { guests: { cook: 0, fly: 1, blob: 4, lizard: 3 }, things: { quilt: { guest: 'blob' } } },
    withBench: { guests: { cook: 0, fly: 1, blob: 4, lizard: 3, troll: 2 } } },

  // --- stove-and-ice: warmth and cold of the child's own making ---------------
  { id: 'stove-and-ice/a', position: 'stove-and-ice', house: plain('long'), guests: ['lizard', 'yeti', 'troll', 'fly'], bench: 'blob', kit: ['stove', 'ice'],
    neat: { guests: { lizard: 0, yeti: 1, troll: 2, fly: 3 }, things: { stove: { room: 0 } } },
    withBench: { guests: { lizard: 0, yeti: 1, troll: 2, fly: 3, blob: 4 }, things: { stove: { room: 0 } } } },
  { id: 'stove-and-ice/b', position: 'stove-and-ice', house: plain('long'), guests: ['lizard', 'yeti', 'blob', 'troll'], bench: 'cook', kit: ['stove', 'ice'],
    neat: { guests: { lizard: 0, yeti: 1, blob: 2, troll: 4 }, things: { stove: { room: 0 } } },
    withBench: { guests: { lizard: 0, yeti: 1, blob: 2, troll: 4, cook: 3 }, things: { stove: { room: 0 } } } },
  { id: 'stove-and-ice/c', position: 'stove-and-ice', house: plain('long'), guests: ['lizard', 'blob', 'troll', 'cook'], bench: 'yeti', kit: ['stove', 'ice'],
    neat: { guests: { lizard: 0, blob: 1, troll: 5, cook: 3 }, things: { stove: { room: 0 } } },
    withBench: { guests: { lizard: 0, blob: 1, troll: 5, cook: 3, yeti: 2 }, things: { stove: { room: 0 } } } },

  // --- alarm-clock: guests who will change their hours and guests who will not
  { id: 'alarm-clock/a', position: 'alarm-clock', house: heated('long', 0, 2), guests: ['troll', 'blob', 'bat', 'lizard'], bench: 'cook', kit: ['clock'],
    neat: { guests: { troll: 0, blob: 1, bat: 2, lizard: 3 }, things: { clock: { guest: 'troll' } } },
    withBench: { guests: { troll: 0, blob: 4, bat: 2, lizard: 3, cook: 1 }, things: { clock: { guest: 'troll' } } } },
  // With the troll playing by day, the cook next door hums along.
  { id: 'alarm-clock/b', position: 'alarm-clock', house: heated('long', 0, 2), guests: ['troll', 'blob', 'lizard', 'cook'], bench: 'fly', kit: ['clock'],
    neat: { guests: { troll: 0, blob: 4, lizard: 3, cook: 1 }, things: { clock: { guest: 'troll' } } },
    withBench: { guests: { troll: 2, blob: 4, lizard: 3, cook: 1, fly: 0 }, things: { clock: { guest: 'troll' } } } },
  { id: 'alarm-clock/c', position: 'alarm-clock', house: heated('long', 0, 2), guests: ['troll', 'blob', 'lizard', 'yeti'], bench: 'cook', kit: ['clock', 'quilt'],
    neat: { guests: { troll: 0, blob: 1, lizard: 3, yeti: 2 }, things: { clock: { guest: 'troll' }, quilt: { guest: 'blob' } } },
    withBench: { guests: { troll: 0, blob: 4, lizard: 3, yeti: 2, cook: 1 }, things: { clock: { guest: 'troll' }, quilt: { guest: 'blob' } } } },

  // --- tower-and-pipe: three floors, and the pipe -----------------------------
  // The pipe through the cook's ceiling carries the smell up to the fly.
  { id: 'tower-and-pipe/a', position: 'tower-and-pipe', house: heated('tower', 0, 1), guests: ['cook', 'fly', 'blob', 'lizard'], bench: 'troll', kit: ['pipe'],
    neat: { guests: { cook: 2, fly: 4, blob: 1, lizard: 0 }, things: { pipe: { edge: '2-4' } } },
    withBench: { guests: { cook: 3, fly: 2, blob: 1, lizard: 0, troll: 4 }, things: { pipe: { guest: 'fly' } } } },
  // The pipe through the wall carries the boiler's warmth to the fly, who sits under the yeti's cold.
  { id: 'tower-and-pipe/b', position: 'tower-and-pipe', house: heated('tower', 1, 0), guests: ['cook', 'fly', 'lizard', 'yeti'], bench: 'blob', kit: ['pipe'],
    neat: { guests: { cook: 1, fly: 0, lizard: 3, yeti: 2 }, things: { pipe: { edge: '0-1' } } },
    withBench: { guests: { cook: 0, fly: 1, lizard: 3, yeti: 2, blob: 5 }, things: { pipe: { guest: 'fly' } } } },
  { id: 'tower-and-pipe/c', position: 'tower-and-pipe', house: plain('tower'), guests: ['cook', 'fly', 'troll', 'lizard'], bench: 'yeti', kit: ['pipe', 'stove'],
    neat: { guests: { cook: 0, fly: 2, troll: 1, lizard: 4 }, things: { pipe: { edge: '0-2' }, stove: { room: 4 } } },
    withBench: { guests: { cook: 0, fly: 1, troll: 2, lizard: 5, yeti: 4 }, things: { pipe: { guest: 'fly' }, stove: { room: 5 } } } },

  // --- twin-rooms: more guests than rooms -------------------------------------
  // The troll and the blob share: with the alarm clock the troll plays by day, when the blob is up, and both sleep at night.
  { id: 'twin-rooms/a', position: 'twin-rooms', house: { shape: 'square', fixtures: [], twins: [0, 3] }, guests: ['troll', 'bat', 'blob', 'yeti', 'cook'], bench: 'fly', kit: ['clock'],
    neat: { guests: { troll: 0, bat: 3, blob: 0, yeti: 1, cook: 2 }, things: { clock: { guest: 'troll' } } },
    withBench: { guests: { troll: 1, bat: 3, blob: 2, yeti: 3, cook: 0, fly: 0 } } },
  { id: 'twin-rooms/b', position: 'twin-rooms', house: { shape: 'square', fixtures: [], twins: [0, 3] }, guests: ['troll', 'blob', 'yeti', 'cook', 'fly'], bench: 'bat', kit: ['quilt'],
    neat: { guests: { troll: 1, blob: 2, yeti: 3, cook: 0, fly: 0 }, things: { quilt: { guest: 'blob' } } },
    withBench: { guests: { troll: 1, blob: 2, yeti: 3, cook: 0, fly: 0, bat: 3 }, things: { quilt: { guest: 'blob' } } } },
  { id: 'twin-rooms/c', position: 'twin-rooms', house: { shape: 'square', fixtures: [], twins: [0, 3] }, guests: ['bat', 'blob', 'yeti', 'lizard', 'fly'], bench: 'cook', kit: ['stove'],
    neat: { guests: { bat: 0, blob: 0, yeti: 1, lizard: 2, fly: 3 }, things: { stove: { room: 2 } } },
    withBench: { guests: { bat: 0, blob: 0, yeti: 1, lizard: 2, fly: 3, cook: 3 }, things: { stove: { room: 2 } } } },

  // --- listener: the singer, who must be heard --------------------------------
  // The blob keeps the alarm clock, stays up all night and is her audience.
  { id: 'listener/a', position: 'listener', house: plain('long'), guests: ['singer', 'blob', 'cook', 'fly'], bench: 'yeti', kit: ['clock'],
    neat: { guests: { singer: 0, blob: 1, cook: 3, fly: 4 }, things: { clock: { guest: 'blob' } } },
    withBench: { guests: { singer: 0, blob: 1, cook: 3, fly: 4, yeti: 2 }, things: { clock: { guest: 'blob' } } } },
  { id: 'listener/b', position: 'listener', house: heated('long', 0, 2), guests: ['singer', 'troll', 'blob', 'cook'], bench: 'lizard', kit: ['quilt'],
    neat: { guests: { singer: 2, troll: 1, blob: 3, cook: 0 }, things: { quilt: { edge: '0-3' } } },
    withBench: { guests: { singer: 2, troll: 5, blob: 1, cook: 3, lizard: 0 }, things: { quilt: { edge: '1-2' } } } },
  { id: 'listener/c', position: 'listener', house: heated('long', 0, 2), guests: ['singer', 'troll', 'blob', 'lizard'], bench: 'cook', kit: ['clock'],
    neat: { guests: { singer: 2, troll: 1, blob: 4, lizard: 3 }, things: { clock: { guest: 'blob' } } },
    withBench: { guests: { singer: 2, troll: 1, blob: 4, lizard: 3, cook: 0 }, things: { clock: { guest: 'blob' } } } },

  // --- full-house: everything at once ------------------------------------------
  { id: 'full-house/a', position: 'full-house', house: heated('long', 0, 2), guests: ['singer', 'troll', 'blob', 'lizard', 'cook'], bench: 'fly', kit: ['quilt', 'clock', 'stove'],
    neat: { guests: { singer: 2, troll: 1, blob: 4, lizard: 3, cook: 0 }, things: { quilt: { guest: 'blob' }, clock: { guest: 'blob' } } },
    withBench: { guests: { singer: 2, troll: 5, blob: 4, lizard: 3, cook: 0, fly: 1 }, things: { quilt: { guest: 'blob' }, clock: { guest: 'blob' } } } },
  { id: 'full-house/b', position: 'full-house', house: heated('tower', 0, 1), guests: ['troll', 'blob', 'lizard', 'yeti', 'cook'], bench: 'bat', kit: ['clock', 'pipe', 'stove'],
    neat: { guests: { troll: 0, blob: 4, lizard: 1, yeti: 5, cook: 2 }, things: { clock: { guest: 'troll' }, pipe: { edge: '0-1' } } },
    withBench: { guests: { troll: 0, blob: 4, lizard: 2, yeti: 3, cook: 1, bat: 5 }, things: { clock: { guest: 'troll' } } } },
  { id: 'full-house/c', position: 'full-house', house: heated('long', 2, 0, [4]), guests: ['singer', 'bat', 'blob', 'cook', 'fly'], bench: 'troll', kit: ['quilt', 'pipe', 'ice'],
    neat: { guests: { singer: 0, bat: 3, blob: 5, cook: 2, fly: 1 }, things: { quilt: { guest: 'blob' }, pipe: { guest: 'fly' }, ice: { room: 5 } } },
    withBench: { guests: { singer: 0, bat: 4, blob: 5, cook: 2, fly: 1, troll: 3 }, things: { quilt: { guest: 'blob' }, ice: { room: 5 } } } },
]

/** A cast as the coach leaves it: the guests in the lobby, the bench guest on the bench, everything in the cupboard, by day. */
export function startOf(cast: Cast): Arrangement {
  return {
    house: cast.house,
    guests: [...cast.guests.map((id) => ({ id, at: 'lobby' as const })), { id: cast.bench, at: 'bench' as const }],
    things: cast.kit.map((kind) => ({ kind, at: 'cupboard' as const, dial: 1 as const })),
    bench: cast.bench,
    phase: 'day',
  }
}

/** The cast's neat arrangement, laid over its start: guests it does not name stay where the start has them. */
export function neatOf(cast: Cast): Arrangement {
  return laidOver(cast, cast.neat)
}

/** The cast's arrangement with the bench guest carried in. */
export function withBenchOf(cast: Cast): Arrangement {
  return laidOver(cast, cast.withBench)
}

function laidOver(cast: Cast, notes: Neat): Arrangement {
  const start = startOf(cast)
  return {
    ...start,
    guests: start.guests.map((guest) => ({ id: guest.id, at: notes.guests[guest.id] ?? guest.at })),
    things: start.things.map((item) => ({ kind: item.kind, at: notes.things?.[item.kind] ?? item.at, dial: notes.dials?.[item.kind] ?? item.dial })),
  }
}

export function castById(id: string): Cast | null {
  return CASTS.find((cast) => cast.id === id) ?? null
}

export function castsAt(position: string): readonly Cast[] {
  return CASTS.filter((cast) => cast.position === position)
}

