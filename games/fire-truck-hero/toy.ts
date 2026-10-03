// The toy: the hose in an empty yard, with its sound and motion and no goal
// (ART.md, "The toy"). No renderer and no DOM here. This module joins the
// hose, the drops, the truck's motion, the wet sand and the voices, and the
// Mount hands it touches and frames. What it plays is passed in, so a test can
// listen without an audio API.
//
// The answer to a touch starts in `press`, which the Mount calls in the frame
// the finger lands: the nozzle turns, the truck rocks back, water leaves and
// the hose is heard, before any frame has been played.

import { Drops, SPLASH_PER_LANDING } from './drops'
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

/** What is under the finger: the truck, or a point of the yard. */
export type Touched = { truck: boolean; point: Ground2 }

export class Toy {
  readonly hose = new Hose()
  readonly drops = new Drops()
  readonly truck = new TruckMotion()
  readonly paint = new WetPaint()
  /** The wet sand as the coarse grid that a save would hold. */
  ground: Ground = dryGround()
  /** The share of the stream's small drops and splashes that are drawn: a quality tier sets it. The water is the same. */
  dropsShare = 1
  private readonly variants = new Variants()
  private readonly creaks = new Variants(0x2c1b3c6d)
  private trickleOwed = 0
  private gulpsInTouch = 0

  constructor(private readonly play: (voice: VoiceSpec) => void) {}

  /** The finger lands. On the truck it honks and hops; anywhere else the first gulp leaves at once. */
  press(touched: Touched, now: number): void {
    if (touched.truck) {
      this.truck.honk()
      this.play(honk())
      return
    }
    this.gulpsInTouch = 0
    const gulp = this.hose.press(touched.point, now)
    this.leave(gulp)
    // One voice, since the first sound of a first touch is the one that waits for the unlock.
    this.play([...hoseVoice(gulp.arc.reach), ...spurt()])
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
    const { launched, landed } = this.hose.step(now, seconds)
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
    this.drops.step(seconds, (x, z, gulps, radius) => this.paint.splash(x, z, gulps * SPREAD, radius), Math.round(SPLASH_PER_LANDING * this.dropsShare))
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

  private leave(gulp: Gulp): void {
    const { turn, tilt } = nozzleFor(gulp.arc)
    this.truck.aim(turn, tilt)
    this.truck.gulp(gulp.first)
    this.drops.gulp(gulp.arc)
    // The first gulp of a touch has its pop. In a stream the springs creak at every third gulp after it.
    if (this.gulpsInTouch++ % 3 === 0 && !gulp.first) this.play(creak(this.creaks.next(3)))
  }

  /** A gulp reaches the sand: it is heard, and the grid takes its water. */
  private land(gulp: Gulp): void {
    const { x, z } = gulp.arc.to
    const before = levelOf(this.ground[cellAt(x, z)] ?? 0)
    const variant = this.variants.next(SPLAT_VARIANTS)
    if (before === 'mud') this.play(squelch(variant))
    else if (before === 'puddle') this.play(plip(variant))
    else this.play(splat(this.paint.at(x, z).damp / 255, variant))
    this.pour(gulp)
  }

  private pour(gulp: Gulp): void {
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
