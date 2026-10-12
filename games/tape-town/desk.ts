import { fitFloor } from './floor'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { inCorner } from './overlay'
import { toStage } from './stage'
import type { Town } from './town'
import type { Sound } from './voices'

// What the Mount does with a finger and a frame, with no canvas, clock or
// audio of its own, so that it can be tested: gestures in, the town stepped,
// and what the town queued handed back to be played and saved.
//
// - The top right corner belongs to the grown-ups: a finger that lands there
//   answers nothing, for as long as it stays down, and is not a touch for
//   the idle ladder.
// - A touch that is taken away (a cancel) is not the child letting go.
// - Only a finger, or a scene the finger started, keeps the idle ladder at
//   the bottom. What a toy does by itself never does.
// - Put away, the town is as a load would find it and the ladder starts over.

export type Out = { sounds: Sound[]; cut: boolean; changed: 'no' | 'soon' | 'now' }

export class Desk {
  town: Town | null = null
  readonly touch = new ForgivingTouch()
  readonly ladder = new IdleLadder(0)
  width = 0
  height = 0
  /** The working finger went down in the grown-up's corner: nothing it does reaches the town. */
  private cornered = false
  private sounds: Sound[] = []
  private cut = false
  private changed: Out['changed'] = 'no'

  /** The surface has a size: the town learns where the home control lies on its stage. */
  size(width: number, height: number): void {
    this.width = width
    this.height = height
    if (width > 0 && height > 0) this.town?.setSurface(width, fitFloor(width, height))
  }

  /** The slot has been read. */
  open(town: Town): void {
    this.town = town
    this.size(this.width, this.height)
  }

  private stage(at: Point): Point {
    return toStage(at, fitFloor(this.width, this.height))
  }

  private gather(): void {
    const town = this.town
    if (!town) return
    this.sounds.push(...town.takeSounds())
    if (town.takeCut()) {
      // What was queued before the cut belongs to what was cut.
      this.cut = true
    }
    const changed = town.takeChanged()
    if (changed === 'now' || (changed === 'soon' && this.changed === 'no')) this.changed = changed
  }

  /** What the town queued since the last call: sounds to play, whether to cut what still sounds, and what to save. */
  take(): Out {
    const out = { sounds: this.sounds, cut: this.cut, changed: this.changed }
    this.sounds = []
    this.cut = false
    this.changed = 'no'
    return out
  }

  private act(gestures: Gesture[]): void {
    const town = this.town
    if (!town || this.width <= 0 || this.cornered) return
    for (const gesture of gestures) {
      switch (gesture.type) {
        case 'press':
          town.press(this.stage(gesture.at))
          break
        case 'dragMove':
          town.move(this.stage(gesture.at))
          break
        // A tap and the end of a drag are both the finger letting go, however long it was down.
        case 'tap':
        case 'dragEnd':
          town.lift()
          break
        // Taken away, not let go: nothing is done for the child.
        case 'pressEnd':
        case 'dragCancel':
          town.cancel()
          break
        case 'dragStart':
        case 'dragLift':
          break
        default:
          gesture satisfies never
      }
    }
    this.gather()
  }

  /** Whether a finger that lands here is the grown-up's: in their corner, or on or round the home control. Such a touch is not the game's. */
  private isCorner(at: Point): boolean {
    return inCorner(at.x, at.y, this.width) || (this.town?.onHome(this.stage(at)) ?? false)
  }

  down(id: number, at: Point, t: number, seconds: number): void {
    const was = this.touch.active
    const gestures = this.touch.down(id, at, t)
    if (!gestures.length) return
    // A new working finger: is it the grown-up's?
    if (!was || gestures.some((gesture) => gesture.type === 'press')) this.cornered = gestures.some((gesture) => gesture.type === 'press') && this.isCorner(at)
    if (!this.cornered) this.ladder.touch(seconds)
    this.act(gestures)
  }

  move(id: number, at: Point): void {
    this.act(this.touch.move(id, at))
  }

  up(id: number, at: Point, t: number): void {
    this.act([...this.touch.up(id, at, t), ...this.touch.letGo()])
    if (!this.touch.active) this.cornered = false
  }

  cancel(id: number): void {
    this.act(this.touch.cancel(id))
    if (!this.touch.active) this.cornered = false
  }

  /** One frame: the town steps by `step` seconds of attended time, and the ladder says what to show an idle child. */
  frame(now: number, seconds: number, step: number): Guidance {
    this.act(this.touch.advance(now))
    if (!this.touch.active) this.cornered = false
    const town = this.town
    // A finger that is working is not idle, and neither is a scene the finger started. A toy going about its
    // habit is not a touch: the ladder climbs while the town runs by itself.
    if ((this.touch.active && !this.cornered) || town?.playing) this.ladder.touch(seconds)
    const guidance = this.ladder.update(seconds)
    if (town && step > 0) {
      town.step(step)
      this.gather()
    }
    return guidance
  }

  /** Parked, hidden or closed: the touch ends without acting, the town settles as a load would, and the ladder starts over. */
  putAway(seconds: number): void {
    this.act(this.touch.clear())
    this.cornered = false
    this.ladder.touch(seconds)
    const town = this.town
    if (!town) return
    town.rest()
    town.takeSounds()
    town.takeCut()
    town.takeChanged()
    this.sounds = []
    this.cut = true
    this.changed = 'now'
  }
}
