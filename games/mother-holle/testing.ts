import { Play, scaleOf } from './play'
import { deserialize } from './save'
import { Village } from './village'
import { makeRng } from './rng'

// A finger for the tests: it goes the Mount's own way, by surface pixels.

export const W = 1180
export const H = 820

export class Hand {
  play: Play
  id = 1
  constructor(raw: unknown = null, age: number | null = null, seed = 7) {
    const rng = makeRng(seed)
    this.play = new Play(new Village(deserialize(raw, age), () => rng.next()))
    this.play.size(W, H)
  }
  get v(): Village {
    return this.play.village
  }
  px(x: number, y: number): [number, number] {
    const s = scaleOf(W, H)
    return [W / 2 + x * s, H / 2 - y * s]
  }
  run(s: number): void {
    for (let t = 0; t < s; t += 1 / 60) this.play.step(1 / 60)
  }
  down(x: number, y: number): void {
    this.play.down(this.id, ...this.px(x, y))
  }
  move(x: number, y: number): void {
    this.play.move(this.id, ...this.px(x, y))
  }
  up(x: number, y: number): void {
    this.play.up(this.id, ...this.px(x, y))
  }
  tap(x: number, y: number): void {
    this.down(x, y)
    this.run(0.08)
    this.up(x, y)
  }
  drag(x0: number, y0: number, x1: number, y1: number, s = 0.6): void {
    this.down(x0, y0)
    const n = Math.max(1, Math.round(s * 60))
    for (let i = 1; i <= n; i++) {
      this.move(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)
      this.run(1 / 60)
    }
    this.up(x1, y1)
  }
  /** Snow all the way down. */
  whiten(): void {
    for (let k = 0; k < 2; k++) this.drag(-9, 4, 10, 4, 1.6)
    this.run(2)
  }
  /** Rides are over. */
  rest(max = 20): void {
    for (let t = 0; t < max && this.v.busy; t += 1 / 60) this.play.step(1 / 60)
  }
}
