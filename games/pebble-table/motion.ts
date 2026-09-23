// Motion personalities. Every guest species moves like itself: the rabbit
// is quick and twitchy, the bear cub slow and heavy, the hedgehog tiny and
// shy. Each has its own idle life, several variants of every action (react
// to a stone, eat, being poked, arriving), and rare delights (a yawn, a
// sneeze, a glance at a neighbour). A director per guest picks variants
// without repeating, randomizes timing and amplitude, and never plays a
// delight while something else is happening. Pure: the view maps a pose
// onto clay parts.

export type Species = 'rabbit' | 'bear' | 'hedgehog'

/** Seat order around the table (top, right, and so on). */
export const SEAT_SPECIES: readonly Species[] = ['bear', 'rabbit', 'hedgehog', 'bear', 'hedgehog']

/** Additive offsets from the resting pose. Angles in radians, lengths in the guest's own units. */
export type MotionPose = {
  lift: number
  /** Positive squashes down and out, negative stretches up. */
  squash: number
  lean: number
  roll: number
  twist: number
  headPitch: number
  headYaw: number
  headRoll: number
  /** How far the head sinks into the body (curling up). */
  headDrop: number
  /** Arm raise (outward) and forward swing, left and right. */
  armUp: [number, number]
  armForward: [number, number]
  /** Ear angle back (positive) or forward, left and right. */
  ears: [number, number]
  /** 1 open, 0 shut; multiplies the blink. */
  eyes: number
  mouth: number
  nose: number
  cheeks: number
  quills: number
}

export type ActionKind = 'react' | 'eat' | 'poke' | 'arrive' | 'delight'

type PoseDelta = Partial<Omit<MotionPose, 'armUp' | 'armForward' | 'ears'>> & {
  armUp?: [number, number]
  armForward?: [number, number]
  ears?: [number, number]
}

export type Action = {
  name: string
  duration: number
  /** t runs 0 to 1 over the action; amp scales it (about 0.85 to 1.15). */
  sample(t: number, amp: number, glance: number): PoseDelta
}

export type Personality = {
  species: Species
  /** Mouth width relative to the shared mouth shape. */
  mouthWidth: number
  idle(now: number, phase: number): PoseDelta
  blinkEvery: [number, number]
  blinkLength: number
  /** Head-turn spring toward what the guest looks at. */
  look: { stiffness: number; damping: number }
  /** How the guest reaches for the bowl while there is something to share, and how quickly it responds (higher is quicker). */
  reach(amount: number, now: number, phase: number): PoseDelta
  reachResponse: number
  delightEvery: [number, number]
  react: Action[]
  eat: Action[]
  poke: Action[]
  arrive: Action[]
  delight: Action[]
}

// --- shaping helpers ------------------------------------------------------------

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
/** 0 outside [a, b], rising to 1 and back as a smooth hump. */
const hump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI))
/** Smooth 0 to 1 over [a, b]. */
const ramp = (t: number, a: number, b: number) => {
  const k = clamp01((t - a) / (b - a))
  return k * k * (3 - 2 * k)
}
/** Rise over [a, b], hold, fall over [c, d]. */
const hold = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))
/** n chomps between a and b: 1 when shut, 0 when open. */
const chomps = (t: number, n: number, a = 0, b = 1) => (t < a || t > b ? 0 : Math.abs(Math.sin(((t - a) / (b - a)) * Math.PI * n)))
/** A decaying wobble after time a. */
const wobble = (t: number, a: number, rate: number, decay: number) => (t < a ? 0 : Math.sin((t - a) * rate) * Math.exp(-(t - a) * decay))

// --- rabbit: quick, twitchy, all ears and nose ----------------------------------

