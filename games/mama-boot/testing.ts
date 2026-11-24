import { STAGE } from './stage'
import { Play } from './play'
import { makeRng } from './rng'
import { freshState, type GameState } from './save'
import type { Id, Spot } from './layout'
import { Yard } from './yard'

/** A game driven the way the Mount drives it: fingers by id and pixel, and time. */
export class Hand {
  readonly yard: Yard
  readonly play: Play
  constructor(state: GameState = freshState(5), seed = 1) {
    this.yard = new Yard(state, makeRng(seed))
    this.play = new Play(this.yard)
    this.play.size(STAGE.width, STAGE.height)
  }
  run(seconds: number): void {
    for (let t = 0; t < seconds; t += 1 / 60) this.play.step(1 / 60)
  }
  where(id: Id): Spot {
    return this.yard.middle(this.yard.of(id)!)
  }
  tapAt(p: Spot, finger = 1): void {
    this.play.down(finger, p.x, p.y)
    this.run(0.1)
    this.play.up(finger, p.x, p.y)
  }
  tap(id: Id): void {
    this.tapAt(this.where(id))
  }
  lift(id: Id, finger = 1): Spot {
    const p = this.where(id)
    this.play.down(finger, p.x, p.y)
    this.play.move(finger, p.x + 24, p.y)
    return p
  }
  drag(id: Id, to: Spot, steps = 12): void {
    const p = this.lift(id)
    for (let i = 1; i <= steps; i++) {
      this.play.move(1, p.x + ((to.x - p.x) * i) / steps, p.y + ((to.y - p.y) * i) / steps)
      this.run(0.03)
    }
    this.play.up(1, to.x, to.y)
    this.run(0.4)
  }
}

export function state(edit: (s: GameState) => void, age = 5): GameState {
  const s = freshState(age)
  edit(s)
  return s
}
