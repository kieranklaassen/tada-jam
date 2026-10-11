import type { Gesture, Point } from './input'
import type { Yard } from './model'

// What the yard does with a gesture. Pure, so that the rule about the grown-up's
// corner has a test: a touch that begins there does nothing in the yard, as a tap
// or as a drag.

/**
 * Hands one gesture to the yard. `onStage` turns a point of the surface into a stage point, and `inCorner`
 * says whether a point of the surface lies in the grown-up's corner.
 */
export function sendGesture(yard: Yard, gesture: Gesture, onStage: (point: Point) => Point, inCorner: (point: Point) => boolean): void {
  switch (gesture.type) {
    // The answer starts when the finger lands: the peg, the turn of the raccoon, the thing that hops.
    case 'press':
      if (!inCorner(gesture.at)) yard.press(onStage(gesture.at))
      break
    // The press already sent the raccoon on its way: a tap adds nothing, and a press taken away takes nothing back.
    case 'tap':
    case 'pressEnd':
    case 'dragStart':
    case 'dragLift':
      break
    // A finger that drags leads the raccoon over the floor, wherever it has got to, unless it set out from the corner.
    case 'dragMove':
      if (!inCorner(gesture.from)) yard.lead(onStage(gesture.at))
      break
    // The finger let go: the raccoon does what it does where it was led.
    case 'dragEnd':
      if (!inCorner(gesture.from)) yard.letGo()
      break
    // The drag was taken away and the child chose no spot: the raccoon stops where it has got to.
    case 'dragCancel':
      if (!inCorner(gesture.from)) yard.takenAway()
      break
    default:
      // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
      gesture satisfies never
  }
}