const rabbit: Personality = {
  species: 'rabbit',
  mouthWidth: 0.9,
  idle: (now, phase) => ({
    squash: -Math.sin(now * 2.7 + phase) * 0.018,
    nose: Math.sin(now * 19) * hump((now + phase) % 1.9, 0, 0.45),
    ears: [Math.sin(now * 1.3 + phase) * 0.05, Math.sin(now * 1.1 + phase + 2) * 0.05],
    headRoll: Math.sin(now * 0.9 + phase) * 0.04,
  }),
  blinkEvery: [2.2, 4.8],
  blinkLength: 0.08,
  look: { stiffness: 120, damping: 11 },
  reach: (k, now) => ({ squash: -k * 0.12, lift: k * 0.5, headPitch: -k * 0.18, ears: [-k * 0.4 + Math.sin(now * 9) * 0.1 * k, -k * 0.4 - Math.sin(now * 8) * 0.1 * k], armUp: [k * 0.5, k * 0.5], nose: Math.sin(now * 30) * k }),
  reachResponse: 9,
  delightEvery: [5, 11],
  react: [
    {
      name: 'twitch-hop',
      duration: 0.75,
      sample: (t, amp) => ({
        lift: (hump(t, 0.05, 0.35) * 2.2 + hump(t, 0.4, 0.66) * 1.3) * amp,
        squash: (-hump(t, 0.05, 0.35) * 0.1 + hump(t, 0.34, 0.42) * 0.14 + hump(t, 0.64, 0.74) * 0.12) * amp,
        ears: [hump(t, 0.05, 0.4) * 0.5, hump(t, 0.1, 0.45) * 0.55],
        armUp: [hump(t, 0.05, 0.66) * 0.4, hump(t, 0.05, 0.66) * 0.4],
      }),
    },
    {
      name: 'thump',
      duration: 0.8,
      sample: (t, amp) => ({
        squash: (hump(t, 0, 0.12) * 0.18 + wobble(t, 0.12, 30, 7) * 0.05) * amp,
        lean: -hump(t, 0.05, 0.6) * 0.16 * amp,
        ears: [-hump(t, 0, 0.7) * 0.35, -hump(t, 0, 0.7) * 0.35],
        eyes: 1 + hump(t, 0, 0.5) * 0.2,
        nose: Math.sin(t * 60) * hump(t, 0.1, 0.8),
      }),
    },
    {
      name: 'binky',
      duration: 0.7,
      sample: (t, amp) => ({
        lift: hump(t, 0.08, 0.6) * 3 * amp,
        twist: Math.sin(clamp01((t - 0.1) / 0.5) * Math.PI * 2) * 0.35 * hump(t, 0.1, 0.6) * amp,
        roll: hump(t, 0.2, 0.5) * 0.2 * amp,
        squash: (-hump(t, 0.08, 0.6) * 0.08 + hump(t, 0.58, 0.7) * 0.15) * amp,
        ears: [hump(t, 0.1, 0.6) * 0.7, hump(t, 0.15, 0.62) * 0.6],
      }),
    },
  ],
  eat: [
    {
      name: 'nibble',
      duration: 1.5,
      sample: (t) => ({
        headPitch: 0.1 + (1 - chomps(t, 8, 0.1, 0.9)) * 0.08 * hump(t, 0.05, 0.95),
        mouth: (1 - chomps(t, 8, 0.1, 0.9)) * hump(t, 0.05, 0.95) * 0.7,
        nose: Math.sin(t * 90) * hump(t, 0, 1),
        cheeks: hump(t, 0.1, 0.95) * 0.5,
        lift: Math.abs(Math.sin(t * Math.PI * 4)) * 0.45 * hump(t, 0.05, 0.95),
        ears: [-hump(t, 0, 1) * 0.2 + Math.sin(t * 20) * 0.12 * hump(t, 0, 1), -hump(t, 0, 1) * 0.2 - Math.sin(t * 17) * 0.12 * hump(t, 0, 1)],
      }),
    },
    {
      name: 'hold-and-nibble',
      duration: 1.7,
      sample: (t) => ({
        armForward: [hold(t, 0, 0.12, 0.85, 1) * 1.2, hold(t, 0, 0.12, 0.85, 1) * 1.2],
        armUp: [-hold(t, 0, 0.12, 0.85, 1) * 0.3, -hold(t, 0, 0.12, 0.85, 1) * 0.3],
        headPitch: 0.22 * hold(t, 0, 0.12, 0.85, 1),
        mouth: (1 - chomps(t, 6, 0.15, 0.85)) * hold(t, 0.1, 0.15, 0.8, 0.85) * 0.6,
        nose: Math.sin(t * 80) * hold(t, 0, 0.1, 0.9, 1),
        ears: [0.25 * hold(t, 0, 0.2, 0.8, 1), 0.3 * hold(t, 0, 0.2, 0.8, 1)],
        squash: hump(t, 0.9, 1) * 0.06,
      }),
    },
  ],
  poke: [
    {
      name: 'giggle',
      duration: 0.9,
      sample: (t, amp) => ({
        roll: Math.sin(t * 55) * 0.09 * hump(t, 0, 1) * amp,
        lift: Math.abs(Math.sin(t * Math.PI * 4)) * 0.9 * hump(t, 0, 1) * amp,
        squash: Math.abs(Math.sin(t * 28)) * 0.07 * hump(t, 0, 1),
        headRoll: Math.sin(t * 30) * 0.12 * hump(t, 0, 1),
        eyes: 1 - hump(t, 0, 1) * 0.75,
        ears: [Math.sin(t * 22) * 0.4 * hump(t, 0, 1), -Math.sin(t * 22) * 0.4 * hump(t, 0, 1)],
        mouth: hump(t, 0.05, 0.95) * 0.6,
      }),
    },
    {
      name: 'startle',
      duration: 0.8,
      sample: (t, amp) => ({
        lift: hump(t, 0, 0.35) * 2.6 * amp,
        squash: (-hump(t, 0, 0.35) * 0.14 + hump(t, 0.33, 0.45) * 0.14 + wobble(t, 0.45, 25, 6) * 0.04) * amp,
        ears: [-hump(t, 0, 0.9) * 0.5, -hump(t, 0, 0.9) * 0.5],
        eyes: 1 + hump(t, 0, 0.6) * 0.3,
        armUp: [hump(t, 0, 0.4) * 0.9, hump(t, 0, 0.4) * 0.9],
      }),
    },
  ],
  arrive: [
    {
      name: 'bounce-in',
      duration: 0.8,
      sample: (t) => ({ lift: hump(t, 0, 0.45) * 3 + hump(t, 0.5, 0.75) * 1.1, squash: hump(t, 0.43, 0.52) * 0.15 + hump(t, 0.74, 0.84) * 0.1, ears: [hump(t, 0, 0.8) * 0.5, hump(t, 0, 0.8) * 0.5] }),
    },
  ],
  delight: [
    { name: 'ear-flick', duration: 0.6, sample: (t) => ({ ears: [wobble(t, 0.05, 40, 7) * 0.7, 0], headRoll: hump(t, 0, 0.5) * 0.08 }) },
    {
      name: 'sniff-the-air',
      duration: 1.3,
      sample: (t) => ({ lean: hump(t, 0, 1) * 0.12, headPitch: -hump(t, 0, 1) * 0.28, nose: Math.sin(t * 110) * hump(t, 0.05, 0.95), lift: hump(t, 0.1, 0.9) * 0.4 }),
    },
    {
      name: 'scratch',
      duration: 1.2,
      sample: (t) => ({ armUp: [0, hold(t, 0, 0.15, 0.8, 1) * 1.5], armForward: [0, Math.sin(t * 45) * 0.25 * hold(t, 0.15, 0.2, 0.75, 0.8)], headRoll: hold(t, 0, 0.2, 0.8, 1) * 0.25, eyes: 1 - hold(t, 0.15, 0.25, 0.75, 0.85) * 0.8 }),
    },
    { name: 'glance', duration: 1.1, sample: (t, _amp, glance) => ({ headYaw: glance * 0.5 * hold(t, 0, 0.15, 0.7, 0.9), ears: [glance * 0.2 * hump(t, 0, 1), -glance * 0.2 * hump(t, 0, 1)] }) },
  ],
}

