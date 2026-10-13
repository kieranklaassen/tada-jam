import { dragCancel, dragEnd, dragMove, dragStart, press, pressEnd, tap } from './finger'
import { IdleLadder, type Guidance } from './guidance'
import { MARGIN, frameLeft } from './layout'
import { moving, openWorld, parked } from './open'
import { finishScene } from './scenes'
import { deserialize, serialize, type Save } from './save'
import { STAGE } from './stage'
import type { GameState } from './state'
import { step } from './tick'
import type { Sound } from './voices'
import { toSave, type World } from './world'

// One visit to the game, with no surface and no browser in it: the world,
// the idle ladder and what is kept of the saved state, behind the handful of
// calls the Mount makes. The Mount adds the canvas, the pointer, the clock
// and the speaker. Everything a reader's lesson asks of the wiring is here,
// where a test can drive it.

export type Heard = { plain: Sound[]; scene: Sound[]; cut: boolean }

export class Session {
  w: World
  /** What the idle ladder shows now. */
  guidance: Guidance
  private readonly ladder: IdleLadder
  private readonly kept: GameState
  private readonly seed: number
  /** The attended clock's seconds, as the Mount last gave them. */
  private seconds = 0
  /** The press that is down landed in the grown-up's corner: it is not the child's, and does not count as a touch. */
  private cornered = false

  /** `raw` is whatever storage handed back; `childAge` only chooses what a first visit finds on the stone. */
  constructor(raw: unknown, childAge: number | null, seed: number) {
    const save = deserialize(raw, childAge)
    this.kept = { v: save.v, position: save.position, finished: save.finished }
    this.seed = seed
    this.w = openWorld(save, seed)
    this.ladder = new IdleLadder(0)
    this.guidance = this.ladder.update(0)
  }

  /** Where on the stage the finger last was, while it is down. */
  private at: { x: number; y: number } | null = null

  /** A point of the stage, as the view draws it, in the units of the frame the boat is in. */
  private inFrame(x: number): number {
    return x + this.w.cam - frameLeft(this.w.frame)
  }

  /** The finger, and the thing it holds, moved to where the finger is on the stage now that the view has moved. */
  private follow(): void {
    const w = this.w
    if (!w.hand || !this.at || this.cornered) return
    const moved = this.inFrame(this.at.x) - w.finger.x
    if (moved === 0) return
    w.finger.x += moved
    for (const piece of w.pieces) if (piece.mode === 'held') piece.x += moved
  }

  /** The finger lands at a point of the stage. In the grown-up's corner it answers nothing and leaves the ladder where it is. */
  press(x: number, y: number, corner: boolean): void {
    // Outside the print (the paper margin, and the bare surface beside the stage where it is letterboxed) nothing
    // is drawn, so nothing answers: a knock there would be heard with nothing to see.
    const off = x < MARGIN || x > STAGE.width - MARGIN || y < MARGIN || y > STAGE.height - MARGIN
    this.cornered = corner || off
    // The world never hears of a press in the corner or off the print: nothing is in the hand, so its lift and its drag do nothing either.
    if (this.cornered) return
    this.ladder.touch(this.seconds)
    // A touch ends a scene in its end state first, so that it is read in the frame that is then on show:
    // a touch during the morning lands on the bank the view has cut to, and is answered there, in sight.
    finishScene(this.w)
    this.at = { x, y }
    press(this.w, this.inFrame(x), y)
  }

  tap(): void { tap(this.w); this.cornered = false }
  pressEnd(): void { pressEnd(this.w); this.cornered = false }
  dragStart(): void { dragStart(this.w) }
  dragMove(x: number, y: number): void {
    if (this.cornered) return
    this.at = { x, y }
    dragMove(this.w, this.inFrame(x), y)
  }
  dragEnd(): void { dragEnd(this.w); this.cornered = false }
  /** The drag was taken away: nothing is dropped for the child. */
  dragCancel(): void { dragCancel(this.w); this.cornered = false }

  /**
   * One frame: `dt` seconds of play, at `seconds` of the attended clock. A finger at work, a thing on its way
   * and a scene keep the ladder at the bottom; a character's own doing (a croak, a blink, an opinion) does not.
   */
  frame(dt: number, seconds: number, fingerDown: boolean): Guidance {
    this.seconds = seconds
    // What is in the hand stays under the finger, in the frame the child sees, whatever the view does: a finger
    // that rests sends no events, so its place in the frame the boat is in is worked out again each frame.
    this.follow()
    step(this.w, dt)
    this.follow()
    if ((fingerDown && !this.cornered) || moving(this.w)) this.ladder.touch(seconds)
    this.guidance = this.ladder.update(seconds)
    return this.guidance
  }

  /**
   * Put away. The world becomes what a load of its own save would find: nothing in the hand, in the air or on
   * its way, no scene, no sound owed. The ladder is taken back to the bottom, so the child who comes back is
   * not met by a hand that was already showing.
   */
  park(): void {
    this.w = parked(this.w, this.seed)
    this.cornered = false
    this.ladder.touch(this.seconds)
    this.guidance = this.ladder.update(this.seconds)
  }

  /** What goes to storage. */
  save(): Save {
    const world = toSave(this.w)
    return serialize({ ...this.kept, ...world })
  }

  /** Whether the world changed since the last look, and whether that must be saved at once. Clears the mark. */
  changed(): 'no' | 'soon' | 'now' {
    const dirty = this.w.dirty
    this.w.dirty = 'no'
    return dirty
  }

  /** The sounds of this handler or this frame, the scene's apart from the rest, and whether a touch has just ended a scene. Empties the list. */
  heard(): Heard {
    const w = this.w
    const out: Heard = { plain: [], scene: [], cut: w.cut }
    for (const sound of w.sounds) (sound.scene ? out.scene : out.plain).push({ name: sound.name, rate: sound.rate })
    w.sounds.length = 0
    w.cut = false
    return out
  }
}
