import { WATER } from './pose'
import { groundAt } from './sheet'
import { WAIT } from './ride'
import type { Beat } from './scene'
import type { Site, VehicleId } from './sites'
import type { Reaction } from './vehicles'

// The short scenes as lists of timed beats (scene.ts), and what they show.
// Pure: a beat only writes its progress into a `Show`, and the functions below
// turn a show into where a vehicle is. The game starts a scene and saves its
// outcome at that moment; the view reads the show and never changes it.

/** What a scene is showing at this instant: each beat's progress, 0 before it and 1 after. */
export type Show = {
  kind: 'give' | 'crossing' | null
  vehicle: VehicleId | null
  /** The run was the way home: the vehicle ends at the near bank. */
  homeward: boolean
  /** Where the vehicle's front axle was when the scene began, in cells, and how its body was tilted. */
  from: readonly [number, number]
  tilt: number
  /** The give: the part gives and the pieces part; the vehicle falls; it floats and paddles to the near bank; it drives up; it shakes the water off; the bridge goes back as built. */
  snap: number
  fall: number
  paddle: number
  climb: number
  shake: number
  restore: number
  /** The crossing: the bridge springs up and rings; the vehicle shows how the ride went; it parks; the ring fades; the next roll and the other vehicle arrive. */
  spring: number
  react: number
  park: number
  fade: number
  arrive: number
  /** How the vehicle took the ride, for the crossing. */
  reaction: Reaction | null
}

export const idleShow = (): Show => ({ kind: null, vehicle: null, homeward: false, from: [0, 0], tilt: 0, snap: 0, fall: 0, paddle: 0, climb: 0, shake: 0, restore: 0, spring: 0, react: 0, park: 0, fade: 0, arrive: 0, reaction: null })

/** A cue for a sound, played once when its beat begins: the game queues the voice. */
export type Cue = 'splash' | 'ring' | 'react' | 'arrive' | 'restore'

const beat = (at: number, lasts: number, write: (progress: number) => void): Beat => ({ at, lasts, play: write })

/**
 * The give (a consequence; 4 to 6 seconds): the part gives at its spot and the
 * pieces drop; the vehicle falls, floats on its crates, paddles to the near
 * bank and drives up, shaking off water; it ends with the bridge back as built.
 */
export function giveBeats(show: Show, cue: (what: Cue) => void): Beat[] {
  let splashed = false, restored = false
  return [
    beat(0, 0.3, (p) => { show.snap = p }),
    beat(0.15, 0.75, (p) => { show.fall = p; if (p >= 1 && !splashed) { splashed = true; cue('splash') } }),
    beat(0.9, 1.9, (p) => { show.paddle = p }),
    beat(2.8, 0.8, (p) => { show.climb = p }),
    beat(3.6, 0.8, (p) => { show.shake = p }),
    beat(3.7, 0.9, (p) => { show.restore = p; if (p > 0 && !restored) { restored = true; cue('restore') } }),
  ]
}

/**
 * The crossing (the ending; about 8 seconds): the wheels leave the last plank
 * and the bridge springs up and rings with the notes of its own parts; the
 * cargo and the driver show how this ride went; the vehicle parks in the
 * lay-by and stays there; the pencil ring fades; the next roll slides in and
 * one other vehicle draws up at the near bank.
 */
export function crossingBeats(show: Show, cue: (what: Cue) => void): Beat[] {
  let rung = false, reacted = false, arrived = false
  return [
    beat(0, 0.7, (p) => { show.spring = p; if (!rung) { rung = true; cue('ring') } }),
    beat(0.5, 3.4, (p) => { show.react = p; if (!reacted) { reacted = true; cue('react') } }),
    beat(3.9, 1.3, (p) => { show.park = p }),
    beat(4.6, 1.2, (p) => { show.fade = p }),
    beat(5.8, 1.9, (p) => { show.arrive = p; if (!arrived) { arrived = true; cue('arrive') } }),
  ]
}

const ease = (t: number) => t * t * (3 - 2 * t)

/** Where a vehicle in a scene is drawn: its front axle in cells, its tilt, how deep it sits in the water, and a wiggle for shaking dry. */
export type Place = { x: number; y: number; tilt: number; afloat: number; wiggle: number }

/** The vehicle during the give: down into the water, along it to the near bank, up the bank, and still. `long` is the distance from its front axle to its last. */
export function givePlace(show: Show, at: Site, long: number): Place {
  const wait = at.left[0] - WAIT.before, shore = at.left[0] + 0.4 + long
  // It falls where it was, nose first, a little further on than where the road left it, and never into either bank.
  const dropX = Math.min(Math.max(show.from[0], shore) + 0.3 * show.fall, at.right[0] - 0.9)
  const afloat = WATER + 0.25, fallY = show.from[1] + (afloat - show.from[1]) * show.fall * show.fall
  // It floats on the water, and where a rock or a ledge stands out of it, it clambers over: its wheels are never inside one.
  const over = (x: number) => Math.max(afloat, Math.min(at.left[1], groundAt(at, x)) + 0.02, Math.min(at.left[1], groundAt(at, x - long)) + 0.02)
  if (show.paddle <= 0) return { x: dropX, y: Math.max(fallY, over(dropX)), tilt: show.tilt - 0.35 * show.fall, afloat: show.fall >= 1 ? 1 : 0, wiggle: 0 }
  if (show.climb <= 0) {
    // Afloat on its crates: it bobs, and paddles back toward the near bank.
    const x = dropX + (shore - dropX) * ease(show.paddle)
    return { x, y: over(x) + (over(x) > afloat ? 0 : 0.08 * Math.abs(Math.sin(show.paddle * 14))), tilt: 0.06 * Math.sin(show.paddle * 9), afloat: over(x) > afloat ? 0 : 1, wiggle: 0 }
  }
  // Out of the water in one leap: straight up beside the bank to the height of its top, then over onto it and back to
  // where it waits. It never goes through the bank's corner.
  const up = ease(Math.min(1, show.climb * 2)), across = ease(Math.max(0, show.climb * 2 - 1)), base = over(shore)
  return {
    x: shore + (wait - shore) * across,
    y: base + (at.left[1] - base) * up + 0.45 * Math.sin(Math.PI * Math.min(1, show.climb * 2)) * (1 - across) + 0.5 * Math.sin(Math.PI * across),
    tilt: 0.3 * Math.sin(Math.PI * show.climb), afloat: 1 - up, wiggle: show.shake > 0 && show.shake < 1 ? Math.sin(show.shake * 40) * (1 - show.shake) : 0,
  }
}

/** The vehicle during the crossing: where the run left it while it reacts, then on to where it stays: the lay-by on the far bank, or, come home, its place in the line at the near bank. `stays` is that place's x. */
export function crossingPlace(show: Show, at: Site, stays: number): Place {
  return { x: show.from[0] + (stays - show.from[0]) * ease(show.park), y: show.homeward ? at.left[1] : at.right[1], tilt: 0, afloat: 0, wiggle: 0 }
}

/** Where the next roll stands as it slides in from the right edge: its x in cells, for a sheet `cols` wide. */
export const rollPlace = (arrive: number, cols: number): number => cols + 2.2 - 2.3 * ease(Math.min(1, arrive * 1.6))

/** How far the other vehicle has drawn up to the near bank from off the sheet: its front axle's x. `place` is its place in the line, 0 at the front. */
export const drawUp = (arrive: number, at: Site, place: number): number => {
  const stand = at.left[0] - WAIT.before - WAIT.apart * place
  return stand - (stand + 4) * (1 - ease(Math.max(0, Math.min(1, (arrive - 0.25) / 0.75))))
}
