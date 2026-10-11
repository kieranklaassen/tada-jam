import type { Beat } from './figure'
import type { House, RoomId } from './house'
import type { Point } from './input'
import type { Shape } from './layout'
import type { Pen, Picture } from './pen'
import type { Rng } from './rng'
import type { Cue } from './voices'

// What a room is to the game: a print, a set of segments, and rules that say
// which of them are lit for a house, what answers a touch and how. A room
// draws through a pen and decides through plain values; it reads no clock.

/** Which segments each figure of the room shows. Every figure of the room is named, an absent one with no segments. */
export type Cast = Record<string, readonly string[]>

/** One figure's run of poses, started now or `after` seconds from now. */
export type Part = { who: string; after?: number; beats: readonly Beat[] }
export type Plan = readonly Part[]

/** The short-lived things of the room on screen, gone on load: the spot the fly is on, which answer came last, what a wrong use left on a head. */
export type Live = Record<string, number>

/** What a touch came to. */
export type Answer = {
  /** The house after the touch, when the touch changed it. */
  house?: House
  /** A change that keeps coming is saved at the throttle ('soon'); every other change at once. */
  save?: 'soon' | 'now'
  /** The answer is a scene: its outcome is saved as it starts, and any touch ends it. */
  scene?: boolean
  plan: Plan
}

/** A thing that answers a touch, and where. `grip` names what a finger that stays down goes on to do. */
export type Target = { id: string; shape: Shape; grip?: 'rub' | 'pull' }

/** What the idle ladder shows: a tap at a point, or a drag from it to another. */
export type Hint = { at: Point; to?: Point; glow: Shape }

/** A figure whose eyes follow the finger while one of the poses `when` is lit: the pupils are `base` and then L, C or R. */
export type Eyes = { who: string; when: readonly string[]; base: string; x: number }

export type RoomDef = {
  id: RoomId
  /** The printed card of the room, left of the stairwell. */
  print(p: Pen, day: boolean): void
  /** Every segment of the room, by name. */
  segments: Readonly<Record<string, Picture>>
  /** The segments whose unlit ghosts show on the glass. */
  ghosts: readonly string[]
  /** The figure that is the dog on his feet in this room, where it is not called `dog`: he goes ahead through a door from there too. */
  dog?: string
  /** The room's short-lived things as it is entered or loaded. */
  enter(house: House): Live
  /** Everyone at rest, as the house stands. */
  rest(house: House, live: Live): Cast
  /** A figure's own run while nobody touches it, or null when it only rests. */
  idle(who: string, house: House, live: Live, rng: Rng): readonly Beat[] | null
  /** What answers a touch, nearest the finger first. */
  targets(house: House, live: Live): Target[]
  touch(id: string, house: House, live: Live, rng: Rng, at: Point): Answer | null
  /** A finger that is rubbing has come to `at`. Returns an answer when it wiped something there. */
  rub?(house: House, live: Live, at: Point): Answer | null
  /** A finger that took hold with `grip: 'pull'` has gone `up` stage units upward. Returns an answer when that came to something. */
  pull?(house: House, live: Live, up: number): Answer | null
  /** The pull was let go before it came to anything. */
  letGo?(house: House, live: Live): Plan
  /** What the room's thing does as a door is opened. */
  leave(house: House, live: Live): Plan
  /** What plays as the room is entered: what was carried in from other rooms. `meets` says a meeting happens on this arrival: the dog has just arrived at the toppled pies, or the baker serves the pie from his hat. */
  arrive(house: House, live: Live, meets: boolean): Plan
  /** Everyone squints at the lamp. */
  squint(house: House, live: Live): Plan
  /** The room's thing, as the idle ladder shows it, or null when it is at its last step. */
  hint(house: House, live: Live): Hint | null
  eyes?: readonly Eyes[]
}

/** One beat: a pose, how long it is held, and its sound. */
export const b = (show: string | readonly string[], hold: number, cue?: Cue): Beat => ({ show: typeof show === 'string' ? [show] : show, hold, cue })

/** How long a plan plays, in seconds. */
export function planLength(plan: Plan): number {
  return plan.reduce((end, part) => Math.max(end, (part.after ?? 0) + part.beats.reduce((sum, beat) => sum + (Number.isFinite(beat.hold) ? beat.hold : 0), 0)), 0)
}

/** One of `count` answers, never the one that came last. */
export function another(rng: Rng, count: number, last: number): number {
  const pick = Math.min(count - (last < 0 || last >= count ? 0 : 1) - 1, Math.floor(rng.next() * (last < 0 || last >= count ? count : count - 1)))
  return last >= 0 && last < count && pick >= last ? pick + 1 : pick
}
