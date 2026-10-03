import { type Bench, type Mark } from './bench'
import { Customer } from './folk'
import { Director, Raccoon } from './motion'
import { AT_BENCH, AT_WINDOW, STAGE, type P } from './stage'
import { type Who } from './tastes'

// Who is on screen and where: the customer at the bench, the one who waits at
// the window, one who is walking off, and the old hand. Numbers only. Each
// customer keeps its own rig from the moment it steps up to the window until
// it has walked off, so it never changes how it moves on the way.

export type Standing = { customer: Customer; at: P; size: number }

/** How big a customer is drawn at the window, against 1 at the bench: it stands a little further off. */
export const WINDOW_SIZE = 0.78

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export class Cast {
  readonly raccoon: Raccoon
  owner: Customer
  waiting: Customer
  leaving: Customer | null = null
  private readonly director: Director

  constructor(seed: number, bench: Bench) {
    this.director = new Director(seed + 7)
    this.raccoon = new Raccoon(new Director(seed))
    this.owner = new Customer(bench.stall.job.who, this.director)
    this.waiting = new Customer(bench.stall.next.who, this.director)
    // As it was left: a customer whose gadget was handed back stands as that reaction left it.
    if (bench.stall.finished && bench.show.act) this.owner.settle(bench.show.act)
  }

  /** What the bench just did, for whoever reacts to it. */
  mark(marks: readonly Mark[]): void {
    for (const mark of marks) {
      if (mark.type === 'pop') { this.raccoon.pop(); this.owner.startle(); this.waiting.startle() }
      else if (mark.type === 'poke' && mark.who === 'oldHand') this.raccoon.poke()
      else if (mark.type === 'poke' && mark.who === 'mug') this.raccoon.slosh.v += 5
      else if (mark.type === 'poke' && mark.who === 'owner') this.owner.startle()
    }
  }

  /** Keep the cast in step with the stall: when the customers change over, each moves up one place with its own rig. */
  private sync(bench: Bench): void {
    const job: Who = bench.stall.job.who, next: Who = bench.stall.next.who
    if (this.owner.who === job && this.waiting.who === next && (bench.leaving === null) === (this.leaving === null)) return
    if (bench.leaving && !this.leaving) {
      this.leaving = this.owner
      this.owner = this.waiting.who === job ? this.waiting : new Customer(job, this.director)
      this.waiting = new Customer(next, this.director)
      return
    }
    if (!bench.leaving) this.leaving = null
    if (this.owner.who !== job) this.owner = new Customer(job, this.director)
    if (this.waiting.who !== next) this.waiting = new Customer(next, this.director)
  }

  step(dt: number, bench: Bench): void {
    this.sync(bench)
    this.raccoon.step(dt)
    const act = bench.show.act ? { name: bench.show.act, progress: bench.show.react } : null
    // A fan running on the mat ruffles whoever leans over it.
    this.owner.step(dt, act, bench.stall.job.open && !bench.stall.finished, bench.wind())
    this.waiting.step(dt, null, false)
    this.leaving?.step(dt, null, false)
  }

  /** Where each stands now. While the customers change over, one walks off down the lane, one comes to the bench, and one steps up to the window. */
  places(walk: number): { owner: Standing; waiting: Standing; leaving: Standing | null } {
    const t = Math.max(0, Math.min(1, walk))
    return {
      owner: { customer: this.owner, at: { x: lerp(AT_WINDOW.x, AT_BENCH.x, t), y: lerp(AT_WINDOW.y, AT_BENCH.y, t) }, size: lerp(WINDOW_SIZE, 1, t) },
      waiting: { customer: this.waiting, at: { x: lerp(STAGE.w + 160, AT_WINDOW.x, t), y: AT_WINDOW.y }, size: WINDOW_SIZE },
      leaving: this.leaving ? { customer: this.leaving, at: { x: lerp(AT_BENCH.x, -200, t), y: AT_BENCH.y + 6 * Math.sin(t * 18) }, size: 1 } : null,
    }
  }
}