// --- bear cub: slow, heavy, content ---------------------------------------------

const bear: Personality = {
  species: 'bear',
  mouthWidth: 1.5,
  idle: (now, phase) => ({
    squash: -Math.sin(now * 1.15 + phase) * 0.032,
    roll: Math.sin(now * 0.55 + phase) * 0.045,
    headRoll: Math.sin(now * 0.55 + phase + 0.6) * 0.06,
    headPitch: Math.sin(now * 0.35 + phase) * 0.03,
  }),
  blinkEvery: [3.8, 7],
  blinkLength: 0.2,
  look: { stiffness: 32, damping: 7 },
  reach: (k, now) => ({ lean: k * 0.14, armForward: [k * 1.4, k * 1.3 + Math.sin(now * 2.2) * 0.1 * k], armUp: [-k * 0.2, -k * 0.2], headPitch: k * 0.08, mouth: k * 0.2 }),
  reachResponse: 2.2,
  delightEvery: [7, 15],
  react: [
    {
      name: 'belly-pat',
      duration: 1.5,
      sample: (t) => ({
        armUp: [Math.max(0, Math.sin(t * Math.PI * 6)) * 0.9 * hump(t, 0.05, 0.9), Math.max(0, Math.sin(t * Math.PI * 6 + 0.4)) * 0.9 * hump(t, 0.05, 0.9)],
        armForward: [hump(t, 0.05, 0.9) * 0.6, hump(t, 0.05, 0.9) * 0.6],
        squash: Math.max(0, -Math.sin(t * Math.PI * 6)) * 0.07 * hump(t, 0.05, 0.9),
        lean: -hump(t, 0, 1) * 0.08,
        eyes: 1 - hold(t, 0.2, 0.35, 0.75, 0.9) * 0.6,
        mouth: hold(t, 0.2, 0.35, 0.75, 0.9) * 0.35,
      }),
    },
    {
      name: 'heavy-bounce',
      duration: 1.2,
      sample: (t, amp) => ({
        squash: (hump(t, 0, 0.18) * 0.12 - hump(t, 0.18, 0.5) * 0.06 + hump(t, 0.5, 0.62) * 0.2 + wobble(t, 0.62, 14, 3.5) * 0.06) * amp,
        lift: hump(t, 0.18, 0.52) * 1.4 * amp,
        armUp: [hump(t, 0.1, 0.6) * 0.5, hump(t, 0.12, 0.62) * 0.5],
      }),
    },
    {
      name: 'happy-rock',
      duration: 1.6,
      sample: (t, amp) => ({ roll: Math.sin(t * Math.PI * 4) * 0.16 * hump(t, 0, 1) * amp, headRoll: -Math.sin(t * Math.PI * 4 - 0.5) * 0.12 * hump(t, 0, 1), eyes: 1 - hump(t, 0.1, 0.9) * 0.5, mouth: hump(t, 0.1, 0.9) * 0.3 }),
    },
  ],
  eat: [
    {
      name: 'big-chomps-and-sigh',
      duration: 2.4,
      sample: (t) => ({
        headPitch: -hump(t, 0, 0.1) * 0.25 + (0.1 + chomps(t, 3, 0.1, 0.6) * 0.3) * hold(t, 0.08, 0.12, 0.58, 0.62) - hold(t, 0.65, 0.75, 0.9, 1) * 0.25,
        mouth: (1 - chomps(t, 3, 0.1, 0.6)) * hold(t, 0.08, 0.12, 0.58, 0.62),
        cheeks: hold(t, 0.1, 0.2, 0.6, 0.7) * 1.1,
        roll: Math.sin(t * Math.PI * 3) * 0.07 * hold(t, 0.1, 0.15, 0.55, 0.6),
        squash: chomps(t, 3, 0.1, 0.6) * 0.05 * hold(t, 0.08, 0.12, 0.58, 0.62) - hold(t, 0.62, 0.75, 0.85, 1) * 0.12,
        lean: -hold(t, 0.62, 0.75, 0.85, 1) * 0.2,
        armUp: [hold(t, 0.62, 0.75, 0.85, 1) * 0.5, hold(t, 0.62, 0.75, 0.85, 1) * 0.5],
        eyes: 1 - hold(t, 0.64, 0.72, 0.9, 1),
      }),
    },
    {
      name: 'chomp-and-pat',
      duration: 2.2,
      sample: (t) => ({
        mouth: (1 - chomps(t, 2, 0.05, 0.4)) * hold(t, 0, 0.05, 0.38, 0.42),
        headPitch: chomps(t, 2, 0.05, 0.4) * 0.25 * hold(t, 0, 0.05, 0.38, 0.42),
        cheeks: hold(t, 0.05, 0.15, 0.4, 0.5) * 0.8,
        armForward: [hold(t, 0.45, 0.55, 0.85, 0.95) * 0.9 + Math.sin(t * 30) * 0.15 * hold(t, 0.55, 0.6, 0.8, 0.85), hold(t, 0.45, 0.55, 0.85, 0.95) * 0.9 + Math.sin(t * 30 + 1) * 0.15 * hold(t, 0.55, 0.6, 0.8, 0.85)],
        eyes: 1 - hold(t, 0.5, 0.6, 0.85, 0.95) * 0.7,
        squash: -hold(t, 0.8, 0.88, 0.92, 1) * 0.06,
      }),
    },
  ],
  poke: [
    {
      name: 'slow-wave',
      duration: 1.8,
      sample: (t) => ({ armUp: [0, hold(t, 0, 0.25, 0.75, 1) * 1.9], armForward: [0, Math.sin(t * 16) * 0.3 * hold(t, 0.25, 0.3, 0.7, 0.75)], headRoll: hold(t, 0, 0.3, 0.7, 1) * 0.18, mouth: hold(t, 0.1, 0.3, 0.7, 0.9) * 0.4, roll: -hold(t, 0, 0.3, 0.7, 1) * 0.06 }),
    },
    {
      name: 'belly-laugh',
      duration: 1.5,
      sample: (t) => ({
        squash: Math.sin(t * 34) * 0.08 * hump(t, 0, 1),
        lift: Math.abs(Math.sin(t * Math.PI * 5)) * 0.8 * hump(t, 0.05, 0.9),
        roll: Math.sin(t * 17) * 0.08 * hump(t, 0, 1),
        lean: -hump(t, 0, 1) * 0.22,
        headPitch: -hump(t, 0, 1) * 0.3,
        mouth: hump(t, 0.05, 0.95) * 1.2,
        eyes: 1 - hump(t, 0, 1) * 0.85,
        armUp: [hump(t, 0.05, 0.9) * 0.7, hump(t, 0.05, 0.9) * 0.7],
      }),
    },
  ],
  arrive: [
    { name: 'plop', duration: 1, sample: (t) => ({ lift: (1 - ramp(t, 0, 0.3)) * 4, squash: hump(t, 0.28, 0.45) * 0.28 + wobble(t, 0.45, 12, 3) * 0.08, armUp: [hump(t, 0.25, 0.8) * 0.6, hump(t, 0.25, 0.8) * 0.6] }) },
  ],
  delight: [
    {
      name: 'yawn',
      duration: 2.2,
      sample: (t) => ({ mouth: hold(t, 0.1, 0.4, 0.65, 0.85) * 1.6, headPitch: -hold(t, 0.05, 0.4, 0.65, 0.9) * 0.3, eyes: 1 - hold(t, 0.15, 0.35, 0.7, 0.85), armUp: [hold(t, 0.15, 0.45, 0.6, 0.85) * 1.4, hold(t, 0.15, 0.45, 0.6, 0.85) * 1.4], squash: -hold(t, 0.15, 0.45, 0.6, 0.85) * 0.07 }),
    },
    { name: 'belly-rub', duration: 1.6, sample: (t) => ({ armForward: [0, hold(t, 0, 0.15, 0.85, 1) * 0.9], armUp: [0, -Math.sin(t * 12) * 0.25 * hold(t, 0.15, 0.2, 0.8, 0.85)], eyes: 1 - hold(t, 0.1, 0.3, 0.8, 0.95) * 0.5 }) },
    { name: 'big-sway', duration: 2.4, sample: (t) => ({ roll: Math.sin(t * Math.PI * 2) * 0.12 * hump(t, 0, 1), headRoll: Math.sin(t * Math.PI * 2 - 0.7) * 0.1 * hump(t, 0, 1) }) },
    { name: 'glance', duration: 1.8, sample: (t, _amp, glance) => ({ headYaw: glance * 0.45 * hold(t, 0, 0.3, 0.7, 1), headRoll: glance * 0.08 * hump(t, 0, 1) }) },
  ],
}

