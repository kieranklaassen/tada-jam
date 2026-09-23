import type { CreatureKind } from './creatures'

// Motion personalities for the three visitors. The frog sits still and then
// explodes: its throat and long legs do the talking. The sparrow is quick and
// nervous: head snaps, tail flicks, wings. The tanuki is slow, heavy and
// asleep, and wakes grudgingly: belly, tail, yawns. Each has its own idle
// life, travel gait, several answers to a poke, a cheer for a plot blooming
// nearby, an arrival, and rare delights. A director per visitor picks
// variants without repeating, varies their size and speed a little,
// staggers shared moments by temperament, and never plays a delight while
// anything else is happening. Pure: the view maps a pose onto parts.

/** Additive offsets from the resting pose. Angles in radians. */
export type MotionPose = {
  /** Body height, sideways step, and step along its own facing, in body heights. */
  lift: number
  shift: number
  advance: number
  /** 0 faces where it rests, 1 turns the whole visitor toward the child. */
  face: number
  /** Positive squashes down and out, negative stretches up. */
  squash: number
  /** Body pitch (positive tips the nose down), roll, and extra yaw. */
  lean: number
  roll: number
  spin: number
  /** Head angles (the frog's head is its eyes); positive pitch looks down. */
  headPitch: number
  headYaw: number
  headRoll: number
  /** 1 open, 0 shut; blinks multiply it. */
  eyes: number
  /** Tanuki: 0 asleep with its eyes shut, 1 wide awake. */
  awake: number
  /** Tanuki: 0 standing, 1 curled up. */
  curl: number
  /** Tanuki mouth: 0 shut, 1 a full yawn. */
  mouth: number
  /** Frog throat balloon, 0 flat. */
  throat: number
  /** Frog tongue, 0 in, 1 all the way out. */
  tongue: number
  /** Frog hind legs, 0 tucked to 1 flung out behind, left and right. */
  legs: [number, number]
  /** Sparrow wings, how far each is spread. */
  wings: [number, number]
  /** Sparrow tail cock (positive up); tanuki tail sweep (sideways). */
  tail: number
  /** Tanuki ears flicked back, left and right. */
  ears: [number, number]
}

export type ActionKind = 'poke' | 'cheer' | 'arrive' | 'delight'

type Pair = 'legs' | 'wings' | 'ears'
export type PoseDelta = Partial<Omit<MotionPose, Pair>> & Partial<Record<Pair, [number, number]>>

export type Action<N extends string = string> = {
  name: N
  duration: number
  /** t runs 0 to 1 over the action; amp scales it (about 0.85 to 1.15); side is -1 or 1. */
  sample(t: number, amp: number, side: number): PoseDelta
}

export type PokeName = 'spin-leap' | 'croak-puff' | 'belly-flop' | 'startle-hover' | 'scold' | 'hop-back' | 'yawn-stretch' | 'roll-over' | 'peek-and-burrow'

export type Personality = {
  kind: CreatureKind
  idle(now: number, phase: number): PoseDelta
  /** The travel gait, one cycle per hop, wingbeat or waddle step; landing 0..1 blends a flight into its flare. */
  travel(cycle: number, landing: number): PoseDelta
  blinkEvery: [number, number]
  blinkLength: number
  delightEvery: [number, number]
  /** Seconds before this visitor notices a shared moment (a plot blooming). */
  cueDelay: [number, number]
  poke: readonly Action<PokeName>[]
  cheer: readonly Action[]
  arrive: readonly Action[]
  delight: readonly Action[]
}

// --- shaping helpers ---------------------------------------------------------------

const TAU = Math.PI * 2
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
/** Linear 0 to 1 over [a, b]. */
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
/** 0 outside [a, b], rising to 1 and back as a smooth hump. */
const hump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI))
/** Smooth 0 to 1 over [a, b]. */
const ramp = (t: number, a: number, b: number) => {
  const k = span(t, a, b)
  return k * k * (3 - 2 * k)
}
/** Rise over [a, b], hold, fall over [c, d]. */
const hold = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))
/** A decaying wobble after time a. */
const wobble = (t: number, a: number, rate: number, decay: number) => (t < a ? 0 : Math.sin((t - a) * rate) * Math.exp(-(t - a) * decay))
const both = (v: number): [number, number] => [v, v]
const oneSide = (side: number, v: number): [number, number] => (side < 0 ? [v, 0] : [0, v])

