// Each doll's motion as plain numbers (no three.js). Who a doll is decides
// its tempo, its weight and its funniest part, and every action it plays is
// its own: Pip is curious and springy (her arms and her twirl), Moss is tall,
// slow and gentle (his cap and his bow), Bean is small and can't keep still
// (his pom-pom and his spins). A director per doll picks variants without
// repeats, adds rare idle delights, blinks on its own rhythm, and answers a
// cue everyone sees at once (a topple, the kite leaving) after its own
// latency, so the room never moves as one puppet copied three times.

export type Doll = 'pip' | 'moss' | 'bean'
export type Face = 'open' | 'blink' | 'happy' | 'surprised'

/** Offsets from a doll's rest pose, added together from idle, gait and every playing action. */
export type PoseDelta = {
  /** Up from the floor, room units. */
  lift: number
  /** Sideways nudge, room units. */
  shift: number
  /** Added to the body's height scale (the view keeps the volume). */
  squash: number
  /** Lean forward about the feet, radians. */
  bow: number
  /** Lean sideways about the feet, radians. */
  roll: number
  /** Body turn added to where the doll faces, radians. */
  twist: number
  /** A whole-body twirl, radians. */
  spin: number
  headPitch: number
  headYaw: number
  headRoll: number
  /** Arm raise out to the side (0 hanging .. PI straight up). */
  raiseL: number
  raiseR: number
  /** Arm swing about the shoulder; negative swings the arm up in front. */
  forwardL: number
  forwardR: number
  face: Face | null
}

export const POSE_CHANNELS = ['lift', 'shift', 'squash', 'bow', 'roll', 'twist', 'spin', 'headPitch', 'headYaw', 'headRoll', 'raiseL', 'raiseR', 'forwardL', 'forwardR'] as const

export function blankPose(): PoseDelta {
  return { lift: 0, shift: 0, squash: 0, bow: 0, roll: 0, twist: 0, spin: 0, headPitch: 0, headYaw: 0, headRoll: 0, raiseL: 0, raiseR: 0, forwardL: 0, forwardR: 0, face: null }
}

function clear(p: PoseDelta): PoseDelta {
  for (const channel of POSE_CHANNELS) p[channel] = 0
  p.face = null
  return p
}

export type Action = {
  name: string
  duration: number
  /** Adds this action's pose at `t` seconds in, scaled by `amp`, into `p`. */
  sample(t: number, amp: number, p: PoseDelta): void
}

export type ActionKind = 'react' | 'cheer' | 'poke' | 'delight'

export type Personality = {
  doll: Doll
  /** Resting life: breathing tempo and sway. */
  idle(now: number, p: PoseDelta): void
  /** The gait while wandering (the watchers); Pip's route has its own gait in the view. */
  walk(now: number, p: PoseDelta): void
  blinkEvery: readonly [number, number]
  blinkLength: number
  /** How quickly the head turns toward what the doll watches, per second. */
  lookRate: number
  /** Seconds before this doll answers a cue everyone sees at once. */
  latency: number
  delightEvery: readonly [number, number]
  react: readonly Action[]
  /** Played back to back while the kite flies, one variant after another. */
  cheer: readonly Action[]
  poke: readonly Action[]
  delight: readonly Action[]
}

// ---- shaping helpers ------------------------------------------------------------

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

/** 0 before a, eases to 1 at b. */
export function ramp(t: number, a: number, b: number): number {
  const k = clamp01((t - a) / (b - a))
  return k * k * (3 - 2 * k)
}

/** A half-sine bump from a to b, 0 outside. */
export function hump(t: number, a: number, b: number): number {
  return t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI)
}

/** Eases in over [0, a], holds, eases out over [b, c]. */
export function hold(t: number, a: number, b: number, c: number): number {
  return ramp(t, 0, a) * (1 - ramp(t, b, c))
}

/** A shake that dies away. */
function wobble(t: number, speed: number, decay: number): number {
  return Math.sin(t * speed) * Math.exp(-t * decay)
}

const TAU = Math.PI * 2

// ---- Pip: curious, springy, brave ---------------------------------------------------

