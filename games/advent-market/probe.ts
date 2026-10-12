import { Fair, type Point } from './fair'
import { WHO } from './hall'
import { ForgivingTouch, type Gesture } from './input'
import { fit, toStage, type Fit } from './stage'
import { handOver, handle } from './visit'
import type { Place } from './places'
import { freshSave, type Save } from './save'
import { fatCandle, fresh, type Biscuit, type Craft, type Star, type Thing, type Wreath } from './things'

// What the tests share: a fair in a given state, a finger, and everything of
// a fair that can be seen or heard, as plain data. Nothing here is drawn or
// played; no game file imports it.

export const DT = 1 / 60

/** The two surfaces the game is made for, in CSS pixels. */
export const SURFACES = [{ w: 1180, h: 820 }, { w: 1024, h: 768 }] as const

/**
 * A finger on the glass, as the Mount hears it: pointer events in the surface's own pixels go through the touch
 * tracker, and its gestures through `handle`, with the lift taken for the end as the Mount takes it. Points are
 * given in stage units and turned into the surface's pixels here, so a test names a thing where it is drawn.
 */
export class Finger {
  readonly touch = new ForgivingTouch()
  private ms = 0
  private readonly by: Fit

  constructor(readonly fair: Fair, surface: { w: number; h: number } = SURFACES[0]) {
    this.by = fit(surface.w, surface.h)
  }

  private px(at: Point): Point {
    return { x: Math.round(this.by.x + at.x * this.by.scale), y: Math.round(this.by.y + at.y * this.by.scale) }
  }

  private act(gestures: Gesture[]): void {
    handle(this.fair, gestures, (p) => toStage(p, this.by))
  }

  /** A contact lands, as the Mount hears it: a contact that only rests hands the work over first (`handOver`). `id` names the pointer. */
  down(at: Point, id = 1): void {
    this.act(handOver(this.fair, this.touch, true, this.ms))
    this.act(this.touch.down(id, this.px(at), this.ms))
  }

  /** Across to `to` in twenty small moves over a third of a second. */
  to(to: Point, id = 1): void {
    const from = this.fair.finger ?? to
    for (let i = 1; i <= 20; i++) {
      this.act(this.touch.move(id, this.px({ x: from.x + ((to.x - from.x) * i) / 20, y: from.y + ((to.y - from.y) * i) / 20 }), this.ms))
      this.wait(DT)
    }
  }

  up(id = 1): void {
    const at = this.px(this.fair.finger ?? { x: 0, y: 0 })
    this.act(this.touch.up(id, at, this.ms))
    this.act(this.touch.letGo())
  }

  /** The browser takes the finger away. */
  taken(): void {
    this.act(this.touch.cancel(1))
  }

  wait(seconds: number): void {
    for (let t = 0; t < seconds - 1e-9; t += DT) {
      this.ms += DT * 1000
      this.act(this.touch.advance(this.ms))
      this.fair.step(DT)
    }
  }
}

/** A made thing of a craft, middle-sized, in a colour. */
export function made(craft: Craft, colour = 0): Thing {
  if (craft === 'candle') return fatCandle(colour)
  if (craft === 'star') return { ...(fresh('star', 1, colour) as Star), points: 4 }
  if (craft === 'wreath') return { ...(fresh('wreath', 1, colour) as Wreath), twigs: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0] }
  return { ...(fresh('biscuit', 1, colour) as Biscuit), cut: true }
}

/** A fair where the child stands at `place`, changed by `change` before it is loaded. */
export function fairAt(place: Place, change: (save: Save) => void = () => {}, age: number | null = 7): Fair {
  const save = freshSave(age, 7)
  save.at = place
  change(save)
  return new Fair(save)
}

export function run(fair: Fair, seconds: number): void {
  for (let t = 0; t < seconds - 1e-9; t += DT) fair.step(DT)
}

/** The finger lifts. What it carried hangs for the grace, and that moment is played out: the thing is let go where it hung. */
export function lift(fair: Fair): void {
  fair.release(true)
  while (fair.lifted >= 0) fair.step(DT)
}

export function tap(fair: Fair, x: number, y: number): void {
  fair.press(x, y)
  lift(fair)
}

/** A finger lands at `from`, moves to `to` in small steps over a third of a second, and is still there: the caller lets go, or does not. */
export function carry(fair: Fair, from: Point, to: Point): void {
  fair.press(from.x, from.y)
  for (let i = 1; i <= 20; i++) {
    fair.move(from.x + ((to.x - from.x) * i) / 20, from.y + ((to.y - from.y) * i) / 20)
    fair.step(DT)
  }
}

export function drag(fair: Fair, from: Point, to: Point): void {
  carry(fair, from, to)
  lift(fair)
}

/** Everything of a fair that a child could see, as plain data: what a load must find and a put-away must leave. */
export function seen(fair: Fair): unknown {
  const d = fair.dipping
  // To a millionth: a spring that has all but come to rest is at rest.
  const round = (_: string, value: unknown) => (typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value)
  return JSON.parse(JSON.stringify({
    save: fair.toSave(), time: fair.time, finger: fair.finger, stick: fair.stick, working: fair.working, carry: fair.carry, hooked: fair.hooked, pending: fair.pending, snowTap: fair.snowTap, lifted: fair.lifted, letAt: fair.letAt, out: fair.out, pull: fair.pull, landed: fair.landed, bare: fair.bare, hookDy: fair.hookDy, halo: fair.haloAge,
    flight: fair.flight, slide: fair.slide, door: [fair.doorOpen, fair.doorTo], glow: fair.glow, basket: [fair.basketFrom, fair.basketAge], cloth: fair.clothFlown, hop: fair.hop,
    motes: fair.motes, swell: fair.swell, pot: [fair.potMix, fair.potWas], springs: [fair.lamps, fair.potRing, fair.basketShake, fair.flutter], swirl: fair.swirl, lick: fair.lick,
    playing: fair.playing, shown: fair.shown, poses: WHO.map((who) => fair.folk.pose(who)), bench: [fair.bench.give, fair.bench.sway, fair.bench.made],
    dip: { stick: d.stick, swing: d.swing, held: d.held, inPot: d.inPot, wet: d.wet, warm: d.warm, drops: d.drops, rings: d.rings, spots: d.spots, level: d.level, bubbling: d.bubbling, melting: d.melting },
  }, round))
}