function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453
  return x - Math.floor(x)
}
/** Where the sparrow's head snaps on its nth look. */
const lookYaw = (n: number) => (hash(n) - 0.5) * 1.6
const lookRoll = (n: number) => (hash(n + 40) - 0.5) * 0.9

// --- frog: still, then springy; throat and long legs ----------------------------------

const frog: Personality = {
  kind: 'frog',
  idle: (now, phase) => {
    const burst = (now * 0.24 + phase) % 1
    return {
      squash: Math.sin(now * 3.1 + phase) * 0.02,
      throat: burst < 0.38 ? Math.max(0, Math.sin((burst / 0.38) * Math.PI * 3)) * 0.5 : 0,
    }
  },
  travel: (cycle) => {
    const u = cycle - Math.floor(cycle)
    if (u < 0.28) {
      const crouch = hump(u, 0, 0.28)
      return { squash: 0.3 * crouch, lean: -0.15 * crouch }
    }
    const air = (u - 0.28) / 0.72
    const stretch = Math.sin(air * Math.PI)
    return { squash: -0.25 * stretch, lean: -0.5 * (1 - air) + 0.35 * air, legs: both(stretch) }
  },
  blinkEvery: [2.6, 5.5],
  blinkLength: 0.16,
  delightEvery: [5, 10],
  cueDelay: [0.35, 0.8],
  poke: [
    {
      name: 'spin-leap',
      duration: 1.25,
      sample: (t, amp) => {
        const squat = t < 0.13 ? hump(t, 0, 0.26) : 0
        const up = hump(t, 0.13, 0.56)
        const land = Math.max(0, t - 0.56) * 1.25
        return {
          lift: up * 1.5 * amp,
          spin: ramp(t, 0.13, 0.56) * TAU,
          lean: -0.4 * up,
          squash: 0.4 * squat - 0.3 * up + (t > 0.56 ? 0.3 * Math.exp(-land * 10) * Math.cos(land * 26) : 0),
          legs: both(up),
          throat: hump(t, 0.62, 0.96) * 1.1,
        }
      },
    },
    {
      name: 'croak-puff',
      duration: 1.4,
      sample: (t, amp) => {
        const puff = (hump(t, 0.06, 0.42) + hump(t, 0.5, 0.9)) * amp
        const tall = hold(t, 0, 0.08, 0.9, 1)
        return { face: tall * 0.8, throat: puff * 1.4, squash: -puff * 0.07 - tall * 0.08, lean: -tall * 0.15, headPitch: -tall * 0.2, eyes: 1 - puff * 0.55 }
      },
    },
    {
      name: 'belly-flop',
      duration: 1.3,
      sample: (t, amp) => {
        const hop = hump(t, 0.12, 0.42)
        const flat = hold(t, 0.4, 0.45, 0.72, 0.88)
        const splay = hold(t, 0.14, 0.3, 0.72, 0.88) * 1.25
        return {
          lift: hop * 1.1 * amp,
          lean: hop * 0.35 - hump(t, 0, 0.12) * 0.2,
          squash: hump(t, 0, 0.12) * 0.3 - hop * 0.15 + flat * 0.45 + wobble(t, 0.45, 40, 7) * 0.12,
          legs: both(splay),
          roll: wobble(t, 0.45, 32, 5) * 0.12,
          eyes: 1 - hold(t, 0.42, 0.46, 0.6, 0.7) * 0.85,
        }
      },
    },
  ],
  cheer: [
    {
      name: 'double-bounce',
      duration: 0.9,
      sample: (t, amp) => {
        const hops = hump(t, 0.04, 0.4) + hump(t, 0.5, 0.86)
        return { lift: hops * 0.75 * amp, squash: -hops * 0.12 + (hump(t, 0.38, 0.5) + hump(t, 0.84, 0.96)) * 0.22, legs: both(hops * 0.7), lean: -hops * 0.15 }
      },
    },
    {
      name: 'throat-drum',
      duration: 1.2,
      sample: (t, amp) => {
        const tall = hump(t, 0, 1)
        return { throat: Math.abs(Math.sin(t * Math.PI * 7)) * 0.9 * tall * amp, lean: -tall * 0.18, headPitch: -tall * 0.18, squash: -tall * 0.06 }
      },
    },
  ],
  arrive: [
    {
      name: 'land-and-look',
      duration: 1.4,
      sample: (t) => {
        const s = t * 1.4
        return {
          squash: 0.3 * Math.exp(-s * 9) * Math.cos(s * 28),
          spin: 0.45 * hump(t, 0.2, 0.55) - 0.45 * hump(t, 0.55, 0.9),
          headPitch: -hump(t, 0.2, 0.9) * 0.12,
          throat: hump(t, 0.75, 0.98) * 0.6,
        }
      },
    },
  ],
  delight: [
    {
      name: 'fly-snap',
      duration: 1.2,
      sample: (t) => {
        const look = hold(t, 0, 0.2, 0.45, 0.6)
        return {
          headPitch: -look * 0.35,
          lean: -look * 0.18,
          tongue: hump(t, 0.34, 0.5),
          throat: hump(t, 0.55, 0.8) * 0.7,
          squash: hump(t, 0.55, 0.8) * 0.12,
          eyes: 1 - hold(t, 0.55, 0.6, 0.7, 0.8) * 0.9,
        }
      },
    },
    {
      name: 'turn-hop',
      duration: 1,
      sample: (t, _amp, side) => {
        const hops = hump(t, 0.05, 0.35) + hump(t, 0.6, 0.9)
        return {
          lift: hops * 0.6,
          spin: side * 0.9 * ramp(t, 0.05, 0.35) * (1 - ramp(t, 0.6, 0.9)),
          legs: both(hops * 0.8),
          squash: -hops * 0.1 + (hump(t, 0.33, 0.45) + hump(t, 0.88, 1)) * 0.15,
        }
      },
    },
    {
      name: 'sink-low',
      duration: 1.8,
      sample: (t) => {
        const low = hold(t, 0.05, 0.3, 0.7, 0.95)
        return { squash: low * 0.3, lean: low * 0.12, eyes: 1 - low * 0.45, headPitch: -low * 0.25, throat: Math.max(0, Math.sin(t * 30)) * 0.25 * low }
      },
    },
    {
      name: 'leg-stretch',
      duration: 1.5,
      sample: (t, _amp, side) => {
        const out = hold(t, 0.1, 0.35, 0.6, 0.85)
        return { legs: oneSide(side, out * 1.4), lean: -out * 0.1, roll: side * out * 0.12, eyes: 1 - hold(t, 0.3, 0.38, 0.55, 0.62) * 0.8 }
      },
    },
  ],
}

