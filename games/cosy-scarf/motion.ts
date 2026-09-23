import type { AnimalKey } from './state'

// Motion personalities. Every animal moves like itself: the bunny quick and
// twitchy, the penguin slow and rocking, the fox smooth and sly, the bear big
// and heavy. Each has its own idle life and blink, several variants of every
// action (a tap while cold, a tap once warm, a row finished for it, a pattern
// heard, asking for the scarf) and rare delights. A director per animal picks
// variants without repeats, varies their size and speed, and never plays an
// idle beat while something else is happening. Pure numbers: the view maps
// the pose onto crocheted parts. Actions add into a pose the caller owns, so
// a frame allocates nothing.

/**
 * Additive offsets from the pose the view already computes (gait, dance,
 * cold). Screen directions assume the animal faces the child, as it does
 * whenever it stands still: the loom and the basket are to screen right.
 */
export type Pose = {
  lift: number
  /** Positive squashes down and out, negative stretches up. */
  squash: number
  /** Positive leans toward the child. */
  lean: number
  /** Positive tips toward screen left. */
  roll: number
  /** Positive turns the whole body toward screen right. */
  twist: number
  /** Positive nods down. */
  headPitch: number
  /** Positive looks toward screen right (the loom and the basket). */
  headYaw: number
  /** Positive tilts toward screen left. */
  headRoll: number
  /** Arm or flipper raise, screen-left and screen-right. */
  armL: number
  armR: number
  /** Arms wrapping tighter round the belly. */
  hug: number
  /** Positive flattens an ear back, negative pricks it up. */
  earL: number
  earR: number
  /** Positive swishes the tail toward screen right. */
  tail: number
  /** 0 open, 1 shut. */
  shut: number
}

export const CHANNELS = ['lift', 'squash', 'lean', 'roll', 'twist', 'headPitch', 'headYaw', 'headRoll', 'armL', 'armR', 'hug', 'earL', 'earR', 'tail', 'shut'] as const satisfies readonly (keyof Pose)[]

export function emptyPose(): Pose {
  return { lift: 0, squash: 0, lean: 0, roll: 0, twist: 0, headPitch: 0, headYaw: 0, headRoll: 0, armL: 0, armR: 0, hug: 0, earL: 0, earR: 0, tail: 0, shut: 0 }
}

const REST: Readonly<Pose> = emptyPose()

export function resetPose(pose: Pose): Pose {
  return Object.assign(pose, REST)
}

export type ActionKind = 'poke' | 'pet' | 'row' | 'hum' | 'ask' | 'delight'
export const ACTION_KINDS: readonly ActionKind[] = ['poke', 'pet', 'row', 'hum', 'ask', 'delight']
/** Things that happened to the animal; idle beats (asks and delights) never play over them. */
const FOREGROUND: readonly ActionKind[] = ['poke', 'pet', 'row', 'hum']
/** Seconds between a poke's end and the ask that answers it. */
const POKE_ANSWER_GAP = 0.25

export type Action = {
  name: string
  /** Seconds at speed 1. */
  duration: number
  /** u runs 0 to 1 over the action; amp scales it (0.85 to 1.15); glance is -1 or 1, a side picked per play. */
  sample(u: number, amp: number, glance: number, out: Pose): void
}

export type Personality = {
  animal: AnimalKey
  /** Resting life: breathing, sway, twitches. */
  idle(t: number, phase: number, out: Pose): void
  blinkEvery: [number, number]
  blinkLength: number
  /** How fast the head turns toward what it watches (an exponential approach rate, per second). */
  look: number
  /** Seconds after a pattern rings before this animal answers it, so they never move on the same frame. */
  humDelay: number
  /** Gap range between idle beats: asks while cold, delights once warm. */
  askEvery: [number, number]
  delightEvery: [number, number]
  poke: Action[]
  pet: Action[]
  row: Action[]
  hum: Action[]
  ask: Action[]
  delight: Action[]
}

const TAU = Math.PI * 2

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** 0 → 1 → 0 between a and b. */
export function hump(u: number, a = 0, b = 1): number {
  if (u <= a || u >= b) return 0
  return Math.sin(((u - a) / (b - a)) * Math.PI)
}

