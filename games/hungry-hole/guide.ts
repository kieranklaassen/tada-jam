import { KEEPER } from './places'
import type { Play, Thing } from './play'
import { STREET } from './street'

// What the idle ladder shows, from the street as it stands: a glow on what
// can be touched now, and one move for the ghost hand. The hand shows a move
// and never a plan: the simplest thing a finger could do next.

export type Hint = {
  /** The thing that glows with the hole: the nearest one the mouth takes now. */
  thing: Thing | null
  /** The gate keeper and the gate glow instead of the hole: the street is bare after a float. */
  gate: boolean
  /** Where the hand taps: on the hole when a burp makes a stack, on that thing, on bare street beside a stack that rides, or on the gate keeper. */
  hand: { on: 'thing'; thing: Thing } | { on: 'hole' } | { on: 'street'; x: number; z: number } | { on: 'keeper'; x: number; z: number } | null
}

/** `finished` is the save's: the float of this street has gone out. */
export function hintOf(play: Play, finished: boolean): Hint {
  // The bare street after a float: a tap on the gate keeper lets the next street in.
  if (finished && play.bare) return { thing: null, gate: true, hand: { on: 'keeper', x: KEEPER.x, z: KEEPER.z } }
  const thing = play.nearestThatFits()
  // A tap on the hole would bring a thing up under another, or there are two inside to come up one under the other:
  // the hand shows the burp as soon as it makes a stack. The thing that fits glows on beside the hole.
  if (play.belly.length > 0 && play.belly.length + play.riders.length >= 2) return { thing, gate: false, hand: { on: 'hole' } }
  // Something fits: a tap on it calls the hole, which eats it.
  if (thing) return { thing, gate: false, hand: { on: 'thing', thing } }
  // Nothing fits and something is inside: a tap on the hole gives the last thing back.
  if (play.belly.length > 0) return { thing: null, gate: false, hand: { on: 'hole' } }
  // Everything rides on the breath: a tap on the street beside it calls the hole away and lets the stack down.
  if (play.riders.length > 0) {
    const side = play.x > 0 ? -1 : 1
    return { thing: null, gate: false, hand: { on: 'street', x: Math.max(STREET.x0 + 1, Math.min(STREET.x1 - 1, play.x + side * (play.mouth / 2 + 2))), z: Math.min(STREET.z1 - 0.6, play.z + 0.6) } }
  }
  return { thing: null, gate: false, hand: null }
}
