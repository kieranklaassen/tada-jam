// How the truck moves, as numbers. No renderer: the stage copies these onto
// the model each frame. The truck is a character and moves like itself: eager
// and springy, a little heavy, with its funniest part its whole body rocking
// back on its wheels at every gulp (ART.md, "The characters").
//
// - A gulp rocks it back, and it bobs forward again past level and settles.
// - A honk makes it hop, and its roof light turns once.
// - The nozzle swings to where the water is sent, quickly, and overshoots.
// - At rest it idles like a toy with its motor running, blinks now and then,
//   and its eyes follow the nozzle.

import { kick, spring, stepSpring, type Feel } from './springs'

/** The body on its springs: lively, so a rock back swings past level before it settles. */
export const BODY: Feel = { stiffness: 150, damping: 9 }
/** A hop: softer than the body's rock, so the truck hangs in the air for a moment. */
export const HOP: Feel = { stiffness: 80, damping: 5 }
/** The nozzle: quick and a little loose. */
export const NOZZLE_FEEL: Feel = { stiffness: 420, damping: 24 }
/** The eyes: they glide after the nozzle. */
export const EYES: Feel = { stiffness: 90, damping: 16 }
/** The roof light: a heavy dome that turns once and stops without swinging back. */
export const LIGHT: Feel = { stiffness: 26, damping: 10.5 }

/** How hard one gulp knocks the body back, as a turning speed in radians a second. */
export const GULP_KICK = 2.3
/** The gulps of a stream knock less than the first of a touch, so a held stream is a shudder and not a seesaw. */
export const STREAM_KICK = 1.0
/** How fast a honk throws the body up, in yard units a second. */
export const HOP_KICK = 5
/** The body never tips further than this, in radians. */
export const MOST_ROCK = 0.22
/** The idle bob: how far and how often, like a motor ticking over. */
export const IDLE_BOB = 0.012
export const IDLE_HZ = 2.6
/** How long the eyes are shut in a blink, in seconds. */
export const BLINK_S = 0.13

export type TruckPose = {
  /** The body tips back by this many radians (negative is forward). */
  rock: number
  /** The whole truck is off the ground by this many yard units: a hop. */
  lift: number
  /** The body alone rides this much higher on its springs: the idle bob. */
  bob: number
  /** The body squashes and stretches by this share: under 1 is squashed. */
  squash: number
  /** The nozzle's direction: a turn about the upright (0 is along +x, toward +z is positive) and a tilt up from level. */
  turn: number
  tilt: number
  /** How far round the roof light has turned, in radians. */
  light: number
  /** Where the eyes look, each from -1 to 1: sideways (toward +z is positive) and up. */
  lookSide: number
  lookUp: number
  /** How open the eyes are, 1 to 0. */
  eyesOpen: number
}

/** The shortest way round from one angle to another, in radians. */
export function turnTo(from: number, to: number): number {
  let gap = (to - from) % (2 * Math.PI)
  if (gap > Math.PI) gap -= 2 * Math.PI
  if (gap < -Math.PI) gap += 2 * Math.PI
  return from + gap
}

export class TruckMotion {
  readonly pose: TruckPose = { rock: 0, lift: 0, bob: 0, squash: 1, turn: 0, tilt: 0.2, light: 0, lookSide: 0, lookUp: 0, eyesOpen: 1 }
  /** The truck was in the air and has just come down: true for one step, for the thud. */
  landed = false
  private rock = spring(0)
  private lift = spring(0)
  private turn = spring(0)
  private tilt = spring(0.2)
  private light = spring(0)
  private lookSide = spring(0)
  private lookUp = spring(0)
  private time = 0
  private nextBlink = 2.2
  private blinks = 0
  private inAir = false

  /** Water is being sent this way: the nozzle swings to it. */
  aim(turn: number, tilt: number): void {
    this.turn.target = turnTo(this.turn.value, turn)
    this.tilt.target = tilt
  }

  /** A gulp leaves the nozzle: the body is knocked back. `first` is the first gulp of a touch. */
  gulp(first: boolean): void {
    kick(this.rock, first ? GULP_KICK : STREAM_KICK)
  }

  /** A touch on the truck: it hops and its light turns once. */
  honk(): void {
    kick(this.lift, HOP_KICK)
    this.light.target += 2 * Math.PI
    // It blinks with surprise.
    this.nextBlink = this.time
  }

  step(seconds: number): TruckPose {
    this.landed = false
    if (!(seconds > 0)) return this.pose
    this.time += seconds
    stepSpring(this.rock, BODY, seconds)
    stepSpring(this.lift, HOP, seconds)
    stepSpring(this.turn, NOZZLE_FEEL, seconds)
    stepSpring(this.tilt, NOZZLE_FEEL, seconds)
    stepSpring(this.light, LIGHT, seconds)
    // The eyes follow the nozzle: sideways with its turn, up with its tilt.
    this.lookSide.target = Math.max(-1, Math.min(1, Math.sin(this.turn.value) * 1.4))
    this.lookUp.target = Math.max(-1, Math.min(1, this.tilt.value * 1.2 - 0.1))
    stepSpring(this.lookSide, EYES, seconds)
    stepSpring(this.lookUp, EYES, seconds)

    // A toy cannot sink into the sand: below its wheels the spring turns it round, and that is the landing.
    // It bounces once more, low, and that small bounce is not a second landing.
    if (this.lift.value > 0.1) this.inAir = true
    if (this.lift.value < 0) {
      this.lift.value = 0
      if (this.lift.velocity < 0) this.lift.velocity *= -0.25
      if (this.inAir) this.landed = true
      this.inAir = false
    }

    const pose = this.pose
    pose.rock = Math.max(-MOST_ROCK, Math.min(MOST_ROCK, this.rock.value))
    pose.lift = this.lift.value
    pose.bob = IDLE_BOB * (0.5 + 0.5 * Math.sin(this.time * IDLE_HZ * 2 * Math.PI))
    // Stretched on the way up, squashed as it comes down and as it rocks back.
    pose.squash = Math.max(0.9, Math.min(1.1, 1 + this.lift.velocity * 0.02 - Math.abs(pose.rock) * 0.25))
    pose.turn = this.turn.value
    pose.tilt = this.tilt.value
    pose.light = this.light.value
    pose.lookSide = this.lookSide.value
    pose.lookUp = this.lookUp.value

    if (this.time >= this.nextBlink + BLINK_S) {
      this.blinks++
      // The gaps between blinks differ, in a fixed order, so it never blinks like a metronome.
      this.nextBlink = this.time + [3.1, 4.4, 2.6, 5.2, 3.7][this.blinks % 5]
    }
    const into = (this.time - this.nextBlink) / BLINK_S
    pose.eyesOpen = into >= 0 && into <= 1 ? Math.abs(into * 2 - 1) : 1
    return pose
  }
}