// --- hedgehog: tiny, quick, shy ---------------------------------------------------

const hedgehog: Personality = {
  species: 'hedgehog',
  mouthWidth: 0.75,
  idle: (now, phase) => ({
    squash: -Math.sin(now * 3.4 + phase) * 0.012,
    nose: Math.sin(now * 23) * 0.6,
    quills: (Math.sin(now * 0.8 + phase) * 0.5 + 0.5) * 0.08,
    // Every few seconds a burst of tiny shuffling steps.
    lift: Math.abs(Math.sin(now * 14)) * 0.4 * hump((now * 0.31 + phase) % 1, 0.62, 0.82),
    roll: Math.sin(now * 14) * 0.09 * hump((now * 0.31 + phase) % 1, 0.62, 0.82),
    twist: Math.sin(now * 0.31 * Math.PI * 2 + phase) * 0.06,
  }),
  blinkEvery: [2.8, 6],
  blinkLength: 0.11,
  look: { stiffness: 75, damping: 10 },
  reach: (k, now) => ({ lean: k * 0.22, headPitch: k * 0.12, nose: Math.sin(now * 40) * k, quills: -k * 0.1, lift: Math.abs(Math.sin(now * 6)) * 0.15 * k }),
  reachResponse: 4.5,
  delightEvery: [6, 12],
  react: [
    {
      name: 'shuffle',
      duration: 1,
      sample: (t, amp) => ({ roll: Math.sin(t * Math.PI * 6) * 0.1 * hump(t, 0, 1) * amp, lift: Math.abs(Math.sin(t * Math.PI * 6)) * 0.35 * hump(t, 0, 1) * amp, quills: hump(t, 0, 1) * 0.25, nose: Math.sin(t * 70) }),
    },
    {
      name: 'quill-ripple',
      duration: 0.9,
      sample: (t, amp) => ({ quills: hump(t, 0, 0.4) * 0.9 * amp + wobble(t, 0.4, 25, 5) * 0.3, squash: (-hump(t, 0, 0.35) * 0.08 + hump(t, 0.35, 0.5) * 0.1) * amp, lift: hump(t, 0, 0.4) * 1 * amp, eyes: 1 + hump(t, 0, 0.5) * 0.25 }),
    },
    {
      name: 'tippy-toes',
      duration: 1.1,
      sample: (t) => ({ squash: -hold(t, 0, 0.2, 0.7, 0.9) * 0.14 + hump(t, 0.85, 1) * 0.08, headPitch: -hold(t, 0, 0.2, 0.7, 0.9) * 0.2, nose: Math.sin(t * 80) * hold(t, 0.1, 0.2, 0.7, 0.8), armUp: [hold(t, 0, 0.2, 0.7, 0.9) * 0.6, hold(t, 0, 0.2, 0.7, 0.9) * 0.6] }),
    },
  ],
  eat: [
    {
      name: 'tiny-chomps',
      duration: 1.4,
      sample: (t) => ({
        mouth: (1 - chomps(t, 11, 0.05, 0.75)) * hump(t, 0, 0.78) * 0.8,
        headPitch: 0.22 * hump(t, 0, 0.78) + (1 - chomps(t, 11, 0.05, 0.75)) * 0.14,
        lean: hump(t, 0, 0.78) * 0.1,
        nose: Math.sin(t * 100) * hump(t, 0, 1),
        cheeks: hump(t, 0.05, 0.78) * 0.45,
        roll: Math.sin(t * 60) * 0.12 * hump(t, 0.75, 1),
        lift: Math.abs(Math.sin(t * 60)) * 0.4 * hump(t, 0.75, 1),
        quills: hump(t, 0.75, 1) * 0.4,
      }),
    },
    {
      name: 'sniff-then-chomp',
      duration: 1.8,
      sample: (t) => ({
        headPitch: hold(t, 0, 0.1, 0.35, 0.4) * 0.35 + (1 - chomps(t, 5, 0.42, 0.9)) * 0.1 * hold(t, 0.4, 0.42, 0.9, 0.95),
        nose: Math.sin(t * 120) * hold(t, 0, 0.05, 0.35, 0.4),
        mouth: (1 - chomps(t, 5, 0.42, 0.9)) * hold(t, 0.4, 0.42, 0.9, 0.95) * 0.6,
        lift: hump(t, 0.92, 1) * 0.6,
        quills: hump(t, 0.92, 1) * 0.35,
      }),
    },
  ],
  poke: [
    {
      name: 'curl-up',
      duration: 2.2,
      sample: (t) => {
        const curled = hold(t, 0, 0.08, 0.6, 0.85)
        return { headDrop: curled * 2.6, headPitch: curled * 0.7, squash: curled * 0.12 - hump(t, 0.85, 1) * 0.06, quills: curled * 1, eyes: 1 - hold(t, 0.02, 0.06, 0.55, 0.6), armUp: [-curled * 0.4, -curled * 0.4], armForward: [curled * 1.2, curled * 1.2], roll: Math.sin(t * 40) * 0.03 * hump(t, 0.1, 0.5) }
      },
    },
    {
      name: 'puff-and-peek',
      duration: 1.6,
      sample: (t) => ({ quills: hold(t, 0, 0.05, 0.5, 0.9) * 0.8, headDrop: hold(t, 0, 0.06, 0.3, 0.6) * 1.4, eyes: 1 - hold(t, 0.02, 0.05, 0.35, 0.45) + hump(t, 0.45, 0.8) * 0.3, headYaw: Math.sin(t * 18) * 0.25 * hump(t, 0.5, 0.9) }),
    },
  ],
  arrive: [
    {
      name: 'unroll',
      duration: 1.1,
      sample: (t) => {
        const curled = 1 - ramp(t, 0.35, 0.8)
        return { headDrop: curled * 2.6, headPitch: curled * 0.7, quills: curled, squash: curled * 0.1, eyes: ramp(t, 0.6, 0.8), twist: (1 - ramp(t, 0, 0.4)) * 1.5 }
      },
    },
  ],
  delight: [
    {
      name: 'sneeze',
      duration: 1.2,
      sample: (t) => ({ headPitch: -ramp(t, 0.05, 0.45) * 0.35 * (1 - ramp(t, 0.45, 0.5)) + hump(t, 0.47, 0.65) * 0.45, eyes: 1 - hold(t, 0.3, 0.42, 0.55, 0.7), quills: hump(t, 0.47, 0.8) * 0.9, lift: hump(t, 0.47, 0.6) * 0.6, nose: Math.sin(t * 90) * hump(t, 0.05, 0.45) }),
    },
    { name: 'sniff', duration: 1.3, sample: (t) => ({ lean: hump(t, 0, 1) * 0.15, headPitch: -hump(t, 0, 1) * 0.2, nose: Math.sin(t * 130) * hump(t, 0, 1) }) },
    { name: 'little-shuffle', duration: 0.9, sample: (t) => ({ roll: Math.sin(t * Math.PI * 4) * 0.08 * hump(t, 0, 1), lift: Math.abs(Math.sin(t * Math.PI * 4)) * 0.25 * hump(t, 0, 1) }) },
    { name: 'glance', duration: 1.3, sample: (t, _amp, glance) => ({ headYaw: glance * 0.55 * hold(t, 0, 0.12, 0.55, 0.75), nose: Math.sin(t * 90) * hump(t, 0.1, 0.6) }) },
  ],
}