// --- sparrow: quick, nervous; head snaps, tail flicks, wings --------------------------

const sparrow: Personality = {
  kind: 'sparrow',
  idle: (now, phase) => {
    const beat = now / 0.62 + phase
    const look = Math.floor(beat)
    const snap = ramp(beat - look, 0, 0.12)
    const flick = (now * 0.71 + phase) % 1
    return {
      squash: -Math.sin(now * 11 + phase) * 0.02,
      headYaw: lookYaw(look - 1) + (lookYaw(look) - lookYaw(look - 1)) * snap,
      headRoll: lookRoll(look - 1) + (lookRoll(look) - lookRoll(look - 1)) * snap,
      tail: hump(flick, 0, 0.09) * 0.6,
    }
  },
  travel: (cycle, landing) => {
    const beat = Math.sin(cycle * TAU) * 0.5 + 0.5
    const wing = (0.2 + 0.9 * beat) * (1 - landing) + landing * (1.2 + 0.2 * Math.sin((cycle * TAU) / 3))
    return { wings: both(wing), lean: 0.35 * (1 - landing) - 0.55 * landing, tail: 0.35 * landing, lift: Math.sin(cycle * 1.53) * 0.15 * (1 - landing) }
  },
  blinkEvery: [1.4, 3.2],
  blinkLength: 0.06,
  delightEvery: [3.5, 7],
  cueDelay: [0.05, 0.3],
  poke: [
    {
      name: 'startle-hover',
      duration: 1.3,
      sample: (t, amp) => {
        const s = t * 1.3
        const up = ramp(t, 0, 0.154) * (1 - ramp(t, 0.42, 0.73))
        const beat = up > 0.02 ? 0.3 + 0.9 * (Math.sin(s * TAU * 12) * 0.5 + 0.5) : 0
        return {
          lift: up * 1.5 * amp,
          shift: Math.sin(s * 19) * 0.15 * up,
          wings: both(beat),
          lean: -0.35 * up,
          tail: 0.4 * up,
          headRoll: t > 0.73 ? Math.sin((t - 0.73) * 65) * 0.5 * (1 - span(t, 0.73, 1)) : 0,
        }
      },
    },
    {
      // Turns to face the child and tells them off: hopping on the spot, tail cocked high, wings flicking.
      name: 'scold',
      duration: 1.3,
      sample: (t, amp) => {
        const on = hold(t, 0, 0.1, 0.85, 1)
        const chit = Math.abs(Math.sin(t * Math.PI * 10))
        return {
          face: on * 0.9,
          tail: on * 1.3 * amp,
          wings: both(chit * 1.1 * on),
          lift: chit * 0.45 * on,
          headPitch: (chit - 0.5) * 0.7 * on,
          lean: -on * 0.3,
          squash: (0.5 - chit) * 0.12 * on,
        }
      },
    },
    {
      // Two hops back along the terrace, a head-cocked look at the finger, and two hops home.
      name: 'hop-back',
      duration: 1.4,
      sample: (t, amp, side) => {
        const away = ramp(t, 0.02, 0.16) + ramp(t, 0.19, 0.33)
        const home = ramp(t, 0.66, 0.8) + ramp(t, 0.83, 0.97)
        const hops = hump(t, 0.02, 0.16) + hump(t, 0.19, 0.33) + hump(t, 0.66, 0.8) + hump(t, 0.83, 0.97)
        const eye = hold(t, 0.34, 0.4, 0.58, 0.64)
        return {
          advance: -(away - home) * 1.1 * amp,
          lift: hops * 0.6,
          wings: both(hops * 0.5),
          face: eye * 0.7,
          headYaw: side * eye * 0.4,
          headRoll: side * eye * 0.6,
          squash: -hops * 0.08,
        }
      },
    },
  ],
  cheer: [
    {
      name: 'wing-flutter',
      duration: 0.9,
      sample: (t, amp) => {
        const on = hump(t, 0, 1)
        return { wings: both(Math.abs(Math.sin(t * Math.PI * 14)) * 0.95 * on * amp), lift: Math.abs(Math.sin(t * Math.PI * 3)) * 0.45 * on, tail: on * 0.45, lean: -on * 0.15 }
      },
    },
    {
      name: 'sing',
      duration: 1.5,
      sample: (t) => {
        const on = hold(t, 0, 0.1, 0.85, 1)
        return { headPitch: -on * 0.65, squash: -on * 0.08 + Math.sin(t * Math.PI * 16) * 0.03 * on, tail: -on * 0.4, wings: both(on * 0.18), lean: -on * 0.2 }
      },
    },
  ],
  arrive: [
    {
      name: 'flare-and-fluff',
      duration: 1.1,
      sample: (t) => {
        const fold = 1 - ramp(t, 0, 0.3)
        const fluff = hump(t, 0.35, 0.75)
        return { wings: both(fold * 1.2), lean: -0.55 * fold, squash: fluff * 0.12, roll: Math.sin(t * 70) * 0.12 * fluff, tail: 0.35 * fold + hump(t, 0.8, 0.95) * 0.7 }
      },
    },
  ],
  delight: [
    {
      name: 'peck-peck',
      duration: 1,
      sample: (t) => {
        const peck = hump(t, 0, 0.2) + hump(t, 0.3, 0.5) + hump(t, 0.62, 0.82)
        return { lean: peck * 0.75, headPitch: peck * 0.3, tail: peck * 0.3 }
      },
    },
    {
      name: 'preen',
      duration: 1.6,
      sample: (t, _amp, side) => {
        const turned = hold(t, 0, 0.18, 0.75, 0.92)
        const nibble = Math.sin(t * 45) * 0.15 * hold(t, 0.18, 0.22, 0.72, 0.75)
        return { headYaw: side * turned * 2.1, headPitch: turned * 0.35 + nibble, wings: oneSide(side, turned * 0.45), roll: -side * turned * 0.12 }
      },
    },
    {
      name: 'fluff-shake',
      duration: 0.8,
      sample: (t) => {
        const on = hump(t, 0.08, 0.85)
        return { roll: Math.sin(t * 75) * 0.22 * on, squash: -hump(t, 0, 0.9) * 0.1, wings: both(on * 0.3), tail: Math.sin(t * 75 + 1) * 0.35 * on }
      },
    },
    {
      name: 'hop-turn',
      duration: 1,
      sample: (t, _amp, side) => {
        const hops = hump(t, 0.04, 0.32) + hump(t, 0.62, 0.9)
        return { lift: hops * 0.8, spin: side * 2.5 * ramp(t, 0.04, 0.32) * (1 - ramp(t, 0.62, 0.9)), wings: both(hops * 0.45), squash: -hops * 0.08 }
      },
    },
  ],
}

