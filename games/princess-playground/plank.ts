import { MAX_TILT } from './world'

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

/**
 * One fixed step. `left` and `right` are the weights resting on each end.
 * Returns the knock if an end came down on the sand in this step.
 */
export function stepPlank(state: PlankState, left: number, right: number, dt: number): Knock | null {
  const difference = right - left
  let pull: number
  if (difference === 0) {
    pull = -LEVEL_SPRING * state.tilt - LEVEL_DRAG * state.spin
  } else {
    pull = (TURN * difference) / (PLANK_INERTIA + left + right) - DRAG * state.spin
  }
  state.spin += pull * dt
  state.tilt += state.spin * dt
  if (Math.abs(state.tilt) < MAX_TILT) return null
  const end = state.tilt > 0 ? 'right' : 'left'
  const speed = Math.abs(state.spin)
  state.tilt = Math.sign(state.tilt) * MAX_TILT
  // Moving into the sand: knock and rebound, or stay if it was only a touch.
  const into = Math.sign(state.spin) === Math.sign(state.tilt)
  if (!into) return null
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
  const target = Math.sign(right - left) * MAX_TILT
  return Math.abs(state.tilt - target) < 0.004 && Math.abs(state.spin) < 0.02
}
