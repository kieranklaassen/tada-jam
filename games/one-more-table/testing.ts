import type { GuestId } from './cast'
import { TOP, toStagePoint, type Point } from './layout'
import { Play } from './play'
import { freshState, type GameState } from './save'
import { STAGE } from './stage'
import { Table } from './table'

/** A game driven the way the Mount drives it: fingers by id and pixel, and time. */
export class Hand {
  readonly table: Table
  readonly play: Play
  constructor(state: GameState = { ...freshState(), shown: true }) {
    this.table = new Table(state)
    this.play = new Play(this.table)
    this.play.size(STAGE.width, STAGE.height)
  }
  run(seconds: number, each?: () => void): void {
    for (let t = 0; t < seconds; t += 1 / 60) { this.play.step(1 / 60); each?.() }
  }
  on(p: Point): Point { return toStagePoint(p, this.table.cam) }
  get knob(): Point { return this.on(this.table.knobAt()) }
  get bell(): Point { return this.on(this.table.bellAt()) }
  face(id: GuestId): Point { const b = this.table.base(id); return this.on({ x: b.x, y: TOP - 112 }) }
  tapAt(p: Point, finger = 1): void { this.play.down(finger, p.x, p.y); this.run(0.06); this.play.up(finger, p.x, p.y) }
  dragBy(p: Point, dx: number, dy: number, lift: 'up' | 'hold' | 'cancel' = 'up', steps = 24): void {
    this.play.down(1, p.x, p.y)
    for (let i = 1; i <= steps; i++) { this.play.move(1, p.x + (dx * i) / steps, p.y + (dy * i) / steps); this.run(0.03) }
    if (lift === 'up') this.play.up(1, p.x + dx, p.y + dy)
    if (lift === 'cancel') this.play.cancel(1)
  }
  /** Seats the next ones, one tap of the knob each. */
  seat(n: number): void { for (let i = 0; i < n; i++) { this.tapAt(this.knob); this.run(2.4) } }
}