// --- tanuki: slow, heavy, asleep; belly, tail, yawns ----------------------------------

const tanuki: Personality = {
  kind: 'tanuki',
  idle: (now, phase) => ({
    curl: 1,
    squash: -Math.sin((now / 2.8) * TAU + phase) * 0.035,
    tail: Math.sin(now * 0.7 + phase) * 0.08,
    headRoll: hump((now / 9.2 + phase) % 1, 0, 0.02) * 0.12,
  }),
  travel: (cycle) => {
    const step = cycle * TAU
    return { roll: Math.sin(step) * 0.14, lift: Math.abs(Math.cos(step)) * 0.08, headPitch: Math.sin(step * 2) * 0.06, headRoll: -Math.sin(step) * 0.08, tail: -Math.sin(step) * 0.5, awake: 1 }
  },
  blinkEvery: [3.5, 7],
  blinkLength: 0.24,
  delightEvery: [7, 15],
  cueDelay: [1, 2.2],
  poke: [
    {
      name: 'yawn-stretch',
      duration: 2.8,
      sample: (t, amp) => {
        const wake = ramp(t, 0, 0.107) * (1 - ramp(t, 0.786, 1))
        const yawn = hump(t, 0.16, 0.607) * amp
        return {
          curl: -wake,
          awake: wake * (1 - hump(t, 0.2, 0.58)) * (1 - hump(t, 0.68, 0.73)),
          headPitch: -0.45 * yawn - wake * 0.1,
          squash: -0.2 * wake - 0.06 * yawn,
          lean: -0.12 * yawn,
          mouth: yawn,
          ears: both(yawn * 0.4),
        }
      },
    },
    {
      name: 'roll-over',
      duration: 2.6,
      sample: (t, _amp, side) => {
        const over = hold(t, 0.1, 0.34, 0.66, 0.9)
        const wiggle = Math.sin(t * 28) * 0.14 * hold(t, 0.34, 0.4, 0.6, 0.66)
        return {
          curl: -hold(t, 0.04, 0.16, 0.8, 0.95),
          roll: side * over * 2.6 + wiggle,
          lift: (1 - Math.cos(over * 2.6)) * 0.5,
          awake: over * 0.9,
          mouth: over * 0.3,
          tail: Math.sin(t * 32) * 0.45 * over,
          ears: both(over * 0.3),
        }
      },
    },
    {
      name: 'peek-and-burrow',
      duration: 2.2,
      sample: (t, _amp, side) => {
        const peek = hold(t, 0.05, 0.14, 0.4, 0.5)
        const burrow = hold(t, 0.52, 0.62, 0.84, 1)
        return {
          face: peek * 0.85,
          awake: peek * (1 - hump(t, 0.26, 0.32)),
          curl: -peek * 0.55,
          headPitch: -peek * 0.18 + burrow * 0.25,
          headYaw: side * peek * 0.3,
          squash: burrow * 0.18,
          tail: burrow * 1.1,
          roll: Math.sin(t * 50) * 0.1 * hump(t, 0.52, 0.74),
          ears: both(peek * 0.7 - burrow * 0.25),
        }
      },
    },
  ],
  cheer: [
    {
      name: 'tail-sweep',
      duration: 1.3,
      sample: (t, amp) => ({ tail: Math.sin(t * Math.PI * 4) * 0.55 * hump(t, 0, 1) * amp, ears: [hump(t, 0, 0.45) * 0.5, hump(t, 0.1, 0.55) * 0.5], squash: -hump(t, 0, 1) * 0.05 }),
    },
    {
      name: 'sleepy-smile',
      duration: 1.8,
      sample: (t) => {
        const on = hold(t, 0, 0.2, 0.75, 1)
        return { mouth: on * 0.35, awake: on * 0.3, squash: -on * 0.1, lean: -on * 0.1, curl: -on * 0.15, ears: both(on * 0.25) }
      },
    },
  ],
  arrive: [
    {
      name: 'circle-and-curl',
      duration: 2.3,
      sample: (t) => ({
        spin: ramp(t, 0, 0.7) * TAU * 2,
        roll: Math.sin(t * 2.3 * TAU * 2.4) * 0.1 * (1 - ramp(t, 0.6, 0.72)),
        curl: -(1 - ramp(t, 0.56, 1)),
        awake: 1 - ramp(t, 0.66, 0.8),
      }),
    },
  ],
  delight: [
    {
      name: 'dream-paddle',
      duration: 1.6,
      sample: (t) => {
        const on = hump(t, 0, 1)
        return { roll: Math.sin(t * 45) * 0.04 * on, ears: [Math.sin(t * 31) * 0.3 * on, Math.sin(t * 27 + 1) * 0.3 * on], mouth: hump(t, 0.3, 0.7) * 0.15, tail: Math.sin(t * 20) * 0.2 * on }
      },
    },
    { name: 'ear-flick', duration: 0.7, sample: (t, _amp, side) => ({ ears: oneSide(side, wobble(t, 0.05, 40, 6) * 0.8), headRoll: hump(t, 0, 0.5) * 0.06 * side }) },
    {
      name: 'big-sigh',
      duration: 2.2,
      sample: (t) => {
        const out = hump(t, 0.5, 1)
        return { squash: -hump(t, 0, 0.45) * 0.12 + out * 0.08, mouth: hump(t, 0.5, 0.9) * 0.2, headPitch: -hump(t, 0, 0.45) * 0.08 + out * 0.06, ears: both(-out * 0.15) }
      },
    },
    {
      name: 'resettle',
      duration: 2,
      sample: (t, _amp, side) => ({
        awake: hold(t, 0.1, 0.2, 0.5, 0.6) * 0.3,
        lift: hump(t, 0.1, 0.5) * 0.25,
        curl: -hump(t, 0.1, 0.55) * 0.35,
        spin: side * Math.sin(t * Math.PI) * 0.6,
        squash: hump(t, 0.6, 0.8) * 0.1 + wobble(t, 0.75, 20, 6) * 0.04,
      }),
    },
  ],
}