/** 0 → 1 between a and b, eased. */
export function ramp(u: number, a: number, b: number): number {
  const k = clamp01((u - a) / (b - a))
  return k * k * (3 - 2 * k)
}

/** Up over `edge`, held, down over `edge`: a pose held from a to b. */
export function hold(u: number, a = 0, b = 1, edge = 0.15): number {
  return ramp(u, a, a + edge) * (1 - ramp(u, b - edge, b))
}

/** `cycles` wiggles between a and b, fading in and out. */
export function shake(u: number, cycles: number, a = 0, b = 1): number {
  if (u <= a || u >= b) return 0
  const k = (u - a) / (b - a)
  return Math.sin(k * cycles * TAU) * Math.sin(k * Math.PI)
}

/** `n` bounces between a and b (always up). */
export function hops(u: number, n: number, a = 0, b = 1): number {
  if (u <= a || u >= b) return 0
  return Math.abs(Math.sin(((u - a) / (b - a)) * n * Math.PI))
}

/** Shared by everyone: a look to one side and back. */
const glance: Action = {
  name: 'glance',
  duration: 1.4,
  sample(u, amp, side, out) {
    out.headYaw += hold(u, 0.1, 0.9) * 0.45 * side * amp
    out.headPitch -= hold(u, 0.1, 0.9) * 0.05
  },
}

// --- the bunny: quick, twitchy, light; its ears and its hops are the funny parts ---

