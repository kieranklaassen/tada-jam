// The toy: the hose in an empty yard, with its sound and motion and no goal
// (ART.md, "The toy"). No renderer and no DOM here. This module joins the
// hose, the drops, the truck's motion, the wet sand and the voices, and the
// Mount hands it touches and frames. What it plays is passed in, so a test can
// listen without an audio API.
//
// The answer to a touch starts in `press`, which the Mount calls in the frame
// the finger lands: the nozzle turns, the truck rocks back, water leaves and
// the hose is heard, before any frame has been played.

import { DOT, Drops, SPLASH_PER_LANDING } from './drops'
import { PUDDLE_AT, cellAt, dry, dryGround, levelOf, pour, type Ground } from './ground'
import { Hose, type Gulp } from './hose'
import { arcTo, nozzleFor, type Ground2 } from './jet'
import { NOZZLE } from './layout'
import { TruckMotion } from './truckMotion'
import { Variants, creak, honk, hose as hoseVoice, plip, splat, spurt, squelch, thud, SPLAT_VARIANTS, type VoiceSpec } from './voices'
import { WetPaint } from './wetPaint'

/** Small drops a second that fill a stream between its gulps, at full quality. */
export const TRICKLES_PER_S = 48

/**
 * The drops of a gulp come down spread over a blot wider than one drop, so
 * each leaves this much more than its share for the middle of the blot to be
 * as dark as one gulp makes it (wetPaint.ts).
 */
export const SPREAD = 1.8

/** The springs creak this long after the gulp leaves, as the truck rocks back, in seconds. */
export const CREAK_AFTER_S = 0.08

/** What is under the finger: the truck, or a point of the yard. */
export type Touched = { truck: boolean; point: Ground2 }

export class Toy {
  readonly hose = new Hose()
  readonly drops = new Drops()
  readonly truck = new TruckMotion()
  readonly paint = new WetPaint()
  /** The open sand as the coarse grid that a save holds. The game keeps it in its yard. */
  protected sand: Ground = dryGround()
  /** The share of the stream's small drops and splashes that are drawn: a quality tier sets it. The water is the same. */
  dropsShare = 1
  protected readonly variants = new Variants()
  private readonly creaks = new Variants(0x2c1b3c6d)
  private trickleOwed = 0

  constructor(protected readonly play: (voice: VoiceSpec) => void) {}

  get ground(): Ground {
    return this.sand
  }

  set ground(next: Ground) {
    this.sand = next
  }


  /** The finger lands. On the truck it honks and hops; anywhere else the first gulp leaves at once. */
  press(touched: Touched, now: number): void {
    if (touched.truck) {
      this.truck.honk()
      this.play(honk())
      return
    }
    const gulp = this.hose.press(touched.point, now)
    this.leave(gulp)
    // One voice, since the first sound of a first touch is the one that waits for the unlock: the hose, its pop,
    // and the creak of the springs as the truck rocks back, a moment after.
    this.play([...hoseVoice(gulp.arc.reach), ...spurt(), ...creak(this.creaks.next(3)).map((partial) => ({ ...partial, at: partial.at + CREAK_AFTER_S }))])
  }

  /** The finger moves: the water follows. */
  move(point: Ground2): void {
    this.hose.move(point)
  }

  /** The finger lifts. Water in the air still lands. */
  lift(): void {
    this.hose.lift()
  }

  /** One frame of `seconds` of game time, ending at `now` on the attended clock. */
  step(seconds: number, now: number): void {
    const { launched, landed, rested } = this.hose.step(now, seconds)
    for (const gulp of launched) {
      this.leave(gulp)
      this.play(hoseVoice(gulp.arc.reach))
    }
    if (this.hose.holding && seconds > 0) {
      const arc = arcTo(NOZZLE, this.hose.aim)
      const { turn, tilt } = nozzleFor(arc)
      this.truck.aim(turn, tilt)
      this.trickleOwed += seconds * TRICKLES_PER_S * this.dropsShare
      while (this.trickleOwed >= 1) {
        this.trickleOwed -= 1
        this.drops.trickle(arc)
      }
    }
    for (const gulp of landed) this.land(gulp)
    if (rested) this.rested()
    this.drops.step(seconds, (x, z, gulps, radius) => this.paint.splash(x, z, gulps * SPREAD, radius), Math.round(SPLASH_PER_LANDING * this.dropsShare), (x, z) => this.paint.splash(x, z, DOT.dark, DOT.radius))
    this.ground = dry(this.ground, seconds)
    this.paint.dry(seconds)
    this.truck.step(seconds)
    if (this.truck.landed) this.play(thud())
  }

  /** The game goes to rest: the stream stops, and what was in the air lands at once and silently, so nothing is lost. */
  rest(): void {
    for (const gulp of this.hose.clear()) {
      this.pour(gulp)
      this.paint.splash(gulp.arc.to.x, gulp.arc.to.z, 1)
    }
    this.drops.clear()
  }

  /** The stream stopped and stayed stopped: the watering is over. The game tells the yard. */
  protected rested(): void {}

  protected leave(gulp: Gulp): void {
    const { turn, tilt } = nozzleFor(gulp.arc)
    this.truck.aim(turn, tilt)
    this.truck.gulp(gulp.first)
    this.drops.gulp(gulp.arc)
    // The truck creaks on its springs every time it rocks. The first gulp of a touch has its creak in the voice
    // of the press, with its pop; each gulp of a stream after it has its own.
    if (!gulp.first) this.play(creak(this.creaks.next(3)))
  }

  /** A gulp reaches the sand: it is heard, and the grid takes its water. The game sends it to what stands there. */
  protected land(gulp: Gulp): void {
    const { x, z } = gulp.arc.to
    const before = levelOf(this.ground[cellAt(x, z)] ?? 0)
    const variant = this.variants.next(SPLAT_VARIANTS)
    if (before === 'mud') this.play(squelch(variant))
    else if (before === 'puddle') this.play(plip(variant))
    else this.play(splat(this.paint.at(x, z).damp / 255, variant))
    this.pour(gulp)
  }

  protected pour(gulp: Gulp): void {
    const { x, z } = gulp.arc.to
    const cell = cellAt(x, z)
    if (cell < 0) return
    const before = this.ground[cell]
    this.ground = pour(this.ground, x, z, 1)
    const now = levelOf(this.ground[cell])
    // The sand has had its fill here: the water stands, and with more it is mud.
    if (before < PUDDLE_AT && now !== 'damp') this.paint.puddle(x, z)
    if (now === 'mud' && levelOf(before) !== 'mud') this.paint.mud(x, z)
  }
}
