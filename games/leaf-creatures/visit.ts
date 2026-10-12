import { IdleLadder } from './guidance'
import type { Tier } from './config'
import type { Guidance } from './guidance'
import type { ForgivingTouch, Gesture, Point } from './input'
import type { Painter } from './painter'
import type { Pen } from './pen'
import { drawFrame } from './view'
import { putAway, type Toy } from './toy'

// The small rules of a visit that the Mount keeps, written apart from it so
// that a test can hold them.

/**
 * Whether this frame takes the idle ladder back to the bottom. A finger that is working does, and so does a
 * scene the child caused, for as long as it plays. A finger in the grown-up's corner does not, and neither does
 * anything a character does by itself: a creature that wanders, digs or naps is no touch.
 */
export function holdsLadder(touchActive: boolean, cornered: boolean, toy: Toy | null): boolean {
  // A part in the hand is a finger at work wherever any other finger is: the hint never rises during a carry.
  return (touchActive && !cornered) || (toy !== null && (toy.holdsLadder || toy.hand !== null))
}

/**
 * A finger lands. Only the finger that begins a press says whether the working finger is in the grown-up's corner:
 * a second finger or a palm landing there, or a finger that comes back to a carry, changes nothing for the finger
 * that is working. Returns the gestures of the landing and where the working finger now counts as being.
 */
export function landing(touch: ForgivingTouch, id: number, at: Point, time: number, cornered: boolean, inCorner: (at: Point) => boolean): { gestures: Gesture[]; cornered: boolean } {
  const gestures = touch.down(id, at, time)
  return { gestures, cornered: gestures.some((gesture) => gesture.type === 'press') ? inCorner(at) : cornered }
}

/**
 * What being put away does to a visit, at the attended clock's `now`: the clearing becomes exactly what a load of
 * what was just saved gives, with nothing in the hand, no scene under way and nothing sounding, and the idle
 * ladder is taken back to the bottom. A game that is parked and one that is closed and opened are then one case.
 */
export function park(toy: Toy, childAge: number | null, visitSeed: number, now: number): { toy: Toy; ladder: IdleLadder } {
  return { toy: putAway(toy, childAge, visitSeed), ladder: new IdleLadder(now) }
}

/** The time the touch tracker is told, in ms: the toy's own clock, so a lift's grace runs only while the game does. */
export function touchClock(toy: Toy | null): number {
  return toy ? toy.time * 1000 : 0
}

/**
 * The gestures of a lifted finger. The lift's grace is for a carried part and nothing else: with a part in the hand
 * the drag waits out the lift, so the finger can come back and carry on. A slide that carries nothing (a stroke, a
 * sliding poke, an eye stretched and not pulled off) ends there and then, in the call that brings the lift, so it
 * is answered on that frame, sight and sound together, and a finger that lands again begins a touch of its own.
 */
export function liftOf(toy: Toy | null, touch: ForgivingTouch, id: number, at: Point): Gesture[] {
  const gestures = touch.up(id, at, touchClock(toy))
  if (toy?.hand) return gestures
  return [...gestures, ...touch.letGo()]
}

/**
 * What one gesture does to the toy. `place` gives where a point of the surface is on the stage; a press for
 * which `cornered` holds is in the grown-up's corner, which answers nothing. A carry survives a lifted finger (input.ts): at the lift
 * the part waits, seen to be letting go, and it is dropped only when the tracker gives the drag up, which it
 * does when the finger has stayed away for the grace or has come down somewhere else.
 */
export function perform(toy: Toy | null, gesture: Gesture, place: (at: Point) => Point, cornered: (at: Point) => boolean = () => false): void {
  if (!toy) return
  switch (gesture.type) {
    case 'press': {
      if (cornered(gesture.at)) break
      const at = place(gesture.at)
      toy.press(at.x, at.y)
      break
    }
    case 'tap':
      toy.tap()
      break
    case 'dragStart':
      // The part is in the hand since the press, so the carry has nothing to begin.
      break
    case 'dragMove': {
      const at = place(gesture.at)
      toy.move(at.x, at.y)
      break
    }
    case 'dragLift':
      toy.wait()
      break
    case 'dragEnd':
      toy.drop()
      break
    // The press or the drag was taken away and the child made no drop: whatever was in the hand is back where
    // it came from, and a finger that was calling the creatures calls no more.
    case 'pressEnd':
    case 'dragCancel':
      toy.cancel()
      break
    default:
      // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
      gesture satisfies never
  }
}

/**
 * One draw of the clearing, in the order the Mount keeps: when the kept pictures are new (a load, a put-away, a
 * surface of another size) the place and every creature's own picture are made first, and then the frame begins
 * and is drawn. So the first draw after the slot is read shows every creature, attended or not, and no frame
 * ever carries the making of the pictures.
 */
export function show(pen: Pen, painter: Painter, toy: Toy, guidance: Guidance | null, tier: Tier, begin: () => void): void {
  painter.prime(pen, toy, tier)
  begin()
  drawFrame(pen, toy, guidance, tier, painter)
}