const bunny: Personality = {
  animal: 'bunny',
  idle(t, phase, out) {
    out.squash += Math.sin(t * TAU * 1.15 + phase) * 0.02
    out.headRoll += Math.sin(t * TAU * 0.23 + phase) * 0.06
    const twitch = (t + phase) % 2.6
    if (twitch < 0.3) out.headPitch += Math.abs(Math.sin(twitch * TAU * 11)) * 0.035
  },
  blinkEvery: [2.2, 4.6],
  blinkLength: 0.08,
  look: 6,
  humDelay: 0.06,
  askEvery: [3.2, 5.5],
  delightEvery: [5, 11],
  poke: [
    {
      name: 'brr-shake',
      duration: 0.8,
      sample(u, k, _, out) {
        out.twist += shake(u, 6) * 0.25 * k
        out.earL += shake(u, 6) * 0.5 * k
        out.earR -= shake(u, 6) * 0.5 * k
        out.hug += hold(u) * 0.3
        out.shut += hold(u, 0.05, 0.9) * 0.7
      },
    },
    {
      name: 'chatter-hops',
      duration: 0.9,
      sample(u, k, _, out) {
        out.lift += hops(u, 3, 0, 0.7) * 1.2 * k
        out.headPitch += shake(u, 9) * 0.06 * k
        out.squash += hold(u) * 0.08
        out.hug += hold(u) * 0.4
      },
    },
    {
      name: 'curl-tight',
      duration: 1.1,
      sample(u, k, _, out) {
        const h = hold(u, 0.05, 0.9)
        out.squash += h * 0.14 * k
        out.headPitch += h * 0.3
        out.earL += h * 0.6
        out.earR += h * 0.6
        out.hug += h * 0.5
        out.shut += hold(u, 0.1, 0.85) * 0.9
      },
    },
  ],
  pet: [
    {
      name: 'binky',
      duration: 0.8,
      sample(u, k, side, out) {
        out.lift += hump(u, 0.15, 0.75) * 4.5 * k
        out.twist += hump(u, 0.15, 0.75) * 0.9 * side * k
        out.squash += hump(u, 0, 0.15) * 0.14 - hump(u, 0.15, 0.75) * 0.06 + hump(u, 0.75, 1) * 0.12
        out.earL -= hump(u, 0.15, 0.75) * 0.4
        out.earR -= hump(u, 0.15, 0.75) * 0.4
      },
    },
    {
      name: 'ear-wiggle',
      duration: 1.0,
      sample(u, k, _, out) {
        out.earL += shake(u, 4) * 0.6 * k
        out.earR -= shake(u, 4) * 0.6 * k
        out.headRoll += shake(u, 2) * 0.12 * k
        out.shut += hold(u, 0.1, 0.9) * 0.45
      },
    },
    {
      name: 'foot-thump',
      duration: 0.9,
      sample(u, k, _, out) {
        out.lean -= hold(u, 0, 0.85) * 0.12
        out.lift += (hump(u, 0.2, 0.4) + hump(u, 0.5, 0.7)) * 1.2 * k
        out.squash += (hump(u, 0.38, 0.5) + hump(u, 0.68, 0.8)) * 0.12
        out.armL += hold(u, 0, 0.85) * 0.5
        out.armR += hold(u, 0, 0.85) * 0.5
      },
    },
  ],
  row: [
    {
      name: 'peek-hop',
      duration: 0.7,
      sample(u, k, _, out) {
        out.lift += hump(u, 0.1, 0.6) * 2.2 * k
        out.earL -= hump(u) * 0.5
        out.earR -= hump(u) * 0.5
        out.headYaw += hump(u) * 0.35
      },
    },
    {
      name: 'paws-up',
      duration: 0.9,
      sample(u, k, _, out) {
        const h = hold(u, 0.05, 0.8)
        out.armL += h * 1.1 * k
        out.armR += h * 1.1 * k
        out.headPitch -= h * 0.15
        out.squash -= h * 0.06
      },
    },
  ],
  hum: [
    {
      name: 'triple-nod',
      duration: 0.9,
      sample(u, k, _, out) {
        out.headPitch += hops(u, 3) * 0.22 * k
        out.lift += hops(u, 3) * 0.8
      },
    },
    {
      name: 'ear-sway',
      duration: 1.2,
      sample(u, k, _, out) {
        const s = Math.sin(u * 2 * TAU) * hump(u)
        out.earL += s * 0.5 * k
        out.earR -= s * 0.5 * k
        out.roll += s * 0.08
      },
    },
  ],
  ask: [
    {
      name: 'point-to-basket',
      duration: 2.2,
      sample(u, k, _, out) {
        out.headPitch -= hold(u, 0, 0.4) * 0.12
        out.earL -= hold(u, 0, 0.4) * 0.3
        out.earR -= hold(u, 0, 0.4) * 0.3
        out.headYaw += hold(u, 0.35, 0.95, 0.12) * 0.75 * k
        out.armR += hold(u, 0.4, 0.9, 0.12) * 1.5 * k
        out.roll -= hold(u, 0.4, 0.9) * 0.08
      },
    },
    {
      name: 'hopeful-shuffle',
      duration: 1.8,
      sample(u, k, _, out) {
        out.lift += hops(u, 4, 0.1, 0.7) * 0.9 * k
        out.headYaw += hold(u, 0.1, 0.9) * 0.55 * k
        out.twist += hold(u, 0.1, 0.9) * 0.2
        out.hug += hold(u, 0.1, 0.9) * 0.2
      },
    },
  ],
  delight: [
    {
      name: 'ear-flick',
      duration: 0.5,
      sample(u, k, side, out) {
        if (side > 0) out.earR += hump(u) * 0.8 * k
        else out.earL += hump(u) * 0.8 * k
        out.headRoll += hump(u) * 0.05 * side
      },
    },
    {
      name: 'sniff-air',
      duration: 1.2,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.9)
        out.headPitch -= h * 0.25 * k - shake(u, 8, 0.2, 0.8) * 0.04
        out.lean -= h * 0.05
        out.earL -= h * 0.3
        out.earR -= h * 0.3
      },
    },
    {
      name: 'scratch',
      duration: 1.1,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.9)
        out.roll += h * 0.18 * k
        out.armL += h * 1.6 + shake(u, 7, 0.2, 0.8) * 0.2
        out.headRoll += h * 0.25
        out.shut += hold(u, 0.2, 0.8) * 0.6
      },
    },
    glance,
  ],
}

// --- the penguin: slow and rocking; its flippers and its wobble are the funny parts ---

