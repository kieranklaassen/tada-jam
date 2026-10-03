// What the ink page draws from: the hotel as it stands at one moment, already
// worked out. The renderer reads nothing else, so the game can build one of
// these from its rules and the page will draw it. Pure data: no renderer, no DOM.

import type { GuestId, Phase } from './guests'
import type { House } from './hotel'

export type InkMood = 'content' | 'cross' | 'happier'

export type InkSide = 'left' | 'right' | 'up' | 'down'

/** How a figure is squashed, leant and moved this frame by its own motion (motion.ts). `rest` changes nothing. */
export type InkBody = {
  /** Width and height as shares of the figure's own: 1 is as drawn. */
  sx: number
  sy: number
  /** Lean about its feet, in radians. */
  rot: number
  /** Shift from where it stands, in the drawing's units. */
  dx: number
  dy: number
}

export const REST: InkBody = { sx: 1, sy: 1, rot: 0, dx: 0, dy: 0 }

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
  /** Its own motion this frame. Left out, the page moves it by its own idle breathing. */
  body?: InkBody
  /** In the child's hand: where the finger is, in logical pixels. It dangles from there, stiff, its bag swinging by `swing`. */
  carried?: { x: number; y: number; swing: number } | null
  /** The side a knock on a wall came from, which it looks toward for a moment. */
  looks?: InkSide | null
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

/** How the guest whose place the page is drawn from takes an air: something it loves, something it minds, or nothing to it. On the plain page every air is `plain`. */
export type InkTaken = 'plain' | 'loved' | 'minded' | 'faint'

export type InkAir = {
  kind: 'din' | 'pong' | 'warm' | 'cold'
  /** The rooms it passes through, in order from where it is made. */
  rooms: number[]
  /** Its strength in the last of them. */
  level: number
  /** Left out, it is `plain`. */
  taken?: InkTaken
}

/** One circular redrawing of the page, spreading from a point: from one guest's place to another's or to the plain page, or from one hour to the other. */
export type InkSweep = {
  /** Where it starts, in logical pixels: the feet of the guest touched, or the wheel. */
  x: number
  y: number
  /** How far it has got, 0 to 1. At 1 it is over and only what it brought is drawn. */
  progress: number
}

/** The page as one guest takes it. */
export type InkView = {
  from: GuestId
  /** The room drawn large: its own, the one it asks for while it has none, or the one it is held over while carried. */
  room: number | null
}

export type InkScene = {
  house: House
  phase: Phase
  guests: InkGuest[]
  things: InkThing[]
  airs: InkAir[]
  /** Whose place the page is drawn from. None is the plain page. */
  from: GuestId | null
  /** The view the page is drawn in, with its large room. Left out or null with `from` null: the plain page. */
  view?: InkView | null
  /** What a sweep in progress is replacing: the view (or, when null, the plain page) that lies outside its circle. */
  under?: InkView | null
  /** The sweep from `under` to `view`. Left out or at 1: no sweep. */
  sweep?: InkSweep | null
  /** The hour a sweep from the wheel is replacing, and that sweep. Left out: the hour is as `phase` says everywhere. */
  hourUnder?: Phase | null
  hourSweep?: InkSweep | null
  /** How far the wheel has turned on from where `phase` puts it, in radians, while it spins or settles. */
  wheelTurn?: number
  /** The idle glow on what can be touched: its strength, 0 to 1, and what it lies on. */
  glow?: { strength: number; guests: GuestId[]; wheel: boolean } | null
  /** The ghost hand showing one move: where its fingertip is, in logical pixels, whether it is pressing, and how solid it is. */
  hand?: { x: number; y: number; down: boolean; alpha: number } | null
  /** Lamps set swinging by a touch: the room and the angle, in radians. */
  lamps?: { room: number; angle: number }[]
  /** A knock on a wall or floor: where, in logical pixels, and how long ago in seconds. Its marks last about half a second. */
  knocks?: { x: number; y: number; age: number }[]
  /** Whether the coach and what waits in it are drawn. Left out, they are. */
  coach?: boolean
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
