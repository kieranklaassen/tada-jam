import type { Guidance, IdleLadder } from './guidance'
import type { Hall } from './hall'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { inCorner } from './overlay'
import { toStage, type Fit } from './stage'

// The finger, between the surface and the hall. The Mount hands it every
// pointer event as a point in the surface's CSS pixels; it turns them into
// gestures (input.ts), puts each on the stage through the one fit, and tells
// the hall. It also keeps three rules that belong to no single gesture, so
// that a test can hold them without a browser:
//
// - A touch that begins in the grown-up's corner is not the hall's, from its
//   press to its lift, and does not send the idle ladder back to the bottom.
// - A drag survives a lifted finger: a garment let go over nothing waits in
//   the air where it is for the grace input.ts gives. A finger that comes
//   back near it has it again; otherwise it sails home, seen and heard. A
//   garment let go over a spot goes on at once, inside the touch.
// - Going to rest takes the idle ladder back to the bottom, so the hall that
//   is parked and the hall that is loaded both wait the same time before the
//   ghost hand shows.

/** What the surface is now: its width in CSS pixels and the fit of the stage in it. */
export type Surface = { width: number; by: Fit }

export class Touching {
  private readonly touch = new ForgivingTouch()
  /** The touch that is on began in the grown-up's corner. */
  private inTheCorner = false

  constructor(
    private readonly ladder: IdleLadder,
    private readonly hall: () => Hall | null,
    private readonly surface: () => Surface,
  ) {}

  /** A finger is working, or a drag is waiting out a lift. */
  get active(): boolean {
    return this.touch.active
  }

  /** Whether that pointer is the finger that is working. */
  holds(id: number): boolean {
    return this.touch.holds(id)
  }

  /** A pointer came down at `where`, at `timeMs` of the event clock and `seconds` of the attended clock. */
  down(id: number, where: Point, timeMs: number, seconds: number): void {
    if (!inCorner(where.x, where.y, this.surface().width)) this.ladder.touch(seconds)
    this.act(this.touch.down(id, where, timeMs))
  }

  move(id: number, where: Point): void {
    this.act(this.touch.move(id, where))
  }

  up(id: number, where: Point, timeMs: number): void {
    this.act(this.touch.up(id, where, timeMs))
  }

  /** The browser took the pointer away, which is not the child letting go. */
  cancel(id: number): void {
    this.act(this.touch.cancel(id))
  }

  /** Every frame: a lift that has outlasted its grace ends its drag, and a finger that is working is not idle. */
  advance(timeMs: number, seconds: number): void {
    this.act(this.touch.advance(timeMs))
    if (this.touch.active && !this.inTheCorner) this.ladder.touch(seconds)
  }

  /** The surface is going away with the touch still on it: the touch ends as input.ts says, and the hall is told. */
  end(): void {
    this.act(this.touch.clear())
  }

  /**
   * The game goes to rest at `seconds` of the attended clock: the touch ends, the hall is put away, and the
   * ladder is taken back to the bottom. Returns what the ladder shows now, which is nothing: the parked hall
   * is the loaded hall, with the hand still to come.
   */
  rest(seconds: number): Guidance {
    this.end()
    this.hall()?.putAway()
    this.ladder.touch(seconds)
    return this.ladder.update(seconds)
  }

  private act(gestures: Gesture[]): void {
    const hall = this.hall(), { width, by } = this.surface()
    if (!hall || !(by.scale > 0)) return
    for (const gesture of gestures) {
      if (gesture.type === 'press') this.inTheCorner = inCorner(gesture.at.x, gesture.at.y, width)
      if (this.inTheCorner) continue
      switch (gesture.type) {
        case 'press': {
          const on = toStage(gesture.at, by)
          hall.press(on.x, on.y)
          break
        }
        case 'tap':
          hall.tap()
          break
        case 'pressEnd':
          hall.pressEnd()
          break
        case 'dragStart':
          hall.dragStart()
          break
        case 'dragMove': {
          const on = toStage(gesture.at, by)
          hall.dragMove(on.x, on.y)
          break
        }
        // The finger lifted in a drag. A garment over nothing waits for it; anything else is let go now, inside the touch.
        case 'dragLift':
          hall.dragLift()
          if (!hall.waitsWhenLifted) this.act(this.touch.letGo())
          break
        case 'dragEnd': {
          const on = toStage(gesture.at, by)
          hall.drop(on.x, on.y)
          break
        }
        // The drag was taken away and the child made no drop: the garment goes back where it came from, unheard.
        case 'dragCancel':
          hall.cancel()
          break
        default:
          // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
          gesture satisfies never
      }
    }
  }
}
