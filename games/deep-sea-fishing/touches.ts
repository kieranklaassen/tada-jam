import type { Game } from './game'
import type { Gesture, Point } from './input'

// What the game does with a gesture (the Mount hands each one here). The
// points arrive in the surface's own pixels. A press answers at once: a scene
// that is playing ends, and then the hook starts for the finger, or a bait,
// the cat, the tub, a catch or the gull answers as itself. A tap or a drop
// leaves the hook where the finger let go. Two endings are not the child's
// doing: a press or a drag that is taken away puts the hook back where the
// line was taken up.
//
// The top right corner is the grown-up's (overlay.ts) and answers no touch: a
// press there is not handed on, and a finger that draws the line into it
// stops drawing at its edge until it comes out again.

/**
 * Whether a finger counts as the child at work, for the idle ladder: one in the grown-up's corner does not, so
 * the glow and the hand stay as they are while a grown-up holds or taps there.
 */
export class Working {
  private cornered = false
  /** The working finger is at `at`: landed there or moved there. */
  at(at: Point, inCorner: (at: Point) => boolean): void {
    this.cornered = inCorner(at)
  }
  /** The finger lifted or was taken away. */
  lifted(): void {
    this.cornered = false
  }
  /** A finger that is down is the child's, unless it is in the corner. */
  counts(active: boolean): boolean {
    return active && !this.cornered
  }
}

export function answer(game: Game, gesture: Gesture, toStage: (at: Point) => Point, inCorner: (at: Point) => boolean): void {
  switch (gesture.type) {
    case 'press':
      if (!inCorner(gesture.at)) game.press(toStage(gesture.at))
      break
    case 'dragMove':
      if (!inCorner(gesture.at)) game.drag(toStage(gesture.at))
      break
    case 'tap':
    case 'dragEnd':
      game.release()
      break
    case 'pressEnd':
    case 'dragCancel':
      game.cancel()
      break
    case 'dragStart':
    case 'dragLift':
      break
    default:
      // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
      gesture satisfies never
  }
}