const penguin: Personality = {
  animal: 'penguin',
  idle(t, phase, out) {
    out.roll += Math.sin(t * TAU * 0.45 + phase) * 0.06
    out.squash += Math.sin(t * TAU * 0.4 + phase) * 0.015
    out.headPitch += Math.sin(t * TAU * 0.45 + phase + 1) * 0.05
  },
  blinkEvery: [3.2, 6.5],
  blinkLength: 0.16,
  look: 3.5,
  humDelay: 0.32,
  askEvery: [4.2, 7.5],
  delightEvery: [6, 13],
  poke: [
    {
      name: 'flipper-flurry',
      duration: 0.9,
      sample(u, k, _, out) {
        out.armL += hops(u, 6) * 0.9 * k
        out.armR += hops(u, 6, 0.04, 1) * 0.9 * k
        out.lift += hops(u, 6) * 0.4
        out.shut += hold(u) * 0.5
      },
    },
    {
      name: 'huddle-down',
      duration: 1.3,
      sample(u, k, _, out) {
        const h = hold(u, 0.05, 0.9)
        out.squash += h * 0.16 * k
        out.headPitch += h * 0.25
        out.hug += h * 0.6
        out.roll += shake(u, 8, 0.1, 0.9) * 0.04
        out.shut += hold(u, 0.1, 0.85) * 0.8
      },
    },
  ],
  pet: [
    {
      name: 'flap-hop',
      duration: 0.9,
      sample(u, k, _, out) {
        out.armL += hops(u, 4, 0, 0.8) * 1.1 * k
        out.armR += hops(u, 4, 0, 0.8) * 1.1 * k
        out.lift += hump(u, 0.2, 0.7) * 1.8 * k
      },
    },
    {
      name: 'proud-puff',
      duration: 1.4,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.85)
        out.squash -= h * 0.1 * k
        out.lean -= h * 0.14
        out.armL += h * 0.7
        out.armR += h * 0.7
        out.headPitch -= h * 0.2
        out.shut += hold(u, 0.3, 0.8) * 0.8
      },
    },
    {
      name: 'belly-wobble',
      duration: 1.2,
      sample(u, k, _, out) {
        out.roll += shake(u, 3) * 0.2 * k
        out.squash += shake(u, 6) * 0.05
        out.headRoll -= shake(u, 3) * 0.1
      },
    },
  ],
  row: [
    {
      name: 'flipper-clap',
      duration: 0.8,
      sample(u, k, _, out) {
        const clap = (hump(u, 0, 0.35) + hump(u, 0.4, 0.75)) * 0.9 * k
        out.armL += clap
        out.armR += clap
        out.headPitch -= hump(u) * 0.1
      },
    },
    {
      name: 'tiptoe-peer',
      duration: 1.2,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.85)
        out.squash -= h * 0.08 * k
        out.lift += h * 0.6
        out.headYaw += h * 0.4 * k
        out.lean += h * 0.1
      },
    },
  ],
  hum: [
    {
      name: 'side-rock',
      duration: 1.4,
      sample(u, k, _, out) {
        const s = Math.sin(u * 2 * TAU) * hump(u)
        out.roll += s * 0.16 * k
        out.headRoll -= s * 0.08
      },
    },
    {
      name: 'flipper-beat',
      duration: 1.0,
      sample(u, k, _, out) {
        out.armL += hops(u, 3) * 0.6 * k
        out.armR += hops(u, 3, 0.1, 1) * 0.6 * k
        out.headPitch += hops(u, 3) * 0.08
      },
    },
  ],
  ask: [
    {
      name: 'point-flipper',
      duration: 2.4,
      sample(u, k, _, out) {
        out.headPitch -= hold(u, 0, 0.35) * 0.1
        out.headYaw += hold(u, 0.3, 0.95, 0.12) * 0.65 * k
        out.armR += hold(u, 0.35, 0.9, 0.1) * 1.3 * k
        out.roll -= hold(u, 0.35, 0.9) * 0.1
      },
    },
    {
      name: 'foot-to-foot',
      duration: 2.0,
      sample(u, k, _, out) {
        out.roll += Math.sin(u * 4 * TAU) * 0.12 * hump(u) * k
        out.headYaw += hold(u, 0.1, 0.9) * 0.5 * k
        out.hug += hold(u, 0.1, 0.9) * 0.4
      },
    },
  ],
  delight: [
    {
      name: 'preen',
      duration: 1.4,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.9)
        out.headYaw -= h * 0.7 * k
        out.headPitch += h * 0.35 + shake(u, 6, 0.3, 0.8) * 0.05
        out.headRoll += h * 0.2
        out.armL += h * 0.3
      },
    },
    {
      name: 'stretch-tall',
      duration: 1.6,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.8)
        out.squash -= h * 0.12 * k
        out.armL += h * 1.3
        out.armR += h * 1.3
        out.headPitch -= h * 0.3
        out.shut += h * 0.9
      },
    },
    {
      name: 'wing-shake',
      duration: 0.8,
      sample(u, k, _, out) {
        out.armL += hops(u, 5) * 0.5 * k
        out.armR += hops(u, 5) * 0.5 * k
        out.roll += shake(u, 5) * 0.08
      },
    },
    glance,
  ],
}

