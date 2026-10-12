import type { Game } from './game'
import { ForgivingTouch, type Gesture, type Point } from './input'

// The fingers on the glass, between the Mount and the game, with no browser
// in it. One finger works at a time (input.ts), with two things this game
// needs on top of that, both timed on the toy's own clock:
// - A resting contact never deadens the game. A palm or a finger that landed
//   where nothing is, or that has lain a second on a bowl, on the comb or
//   still on the felt, hands the work on: to the next contact that lands,
//   or to one that is down already. A finger that lands while another works
//   is not dropped: it waits where it is, and takes over the work there when
//   the working contact rests or lifts. A finger that is laying wool or
//   combing by moving, or carrying, is never interrupted.
// - A carry survives a lifted finger. A figure or the comb in the hand hangs
//   where it was let go for 0.3 s, and a finger landing on it again in that
//   time carries on. Wool is different: its lift is the act (the wool clings
//   and wakes when the finger goes), so a stroke of wool ends at the lift.
// Put away while something hangs, it is set down where it hangs: the child
// let it go there, and nothing is lost.

export class Hands {
  private touch = new ForgivingTouch()
  /** The pointer that is working, or null; and whether its press fell in the grown-up's corner, where the game holds nothing for it. */
  private finger: number | null = null
  private unheld = false
  /** The fingers that landed while another worked, oldest first, and where each is now. */
  private waiting = new Map<number, Point>()

  /**
   * `game` is the game once the slot has been read, `place` turns a point of the surface into stage units,
   * `corner` says whether a point is in the grown-up's corner, and `after` runs once each gesture has been
   * handed to the game, with whether a touch ended in it: the Mount plays the notes and saves there.
   */
  constructor(private game: () => Game | null, private place: (at: Point) => Point, private corner: (at: Point) => boolean, private after: (ended: boolean) => void) {}

  /** Whether that pointer is the finger that is working. */
  holds(id: number): boolean {
    return this.touch.holds(id)
  }

  /** The toy's clock, in the ms the tracker counts in. */
  private now(game: Game): number {
    return game.toy.t * 1000
  }

  down(id: number, at: Point): void {
    const game = this.game()
    if (!game) return
    // A finger is down already. If it rests, its touch is over (it made no move, and makes none now) and this one works.
    if (this.finger !== null && this.finger !== id && this.touch.holds(this.finger)) {
      if (this.unheld || game.toy.resting) this.act(game, this.touch.cancel(this.finger))
      // The working finger is not resting: this one waits where it is, and is not forgotten.
      else { this.waiting.set(id, at); return }
    }
    const gestures = this.touch.down(id, at, this.now(game))
    if (this.touch.holds(id)) this.finger = id
    this.act(game, gestures)
  }

  move(id: number, at: Point): void {
    const game = this.game()
    if (this.waiting.has(id)) { this.waiting.set(id, at); return }
    if (game) this.act(game, this.touch.move(id, at))
  }

  up(id: number, at: Point): void {
    const game = this.game()
    if (this.waiting.delete(id) || !game) return
    let gestures = this.touch.up(id, at, this.now(game))
    // A lifted drag waits only where something is carried. Everything else takes the lift for the end.
    if (gestures.some((gesture) => gesture.type === 'dragLift') && !game.toy.carrying) gestures = this.touch.letGo()
    this.act(game, gestures)
    this.handOver(game)
  }

  /** The browser took the pointer away, which is not the child letting go. */
  cancel(id: number): void {
    const game = this.game()
    if (this.waiting.delete(id) || !game) return
    this.act(game, this.touch.cancel(id))
    this.handOver(game)
  }

  /**
   * A finger that waits takes over the work where it is now, as a touch of its own: when the working contact has
   * come to rest, whose touch is then over, or when nothing works any more. While something hangs where a
   * carrying finger let it go, that comes first.
   */
  private handOver(game: Game): void {
    if (this.waiting.size === 0) return
    const working = this.finger !== null && this.touch.holds(this.finger)
    if (working ? !(this.unheld || game.toy.resting) : this.touch.active) return
    if (working) this.act(game, this.touch.cancel(this.finger!))
    const [id, at] = this.waiting.entries().next().value as [number, Point]
    this.waiting.delete(id)
    const gestures = this.touch.down(id, at, this.now(game))
    if (this.touch.holds(id)) this.finger = id
    this.act(game, gestures)
  }

  /** Every frame, after the game has played its step: what hung longer than the grace is let go where it hangs. */
  frame(): void {
    const game = this.game()
    if (!game) return
    this.act(game, this.touch.advance(this.now(game)))
    this.handOver(game)
  }

  /** The surface is parked or hidden mid-touch: a finger still down is taken away, and what hangs is set down. */
  clear(): void {
    const game = this.game()
    this.waiting.clear()
    if (game) this.act(game, this.touch.clear())
  }

  private act(game: Game, gestures: Gesture[]): void {
    for (const gesture of gestures) {
      switch (gesture.type) {
        // The answer is made when the finger lands. In the grown-up's corner the game answers nothing.
        case 'press':
          this.unheld = !game.press(this.place(gesture.at), this.corner(gesture.at))
          break
        case 'dragMove':
          game.move(this.place(gesture.at))
          break
        case 'dragStart':
          break
        // Each of the five ways a touch ends lets go of whatever the finger held, but a lift that carries: that
        // hangs until its drag ends. A touch that was taken away (`pressEnd`, `dragCancel`) makes no move for the child.
        case 'tap':
        case 'pressEnd':
        case 'dragLift':
        case 'dragEnd':
        case 'dragCancel':
          game.end(gesture.type)
          this.after(true)
          break
        default:
          // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
          gesture satisfies never
      }
    }
    if (!this.touch.active) this.finger = null
    this.after(false)
  }
}
