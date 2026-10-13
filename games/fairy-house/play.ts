import { IdleLadder, type Guidance } from './guidance'
import type { Save } from './save'
import { Toy, type Show } from './toy'

// The game with its idle ladder, and no canvas, clock or pointer in it. The
// Mount turns each pointer gesture into one of these, in stage units, and
// plays each frame's step through `frame`; everything the ladder may and may
// not be reset by is decided here, where a test can hold it.
//
// - A finger that is working keeps the ladder at the bottom, and so does a
//   thing in the air and a scene that is playing.
// - What the three do by themselves never resets it: their idle delights,
//   their breathing, their sleep.
// - A touch in the grown-up's corner answers nothing and does not reset it.
// - Putting the game away takes it back to the bottom.

export type StageGesture =
  | { type: 'press'; x: number; y: number; corner: boolean }
  | { type: 'tap' | 'pressEnd' | 'dragStart' | 'dragCancel' }
  | { type: 'dragMove' | 'dragLift' | 'dragEnd'; x: number; y: number }

export class Play {
  readonly toy: Toy
  /** Seconds of play so far: the attended clock's, summed from the steps. */
  seconds = 0
  /** What the idle ladder shows now, or null before the first frame. */
  guidance: Guidance | null = null
  private readonly ladder = new IdleLadder(0)
  /** Whose finger is down: the child's, or one that landed in the grown-up's corner. */
  private finger: 'none' | 'child' | 'corner' = 'none'

  constructor(save: Save, seed: number) {
    this.toy = new Toy(save, seed)
  }

  act(gesture: StageGesture): void {
    const toy = this.toy
    switch (gesture.type) {
      case 'press':
        this.finger = gesture.corner ? 'corner' : 'child'
        if (!gesture.corner) this.ladder.touch(this.seconds)
        toy.press(gesture.x, gesture.y, gesture.corner)
        break
      // A tap changes nothing: the thing hops under the finger and drops back. A press taken away does the same.
      case 'tap':
      case 'pressEnd':
        toy.release()
        this.finger = 'none'
        break
      case 'dragStart':
        toy.dragStart()
        break
      case 'dragMove':
      case 'dragLift':
        toy.dragMove(gesture.x, gesture.y)
        break
      case 'dragEnd':
        toy.dragMove(gesture.x, gesture.y)
        toy.drop()
        this.finger = 'none'
        break
      // The drag was taken away and the child made no drop: what was in the hand goes back where it came from.
      case 'dragCancel':
        toy.cancel()
        this.finger = 'none'
        break
      default:
        // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
        gesture satisfies never
    }
  }

  /** One frame: `step` seconds of play. */
  frame(step: number): void {
    this.seconds += step
    if (this.finger === 'child' || this.toy.busy) this.ladder.touch(this.seconds)
    this.guidance = this.ladder.update(this.seconds)
    this.toy.step(step)
  }

  /** The game is put away: everything is laid at rest as a load would find it, and the idle ladder starts again from the bottom. */
  putAway(): void {
    this.toy.putAway()
    this.finger = 'none'
    this.ladder.touch(this.seconds)
    this.guidance = this.ladder.update(this.seconds)
  }

  show(): Show {
    return this.toy.show(this.guidance)
  }
}
