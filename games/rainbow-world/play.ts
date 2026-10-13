import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { inCorner } from './overlay'
import type { World } from './world'

// What the Mount does with fingers and frames, kept apart from the browser so that it can be held by tests:
// which touches are the game's, what each gesture asks of the world, when the idle ladder goes back to the
// bottom, and what a put-away leaves behind.
//
// - A touch that lands in the grown-up's corner at the top right is not the game's: it and whatever follows it
//   are passed over, and it does not count as the child being busy.
// - A hand at rest on the surface never silences the next finger: after a quarter of a second the next contact is
//   the one that is answered.
// - A finger takes the idle ladder back, and a scene holds it at the bottom while it plays. What a character
//   does by itself never does.
// - The browser taking a finger away is not the child letting go: it sets off nothing new.
// - Seconds here are the attended clock's steps added up, the same steps the world is given.

/** Seconds a contact has been down, without carrying anything, before it counts as a hand at rest: longer than the contacts of one palm take to land, and shorter than a child waits. */
export const RESTING = 0.25

/** How far a finger may slide on the surface, in CSS pixels, and still be tapping: wide, for a band that starts at 2. The tracker's own slop is narrower and is kept for what happens after. */
export const TAP_SMEAR = 30

export class Play {
  readonly touch = new ForgivingTouch()
  readonly ladder = new IdleLadder(0)
  /** Seconds of play: the sum of the steps handed to `frame`. */
  seconds = 0
  private passedOver = false
  /** The pointer that is working, as far as the tracker has one. */
  private finger: number | null = null
  /** When that pointer landed, in seconds of play. */
  private fingerSince = 0
  /** Whether that pointer landed on a thing: a finger at work, and never a hand at rest. */
  private working = false
  /** Where that pointer landed on the surface, and whether it has since gone further than a smear from there. */
  private landed: Point = { x: 0, y: 0 }
  private smeared = false

  constructor(readonly world: World, private readonly toStage: (at: Point) => Point) {}

  /** A finger lands at a point of the surface, in CSS pixels; `width` is the surface's. */
  down(id: number, at: Point, timeMs: number, width: number): void {
    const corner = inCorner(at.x, at.y, width)
    if (!corner) this.ladder.touch(this.seconds)
    const on = this.toStage(at), target = corner ? null : this.world.hit(on.x, on.y).kind
    // A wrist or a palm that landed first on no thing does not silence a finger. The newest touch takes over, and the older one ends with nothing more to follow:
    // when the newest lands on a thing; when a thing is in hand and the newest lands on the mat, where it is set down; or when the older one is a hand at rest,
    // down and still for longer than a palm takes to land. A finger that landed on a thing is working and is never taken for a hand at rest, and a carry is never taken away.
    if (target && this.finger !== null && this.finger !== id && this.touch.holds(this.finger) && !this.working && this.world.hand?.mode !== 'drag') {
      const resting = this.seconds - this.fingerSince >= RESTING
      if (resting || target === 'piece' || (target === 'mat' && this.world.hand)) this.act(this.touch.cancel(this.finger), width)
    }
    if (!this.touch.active || !this.touch.holds(this.finger ?? -1)) { this.finger = id; this.fingerSince = this.seconds; this.working = target === 'piece'; this.landed = at; this.smeared = false }
    this.act(this.touch.down(id, at, timeMs), width)
  }

  move(id: number, at: Point, width: number): void {
    // A small finger smears as it taps, and a smeared tap is a tap: until the finger has gone further than the smear from where it landed, its moves are not passed on.
    if (id === this.finger && !this.smeared) {
      if (Math.hypot(at.x - this.landed.x, at.y - this.landed.y) <= TAP_SMEAR) return
      this.smeared = true
    }
    this.act(this.touch.move(id, at), width)
  }

  /** A finger lifts. The lift ends a drag at once: the world itself holds the thing in the air a moment, on its own clock, for the finger to come back. */
  up(id: number, at: Point, timeMs: number, width: number): void {
    this.act(this.touch.up(id, at, timeMs), width)
    this.act(this.touch.letGo(), width)
  }

  /** The browser took the finger away. */
  cancel(id: number, width: number): void {
    this.act(this.touch.cancel(id), width)
  }

  /** One frame: `step` seconds of the attended clock. Returns what the idle ladder shows now. */
  frame(step: number): Guidance {
    this.seconds += step
    // A finger that is working is not idle, and neither is a scene that is playing: the idle stretch begins when the scene has ended.
    if ((this.touch.active && !this.passedOver) || this.world.scene) this.ladder.touch(this.seconds)
    const guidance = this.ladder.update(this.seconds)
    this.world.step(step)
    return guidance
  }

  /**
   * The game goes to rest. A touch in progress is ended, since its lift will never arrive; the world settles as
   * a load of its save would leave it; and the idle ladder goes back to the bottom, so coming back shows no
   * prompt that was half way through.
   */
  rest(width: number): void {
    // The world settles first: a thing still carried over the mat stays where the child brought it. The touch is then ended, and has nothing left to act on.
    this.world.settle()
    this.act(this.touch.clear(), width)
    this.passedOver = false
    this.finger = null
    this.ladder.touch(this.seconds)
  }

  private act(gestures: Gesture[], width: number): void {
    const world = this.world
    for (const gesture of gestures) {
      if (gesture.type === 'press') this.passedOver = inCorner(gesture.at.x, gesture.at.y, width)
      if (this.passedOver) continue
      switch (gesture.type) {
        case 'press': {
          const at = this.toStage(gesture.at)
          world.press(at.x, at.y)
          break
        }
        case 'tap':
          world.tap()
          break
        // The press was taken away and was not a tap. What it set off was answered on the press; nothing follows.
        case 'pressEnd':
          world.pressEnd()
          break
        case 'dragStart':
          world.dragStart()
          break
        case 'dragMove': {
          const at = this.toStage(gesture.at)
          world.dragMove(at.x, at.y)
          break
        }
        // The lift is ended at once in `up` (`letGo`), so the drop follows in the same handler.
        case 'dragLift':
          break
        // The finger let go. The world waits a moment, on its own clock, for the finger to come back.
        case 'dragEnd':
          world.dragEnd()
          break
        // The drag was taken away and the child made no drop: the thing goes back where it came from.
        case 'dragCancel':
          world.dragCancel()
          break
        default:
          gesture satisfies never
      }
    }
  }
}
