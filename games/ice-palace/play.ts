import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { inCorner } from './overlay'
import { fit, toStage } from './stage'
import type { Toy } from './toy'
import type { Sound } from './voices'

// What the Mount does with fingers, frames and a put-away, kept free of the
// browser so that the tests can hold it: which gesture reaches the toy, what
// counts as idleness, where a sound goes, and how the game comes to rest.

/** How near the end of the line it left a finger must land, in stage units, to carry that line on. */
export const CARRY_ON = 44

/** Where the play hands what it produces. The Mount gives it the sound, the storage and the view. */
export type Outlets = {
  /** Everything one touch or one step set off, as one voice. `scene` sounds go where a touch can cut them. */
  speak(sounds: Sound[], scene: boolean): void
  /** A touch ended a scene, or the game was put away: what a scene was sounding stops now. */
  hush(): void
  /** Something a save holds has changed: `now` for an outcome a put-away must find saved. */
  save(now: boolean): void
  /** The game is at rest: what was flying is gone and every sound is closed. */
  settle(): void
}

export class Play {
  toy: Toy | null = null
  readonly touch = new ForgivingTouch()
  readonly ladder = new IdleLadder(0)
  /** The surface in CSS pixels, which every touch is fitted by. */
  width = 0
  height = 0
  /** The finger that is down landed in the grown-up's corner: its whole touch reaches nothing. Set anew by every press. */
  private quiet = false

  constructor(private readonly out: Outlets) {}

  /** What the toy asked for while it answered is heard and saved. */
  flush(): void {
    const toy = this.toy
    if (!toy) return
    if (toy.takeHush()) this.out.hush()
    const sounds = toy.takeSounds()
    const scene = sounds.filter((sound) => sound.scene), own = sounds.filter((sound) => !sound.scene)
    if (scene.length > 0) this.out.speak(scene, true)
    if (own.length > 0) this.out.speak(own, false)
    const changed = toy.takeChanged()
    if (changed !== 'no') this.out.save(changed === 'now')
  }

  /**
   * What the game does with a gesture. Two endings are not the child's doing and make no move: a drag that is
   * cancelled puts the thing in hand back, and a press that is taken away is no tap. Every gesture has a case
   * of its own, so leaving one out does not compile.
   */
  apply(gestures: Gesture[]): void {
    const toy = this.toy
    if (!toy) return
    const by = fit(this.width, this.height)
    if (by.scale <= 0) return
    for (const gesture of gestures) {
      // A press says whether this touch is the grown-up's: the corner answers nothing, whatever the stage has under it.
      if (gesture.type === 'press') this.quiet = inCorner(gesture.at.x, gesture.at.y, this.width)
      if (this.quiet) continue
      switch (gesture.type) {
        case 'press': toy.press(toStage(gesture.at, by)); break
        // A tap is the child's: what it landed on may keep a mark of it. A press that was taken away is not.
        case 'tap': toy.tap(); break
        case 'pressEnd': toy.release(); break
        case 'dragStart': break
        case 'dragMove': toy.drag(toStage(gesture.at, by)); break
        // The line gives its block in the frame of the lift; the tracker says later whether the drag is over.
        case 'dragLift': toy.lift(); break
        case 'dragEnd': toy.drop(); break
        case 'dragCancel': toy.cancel(); break
        default: gesture satisfies never
      }
    }
    this.flush()
  }

  /** A finger lands. `seconds` is the attended clock. A touch in the grown-up's corner is no touch of the child's: the idle ladder goes on. */
  down(id: number, at: Point, timeMs: number, seconds: number): void {
    // A new stroke is a new line, unless the finger comes straight back onto the end of the line it has just left.
    if (!this.carriesOn(at)) this.apply(this.touch.letGo())
    const gestures = this.touch.down(id, at, timeMs)
    this.apply(gestures)
    if (!this.touch.holds(id) || !this.quiet) this.ladder.touch(seconds)
  }
  move(id: number, at: Point): void {
    this.apply(this.touch.move(id, at))
  }
  /** A finger lifts. Setting a thing down, packing a scoop and letting the sun go are the lift itself, so they happen here, inside the touch. A line that has just been cut waits out a skip of the finger. */
  up(id: number, at: Point, timeMs: number): void {
    this.apply(this.touch.up(id, at, timeMs))
    // Only a line that may still be carried on keeps its drag open; every other lift is the end, so the next touch is a touch of its own.
    if (!this.toy?.lastCut) this.apply(this.touch.letGo())
    this.forget()
  }
  /** The browser took the finger away, which is not the child letting go: nothing is set down, cut or packed. */
  cancel(id: number): void {
    this.apply(this.touch.cancel(id))
    this.forget()
  }

  /** One frame: a lift that has outlasted its grace ends its drag, the idle ladder is read, and the toy plays `step` seconds. */
  frame(nowMs: number, step: number, seconds: number): Guidance {
    this.apply(this.touch.advance(nowMs))
    this.forget()
    // A working finger is not idle, and neither is a scene that is playing. Nothing a character does by itself counts.
    if ((this.touch.active && !this.quiet) || this.toy?.sceneRunning) this.ladder.touch(seconds)
    const guidance = this.ladder.update(seconds)
    this.toy?.advance(step)
    this.flush()
    return guidance
  }

  /**
   * The game is put away, or hidden. The touch ends first, since its lift will never arrive; then everything
   * comes to rest exactly as a load would find it, without a sound, the idle ladder goes back to the bottom,
   * and the newest state is saved.
   */
  rest(seconds: number): void {
    this.apply(this.touch.clear())
    this.forget()
    const toy = this.toy
    if (toy) {
      toy.putAway()
      toy.takeSounds()
      toy.takeHush()
      toy.takeMotions()
      toy.takeChanged()
    }
    this.ladder.touch(seconds)
    this.out.hush()
    this.out.settle()
    if (toy) this.out.save(true)
  }

  /** Whether a finger landing here is the one that skipped, back on the end of its line. */
  private carriesOn(at: Point): boolean {
    const last = this.toy?.lastCut
    const by = fit(this.width, this.height)
    if (!last || by.scale <= 0) return false
    const on = toStage(at, by), cut = last.cut
    return Math.hypot(on.x - (cut.from.x + Math.cos(cut.angle) * cut.len), on.y - (cut.from.y + Math.sin(cut.angle) * cut.len)) <= CARRY_ON
  }

  /** No touch is under way: nothing of the last one is kept. */
  private forget(): void {
    if (!this.touch.active) this.quiet = false
  }
}
