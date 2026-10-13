import type { Face } from './answers'
import type { GnomeId } from './ground'

// How each character moves at rest. No two share a move: each gnome has his
// own tempo, his own weight and one part of him that does most of the
// moving, and the snail and the sun have theirs. Pure numbers over game
// time; the view maps them onto painted parts.

export type GnomePose = {
  /** Units the body is lifted off the seat. */
  bob: number
  /** The body's lean and the head's own tilt on top of it, in radians. */
  lean: number
  head: number
  /** The hat's angle on the head, in radians, and how far it has slid down over the eyes (0 to 1) or flown up (units). */
  hat: number
  hatDown: number
  hatUp: number
  /** 0 is open, 1 is shut. */
  lid: number
  /** Below 0 worried, with the inner ends up; above 0 raised and level. Never lowered over the eyes. */
  brow: number
  /** 0 is a closed line, 1 is a round open mouth. */
  mouth: number
  /** The nose's size, 1 at rest. */
  nose: number
  /** The bundle's swing, in radians. */
  bundle: number
  /** How far he stands up out of his seat, 0 at rest, 1 on the tips of his toes, below 0 sagging. */
  rise: number
}

const TAU = Math.PI * 2

/** A blink: shut for a moment once every `every` seconds. */
function blink(t: number, every: number, offset: number): number {
  const phase = (((t + offset) % every) + every) % every
  return phase < 0.12 ? Math.sin((phase / 0.12) * Math.PI) : 0
}

/** The tall one: slow, swaying like a reed, the tip of his hat a beat behind him. */
function tall(t: number): GnomePose {
  const sway = Math.sin(t * 0.9)
  return { bob: 0, lean: 0.045 * sway, head: 0.02 * Math.sin(t * 0.9 - 0.4), hat: 0.12 * Math.sin(t * 0.9 - 1.1), hatDown: 0, hatUp: 0, lid: blink(t, 4.1, 0.3), brow: 0.5, mouth: 0, nose: 1, bundle: 0.04 * sway, rise: 0 }
}

/** The baker: quick and round, bouncing on his heels with his bucket swinging. */
function baker(t: number): GnomePose {
  const bounce = Math.abs(Math.sin(t * 2.4)) ** 1.5
  return { bob: 7 * bounce, lean: 0.02 * Math.sin(t * 1.2), head: 0, hat: 0.05 * bounce, hatDown: 0, hatUp: 0, lid: blink(t, 2.7, 1.1), brow: 0.2, mouth: 0.15, nose: 1, bundle: 0.3 * Math.sin(t * 2.4 + 0.9), rise: 0 }
}

/** The sleepy one: his head sinks slowly and jerks back up. */
function sleepy(t: number): GnomePose {
  const phase = (t % 4.6) / 4.6
  const sink = phase < 0.86 ? (phase / 0.86) ** 2 : 1 - (phase - 0.86) / 0.14
  // Sleepy, not cross: lids that droop, brows left high and level, and a mouth gone slack.
  return { bob: -3 * sink, lean: 0.02 * sink, head: 0.34 * sink, hat: 0.3 * sink, hatDown: 0, hatUp: 0, lid: 0.55 + 0.4 * sink, brow: 0.45, mouth: 0.3 + 0.3 * sink, nose: 1, bundle: 0.05 * sink, rise: 0 }
}

/** The sneezy one: he sniffs in bursts, his head going back as if a sneeze were coming, and it never comes. */
function sneezy(t: number): GnomePose {
  const phase = t % 3.3
  const sniffing = phase < 0.9, burst = sniffing ? phase / 0.9 : 0
  const sniff = Math.abs(Math.sin(burst * 3 * Math.PI))
  const back = sniffing ? burst : Math.max(0, 1 - (phase - 0.9) / 0.25)
  return { bob: 2 * sniff, lean: 0.012 * Math.sin(t * 31) * (sniffing ? 1 : 0), head: -0.13 * back, hat: -0.05 * back, hatDown: 0, hatUp: 0, lid: Math.max(blink(t, 3.1, 0), blink(t, 3.1, 0.3)), brow: -0.6 * back, mouth: 0.5 * back, nose: 1 + 0.2 * sniff, bundle: 0.06 * Math.sin(t * 1.7), rise: 0 }
}

const IDLE: Record<GnomeId, (t: number) => GnomePose> = { tall, baker, sleepy, sneezy }

/** A gnome's pose at rest, at `t` seconds of game time. */
export function idlePose(who: GnomeId, t: number): GnomePose {
  return IDLE[who](t)
}

/** What a touch or a mushroom has set going in a gnome, on top of his rest: springs and a face, kept by the model. */
export type GnomeStir = {
  hop: number
  hatBend: number
  hatUp: number
  /** 0 to 1: a finger pressing his hat down over his eyes. */
  press: number
  rise: number
  lean: number
  /** His head alone, tipped forward or back. */
  nod: number
  face: Face | null
}

/** A gnome's pose with what has been set going in him laid over his rest. */
export function poseOf(who: GnomeId, t: number, stir: GnomeStir): GnomePose {
  const pose = idlePose(who, t)
  pose.bob += stir.hop + 16 * Math.max(0, stir.rise) - 9 * stir.press
  pose.rise = stir.rise
  pose.lean += stir.lean
  pose.head += stir.nod
  pose.hat += stir.hatBend
  pose.hatDown = stir.press
  pose.hatUp = Math.max(0, stir.hatUp)
  if (stir.rise > 0.05) pose.brow = Math.max(pose.brow, stir.rise)
  if (stir.rise < -0.05) { pose.brow = -0.8; pose.head += 0.12 * -stir.rise; pose.mouth = 0 }
  if (stir.face === 'wide') { pose.lid = 0; pose.brow = 1; pose.mouth = Math.max(pose.mouth, 0.5) }
  if (stir.face === 'shut') { pose.lid = 1; pose.brow = -0.4 }
  if (stir.face === 'ooh') { pose.lid = Math.min(pose.lid, 0.2); pose.brow = 0.8; pose.mouth = 1 }
  return pose
}

/** The snail at rest: its two eyes sway on their stalks, one after the other, and its body ripples. */
export function snailIdle(t: number): { stalks: readonly [number, number]; ripple: number } {
  return { stalks: [0.22 * Math.sin(t * 0.55), 0.22 * Math.sin(t * 0.55 + 2.2)], ripple: Math.sin(t * 0.8) }
}

/** The sun at rest: its rays turn slowly and its cheeks breathe. */
export function sunIdle(t: number): { turn: number; breath: number; lid: number } {
  return { turn: (t * 0.06) % TAU, breath: 0.5 + 0.5 * Math.sin(t * 0.7), lid: blink(t, 5.3, 2) }
}