// --- the fox: smooth and sly; its tail and its head tilts are the funny parts ---

const fox: Personality = {
  animal: 'fox',
  idle(t, phase, out) {
    out.squash += Math.sin(t * TAU * 0.7 + phase) * 0.014
    out.tail += Math.sin(t * TAU * 0.35 + phase) * 0.35
    out.headRoll += Math.sin(t * TAU * 0.13 + phase) * 0.08
  },
  blinkEvery: [2.8, 5.5],
  blinkLength: 0.22,
  look: 5,
  humDelay: 0.18,
  askEvery: [3.8, 6.8],
  delightEvery: [5.5, 12],
  poke: [
    {
      name: 'tail-wrap',
      duration: 1.2,
      sample(u, k, _, out) {
        const h = hold(u, 0.05, 0.9)
        out.tail -= h * 0.8 * k
        out.squash += h * 0.1
        out.headPitch += h * 0.2
        out.earL += h * 0.5
        out.earR += h * 0.5
        out.shut += hold(u, 0.15, 0.85) * 0.8
      },
    },
    {
      name: 'sneeze',
      duration: 0.9,
      sample(u, k, _, out) {
        out.headPitch += (hump(u, 0.55, 0.8) * 0.5 - hump(u, 0, 0.55) * 0.3) * k
        out.lean += hump(u, 0.55, 0.8) * 0.12
        out.shut += hold(u, 0.35, 0.85)
        out.earL += hump(u, 0.55, 0.9) * 0.6
        out.earR += hump(u, 0.55, 0.9) * 0.6
      },
    },
  ],
  pet: [
    {
      name: 'head-tilt',
      duration: 1.2,
      sample(u, k, side, out) {
        const h = hold(u, 0.05, 0.9)
        out.headRoll += h * 0.45 * side * k
        out.earL -= h * 0.3
        out.earR -= h * 0.3
        out.shut += hold(u, 0.3, 0.7) * 0.5
      },
    },
    {
      name: 'play-bow',
      duration: 1.2,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.8)
        out.lean += h * 0.25 * k
        out.lift -= h * 1.5
        out.tail += shake(u, 4, 0.1, 0.9) * 0.6
        out.headPitch -= h * 0.2
      },
    },
    {
      name: 'tail-swish',
      duration: 0.9,
      sample(u, k, _, out) {
        out.tail += shake(u, 3) * 0.9 * k
        out.roll += shake(u, 3) * 0.05
      },
    },
  ],
  row: [
    {
      name: 'ears-prick',
      duration: 0.7,
      sample(u, k, _, out) {
        out.earL -= hump(u) * 0.6 * k
        out.earR -= hump(u) * 0.6 * k
        out.headYaw += hump(u) * 0.3
        out.lift += hump(u, 0.1, 0.5) * 0.8
      },
    },
    {
      name: 'paw-tap',
      duration: 0.9,
      sample(u, k, _, out) {
        out.armL += (hump(u, 0, 0.35) + hump(u, 0.45, 0.8)) * 0.9 * k
        out.headPitch += hump(u) * 0.12
      },
    },
  ],
  hum: [
    {
      name: 'tail-conduct',
      duration: 1.4,
      sample(u, k, _, out) {
        const s = Math.sin(u * 3 * TAU) * hump(u)
        out.tail += s * 0.6 * k
        out.headRoll += s * 0.08
      },
    },
    {
      name: 'head-bop',
      duration: 0.9,
      sample(u, k, _, out) {
        out.headPitch += hops(u, 3) * 0.18 * k
        out.headRoll += shake(u, 1.5) * 0.1
      },
    },
  ],
  ask: [
    {
      name: 'nose-point',
      duration: 2.3,
      sample(u, k, _, out) {
        out.headPitch -= hold(u, 0, 0.35) * 0.08
        out.headRoll += hold(u, 0, 0.35) * 0.2
        out.headYaw += hold(u, 0.3, 0.95, 0.12) * 0.7 * k
        out.lean += hold(u, 0.35, 0.9) * 0.1
        out.tail += hold(u, 0.35, 0.9) * 0.4
      },
    },
    {
      name: 'sidelong-sigh',
      duration: 1.9,
      sample(u, k, _, out) {
        const h = hold(u, 0.15, 0.85)
        out.headYaw += h * 0.5 * k
        out.shut += h * 0.45
        out.squash += hump(u, 0.6, 1) * 0.07
        out.earL += h * 0.4
      },
    },
  ],
  delight: [
    {
      name: 'ear-swivel',
      duration: 1.0,
      sample(u, k, _, out) {
        out.earL += shake(u, 2) * 0.6 * k
        out.earR -= shake(u, 2, 0.1, 1) * 0.6 * k
      },
    },
    {
      name: 'stretch-yawn',
      duration: 2.0,
      sample(u, k, _, out) {
        const front = hold(u, 0.05, 0.6)
        out.lean += front * 0.2 * k
        out.lift -= front * 0.8
        out.tail += front * 0.5
        out.headPitch -= hold(u, 0.4, 0.9) * 0.35
        out.shut += hold(u, 0.4, 0.9)
      },
    },
    {
      name: 'mouse-pounce',
      duration: 1.2,
      sample(u, k, _, out) {
        const crouch = hold(u, 0, 0.4)
        out.lift += hump(u, 0.4, 0.8) * 3 * k - crouch * 1.2
        out.lean += crouch * 0.12 - hump(u, 0.4, 0.8) * 0.1
        out.tail += hump(u, 0, 0.4) * 0.4
      },
    },
    glance,
  ],
}