export const PERSONALITIES: Record<CreatureKind, Personality> = { frog, sparrow, tanuki }

// --- director ------------------------------------------------------------------------

const KINDS: readonly ActionKind[] = ['poke', 'cheer', 'arrive', 'delight']

export function restPose(): MotionPose {
  return { lift: 0, shift: 0, advance: 0, face: 0, squash: 0, lean: 0, roll: 0, spin: 0, headPitch: 0, headYaw: 0, headRoll: 0, eyes: 1, awake: 0, curl: 0, mouth: 0, throat: 0, tongue: 0, legs: [0, 0], wings: [0, 0], tail: 0, ears: [0, 0] }
}

// Field by field on purpose: a computed-key loop (pose[key] += …) boxes every
// number it writes, three visitors × every field × every frame.
export function resetPose(p: MotionPose): void {
  p.lift = p.shift = p.advance = p.face = p.squash = p.lean = p.roll = p.spin = 0
  p.headPitch = p.headYaw = p.headRoll = p.awake = p.curl = p.mouth = p.throat = p.tongue = p.tail = 0
  p.eyes = 1
  p.legs[0] = p.legs[1] = p.wings[0] = p.wings[1] = p.ears[0] = p.ears[1] = 0
}

export function addPose(p: MotionPose, d: PoseDelta, w = 1): void {
  if (d.lift !== undefined) p.lift += d.lift * w
  if (d.shift !== undefined) p.shift += d.shift * w
  if (d.advance !== undefined) p.advance += d.advance * w
  if (d.face !== undefined) p.face += d.face * w
  if (d.squash !== undefined) p.squash += d.squash * w
  if (d.lean !== undefined) p.lean += d.lean * w
  if (d.roll !== undefined) p.roll += d.roll * w
  if (d.spin !== undefined) p.spin += d.spin * w
  if (d.headPitch !== undefined) p.headPitch += d.headPitch * w
  if (d.headYaw !== undefined) p.headYaw += d.headYaw * w
  if (d.headRoll !== undefined) p.headRoll += d.headRoll * w
  if (d.awake !== undefined) p.awake += d.awake * w
  if (d.curl !== undefined) p.curl += d.curl * w
  if (d.mouth !== undefined) p.mouth += d.mouth * w
  if (d.throat !== undefined) p.throat += d.throat * w
  if (d.tongue !== undefined) p.tongue += d.tongue * w
  if (d.tail !== undefined) p.tail += d.tail * w
  if (d.eyes !== undefined) p.eyes *= 1 + (d.eyes - 1) * w
  if (d.legs) {
    p.legs[0] += d.legs[0] * w
    p.legs[1] += d.legs[1] * w
  }
  if (d.wings) {
    p.wings[0] += d.wings[0] * w
    p.wings[1] += d.wings[1] * w
  }
  if (d.ears) {
    p.ears[0] += d.ears[0] * w
    p.ears[1] += d.ears[1] * w
  }
}

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Playing = { action: Action; start: number; amp: number; speed: number; side: number }

