// What the ink page draws from: the hotel as it stands at one moment, already
// worked out. The renderer reads nothing else, so the game can build one of
// these from its rules and the page will draw it. Pure data: no renderer, no DOM.

import type { GuestId, Phase } from './guests'
import type { House } from './hotel'

export type InkMood = 'content' | 'cross' | 'happier'

export type InkSide = 'left' | 'right' | 'up' | 'down'

export type InkGuest = {
  id: GuestId
  place: { room: number } | 'lobby' | 'bench'
  awake: boolean
  mood: InkMood
  /** The wall, floor or ceiling the trouble comes through, which a cross guest turns to. */
  turnedTo: InkSide | null
  /** Wrapped in the quilt. */
  wrapped: boolean
  /** The room whose door a guest in the lobby stares at. */
  staresAt: number | null
}

export type InkThingKind = 'quilt' | 'pipe' | 'stove' | 'ice' | 'clock'

/** The five things in the order of their slots in the cupboard. */
export const INK_THING_KINDS: readonly InkThingKind[] = ['quilt', 'pipe', 'stove', 'ice', 'clock']

export type InkThing = {
  kind: InkThingKind
  at: 'cupboard' | { room: number } | { edge: string } | { guest: GuestId }
  /** The step of the stove's or the ice box's dial; the other things ignore it. */
  dial: 1 | 2 | 3
}

export type InkAir = {
  kind: 'din' | 'pong' | 'warm' | 'cold'
  /** The rooms it passes through, in order from where it is made. */
  rooms: number[]
  /** Its strength in the last of them. */
  level: number
}

export type InkScene = {
  house: House
  phase: Phase
  guests: InkGuest[]
  things: InkThing[]
  airs: InkAir[]
  /** Whose place the page is drawn from. None is the plain page, which is all the page draws so far. */
  from: GuestId | null
}

const asleep = { awake: false, wrapped: false, staresAt: null } as const

/**
 * The look spike's one scene: the long house on a full night. The troll plays
 * in the middle of the upper floor; the blob next door and the fly under the
 * snow are cross, each with something it minds; everyone else is content.
 */
export const SPIKE_SCENE: InkScene = {
  house: { shape: 'long', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 2 }], twins: [] },
  phase: 'night',
  guests: [
    { id: 'lizard', place: { room: 0 }, mood: 'content', turnedTo: null, ...asleep },
    { id: 'cook', place: { room: 1 }, mood: 'content', turnedTo: null, ...asleep },
    { id: 'fly', place: { room: 2 }, mood: 'cross', turnedTo: 'up', ...asleep },
    { id: 'blob', place: { room: 3 }, mood: 'cross', turnedTo: 'right', ...asleep },
    { id: 'troll', place: { room: 4 }, awake: true, mood: 'content', turnedTo: null, wrapped: false, staresAt: null },
    { id: 'yeti', place: { room: 5 }, mood: 'content', turnedTo: null, ...asleep },
    { id: 'bat', place: 'lobby', awake: true, mood: 'content', turnedTo: null, wrapped: false, staresAt: 5 },
    { id: 'singer', place: 'bench', awake: true, mood: 'content', turnedTo: null, wrapped: false, staresAt: null },
  ],
  things: [
    { kind: 'quilt', at: 'cupboard', dial: 1 },
    { kind: 'pipe', at: 'cupboard', dial: 1 },
    { kind: 'stove', at: 'cupboard', dial: 2 },
    { kind: 'ice', at: 'cupboard', dial: 1 },
    { kind: 'clock', at: 'cupboard', dial: 1 },
  ],
  airs: [
    // The tuba, heard in its own room and one room on through each wall and through the floor.
    { kind: 'din', rooms: [4, 3], level: 1 },
    { kind: 'din', rooms: [4, 5], level: 1 },
    { kind: 'din', rooms: [4, 1], level: 1 },
    // The boiler's warmth, up through the ceiling of the room over it.
    { kind: 'warm', rooms: [0, 3], level: 1 },
    // The cold of the snow hole and of the yeti's own cloud, down through the floor.
    { kind: 'cold', rooms: [5, 2], level: 2 },
  ],
  from: null,
}