// --- the bear: big, slow and heavy; its belly and its arms are the funny parts ---

const bear: Personality = {
  animal: 'bear',
  idle(t, phase, out) {
    out.squash += Math.sin(t * TAU * 0.28 + phase) * 0.03
    out.roll += Math.sin(t * TAU * 0.18 + phase) * 0.035
  },
  blinkEvery: [3.8, 7],
  blinkLength: 0.26,
  look: 2.2,
  humDelay: 0.48,
  askEvery: [5, 8.5],
  delightEvery: [7, 15],
  poke: [
    {
      name: 'big-shudder',
      duration: 1.1,
      sample(u, k, _, out) {
        out.roll += shake(u, 5) * 0.08 * k
        out.twist += shake(u, 5) * 0.06
        out.hug += hold(u) * 0.4
        out.shut += hold(u, 0.1, 0.9) * 0.6
      },
    },
    {
      name: 'rub-arms',
      duration: 1.4,
      sample(u, k, _, out) {
        out.hug += hold(u, 0.05, 0.95) * 0.5
        out.armL += shake(u, 4) * 0.35 * k
        out.armR -= shake(u, 4) * 0.35 * k
        out.headPitch += hold(u) * 0.15
      },
    },
  ],
  pet: [
    {
      name: 'belly-pat',
      duration: 1.4,
      sample(u, k, _, out) {
        const h = hold(u, 0.05, 0.9)
        out.armL += h * 0.5 + hops(u, 4, 0.15, 0.85) * 0.35 * k
        out.hug += h * 0.35
        out.lean -= h * 0.1
        out.shut += hold(u, 0.2, 0.8) * 0.7
      },
    },
    {
      name: 'rock-back-giggle',
      duration: 1.3,
      sample(u, k, _, out) {
        out.lean -= hump(u) * 0.3 * k
        out.headPitch -= hump(u) * 0.2
        out.squash += shake(u, 6, 0.2, 0.8) * 0.04
      },
    },
    {
      name: 'slow-wave',
      duration: 1.8,
      sample(u, k, _, out) {
        out.armR += hold(u, 0.05, 0.9) * 2.2 * k + shake(u, 3, 0.2, 0.85) * 0.25
        out.headRoll += shake(u, 2, 0.1, 0.9) * 0.1
      },
    },
  ],
  row: [
    {
      name: 'slow-nod',
      duration: 1.2,
      sample(u, k, _, out) {
        out.headPitch += hump(u, 0.1, 0.9) * 0.3 * k
        out.squash += hump(u, 0.5, 0.9) * 0.05
      },
    },
    {
      name: 'paws-together',
      duration: 1.3,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.85)
        out.hug += h * 0.6 * k
        out.armL += h * 0.6
        out.armR += h * 0.6
        out.headYaw += h * 0.3
      },
    },
  ],
  hum: [
    {
      name: 'heavy-sway',
      duration: 1.8,
      sample(u, k, side, out) {
        const s = Math.sin(u * TAU) * hump(u) * side
        out.roll += s * 0.14 * k
        out.twist += s * 0.12
        out.squash += hops(u, 2) * 0.05
      },
    },
    {
      name: 'belly-bounce',
      duration: 1.2,
      sample(u, k, _, out) {
        out.squash += hops(u, 3) * 0.08 * k
        out.lift += hops(u, 3) * 0.6
        out.hug += hold(u) * 0.3
      },
    },
  ],
  ask: [
    {
      name: 'hold-out-paws',
      duration: 2.8,
      sample(u, k, _, out) {
        const h = hold(u, 0.3, 0.9)
        out.headPitch -= hold(u, 0, 0.3) * 0.1
        out.armL += h * 1.3 * k
        out.armR += h * 1.3 * k
        out.headYaw += hold(u, 0.25, 0.95) * 0.55 * k
        out.lean += h * 0.08
      },
    },
    {
      name: 'sigh-slump',
      duration: 2.2,
      sample(u, k, _, out) {
        const h = hold(u, 0.2, 0.9)
        out.squash += h * 0.1 * k
        out.headPitch += h * 0.25
        out.shut += hold(u, 0.3, 0.8) * 0.6
        out.headYaw += hold(u, 0, 0.5) * 0.4
      },
    },
  ],
  delight: [
    {
      name: 'sleepy-nod',
      duration: 2.0,
      sample(u, k, _, out) {
        const drift = ramp(u, 0, 0.75) * (1 - ramp(u, 0.75, 0.85))
        out.headPitch += drift * 0.35 * k
        out.shut += ramp(u, 0.2, 0.75) * (1 - ramp(u, 0.75, 0.82))
      },
    },
    {
      name: 'ear-scratch',
      duration: 1.6,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.9)
        out.armL += h * 2.4 * k + shake(u, 6, 0.25, 0.8) * 0.2
        out.headRoll += h * 0.25
        out.shut += hold(u, 0.25, 0.8) * 0.7
      },
    },
    {
      name: 'big-stretch',
      duration: 2.2,
      sample(u, k, _, out) {
        const h = hold(u, 0.1, 0.8)
        out.armL += h * 2.6 * k
        out.armR += h * 2.6 * k
        out.squash -= h * 0.08
        out.lean -= h * 0.12
        out.shut += hold(u, 0.2, 0.8)
      },
    },
    glance,
  ],
}

