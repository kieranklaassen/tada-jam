import type { ForgivingTouch, Gesture, Point } from './input'

/**
 * A finger let go. The template's tracker keeps a lifted drag open for a
 * moment, so a small hand that slips can take the thing up again; a finger
 * landing near by in that moment carries on with the old drag. The children
 * of this game let go on purpose, and their next touch is often the pot next
 * door a blink later. So here a drop is taken where and when the finger
 * lifts, and the touch after it is a touch of its own.
 */
export function letGo(touch: ForgivingTouch, id: number, at: Point, t: number): Gesture[] {
  return [...touch.up(id, at, t), ...touch.advance(Infinity)]
}
