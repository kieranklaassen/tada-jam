import type { Kind } from './blocks'

// How things move, as numbers. Pure: the view maps these onto meshes.
//
// Each kind of block lands in its own way (ART.md, the grid's first two
// columns). The times of the second knocks here are the times the voices use,
// so what is seen and what is heard fall together.

/** A value on a spring: it overshoots and settles. Stepped in whole fixed steps. */
export class Spring {
  value: number
  velocity = 0
  target: number

  constructor(value: number, private readonly stiffness: number, private readonly damping: number) {
    this.value = value
    this.target = value
  }

  step(dt: number): void {
    this.velocity += ((this.target - this.value) * this.stiffness - this.velocity * this.damping) * dt
    this.value += this.velocity * dt
  }

  snap(value: number): void {
    this.value = value
    this.target = value
    this.velocity = 0
  }
}

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

export function smooth(t: number): number {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/** Seconds after the first knock at which a kind's second sound falls, or null when it has one knock. */
export const SECOND_KNOCK: Record<Kind, number | null> = {
  long: 0.09,
  arch: 0.16,
  round: null,
  thin: null,
  cube: null,
  slope: 0.1,
}

/** How long each kind takes to come to rest after it lands, in seconds. */
export const SETTLE_SECONDS: Record<Kind, number> = { long: 0.45, arch: 0.6, round: 0.7, thin: 1.1, cube: 0.35, slope: 0.4 }

/** A slope set on a block takes this long: its toe comes down on air and nods. */
export const NOD_SECONDS = 0.95
/** When the creak of that nod sounds, in seconds after the first knock: as the toe comes up the first time. */
export const NOD_CREAK = 0.16

/** How long a block takes to come to rest after it lands, on the rug or on a block. */
export function settleSeconds(kind: Kind, onBlock = false): number {
  return kind === 'slope' && onBlock ? NOD_SECONDS : SETTLE_SECONDS[kind]
}

export type SettlePose = {
  /** Height as a share of its own: under 1 is squashed. Its width grows to keep its bulk. */
  squash: number
  /** A lean about the axis that runs away from the child, in radians: one end up, the other down. */
  tilt: number
  /** A turn about its upright axis, in radians, on top of the way it faces. */
  turn: number
}

const decay = (t: number, rate: number): number => Math.exp(-t * rate)

/**
 * The pose of a block `t` seconds after it landed. Each kind has its own:
 * the long one comes down one end after the other, the arch rocks from foot
 * to foot, the round one turns a quarter on its end, the thin one sways like
 * a reed, the cube stops dead and squashes, the slope slaps its toe down.
 * At and after `SETTLE_SECONDS` every pose is at rest.
 */
export function settlePose(kind: Kind, t: number, out: SettlePose, onBlock = false): SettlePose {
  out.squash = 1
  out.tilt = 0
  out.turn = 0
  const lasts = settleSeconds(kind, onBlock)
  if (t < 0 || t >= lasts) return out
  // Every pose fades to rest by the end of its time, so nothing snaps.
  const fade = 1 - smooth((t - lasts * 0.7) / (lasts * 0.3))
  switch (kind) {
    case 'long': {
      // One end is down; the other follows at the second knock and bounces once, small.
      const second = SECOND_KNOCK.long!
      out.tilt = t < second ? 0.07 * (1 - t / second) : -0.012 * Math.sin((t - second) * 34) * decay(t - second, 9)
      out.squash = 1 - 0.1 * decay(t, 16)
      break
    }
    case 'arch':
      // Foot to foot, twice.
      out.tilt = 0.05 * Math.cos((t / SECOND_KNOCK.arch!) * Math.PI) * decay(t, 5)
      out.squash = 1 - 0.05 * decay(t, 14)
      break
    case 'round':
      // A quarter turn on its end, easing out, with one deep squash.
      out.turn = (Math.PI / 2) * (1 - smooth(t / 0.55)) * -1
      out.squash = 1 - 0.14 * Math.cos(t * 22) * decay(t, 10)
      break
    case 'thin':
      // A reed: three sways that die.
      out.tilt = 0.13 * Math.sin(t * 17) * decay(t, 3.4)
      break
    case 'cube':
      // Stops dead; squashes and springs back past its height once.
      out.squash = 1 - 0.2 * Math.cos(t * 26) * decay(t, 13)
      break
    case 'slope': {
      // Heel first; the toe slaps down at the second knock.
      const second = SECOND_KNOCK.slope!
      // Set on a block, its toe comes down on air: it nods, the toe coming up and down three times, each smaller,
      // and never below where it rests.
      if (onBlock) out.tilt = t < second ? -0.09 * (1 - (t / second) ** 2) : -0.05 * Math.abs(Math.sin((t - second) * 11)) * decay(t - second, 3.2)
      else out.tilt = t < second ? -0.09 * (1 - (t / second) ** 2) : 0.01 * Math.sin((t - second) * 40) * decay(t - second, 12)
      out.squash = 1 - 0.08 * decay(t, 16)
      break
    }
  }
  out.tilt *= fade
  out.turn *= fade
  out.squash = 1 + (out.squash - 1) * fade
  return out
}

/** The stretch of a block as it comes up into the hand: taller for a moment, then itself. */
export function liftStretch(sinceLift: number): number {
  return 1 + 0.16 * Math.sin(clamp01(sinceLift / 0.22) * Math.PI)
}

/** How long a kind's own way of coming up lasts, in seconds. */
export const LIFT_SECONDS = 0.3

/**
 * The pose of a block `t` seconds after it came up into the hand, on top of
 * its stretch. Each kind comes up its own way (ART.md, the grid's third
 * column): the long one lifts one end first like a see-saw, the arch pops up
 * like a cork, the round one comes up with a twist, the thin one is plucked
 * and shivers, the cube is the plainest, the slope scrapes up toe last. At
 * and after `LIFT_SECONDS` every pose is at rest.
 */
export function liftPose(kind: Kind, t: number, out: SettlePose): SettlePose {
  out.squash = 1
  out.tilt = 0
  out.turn = 0
  if (t < 0 || t >= LIFT_SECONDS) return out
  const p = t / LIFT_SECONDS, swell = Math.sin(p * Math.PI)
  switch (kind) {
    case 'long':
      out.tilt = 0.1 * swell
      break
    case 'arch':
      // A cork: it shoots up tall at once and is itself again.
      out.squash = 1 + 0.14 * Math.sin(Math.min(1, p * 2.2) * Math.PI)
      break
    case 'round':
      out.turn = 0.5 * (1 - smooth(p))
      break
    case 'thin':
      out.tilt = 0.09 * Math.sin(t * 60) * (1 - p)
      break
    case 'cube':
      break
    case 'slope':
      out.tilt = -0.07 * swell
      out.squash = 1 - 0.05 * swell
      break
  }
  return out
}
