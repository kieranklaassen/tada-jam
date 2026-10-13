import type { Voice } from './audio'
import { Bus } from './bus'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { inCorner } from './overlay'
import { STAGE, toStage, type Fit } from './stage'
import { Toy, type Saved } from './toy'
import { mixOf } from './voices'

// One visit's play: the loop, the fingers on it, the idle ladder and where
// its sounds go. The Mount hands it pointers, frames and put-aways, and it
// holds the rules about them in one place, where a test can reach them:
//
// - A finger in the grown-up's corner (the top right) is the grown-up's. The
//   game answers it with nothing, and it is not a touch to the idle ladder.
// - The first finger works: it takes hold, drags and lets go. Any other
//   finger is a tap on the wall where it lands on wall, and nothing where it
//   lands on something a finger takes hold of.
// - A pointer the browser takes away never acts for the child: a piece goes
//   back where it came from, the dial goes back, the release pulls nothing.
// - Only a finger, or the clear-out a finger pulled, takes the idle ladder
//   back to the bottom. Nothing the cast or the loop does by itself is a
//   touch, and the pigeon's lap, which starts by itself, is not one either.
// - A touch that ends a scene closes the scene's sound in that touch.
// - Put away, the loop is what a load would find, the ladder is at the
//   bottom, and every sound is closed.

export class Play {
  toy: Toy
  /** What the idle ladder shows now. Null until the first frame, and again after a put-away. */
  guidance: Guidance | null = null
  readonly bus = new Bus()
  private readonly touch = new ForgivingTouch()
  private ladder: IdleLadder
  private readonly seed: number
  /** The pointer that landed in the grown-up's corner and has not lifted. */
  private corner: number | null = null
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private width = 0
  private height = 0

  constructor(saved: Saved, seed: number, seconds: number) {
    this.seed = seed
    this.toy = new Toy(saved, seed)
    this.ladder = new IdleLadder(seconds)
  }

  /** The surface's fit and its size in CSS pixels: how a touch is turned into a place on the wall, where the corner is, and where the frame ends below. */
  size(by: Fit, width: number, height: number): void {
    this.by = by
    this.width = width
    this.height = height
    this.frameOf(this.toy)
  }

  /** Tells a loop where the bottom edge of the frame is, so what falls off the wall is kept until it is out of it. */
  private frameOf(toy: Toy): void {
    if (this.by.scale > 0) toy.bottom = Math.max(STAGE.height, (this.height - this.by.y) / this.by.scale)
  }

  /** A finger is on the wall, or a drag is waiting out a lift. */
  get touching(): boolean {
    return this.touch.active
  }

  /**
   * A finger landed, at a point of the surface in CSS pixels. `seconds` is the attended clock.
   * Returns whether it is the grown-up's: the Mount hands those to the overlay and the game does nothing with them.
   */
  down(id: number, where: Point, timeMs: number, seconds: number): boolean {
    if (inCorner(where.x, where.y, this.width)) {
      if (this.corner !== null) return false
      this.corner = id
      return true
    }
    if (this.by.scale <= 0) return false
    this.ladder.touch(seconds)
    const gestures = this.touch.down(id, where, timeMs)
    if (!this.touch.holds(id)) {
      // Every tap on the wall is answered, so a second finger drumming beside the first is a tap too. It takes
      // hold of nothing: on a control, the rack or a piece it does nothing at all.
      const at = toStage(where, this.by)
      if (this.toy.under(at) === 'wall') this.toy.wallTap(at)
    }
    this.act(gestures)
    return false
  }

  /** Returns whether the pointer is the grown-up's. */
  move(id: number, where: Point): boolean {
    if (id === this.corner) return true
    this.act(this.touch.move(id, where))
    return false
  }

  /** The finger lifted. Letting go is the act, so a lifted drag ends here and does not wait. */
  up(id: number, where: Point, timeMs: number): boolean {
    if (id === this.corner) {
      this.corner = null
      return true
    }
    this.act(this.touch.up(id, where, timeMs))
    this.act(this.touch.letGo())
    return false
  }

  /** The browser took the pointer away, which is not the child letting go. */
  cancel(id: number): boolean {
    if (id === this.corner) {
      this.corner = null
      return true
    }
    this.act(this.touch.cancel(id))
    return false
  }

  /** One frame: `step` seconds of play at `seconds` of the attended clock. */
  frame(nowMs: number, step: number, seconds: number): void {
    this.act(this.touch.advance(nowMs))
    // A finger that is working is not idle, and neither is a child watching the springs they pulled come down. The
    // loop running, a spring firing by itself, the cast keeping time and the pigeon flying its lap are not touches:
    // the ladder climbs over them. On a ring with a spring on every beat the pigeon flies every lap.
    if (this.touch.active || this.toy.clearing) this.ladder.touch(seconds)
    this.guidance = this.ladder.update(seconds)
    this.toy.step(step)
  }

  /**
   * Put away, or hidden. The touch ends as a finger taken away ends it, the loop becomes what a load would find
   * (so parked and loaded are one state), the ladder goes back to the bottom, and every sound is closed. What
   * the last touch changed is still to be saved: `toy.changed` says so.
   */
  rest(seconds: number): void {
    this.act(this.touch.clear())
    this.corner = null
    const changed = this.toy.changed
    this.toy = this.toy.settled(this.seed)
    this.toy.changed = changed
    this.frameOf(this.toy)
    this.ladder = new IdleLadder(seconds)
    this.guidance = null
    this.bus.cutAll()
  }

  /**
   * Everything set off since the last call, as one voice, or null for silence. Called in the touch or the frame
   * that set it off, so sight and sound are on one clock. A scene a touch has just ended is closed first.
   */
  voice(): Voice | null {
    const events = this.toy.take()
    if (this.toy.sceneEnded) {
      this.bus.cutScene()
      this.toy.sceneEnded = false
    }
    if (events.length === 0) return null
    const mix = mixOf(events, this.toy.tempo)
    return mix.main.length + mix.scene.length > 0 ? this.bus.voice(mix.main, mix.scene) : null
  }

  private act(gestures: Gesture[]): void {
    const toy = this.toy, stage = (point: Point) => toStage(point, this.by)
    for (const gesture of gestures) {
      switch (gesture.type) {
        // The answer starts here, when the finger lands: a tap on the wall is a jump, and a finger on the
        // release, the dial, the rack or a piece takes hold of it.
        case 'press':
          toy.press(stage(gesture.at))
          break
        // A tap on the wall was answered when it landed. A tap on a control is answered here.
        case 'tap':
          toy.tap()
          break
        // Taken away before it was a tap or a drag: whatever it held is let go and nothing is done.
        case 'pressEnd':
          toy.letGo()
          break
        case 'dragStart':
          break
        case 'dragMove':
          toy.drag(stage(gesture.from), stage(gesture.at))
          break
        // The lift is the act: `up` ends a lifted drag in the same call.
        case 'dragLift':
          break
        case 'dragEnd':
          toy.endDrag(true)
          break
        // The drag was taken away and the child made no drop: the piece is back where it came from, the release
        // pulls nothing and the dial goes back.
        case 'dragCancel':
          toy.endDrag(false)
          break
        default:
          // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
          gesture satisfies never
      }
    }
  }
}
