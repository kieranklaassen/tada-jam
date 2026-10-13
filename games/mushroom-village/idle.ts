import { IdleLadder, type Guidance } from './guidance'
import type { Point } from './input'
import { inCorner } from './overlay'

// What counts as the child's touch for the idle ladder, in one place the
// Mount calls and a test can call. The ladder goes back to the bottom on a
// finger that lands in the glade, while that finger works, and while what it
// set off is still going. It does not go back for a finger in the grown-up's
// corner, which the glade never hears of, nor for what a villager does by
// himself. Going to rest takes it down, so a game that was parked and one
// that was loaded start it alike.

export class Idleness {
  private readonly ladder: IdleLadder

  constructor(now: number) {
    this.ladder = new IdleLadder(now)
  }

  /**
   * A finger lands at a point of the surface, `width` wide. In the grown-up's corner it is the overlay's alone:
   * `toCorner` is called, the glade is not, and the ladder stays where it is. Anywhere else it is the child's:
   * the ladder goes to the bottom and `toGlade` is called.
   */
  press(at: Point, width: number, now: number, toGlade: () => void, toCorner: () => void): void {
    if (inCorner(at.x, at.y, width)) { toCorner(); return }
    this.ladder.touch(now)
    toGlade()
  }

  /** One frame. `working` says that a finger is on the glass or that what the child's touch set off is still going. */
  frame(now: number, working: boolean): Guidance {
    if (working) this.ladder.touch(now)
    return this.ladder.update(now)
  }

  /** The game goes to rest: the ladder is taken down, as a load would start it. */
  rest(now: number): void {
    this.ladder.touch(now)
  }
}

/**
 * Put-away, as far as the glade goes, in the one call the Mount makes: whatever was playing ends where its outcome
 * was kept, and the ladder is taken down. So what is found on return, the hand included, is what a load would give.
 */
export function toRest(now: number, idle: Idleness, glade: { rest(): void } | null): void {
  glade?.rest()
  idle.rest(now)
}