export const PERSONALITIES: Record<AnimalKey, Personality> = { bunny, penguin, fox, bear }

/** A small seeded generator, so a run is reproducible and two directors drift apart. */
function seeded(seed: number): () => number {
  let a = (seed * 0x9e3779b1) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Slot = { action: Action | null; start: number; amp: number; speed: number; side: number; last: string }

/** One animal's motion over time: triggered actions, idle beats, blinks, all summed into one pose. */
export class MotionDirector {
  readonly personality: Personality
  private readonly random: () => number
  private readonly slots: Record<ActionKind, Slot>
  private readonly phase: number
  private nextBeat = Number.NaN
  private nextBlink = Number.NaN
  private blinkAt = Number.NEGATIVE_INFINITY
  private double = false

  constructor(animal: AnimalKey, seed: number) {
    this.personality = PERSONALITIES[animal]
    this.random = seeded(seed)
    this.phase = this.random() * TAU
    const slot = (): Slot => ({ action: null, start: 0, amp: 1, speed: 1, side: 1, last: '' })
    this.slots = { poke: slot(), pet: slot(), row: slot(), hum: slot(), ask: slot(), delight: slot() }
  }

  /** Start a variant of `kind` at `now + delay`; returns its name. */
  trigger(kind: ActionKind, now: number, delay = 0): string {
    const choices = this.personality[kind]
    const slot = this.slots[kind]
    let index = Math.floor(this.random() * choices.length)
    if (choices.length > 1 && choices[index].name === slot.last) index = (index + 1 + Math.floor(this.random() * (choices.length - 1))) % choices.length
    const action = choices[index]
    slot.action = action
    slot.last = action.name
    slot.start = now + delay
    slot.amp = 0.85 + this.random() * 0.3
    slot.speed = 0.9 + this.random() * 0.2
    slot.side = this.random() < 0.5 ? -1 : 1
    if (kind !== 'delight') this.slots.delight.action = null
    if (kind !== 'delight' && kind !== 'ask') this.slots.ask.action = null
    // A poke is the child asking "what's wrong?": once the shiver ends, the cold animal answers with an ask.
    if (kind === 'poke') this.nextBeat = slot.start + action.duration / slot.speed + POKE_ANSWER_GAP
    return action.name
  }

  /** The variant of `kind` playing (or waiting to start) at `now`, if any. */
  playing(kind: ActionKind, now: number): string | null {
    const slot = this.slots[kind]
    if (!slot.action) return null
    return (now - slot.start) * slot.speed < slot.action.duration ? slot.action.name : null
  }

  busy(now: number): boolean {
    for (const kind of ACTION_KINDS) if (this.playing(kind, now)) return true
    return false
  }

  /**
   * The pose at `now`, written into `out`. `quiet` (walking, dancing, hoping,
   * watching the knitting) holds idle beats back; `chilly` picks asks over delights.
   */
  sample(now: number, quiet: boolean, chilly: boolean, out: Pose): Pose {
    resetPose(out)
    const p = this.personality
    p.idle(now, this.phase, out)

    const gaps = chilly ? p.askEvery : p.delightEvery
    const lo = gaps[0]
    const hi = gaps[1]
    if (Number.isNaN(this.nextBeat)) this.nextBeat = now + lo + this.random() * (hi - lo)
    if (quiet) {
      this.slots.ask.action = null
      this.slots.delight.action = null
      this.nextBeat = Math.max(this.nextBeat, now + lo * 0.5)
    } else if (now >= this.nextBeat) {
      let foreground = false
      for (const kind of FOREGROUND) if (this.playing(kind, now)) foreground = true
      if (!foreground && !this.playing('ask', now) && !this.playing('delight', now)) {
        this.trigger(chilly ? 'ask' : 'delight', now)
        this.nextBeat = now + lo + this.random() * (hi - lo)
      }
    }

    for (const kind of ACTION_KINDS) {
      const slot = this.slots[kind]
      const action = slot.action
      if (!action) continue
      const u = ((now - slot.start) * slot.speed) / action.duration
      if (u >= 1) slot.action = null
      else if (u >= 0) action.sample(u, slot.amp, slot.side, out)
    }

    if (Number.isNaN(this.nextBlink) || now >= this.nextBlink) {
      if (!Number.isNaN(this.nextBlink)) {
        this.blinkAt = now
        this.double = this.random() < 0.2
      }
      this.nextBlink = now + p.blinkEvery[0] + this.random() * (p.blinkEvery[1] - p.blinkEvery[0])
    }
    const b = now - this.blinkAt
    const length = p.blinkLength
    let blink = b >= 0 && b < length ? Math.sin((b / length) * Math.PI) : 0
    if (this.double && b >= length * 1.6 && b < length * 2.6) blink = Math.max(blink, Math.sin(((b - length * 1.6) / length) * Math.PI))
    out.shut = clamp01(out.shut + blink)
    return out
  }
}
