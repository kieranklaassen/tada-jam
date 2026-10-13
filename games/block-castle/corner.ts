import type { Gesture } from './input'
import { inCorner } from './overlay'

// The grown-up's corner is not the child's. A touch that lands there is the
// grown-up's from its press to its end: its press is not answered, and neither
// is a drag that begins there and leaves the corner, so no block is carried by
// it and the folk's eyes do not follow it.

export class ChildsTouch {
  /** The touch in progress landed in the corner. */
  private grownUps = false

  /** Whether this gesture is the child's, on a surface this wide. */
  takes(gesture: Gesture, width: number): boolean {
    if (gesture.type === 'press') {
      this.grownUps = inCorner(gesture.at.x, gesture.at.y, width)
      return !this.grownUps
    }
    const childs = !this.grownUps
    // The touch is over with any of these: the next one is judged where it lands.
    if (gesture.type === 'tap' || gesture.type === 'pressEnd' || gesture.type === 'dragEnd' || gesture.type === 'dragCancel') this.grownUps = false
    return childs
  }
}
