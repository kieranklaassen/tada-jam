import type { Guidance } from './guidance'
import type { Salon } from './world'

// What the idle ladder shows, for a salon as it stands: what glows as a
// thing to touch now, and what move the ghost hand shows. It shows what can
// be touched and then one move, never a solution: under the cape the hand
// shows the verb on a tuft of the mane, not on the lock, and after that the
// cape's knot. With nobody under the cape there is only the glow: on the
// door, and on the chair as well when a finished pair stands by it.

export type Glow = 'door' | 'chair' | 'lock' | 'knot'
export type HandMove =
  /** The hand snips or pulls one tuft of the mane. */
  | { on: 'tuft'; move: 'snip' | 'pull'; tuft: number }
  /** The hand taps the cape's knot. */
  | { on: 'knot' }

export type Hint = { glow: readonly Glow[]; hand: HandMove | null }

export function hintFor(salon: Salon | null, guidance: Guidance | null, inScene: boolean): Hint {
  // A scene is not idleness: nothing glows over it.
  if (!salon || !guidance || inScene || (guidance.glow <= 0 && guidance.demo === null)) return { glow: [], hand: null }
  const somebody = salon.chair !== null
  if (!somebody || salon.cape === 'off') return { glow: somebody ? ['door', 'chair'] : ['door'], hand: null }
  if (guidance.demo === null) return { glow: ['lock'], hand: null }
  // Turn about: the verb, then the knot, then the other verb, then the knot again. A child who has done with the
  // hair is shown the way on within a few breaths, and one who has not is shown each verb once.
  if (guidance.demoIndex % 2 === 1) return { glow: ['knot'], hand: { on: 'knot' } }
  // The verb on a tuft where it shows best: a snip on the longest tuft first, a pull on the shortest the next time.
  const snip = guidance.demoIndex % 4 === 0
  const pick = snip ? Math.max(...salon.mane) : Math.min(...salon.mane)
  return { glow: ['lock'], hand: { on: 'tuft', move: snip ? 'snip' : 'pull', tuft: Math.max(0, salon.mane.indexOf(pick)) } }
}