const pip: Personality = {
  doll: 'pip',
  idle: (now, p) => {
    p.squash += Math.sin(now * 2.4) * 0.012
  },
  walk: () => {},
  blinkEvery: [2.6, 5.2],
  blinkLength: 0.11,
  lookRate: 7,
  latency: 0.12,
  delightEvery: [5, 11],
  react: [
    {
      name: 'hands-on-cheeks',
      duration: 1.3,
      sample: (t, a, p) => {
        const k = hold(t, 0.15, 0.95, 1.3)
        p.raiseL += 1.7 * k * a
        p.raiseR += 1.7 * k * a
        p.forwardL -= 1.5 * k * a
        p.forwardR -= 1.5 * k * a
        p.squash -= 0.05 * k * a
        p.headRoll += Math.sin(t * 5) * 0.12 * k * a
        p.face = 'surprised'
      },
    },
    {
      name: 'jump-back',
      duration: 0.9,
      sample: (t, a, p) => {
        const air = hump(t, 0, 0.45)
        p.lift += air * 0.22 * a
        p.bow -= 0.24 * hold(t, 0.1, 0.5, 0.9) * a
        p.raiseL += 1.1 * air * a
        p.raiseR += 1.1 * air * a
        p.squash += (0.1 * air - 0.08 * hump(t, 0.45, 0.8)) * a
        p.face = t < 0.6 ? 'surprised' : 'open'
      },
    },
  ],
  cheer: [],
  poke: [
    {
      name: 'twirl',
      duration: 0.7,
      sample: (t, a, p) => {
        p.spin += TAU * ramp(t, 0, 0.7)
        p.lift += hump(t, 0, 0.7) * 0.18 * a
        p.raiseL += 0.9 * hump(t, 0, 0.7) * a
        p.raiseR += 0.9 * hump(t, 0, 0.7) * a
        p.face = 'happy'
      },
    },
    {
      name: 'giggle-hop',
      duration: 0.95,
      sample: (t, a, p) => {
        const air = hump(t, 0, 0.42) + hump(t, 0.48, 0.9) * 0.7
        p.lift += air * 0.18 * a
        p.squash += (air * 0.08 - hump(t, 0.4, 0.5) * 0.06) * a
        const hands = hold(t, 0.1, 0.8, 0.95)
        p.forwardL -= 1.6 * hands * a
        p.forwardR -= 1.6 * hands * a
        p.raiseL += 0.35 * hands * a
        p.raiseR += 0.35 * hands * a
        p.headPitch += 0.15 * hands * a
        p.face = 'happy'
      },
    },
    {
      name: 'shy-sway',
      duration: 1.4,
      sample: (t, a, p) => {
        const k = hold(t, 0.2, 1.1, 1.4)
        p.forwardL += 0.7 * k * a
        p.forwardR += 0.7 * k * a
        p.roll += Math.sin(t * 6.5) * 0.19 * k * a
        p.twist += 0.75 * k * a
        p.headRoll += 0.25 * k * a
        p.headPitch += 0.12 * k * a
        p.face = 'happy'
      },
    },
  ],
  delight: [
    {
      name: 'point-at-the-kite',
      duration: 1.9,
      sample: (t, a, p) => {
        const k = hold(t, 0.3, 1.4, 1.9)
        p.raiseR += 2.1 * k * a
        p.forwardR -= 1.0 * k * a
        p.headPitch -= 0.15 * k * a
        p.lift += hump(t, 1.0, 1.35) * 0.1 * a
        p.face = t > 0.9 && t < 1.5 ? 'happy' : null
      },
    },
    {
      name: 'rock-on-heels',
      duration: 1.8,
      sample: (t, a, p) => {
        const k = hold(t, 0.3, 1.5, 1.8)
        p.bow += Math.sin(t * 7) * 0.16 * k * a
        p.lift += Math.max(0, Math.sin(t * 7)) * 0.025 * k * a
        p.forwardL += 0.45 * k * a
        p.forwardR += 0.45 * k * a
      },
    },
    {
      name: 'wave-to-you',
      duration: 1.6,
      sample: (t, a, p) => {
        const k = hold(t, 0.25, 1.3, 1.6)
        p.raiseL += (1.5 + Math.sin(t * 11) * 0.35) * k * a
        p.forwardL -= 0.3 * k * a
        p.headPitch += 0.18 * k * a
        p.twist -= 0.25 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'little-dance',
      duration: 1.7,
      sample: (t, a, p) => {
        const k = hold(t, 0.2, 1.45, 1.7)
        const beat = Math.sin(t * 8)
        p.roll += beat * 0.1 * k * a
        p.lift += Math.abs(beat) * 0.05 * k * a
        p.raiseL += (0.6 + beat * 0.4) * k * a
        p.raiseR += (0.6 - beat * 0.4) * k * a
        p.face = 'happy'
      },
    },
  ],
}

// ---- Moss: tall, slow, gentle ------------------------------------------------------

const moss: Personality = {
  doll: 'moss',
  idle: (now, p) => {
    p.squash += Math.sin(now * 1.5) * 0.012
    p.roll += Math.sin(now * 0.7) * 0.015
  },
  walk: (now, p) => {
    // A waddle: each step swings the whole body round a little and rocks it over.
    const step = (now / 0.62) * Math.PI
    p.twist += Math.sin(step) * 0.28
    p.roll += Math.sin(step) * 0.07
    p.lift += Math.abs(Math.sin(step)) * 0.035
    p.forwardL += Math.sin(step) * 0.35
    p.forwardR -= Math.sin(step) * 0.35
  },
  blinkEvery: [3.8, 7.2],
  blinkLength: 0.22,
  lookRate: 3,
  latency: 0.35,
  delightEvery: [7, 14],
  react: [
    {
      name: 'peek-through-fingers',
      duration: 2.4,
      sample: (t, a, p) => {
        const cover = hold(t, 0.3, 2.0, 2.4)
        const peek = ramp(t, 1.2, 1.6)
        p.raiseL += 1.9 * cover * a
        p.raiseR += 1.9 * cover * (1 - peek) * a
        p.forwardL -= 1.5 * cover * a
        p.forwardR -= 1.5 * cover * (1 - peek) * a
        p.headPitch += 0.1 * cover * a
        p.face = peek > 0.5 ? 'surprised' : 'blink'
      },
    },
    {
      name: 'hold-the-cap',
      duration: 2.2,
      sample: (t, a, p) => {
        const k = hold(t, 0.35, 1.7, 2.2)
        p.raiseL += 2.4 * k * a
        p.raiseR += 2.4 * k * a
        p.forwardL -= 0.5 * k * a
        p.forwardR -= 0.5 * k * a
        p.bow -= 0.14 * k * a
        p.squash -= 0.05 * k * a
        p.roll += wobble(t, 9, 2.5) * 0.06 * a
        p.face = t < 1.1 ? 'surprised' : 'open'
      },
    },
    {
      name: 'slow-wince',
      duration: 2.0,
      sample: (t, a, p) => {
        const k = hold(t, 0.4, 1.4, 2.0)
        p.roll += 0.19 * k * a
        p.raiseL += 1.3 * k * a
        p.forwardL -= 1.3 * k * a
        p.headYaw += 0.5 * k * a
        p.headPitch += 0.12 * k * a
        p.face = 'blink'
      },
    },
  ],
  cheer: [
    {
      name: 'arms-up-rock',
      duration: 2.4,
      sample: (t, a, p) => {
        const k = hold(t, 0.35, 2.05, 2.4)
        const rock = Math.sin((t / 2.4) * TAU * 2)
        p.raiseL += (2.35 + rock * 0.15) * k * a
        p.raiseR += (2.35 - rock * 0.15) * k * a
        p.roll += rock * 0.1 * k * a
        p.lift += Math.max(0, Math.sin((t / 2.4) * TAU * 4)) * 0.05 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'slow-clap',
      duration: 2.5,
      sample: (t, a, p) => {
        // Arms open wide between claps and meet in front on each one, so the
        // outline changes; a clap in front of his own green coat never read.
        const k = hold(t, 0.35, 2.15, 2.5)
        const clap = 0.5 + 0.5 * Math.cos((t / 2.5) * TAU * 4)
        p.forwardL -= (0.4 + 0.85 * clap) * k * a
        p.forwardR -= (0.4 + 0.85 * clap) * k * a
        p.raiseL += (1.55 - 1.25 * clap) * k * a
        p.raiseR += (1.55 - 1.25 * clap) * k * a
        p.bow += clap * 0.12 * k * a
        p.lift += clap * 0.04 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'big-slow-wave',
      duration: 3.0,
      sample: (t, a, p) => {
        const k = hold(t, 0.4, 2.6, 3.0)
        p.raiseR += (2.7 + Math.sin((t / 3) * TAU * 2) * 0.35) * k * a
        p.forwardL -= 0.8 * k * a
        p.raiseL += 0.2 * k * a
        p.lift += 0.05 * k * a
        p.roll -= 0.06 * k * a
        p.face = 'happy'
      },
    },
  ],
  poke: [
    {
      name: 'tip-the-cap',
      duration: 1.4,
      sample: (t, a, p) => {
        const k = hump(t, 0, 1.4)
        p.bow += 0.35 * k * a
        p.raiseR += 2.2 * k * a
        p.forwardR -= 1.1 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'slow-wave',
      duration: 1.8,
      sample: (t, a, p) => {
        const k = hold(t, 0.35, 1.4, 1.8)
        p.raiseR += (1.5 + Math.sin(t * 6) * 0.35) * k * a
        p.forwardR -= 0.2 * k * a
        p.headRoll += 0.15 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'belly-chuckle',
      duration: 1.5,
      sample: (t, a, p) => {
        // Each heave of the laugh swings his arms out from his belly and back.
        const k = hold(t, 0.25, 1.1, 1.5)
        const heave = 0.5 + 0.5 * Math.sin(t * 13)
        p.forwardL -= 0.6 * k * a
        p.forwardR -= 0.6 * k * a
        p.raiseL += (0.4 + 1.15 * heave) * k * a
        p.raiseR += (0.4 + 1.15 * heave) * k * a
        p.lift += heave * 0.07 * k * a
        p.squash += (heave - 0.5) * 0.08 * k * a
        p.bow -= 0.12 * k * a
        p.headPitch -= 0.3 * k * a
        p.face = 'happy'
      },
    },
  ],
  delight: [
    {
      name: 'big-stretch',
      duration: 2.6,
      sample: (t, a, p) => {
        const k = hold(t, 0.9, 1.7, 2.6)
        p.raiseL += 2.6 * k * a
        p.raiseR += 2.6 * k * a
        p.squash += 0.05 * k * a
        p.lift += 0.04 * k * a
        p.headPitch -= 0.12 * k * a
        p.face = k > 0.6 ? 'blink' : null
      },
    },
    {
      name: 'nod-off',
      duration: 3.2,
      sample: (t, a, p) => {
        const droop = ramp(t, 0.2, 2.4) * (1 - ramp(t, 2.45, 2.6))
        p.headPitch += 0.38 * droop * a
        p.bow += 0.1 * droop * a
        p.squash -= 0.06 * droop * a
        p.lift += hump(t, 2.45, 2.85) * 0.08 * a
        p.face = t < 2.45 ? 'blink' : t < 2.9 ? 'surprised' : null
      },
    },
    {
      name: 'hum-and-sway',
      duration: 3.0,
      sample: (t, a, p) => {
        const k = hold(t, 0.5, 2.5, 3.0)
        p.roll += Math.sin(t * 2.1) * 0.1 * k * a
        p.headRoll += Math.sin(t * 2.1 + 0.5) * 0.14 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'scratch-head',
      duration: 1.9,
      sample: (t, a, p) => {
        const k = hold(t, 0.4, 1.5, 1.9)
        p.raiseR += 2.25 * k * a
        p.forwardR -= (0.5 + Math.sin(t * 14) * 0.12) * k * a
        p.headRoll -= 0.14 * k * a
      },
    },
  ],
}

// ---- Bean: small, quick, bouncy -------------------------------------------------------

const bean: Personality = {
  doll: 'bean',
  idle: (now, p) => {
    p.squash += Math.sin(now * 7) * 0.015
    // Can't keep still: a little bounce every couple of seconds.
    const hop = (now * 0.45) % 1
    if (hop < 0.12) p.lift += Math.sin((hop / 0.12) * Math.PI) * 0.12
  },
  walk: (now, p) => {
    // A wind-up scoot: a fast buzz.
    p.shift += Math.sin(now * Math.PI * 18) * 0.018
    p.roll += Math.sin(now * Math.PI * 18) * 0.05
    p.lift += Math.abs(Math.sin(now * Math.PI * 9)) * 0.03
    p.raiseL += 0.35
    p.raiseR += 0.35
  },
  blinkEvery: [1.8, 4.2],
  blinkLength: 0.08,
  lookRate: 12,
  latency: 0.03,
  delightEvery: [3.5, 8],
  react: [
    {
      name: 'startle-jump',
      duration: 0.6,
      sample: (t, a, p) => {
        const air = hump(t, 0, 0.5)
        p.lift += air * 0.5 * a
        p.squash += air * 0.12 * a
        p.raiseL += 1.25 * hold(t, 0.05, 0.45, 0.6) * a
        p.raiseR += 1.25 * hold(t, 0.05, 0.45, 0.6) * a
        p.face = 'surprised'
      },
    },
    {
      name: 'duck-and-cover',
      duration: 1.1,
      sample: (t, a, p) => {
        const k = hold(t, 0.12, 0.8, 1.1)
        p.squash -= 0.18 * k * a
        p.raiseL += 2.4 * k * a
        p.raiseR += 2.4 * k * a
        p.forwardL -= 0.4 * k * a
        p.forwardR -= 0.4 * k * a
        p.bow += 0.15 * k * a
        p.face = t < 0.8 ? 'blink' : 'surprised'
      },
    },
    {
      name: 'wobble-gasp',
      duration: 1.0,
      sample: (t, a, p) => {
        p.roll += wobble(t, 18, 3) * 0.26 * a
        p.raiseL += 0.8 * hold(t, 0.1, 0.7, 1.0) * a
        p.raiseR += 0.5 * hold(t, 0.1, 0.7, 1.0) * a
        p.lift += hump(t, 0, 0.25) * 0.06 * a
        p.face = 'surprised'
      },
    },
  ],
  cheer: [
    {
      name: 'spin-bounce',
      duration: 2.4,
      sample: (t, a, p) => {
        const k = hold(t, 0.2, 2.2, 2.4)
        const bounce = Math.abs(Math.sin((t / 2.4) * Math.PI * 6))
        p.spin += TAU * 2 * ramp(t, 0.1, 2.3)
        p.lift += bounce * 0.3 * k * a
        p.squash += (bounce * 0.14 - 0.08) * k * a
        p.raiseL += 2.45 * k * a
        p.raiseR += 2.45 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'star-jumps',
      duration: 2.0,
      sample: (t, a, p) => {
        const k = hold(t, 0.15, 1.85, 2.0)
        const air = Math.abs(Math.sin((t / 2.0) * Math.PI * 4))
        p.lift += air * 0.28 * k * a
        p.raiseL += (0.1 + 2.3 * air) * k * a
        p.raiseR += (0.1 + 2.3 * air) * k * a
        p.squash += (air - 0.5) * 0.1 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'wave-both-arms',
      duration: 2.4,
      sample: (t, a, p) => {
        const k = hold(t, 0.2, 2.2, 2.4)
        const wave = Math.sin((t / 2.4) * TAU * 3)
        p.raiseL += (2.2 + wave * 0.45) * k * a
        p.raiseR += (2.2 - wave * 0.45) * k * a
        p.lift += Math.max(0, Math.sin((t / 2.4) * TAU * 6)) * 0.1 * k * a
        p.roll += wave * 0.08 * k * a
        p.face = 'happy'
      },
    },
  ],
  poke: [
    {
      name: 'giggle-wiggle',
      duration: 0.9,
      sample: (t, a, p) => {
        const k = ramp(t, 0, 0.08) * (1 - t / 0.9)
        const shake = Math.sin(t * 30)
        p.roll += shake * 0.24 * k * a
        p.headRoll += Math.sin(t * 30 + 1) * 0.1 * k * a
        p.raiseL += (1.0 + shake * 0.45) * k * a
        p.raiseR += (1.0 - shake * 0.45) * k * a
        p.lift += Math.abs(shake) * 0.05 * k * a
        p.face = 'happy'
      },
    },
    {
      name: 'boing',
      duration: 0.85,
      sample: (t, a, p) => {
        const air = hump(t, 0.2, 0.7)
        p.squash += (air * 0.14 - hump(t, 0, 0.22) * 0.2 - hump(t, 0.7, 0.85) * 0.1) * a
        p.lift += air * 0.45 * a
        p.raiseL += air * 1.2 * a
        p.raiseR += air * 1.2 * a
        p.face = 'happy'
      },
    },
    {
      name: 'hide-and-peek',
      duration: 1.3,
      sample: (t, a, p) => {
        const away = hold(t, 0.2, 0.75, 1.05)
        p.twist += 1.4 * away * a
        p.forwardL -= 1.4 * away * a
        p.forwardR -= 1.4 * away * a
        p.raiseL += 0.3 * away * a
        p.raiseR += 0.3 * away * a
        p.headYaw -= 0.6 * hump(t, 0.55, 1.0) * a
        p.face = t < 0.75 ? 'blink' : 'happy'
      },
    },
  ],
  delight: [
    {
      name: 'hop-turn',
      duration: 1.0,
      sample: (t, a, p) => {
        p.lift += hump(t, 0, 0.5) * 0.3 * a
        p.spin += TAU * ramp(t, 0.05, 0.5)
        p.squash += (hump(t, 0, 0.5) * 0.1 - hump(t, 0.5, 0.8) * 0.1) * a
      },
    },
    {
      name: 'impatient-swing',
      duration: 1.8,
      sample: (t, a, p) => {
        const k = hold(t, 0.2, 1.55, 1.8)
        p.forwardL += Math.sin(t * 9) * 0.8 * k * a
        p.forwardR -= Math.sin(t * 9) * 0.8 * k * a
        p.lift += Math.abs(Math.sin(t * 9)) * 0.095 * k * a
      },
    },
    {
      name: 'tiptoe-peek',
      duration: 1.4,
      sample: (t, a, p) => {
        const k = hold(t, 0.25, 1.0, 1.4)
        p.lift += 0.09 * k * a
        p.squash += 0.06 * k * a
        p.headPitch -= 0.3 * k * a
        p.raiseL += 0.55 * k * a
        p.raiseR += 0.55 * k * a
        p.face = 'surprised'
      },
    },
    {
      // Quick nods that fling the pom-pom forward and back.
      name: 'pom-shake',
      duration: 0.8,
      sample: (t, a, p) => {
        const k = ramp(t, 0, 0.06) * (1 - t / 0.8)
        p.headPitch += Math.sin(t * 24) * 0.3 * k * a
        p.bow += Math.sin(t * 24) * 0.17 * k * a
        p.squash += Math.abs(Math.sin(t * 24)) * 0.03 * k * a
        p.face = 'happy'
      },
    },
  ],
}

export const PERSONALITIES: Record<Doll, Personality> = { pip, moss, bean }

// ---- the director ----------------------------------------------------------------

type Playing = { action: Action; start: number; amp: number; speed: number }

/** Seeded, so a run is reproducible and two directors drift apart. */
function random(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

/** What the doll is doing overall this frame: at rest (delights allowed), wandering, or busy with the game. */
export type Activity = 'idle' | 'walk' | 'busy'

const FOREGROUND: readonly ActionKind[] = ['react', 'cheer', 'poke']
const KINDS: readonly ActionKind[] = ['react', 'cheer', 'poke', 'delight']

export class MotionDirector {
  readonly personality: Personality
  private readonly rng: () => number
  private readonly playing: Record<ActionKind, Playing | null> = { react: null, cheer: null, poke: null, delight: null }
  private readonly last: Record<ActionKind, string | null> = { react: null, cheer: null, poke: null, delight: null }
  private cheering = false
  private cheerFrom = 0
  private nextBlink: number
  private blinkUntil = -Infinity
  private secondBlink = Infinity
  private nextDelight: number
  private readonly pose = blankPose()
  /** How many delights have started, for the tests. */
  delights = 0

  constructor(doll: Doll, seed: number, now = 0) {
    this.personality = PERSONALITIES[doll]
    this.rng = random(seed)
    this.nextBlink = now + this.between(this.personality.blinkEvery)
    this.nextDelight = now + this.between(this.personality.delightEvery)
  }

  private between([lo, hi]: readonly [number, number]): number {
    return lo + (hi - lo) * this.rng()
  }

  /** A variant of `kind`, never the one played last when there is a choice. */
  pick(kind: ActionKind): Action | null {
    const all = this.personality[kind]
    if (all.length === 0) return null
    const choices = all.length > 1 ? all.filter((a) => a.name !== this.last[kind]) : all
    const action = choices[Math.floor(this.rng() * choices.length) % choices.length]
    this.last[kind] = action.name
    return action
  }

  private start(kind: ActionKind, at: number): Playing | null {
    const action = this.pick(kind)
    if (!action) return null
    const playing = { action, start: at, amp: 0.85 + this.rng() * 0.3, speed: 0.9 + this.rng() * 0.2 }
    this.playing[kind] = playing
    return playing
  }

  /** Something happened to this doll: a poke answers at once, a reaction after the doll's latency. Returns the variant. */
  trigger(kind: 'react' | 'poke', now: number): string | null {
    this.playing.delight = null
    return this.start(kind, kind === 'react' ? now + this.personality.latency : now)?.action.name ?? null
  }

  /** The kite is flying (or has landed): cheers play back to back while it lasts, and finish their own swing after. */
  setCheering(on: boolean, now: number): void {
    if (on && !this.cheering) {
      this.cheerFrom = now + this.personality.latency
      this.playing.delight = null
    }
    this.cheering = on
  }

  /** True while a reaction, cheer or poke is still playing. */
  isBusy(now: number): boolean {
    return FOREGROUND.some((kind) => this.isPlaying(kind, now))
  }

  isPlaying(kind: ActionKind, now: number): boolean {
    return this.current(kind, now) !== null
  }

  /** The variant of `kind` playing now, if any. */
  current(kind: ActionKind, now: number): string | null {
    const p = this.playing[kind]
    return p !== null && now >= p.start && (now - p.start) * p.speed < p.action.duration ? p.action.name : null
  }

  /** The doll's pose offsets now. The returned object is reused. */
  sample(now: number, activity: Activity): PoseDelta {
    const pose = clear(this.pose)
    const personality = this.personality
    if (activity === 'walk') personality.walk(now, pose)
    else personality.idle(now, pose)

    if (this.cheering && now >= this.cheerFrom) {
      const cheer = this.playing.cheer
      if (!cheer || (now - cheer.start) * cheer.speed >= cheer.action.duration) this.start('cheer', now)
    }
    const quiet = activity !== 'idle' || this.cheering || FOREGROUND.some((kind) => this.playing[kind] !== null)
    if (quiet) this.nextDelight = Math.max(this.nextDelight, now + personality.delightEvery[0] * 0.5)
    else if (now >= this.nextDelight && !this.playing.delight) {
      const delight = this.start('delight', now)
      if (delight) this.delights += 1
      this.nextDelight = now + (delight?.action.duration ?? 0) + this.between(personality.delightEvery)
    }

    for (const kind of KINDS) {
      const playing = this.playing[kind]
      if (!playing) continue
      const t = (now - playing.start) * playing.speed
      if (t < 0) continue
      if (t >= playing.action.duration) {
        this.playing[kind] = null
        continue
      }
      playing.action.sample(t, playing.amp, pose)
    }

    if (now >= this.nextBlink) {
      this.blinkUntil = now + personality.blinkLength
      this.secondBlink = this.rng() < 0.2 ? now + personality.blinkLength * 2.4 : Infinity
      this.nextBlink = now + this.between(personality.blinkEvery)
    }
    if (now >= this.secondBlink) {
      this.blinkUntil = now + personality.blinkLength
      this.secondBlink = Infinity
    }
    if (now < this.blinkUntil && (pose.face === null || pose.face === 'open')) pose.face = 'blink'
    return pose
  }
}