/** A shared moment is dropped if the visitor is still busy this long after it would have noticed. */
const CUE_PATIENCE = 2.5
/** Seconds to ease from resting life into a travel gait (so the tanuki gets up rather than pops up). */
const TRAVEL_BLEND = 0.4

/** Picks and blends one visitor's actions over time. */
export class MotionDirector {
  readonly personality: Personality
  private readonly random: () => number
  private readonly phase: number
  private readonly playing: (Playing | null)[] = KINDS.map(() => null)
  private readonly lastName: (string | null)[] = KINDS.map(() => null)
  private readonly pose = restPose()
  private nextDelight: number
  private nextBlink: number
  private blinkA = -10
  private blinkB = -10
  private cueAt: number | null = null
  private travelSince: number | null = null

  constructor(kind: CreatureKind, seed: number, now = 0) {
    this.personality = PERSONALITIES[kind]
    this.random = seeded(seed * 7919 + 17)
    this.phase = this.random() * TAU
    this.nextDelight = now + this.between(this.personality.delightEvery)
    this.nextBlink = now + this.between(this.personality.blinkEvery)
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.random() * (max - min)
  }

  private choose<N extends string>(kind: ActionKind, options: readonly Action<N>[]): Action<N> {
    const slot = KINDS.indexOf(kind)
    const last = this.lastName[slot]
    const fresh = options.length > 1 ? options.filter((action) => action.name !== last) : options
    const action = fresh[Math.floor(this.random() * fresh.length)]
    this.lastName[slot] = action.name
    return action
  }

