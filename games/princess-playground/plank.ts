import { lowTilt } from './world'

// The plank as a thing with weight: it turns toward its heavier end, faster
// the bigger the difference, knocks on the sand, rebounds a little and comes
// to rest. With the same weight on both ends it floats level and sways. Pure,
// and stepped at a fixed rate on game time.

export type PlankState = {
  /** Radians; positive is right end down. */
  tilt: number
  /** Radians a second. */
  spin: number
}

export type Knock = {
  /** The end that came down on the sand. */
  end: 'left' | 'right'
  /** How fast the plank was turning when it hit, radians a second. */
  speed: number
}

/** How hard a unit of weight difference turns the plank. */
export const TURN = 15
/** The plank's own reluctance to turn, in the game's weight units. */
export const PLANK_INERTIA = 2.2
/** Friction at the stone. */
export const DRAG = 0.9
/** How much of its speed the plank keeps when an end knocks on the sand. */
export const REBOUND = 0.28
/** Below this speed a knock is a touch: the end stays down. */
export const SETTLE_SPEED = 0.5
/** A level plank is pulled back to level this hard, and loses its sway this slowly. */
export const LEVEL_SPRING = 16
export const LEVEL_DRAG = 0.7
/** An empty plank loses its sway this fast: it lies still within a second. */
export const EMPTY_DRAG = 7
/** How fast an end that has been lightened comes up out of the hollow it dug, radians a second. */
export const RISE = 0.4

/**
 * One fixed step. `left` and `right` are the weights resting on each end.
 * Returns the knock if an end came down on the sand in this step.
 */
export function stepPlank(state: PlankState, left: number, right: number, dt: number): Knock | null {
  const difference = right - left
  let pull: number
  if (difference === 0) {
    // A plank with nobody on it comes level and lies still at once; one that floats two equal ends sways on.
    pull = -LEVEL_SPRING * state.tilt - (left === 0 ? EMPTY_DRAG : LEVEL_DRAG) * state.spin
  } else {
    pull = (TURN * difference) / (PLANK_INERTIA + left + right) - DRAG * state.spin
  }
  state.spin += pull * dt
  state.tilt += state.spin * dt
  // The end that is going down stops in the sand, deeper the more it carries.
  const limit = lowTilt(state.tilt > 0 ? right : left)
  if (Math.abs(state.tilt) < limit) return null
  const end = state.tilt > 0 ? 'right' : 'left'
  const speed = Math.abs(state.spin)
  const into = Math.sign(state.spin) === Math.sign(state.tilt)
  if (!into) {
    // Lighter than it was, and on its way up out of the hollow it dug: it rises to where it now belongs.
    state.tilt = Math.sign(state.tilt) * Math.max(limit, Math.abs(state.tilt) - RISE * dt)
    return null
  }
  state.tilt = Math.sign(state.tilt) * limit
  // Moving into the sand: knock and rebound, or stay if it was only a touch.
  if (speed < SETTLE_SPEED) {
    state.spin = 0
    return null
  }
  state.spin = -state.spin * REBOUND
  return { end, speed }
}

/** A push on the plank: something landed on an end, or a finger tapped it. Positive turns the right end down. */
export function nudge(state: PlankState, spin: number): void {
  state.spin += spin
}

/** True when the plank has come to rest where its weights leave it. */
export function atRest(state: PlankState, left: number, right: number): boolean {
  const target = Math.sign(right - left) * lowTilt(Math.max(left, right))
  return Math.abs(state.tilt - target) < 0.004 && Math.abs(state.spin) < 0.02
}
