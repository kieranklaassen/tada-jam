import type { ForgivingTouch, Gesture, Point } from './input'
import { toStage, type Fit } from './stage'
import type { Toy } from './toy'

// What the toy does with the tracker's gestures, and with a finger that
// moves. Pure, so that a test can drive the toy through the tracker exactly
// as the Mount does: the tracker sends no move while a finger is inside a
// tap's slack, and the lever's knob must not wait for one.

/**
 * A press is answered where it lands; a drag leaves a line of pegs; every ending of a press or a drag lets go
 * of the peg under the finger. A press or a drag that was taken away is not the child letting go: it makes no
 * move, and puts nothing back, since each peg of the line was pushed in when the finger crossed its hole.
 */
export function play(toy: Toy, gestures: readonly Gesture[], by: Fit): void {
  for (const gesture of gestures) {
    switch (gesture.type) {
      case 'press': {
        const at = toStage(gesture.at, by)
        toy.press(at.x, at.y)
        break
      }
      case 'dragMove': {
        const at = toStage(gesture.at, by)
        toy.dragMove(at.x, at.y)
        break
      }
      case 'dragStart':
        break
      case 'tap':
      case 'dragLift':
      case 'dragEnd':
        toy.release()
        break
      case 'pressEnd':
      case 'dragCancel':
        toy.cancel()
        break
      default:
        gesture satisfies never
    }
  }
}

/**
 * A pointer moved to a point of the surface. The working finger's place goes to the toy at once, slack or no
 * slack, so that the lever's knob is under the finger from the first unit; then the tracker's gestures follow.
 */
export function fingerMoved(toy: Toy, touch: ForgivingTouch, id: number, where: Point, by: Fit): void {
  if (touch.holds(id)) {
    const at = toStage(where, by)
    toy.follow(at.x, at.y)
  }
  play(toy, touch.move(id, where), by)
}
