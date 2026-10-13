import type { IdleLadder } from './guidance'
import type { ForgivingTouch, Gesture, Point } from './input'
import { inCorner } from './overlay'
import { toStage, type Fit } from './stage'
import type { Toy } from './toy'

// What the game does with the gestures of a touch. The points arrive in the
// surface's CSS pixels and go to the game in stage units. It has no page and
// no clock in it, so every rule of a touch is tested here on plain gestures:
// - A press is answered at once, and whichever gesture ends it lets go of
//   what it started.
// - A tap and a drag let go are the child's. A press or a drag that was taken
//   away (the game parked under the finger, or the browser took it) is not:
//   it makes no move for the child.
// - A press in the grown-up's corner is not the game's, and the rest of that
//   touch is left alone too. It does not take the idle ladder back either.
// - A put-away leaves the game as a load would find it.
// - A whole hand that lands together is one finger, the first to land. But a
//   contact that only rests never deadens the game. When the contact that is
//   working landed where nothing is (the rim, the table, the wall), or has
//   rested a second without moving, whatever it rests on, the next contact
//   that lands takes the work and is answered as itself, on anything. The
//   resting contact's touch is taken away, which makes no move, and a tool
//   it took up goes back to its place: a thumb that grips the edge of the
//   glass takes up no tool for good. A finger that is pulling is never
//   interrupted.

/** How long a contact rests without moving before another contact may take the work from it, in ms. */
export const REST_MS = 1000

export class Hands {
  /** The touch that is down began in the grown-up's corner. */
  private cornered = false
  /** The pointer whose touch the game is answering, when it landed (ms), and whether it has moved past a tap's slop. */
  private working: number | null = null
  private since = 0
  private dragging = false
  /** The last `down` took the work from a contact that only rested. The Mount reads it to forget the grown-up's hold. */
  handedOver = false

  /**
   * A contact lands on the surface, at `at` in its CSS pixels, at `t` ms. It is handed to the tracker, which lets
   * one finger work at a time. Before that, when the contact that is working only rests (it landed where nothing
   * is, or it has not moved for `REST_MS`), its touch is taken away, which makes no move for the child, and a
   * tool it took up goes back, so that this contact is pressed as a touch of its own. Returns the gestures for
   * `take`.
   */
  down(touch: ForgivingTouch, id: number, at: Point, t: number, toy: Toy | null): Gesture[] {
    const gestures: Gesture[] = []
    this.handedOver = false
    if (toy && this.working !== null && this.working !== id && touch.holds(this.working) && !this.dragging && (this.cornered || toy.onNothing || t - this.since >= REST_MS)) {
      if (!this.cornered) toy.handOver()
      gestures.push(...touch.cancel(this.working))
      this.handedOver = true
    }
    gestures.push(...touch.down(id, at, t))
    if (touch.holds(id) && this.working !== id) {
      this.working = id
      this.since = t
      this.dragging = false
    }
    return gestures
  }

  /** `seconds` is the attended clock's, for the idle ladder. */
  take(gestures: readonly Gesture[], toy: Toy, ladder: IdleLadder, by: Fit, width: number, seconds: number): void {
    for (const gesture of gestures) {
      switch (gesture.type) {
        case 'press': {
          this.cornered = inCorner(gesture.at.x, gesture.at.y, width)
          if (this.cornered) break
          ladder.touch(seconds)
          const where = toStage(gesture.at, by)
          toy.press(where.x, where.y)
          break
        }
        case 'dragMove': {
          if (this.cornered) break
          const where = toStage(gesture.at, by)
          toy.move(where.x, where.y)
          break
        }
        case 'tap':
          if (!this.cornered) toy.release('tap')
          break
        case 'dragEnd':
          if (!this.cornered) toy.release('drop')
          break
        // Taken away: what was moved stays moved, and no move is made for the child.
        case 'pressEnd':
        case 'dragCancel':
          if (!this.cornered) toy.release('cancel')
          break
        // A pull has no thing in hand to show waiting: the lift is its end (`letGo`, in the Mount).
        case 'dragStart':
          this.dragging = true
          break
        case 'dragLift':
          break
        default:
          // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
          gesture satisfies never
      }
    }
  }

  /**
   * Once a frame: a finger that is working, or a scene the child set off, is not idleness, and keeps the idle
   * ladder at the bottom. A finger in the grown-up's corner does not, and neither does anything the cat does by
   * itself.
   */
  idle(toy: Toy, ladder: IdleLadder, fingerDown: boolean, seconds: number): void {
    if ((fingerDown && !this.cornered) || toy.busy) ladder.touch(seconds)
  }

  /** Put away, after the touch has been taken away: the game settles as a load would find it, and the idle ladder is taken back. */
  putAway(toy: Toy, ladder: IdleLadder, seconds: number, seed?: number): void {
    this.cornered = false
    this.working = null
    this.dragging = false
    toy.putAway(seed)
    ladder.touch(seconds)
  }
}