  private start<N extends string>(kind: ActionKind, action: Action<N>, now: number): Action<N> {
    this.playing[KINDS.indexOf(kind)] = { action, start: now, amp: 0.85 + this.random() * 0.3, speed: 0.9 + this.random() * 0.2, side: this.random() < 0.5 ? -1 : 1 }
    if (kind !== 'delight') this.playing[KINDS.indexOf('delight')] = null
    this.nextDelight = Math.max(this.nextDelight, now + this.between(this.personality.delightEvery) * 0.6)
    return action
  }

  /** Starts a variant of an action, never the same one twice in a row when there is a choice; returns its name. */
  trigger(kind: ActionKind, now: number): string {
    return this.start(kind, this.choose(kind, this.personality[kind]), now).name
  }

  /** Answers a poke; the name lets the voice match the move. */
  poke(now: number): PokeName {
    return this.start('poke', this.choose('poke', this.personality.poke), now).name
  }

  /** Something good happened nearby: cheer once this visitor notices, by its own temperament. */
  cue(now: number): void {
    this.cueAt ??= now + this.between(this.personality.cueDelay)
  }

  /** When a noticed moment will play, if one is waiting. */
  get pendingCue(): number | null {
    return this.cueAt
  }

  /** Name of the action playing for a kind, if any. */
  current(kind: ActionKind, now: number): string | null {
    const playing = this.playing[KINDS.indexOf(kind)]
    if (!playing) return null
    const elapsed = (now - playing.start) * playing.speed
    return elapsed >= 0 && elapsed < playing.action.duration ? playing.action.name : null
  }

