import type { ForgivingTouch, Gesture, Point } from './input'

// What the Mount does with a touch, as two functions it calls and a test can
// call: which gestures a lift gives, and what each gesture is to the glade.
// The Mount adds only what needs a browser: where the pointer is, the sound,
// the save.

/** As much of the glade as a touch needs. */
export type Touched = { press(at: Point): void; drag(at: Point): void; lift(): void; takeAway(): void; wait(at: Point): void }

/**
 * A finger lifts. Letting go is the act in this game (a mushroom stops swelling, a pulled one comes out, a door
 * is dropped), so a drag ends at the lift, with one exception: a stroke of pebbles survives a lifted finger.
 * While the glade is `drawing`, the lift only waits (`LIFT_GRACE_MS` in input.ts): a finger that comes back in
 * that time near where it left goes on with the same stroke, and otherwise the stroke ends where it was let go.
 */
export function lift(touch: ForgivingTouch, drawing: boolean, id: number, at: Point, t: number): Gesture[] {
  const gestures = touch.up(id, at, t)
  return drawing ? gestures : [...gestures, ...touch.letGo()]
}

/** Hands gestures to the glade, each as what it is there. `onStage` turns a point of the surface into one of the stage. */
export function hand(glade: Touched, gestures: readonly Gesture[], onStage: (at: Point) => Point): void {
  for (const gesture of gestures) {
    switch (gesture.type) {
      // The finger lands, and whatever is under it answers in this call: a button of a mushroom, a squash, a ring.
      case 'press':
        glade.press(onStage(gesture.at))
        break
      // The finger let go where it landed: the end of a poke or of a hold.
      case 'tap':
        glade.lift()
        break
      // The press was taken away, which is no tap: a mushroom stays as tall as it was held, and nothing is poked.
      case 'pressEnd':
        glade.takeAway()
        break
      case 'dragStart':
        break
      case 'dragMove':
        glade.drag(onStage(gesture.at))
        break
      // The finger let go mid-drag: `lift` above decides whether the drag ends here or waits. A stroke of pebbles
      // waits, and the glade is told where the finger left, so that the wait is seen; to anything else this is nothing.
      case 'dragLift':
        glade.wait(onStage(gesture.at))
        break
      case 'dragEnd':
        glade.lift()
        break
      // The drag was taken away and the child made no drop: a mushroom that was being pulled stays where it stands.
      case 'dragCancel':
        glade.takeAway()
        break
      default:
        // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
        gesture satisfies never
    }
  }
}
