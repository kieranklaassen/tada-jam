import type { Lens } from './camera'
import type { Gesture } from './input'
import type { Island } from './island'
import { inCorner } from './overlay'
import { under, type Sky } from './pick'

// What the island does with a gesture. The Mount hands every gesture here,
// and this is the one place a gesture becomes a touch on the island.
//
// The grown-up's corner is no part of the game. A finger that lands there is
// answered by nothing, and neither is the rest of that touch, wherever the
// finger slides: the island does not hear of it, so its habits grow no louder
// and the idle guidance is not put off.

/** Whether the touch that is on the glass landed in the grown-up's corner. */
export type Hands = { aside: boolean }

/** Whether a finger on the glass is the child at play, which puts the idle guidance off: not one whose touch landed in the grown-up's corner. */
export const atPlay = (hands: Hands, fingerDown: boolean): boolean => fingerDown && !hands.aside

/** `width` is the surface's width in CSS pixels, which says where the corner is. */
export function answer(gesture: Gesture, island: Island, lens: Lens, sky: Sky | null, width: number, hands: Hands): void {
  switch (gesture.type) {
    case 'press':
      hands.aside = inCorner(gesture.at.x, gesture.at.y, width)
      // A wash that is playing ends before the finger's place is read: the touch is then an ordinary one (`touch` in island.ts).
      if (!hands.aside) island.touch(lens, gesture.at.x, gesture.at.y, sky)
      break
    case 'tap':
    case 'pressEnd':
      island.release()
      break
    case 'dragStart':
      if (!hands.aside) island.dragStart()
      break
    case 'dragMove':
      // A carried toy comes down on the ground under the fingertip: its ring lies there the whole way, and the toy rides above it.
      if (!hands.aside) island.drag(under(lens, gesture.at.x, gesture.at.y))
      break
    case 'dragLift':
      island.lift()
      break
    case 'dragEnd':
      island.drop()
      break
    // The drag was taken away and the child made no drop: the toy goes back where it came from.
    case 'dragCancel':
      island.cancel()
      break
    default:
      // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
      gesture satisfies never
  }
}