  busy(now: number): boolean {
    return this.current('poke', now) !== null || this.current('arrive', now) !== null || this.current('cheer', now) !== null
  }

  /**
   * The pose at `now`. While travelling, pass the gait cycle (and a flying
   * arrival's landing blend): the gait replaces idle life and nothing new
   * starts. The returned pose is reused by the next call.
   */
  sample(now: number, travel: number | null = null, landing = 0): MotionPose {
    const pose = this.pose
    resetPose(pose)
    const p = this.personality
    const travelling = travel !== null
    if (travelling) {
      this.travelSince ??= now
      const k = ramp(now - this.travelSince, 0, TRAVEL_BLEND)
      if (k < 1) addPose(pose, p.idle(now, this.phase), 1 - k)
      addPose(pose, p.travel(travel, landing), k)
    } else {
      this.travelSince = null
      addPose(pose, p.idle(now, this.phase))
    }

    if (!travelling && this.cueAt !== null && now >= this.cueAt) {
      if (!this.busy(now)) {
        this.trigger('cheer', now)
        this.cueAt = null
      } else if (now - this.cueAt > CUE_PATIENCE) this.cueAt = null
    }
    if (now >= this.nextDelight) {
      if (!travelling && !this.busy(now)) this.trigger('delight', now)
      this.nextDelight = now + this.between(p.delightEvery)
    }

    for (let i = 0; i < KINDS.length; i++) {
      const playing = this.playing[i]
      if (!playing) continue
      const t = ((now - playing.start) * playing.speed) / playing.action.duration
      if (t >= 1 || t < 0) {
        this.playing[i] = null
        continue
      }
      addPose(pose, playing.action.sample(t, playing.amp, playing.side))
    }

    if (now >= this.nextBlink) {
      this.blinkA = now
      this.blinkB = this.random() < 0.2 ? now + p.blinkLength * 2.2 : -10
      this.nextBlink = now + this.between(p.blinkEvery)
    }
    pose.eyes = Math.max(0.06, pose.eyes * blink((now - this.blinkA) / p.blinkLength) * blink((now - this.blinkB) / p.blinkLength))
    return pose
  }
}

/** Eye openness k of the way through one blink. */
function blink(k: number): number {
  return k >= 0 && k < 1 ? 1 - Math.sin(k * Math.PI) * 0.92 : 1
}
