import { seeded } from './motion'
import { TRAY } from './world'

// The snail: the one living thing in the place round the tray. It creeps
// along the boards behind the tray, slowly, whatever is going on in it; it is
// no part of any ride, weighs nothing on the plank and is never saved. It has
// one answer to a finger and one to a hard knock in the tray: it pulls into
// its shell, and after a moment looks out again, one eye at a time. Pure, on
// game time: it stops when the game does.

/** How far the mat under the tray reaches beyond the tray's rim. */
export const MAT_REACH = 1.7

/** Where it lives: a line across the boards behind the tray and its mat, and how far along it the snail goes before it turns. */
export const SNAIL = {
  z: -TRAY.halfDepth - TRAY.rimThick - MAT_REACH - 1.45,
  reach: 6.4,
  /** Tray units a second, at its fastest. */
  speed: 0.12,
  /** Half the width of its shell: a little smaller than the smallest friend. */
  shell: 0.5,
  /** How near its middle a finger counts as on it. */
  touch: 0.95,
} as const

/** Seconds it stays in its shell after a touch, and after a hard knock in the tray. */
export const HIDES = { touched: 2.2, startled: 1.1 } as const
/** Seconds from the first eye coming out until it creeps again. */
export const PEEK_SECONDS = 1.5
/** Seconds a turn at the end of its line takes. */
const TURN_SECONDS = 2.6

export type SnailPose = {
  x: number
  z: number
  /** Which way it faces, in radians about the upright: 0 is toward the right of the tray. */
  heading: number
  /** How far its body is out of the shell, 0 to 1. */
  out: number
  /** How far each eye stalk is out, 0 to 1: the first to peek, and the second. */
  first: number
  second: number
  /** Its stalks lean toward the tray, 0 to 1, when something happens there. */
  look: number
  /** The shell rocks on its foot after a touch, in radians. */
  rock: number
  /** Its foot stretches and gathers as it creeps, 0 to 1. */
  stretch: number
}

const ease = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt))

export class Snail {
  readonly pose: SnailPose
  private way: 1 | -1
  /** Seconds left in its shell. */
  private hidden = 0
  /** Seconds since it began to come out, or -1 when it is out. */
  private peeking = -1
  /** Seconds into a turn at the end of its line, or -1. */
  private turning = -1
  private rocked = 9
  private flinch = 0
  private looking = 0
  private phase = 0

  constructor(seed = 1) {
    const random = seeded(seed + 101)
    this.way = random() < 0.5 ? 1 : -1
    this.pose = { x: (random() - 0.5) * 7, z: SNAIL.z, heading: this.way > 0 ? 0 : Math.PI, out: 1, first: 1, second: 1, look: 0, rock: 0, stretch: 0 }
  }

  /** In its shell, or not yet all the way out. */
  get tucked(): boolean {
    return this.hidden > 0 || this.peeking >= 0
  }

  /** A finger on it: in it goes, and its shell rocks. Touched again while it is in, it stays in that much longer and rocks again. */
  poke(): void {
    this.hidden = HIDES.touched
    this.peeking = -1
    this.rocked = 0
  }

  /** An end came down in the tray. Hard, and the snail ducks in for a moment; softly, and its eyes only flinch and look that way. */
  startle(strength: number): void {
    this.looking = 1.6
    if (strength >= 0.6 && this.hidden <= 0) {
      this.hidden = HIDES.startled
      this.peeking = -1
    } else this.flinch = 0.35
  }

  step(dt: number): void {
    const pose = this.pose
    this.phase += dt
    this.rocked += dt
    this.flinch = Math.max(0, this.flinch - dt)
    this.looking = Math.max(0, this.looking - dt)
    pose.rock = this.rocked < 1.4 ? 0.32 * Math.sin(this.rocked * 17) * Math.exp(-this.rocked * 3.4) : 0
    if (this.hidden > 0) {
      this.hidden -= dt
      pose.out = ease(pose.out, 0, 18, dt)
      pose.first = ease(pose.first, 0, 24, dt)
      pose.second = ease(pose.second, 0, 24, dt)
      if (this.hidden <= 0) this.peeking = 0
      return
    }
    if (this.peeking >= 0) {
      // One eye first, and a look round; then the other, and the rest of it.
      this.peeking += dt
      const t = this.peeking
      pose.first = ease(pose.first, 1, 7, dt)
      pose.out = ease(pose.out, t < 0.7 ? 0.3 : 1, 5, dt)
      pose.second = ease(pose.second, t < 0.7 ? 0 : 1, 7, dt)
      if (t >= PEEK_SECONDS) {
        this.peeking = -1
        pose.out = pose.first = pose.second = 1
      }
      return
    }
    const eyes = this.flinch > 0 ? 0.45 : 1
    pose.first = ease(pose.first, eyes, 20, dt)
    pose.second = ease(pose.second, eyes, 20, dt)
    pose.look = ease(pose.look, this.looking > 0 ? 1 : 0, 5, dt)
    if (this.turning >= 0) {
      this.turning += dt
      const u = Math.min(1, this.turning / TURN_SECONDS), smooth = u * u * (3 - 2 * u)
      // It turns toward the tray, so its face is never lost behind its shell.
      pose.heading = (this.way > 0 ? 0 : Math.PI) + this.way * -smooth * Math.PI
      if (u >= 1) {
        this.turning = -1
        this.way = this.way > 0 ? -1 : 1
        pose.heading = this.way > 0 ? 0 : Math.PI
      }
      return
    }
    // Creeping: the foot stretches forward and gathers, and it moves only while it stretches.
    pose.stretch = 0.5 - 0.5 * Math.cos(this.phase * 2.1)
    pose.x += this.way * SNAIL.speed * pose.stretch * dt * (this.looking > 0 ? 0.2 : 1)
    if (pose.x * this.way >= SNAIL.reach) this.turning = 0
  }
}