export const PERSONALITIES: Record<Species, Personality> = { rabbit, bear, hedgehog }

// --- director ---------------------------------------------------------------------

export function restPose(): MotionPose {
  return { lift: 0, squash: 0, lean: 0, roll: 0, twist: 0, headPitch: 0, headYaw: 0, headRoll: 0, headDrop: 0, armUp: [0, 0], armForward: [0, 0], ears: [0, 0], eyes: 1, mouth: 0, nose: 0, cheeks: 0, quills: 0 }
}

function add(pose: MotionPose, delta: PoseDelta, weight = 1): void {
  for (const key of ['lift', 'squash', 'lean', 'roll', 'twist', 'headPitch', 'headYaw', 'headRoll', 'headDrop', 'mouth', 'nose', 'cheeks', 'quills'] as const) {
    const value = delta[key]
    if (value !== undefined) pose[key] += value * weight
  }
  if (delta.eyes !== undefined) pose.eyes *= 1 + (delta.eyes - 1) * weight
  for (const key of ['armUp', 'armForward', 'ears'] as const) {
    const value = delta[key]
    if (value) {
      pose[key][0] += value[0] * weight
      pose[key][1] += value[1] * weight
    }
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

type Playing = { action: Action; start: number; amp: number; speed: number }

const FOREGROUND: readonly ActionKind[] = ['arrive', 'poke', 'eat', 'react']

/** Picks and blends one guest's actions over time. */
export class MotionDirector {
  readonly personality: Personality
  private readonly random: () => number
  private readonly phase: number
  private playing = new Map<ActionKind, Playing>()
  private lastName = new Map<ActionKind, string>()
  private nextDelight: number
  private nextBlink: number
  private blinks: number[] = []
  /** -1 or 1: which way a glance at a neighbour turns. */
  glance = 1

  constructor(species: Species, seed: number, now = 0) {
    this.personality = PERSONALITIES[species]
    this.random = seeded(seed * 7919 + 17)
    this.phase = this.random() * Math.PI * 2
    this.nextDelight = now + this.between(this.personality.delightEvery)
    this.nextBlink = now + this.between(this.personality.blinkEvery)
  }

  private between([min, max]: [number, number]): number {
    return min + this.random() * (max - min)
  }

  /** The variant that would play next for a kind, never the same one twice in a row when there is a choice. */
  pick(kind: ActionKind): Action {
    const options = this.personality[kind]
    const last = this.lastName.get(kind)
    const fresh = options.length > 1 ? options.filter((action) => action.name !== last) : options
    const action = fresh[Math.floor(this.random() * fresh.length)]
    this.lastName.set(kind, action.name)
    return action
  }

  trigger(kind: ActionKind, now: number): string {
    const action = this.pick(kind)
    this.playing.set(kind, { action, start: now, amp: 0.85 + this.random() * 0.3, speed: 0.9 + this.random() * 0.2 })
    if (kind === 'delight') this.glance = this.random() < 0.5 ? -1 : 1
    if (kind !== 'delight') this.playing.delete('delight')
    this.nextDelight = Math.max(this.nextDelight, now + this.between(this.personality.delightEvery) * 0.6)
    return action.name
  }

  /** Name of the action playing for a kind, if any. */
  current(kind: ActionKind, now: number): string | null {
    const playing = this.playing.get(kind)
    if (!playing) return null
    const elapsed = (now - playing.start) * playing.speed
    return elapsed >= 0 && elapsed < playing.action.duration ? playing.action.name : null
  }

  busy(now: number): boolean {
    return FOREGROUND.some((kind) => this.current(kind, now) !== null)
  }

  private reached = 0
  private lastSample: number | null = null

  sample(now: number, quiet = false, reach = 0): MotionPose {
    const pose = restPose()
    add(pose, this.personality.idle(now, this.phase))
    const dt = this.lastSample === null ? 0 : Math.max(0, Math.min(0.1, now - this.lastSample))
    this.lastSample = now
    this.reached += (reach - this.reached) * Math.min(1, dt * this.personality.reachResponse)
    if (this.reached > 0.01) add(pose, this.personality.reach(this.reached, now, this.phase))

    for (const [kind, playing] of this.playing) {
      const t = ((now - playing.start) * playing.speed) / playing.action.duration
      if (t >= 1 || t < 0) {
        this.playing.delete(kind)
        continue
      }
      add(pose, playing.action.sample(t, playing.amp, this.glance))
    }

    if (now >= this.nextDelight) {
      if (!quiet && !this.busy(now)) this.trigger('delight', now)
      this.nextDelight = now + this.between(this.personality.delightEvery)
    }

    if (now >= this.nextBlink) {
      this.blinks = [now]
      if (this.random() < 0.2) this.blinks.push(now + this.personality.blinkLength * 2.2)
      this.nextBlink = now + this.between(this.personality.blinkEvery)
    }
    for (const start of this.blinks) {
      const k = (now - start) / this.personality.blinkLength
      if (k >= 0 && k < 1) pose.eyes *= 1 - Math.sin(k * Math.PI) * 0.92
    }
    pose.eyes = Math.max(0.06, pose.eyes)
    return pose
  }
}
