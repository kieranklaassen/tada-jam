import { IdleLadder, type Guidance } from './guidance'
import { hintFor, type Hint } from './hint'
import type { Point } from './input'
import { COMB_HAND } from './layout'
import type { Rng } from './rng'
import { open, record, type Saved } from './save'
import type { GameState } from './state'
import { Toy, type End } from './toy'

// The game as the Mount holds it, with no drawing and no browser in it: the
// saved state, the toy, and the idle ladder, all on the toy's one clock. The
// Mount hands it touches in stage units and the seconds to play.

export class Game {
  state: GameState
  toy: Toy
  /** What the idle ladder shows now: the glow, and the ghost hand's one move. */
  guidance: Guidance
  /** The one move the ladder shows now. It is chosen as a showing begins and kept until that showing is over. */
  hint: Hint
  private ladder = new IdleLadder(0)
  /** What this visit has had: the hand at the loop, the hand at the comb, the comb in use, and the hand at a bowl. A visit ends when the game is put away. */
  private visit = { loopShown: false, combPointed: false, combUsed: false, bowlShown: false }
  private showing = -1

  /** `raw` is what the slot held, `childAge` the shell's hint (only a first visit reads it), and `rng` the visit's one stream of chance. */
  constructor(raw: unknown, private childAge: number | null, private rng: Rng) {
    const opened = open(raw, childAge)
    this.state = opened.state
    this.toy = new Toy(opened.sheet, opened.hand, opened.size, rng, { folk: opened.folk, wall: opened.wall, finished: opened.state.finished })
    this.guidance = this.ladder.update(0)
    this.hint = hintFor(this.toy)
  }

  /**
   * A finger lands at this point of the stage. In the grown-up's corner it answers nothing and the idle ladder
   * stays where it is: that corner is not the child's. Returns whether the game took the touch.
   */
  press(at: Point, inCorner: boolean): boolean {
    if (inCorner) return false
    this.ladder.touch(this.toy.t)
    this.toy.press(at)
    return true
  }

  move(at: Point): void {
    this.toy.move(at)
  }

  end(kind: End): void {
    this.toy.end(kind)
  }

  /** Plays `seconds`. Only a finger at work or a scene keeps the ladder at the bottom: what a figure or the weather does by itself never does. */
  advance(seconds: number): void {
    this.toy.advance(seconds)
    if (this.toy.finger.down || this.toy.hanging || this.toy.scene) this.ladder.touch(this.toy.t)
    this.guidance = this.ladder.update(this.toy.t)
    this.choose()
  }

  /**
   * The move the ladder shows. The hand at the loop and the hand at the comb are each shown once in a visit: one
   * that has begun counts as shown, whether it ran to its end or a touch cut it short, and it never comes back.
   * The glow alone, before any hand, is not a showing.
   */
  private choose(): void {
    const visit = this.visit, demo = this.guidance.demoIndex
    if (this.toy.hand === COMB_HAND) visit.combUsed = true
    if (demo === this.showing && demo >= 0) return
    if (this.showing >= 0 && this.hint.kind === 'loop') visit.loopShown = true
    if (this.showing >= 0 && this.hint.kind === 'comb') visit.combPointed = true
    // A hand that laid wool from a bowl, or tapped one, has shown a bowl: only after that does it ever carry a figure.
    if (this.showing >= 0 && (this.hint.kind === 'wool' || this.hint.kind === 'bowl')) visit.bowlShown = true
    this.showing = demo
    // With nothing of the ladder on the screen there is nothing to choose.
    if (demo < 0 && this.guidance.glow <= 0.01) return
    this.hint = hintFor(this.toy, { demo, ...visit })
  }

  /** The record to save, as the game stands. */
  record(): Saved {
    return record(this.state, this.toy)
  }

  /**
   * Put away. The game settles as a load would: the toy is made again from the record it has just saved, so
   * what is found on coming back is what a fresh load of that record gives, and the idle ladder is taken back
   * to the bottom. Whatever the finger held has been let go by the Mount before this is called.
   */
  park(): void {
    const opened = open(JSON.parse(JSON.stringify(this.record())) as unknown, this.childAge)
    this.state = opened.state
    this.toy = new Toy(opened.sheet, opened.hand, opened.size, this.rng, { folk: opened.folk, wall: opened.wall, finished: opened.state.finished })
    this.ladder = new IdleLadder(0)
    this.guidance = this.ladder.update(0)
    this.visit = { loopShown: false, combPointed: false, combUsed: false, bowlShown: false }
    this.showing = -1
    this.hint = hintFor(this.toy)
  }
}
