import type { GuestId } from './world'

// How the guests move. No renderer and no clock: every function here is given
// a time and returns numbers, and the view lays those numbers on a figurine.
//
// - There are four kinds of mover, and each has its own tempo, its own weight
//   and one funny part: the Bear his belly and arms, the Mouse her tail, the
//   Hen her neck and comb, the Ducklings their tails and big feet.
// - No curve is shared. Every kind of action is written once for each mover,
//   from that mover's nature, and a test fails when two of them are the same
//   curve at another size or speed.
// - The Hen's head never glides: it holds a pose and snaps to the next.
// - A Director plays one guest: its idle, its blinks and whatever actions are
//   running, added together. It is seeded, so a run can be played again.

export type MoverKind = 'bear' | 'mouse' | 'hen' | 'duckling'

export function kindOf(who: GuestId): MoverKind {
  return who === 'duckling-a' || who === 'duckling-b' ? 'duckling' : who
}

/** Offsets from the rest pose. Lengths in table units (a Bear is about 3 tall), angles in radians. */
export type Pose = {
  lift: number // up off the cloth, never negative after blending
  squash: number // body height change as a share: -0.2 is squashed flat by a fifth, 0.1 stretched
  lean: number // forward (toward the child) positive
  roll: number // to the guest's left positive
  twist: number // turn about the upright axis
  headPitch: number // nod down positive
  headYaw: number
  headRoll: number
  funny: number // the funny part: the Bear's arms lifted, the Mouse's tail swung, the Hen's comb flopped forward and back, a Duckling's tail cocked up
  funnyTwist: number // its other angle: the Mouse's tail curled, the Hen's comb flopped side to side, a Duckling's tail wagged
  eyes: number // multiplies the eye height: 1 open, 0 shut, up to 1.4 wide
}

export const REST: Pose = Object.freeze({ lift: 0, squash: 0, lean: 0, roll: 0, twist: 0, headPitch: 0, headYaw: 0, headRoll: 0, funny: 0, funnyTwist: 0, eyes: 1 })

/** The ten channels that add; `eyes` multiplies. */
const OFFSETS = ['lift', 'squash', 'lean', 'roll', 'twist', 'headPitch', 'headYaw', 'headRoll', 'funny', 'funnyTwist'] as const

/** Adds b to a (eyes multiply). Returns a new pose. */
export function add(a: Pose, b: Pose): Pose {
  const sum = { ...a, eyes: a.eyes * b.eyes }
  for (const channel of OFFSETS) sum[channel] = a[channel] + b[channel]
  return sum
}

/** A pose played bigger or smaller. The eyes keep their meaning: shut stays shut. */
function scaled(pose: Pose, by: number): Pose {
  const out = { ...pose }
  for (const channel of OFFSETS) out[channel] = pose[channel] * by
  return out
}

export type ActionKind = 'poke' | 'stream' | 'tickle' | 'step' | 'reach' | 'sip-right' | 'sip-short' | 'sip-over' | 'wait' | 'clink' | 'settle' | 'show' | 'hat' | 'arrive' | 'joke'

/** `t` runs from 0 to 1. Every action starts and ends at REST, except 'settle', which ends at the pose the guest then keeps. */
export type Action = { name: string; kind: ActionKind; seconds: number; sample(t: number): Pose }

export type Personality = {
  kind: MoverKind
  /** Breaths a second. */
  tempo: number
  /** The idle pose at a time in seconds, with a phase 0 to 1 so two of a kind are not in step. */
  idle(seconds: number, phase: number): Pose
  /** Seconds between blinks, lowest and highest, and how long a blink lasts. */
  blinkEvery: [number, number]
  blinkSeconds: number
  /** How the head turns toward what the guest watches: a spring's stiffness and damping. The Hen's is stiff and barely damped enough to snap. */
  look: { stiffness: number; damping: number }
  /** Two variants for 'poke' and for 'tickle', one for every other kind. */
  actions: Record<ActionKind, Action[]>
}

// The shaping helpers. Each is 0 at the start of its stretch, and all but
// `ramp` and `jerk` are 0 again at the end of it, so an action built from them
// begins and ends at rest without any care taken.

const TAU = Math.PI * 2
const part = (t: number, from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)))

/** 0 before `from`, 1 after `to`, eased at both ends. */
const ramp = (t: number, from: number, to: number) => {
  const u = part(t, from, to)
  return u * u * (3 - 2 * u)
}
/** Up between `a` and `b`, held, and down between `c` and `d`. */
const hold = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))
/** One soft bump. */
const hump = (t: number, from: number, to: number) => Math.sin(Math.PI * part(t, from, to)) ** 2
/** `n` soft bumps in a row: gulps, bobs, pats. */
const beats = (t: number, from: number, to: number, n: number) => Math.sin(Math.PI * n * part(t, from, to)) ** 2
/** Thrown up and fallen back: the arc of a hop. */
const toss = (t: number, from: number, to: number) => 4 * part(t, from, to) * (1 - part(t, from, to))
/** `n` swings that start hard and die away: jelly, a comb, a tail after a landing. */
const ring = (t: number, from: number, to: number, n: number) => Math.sin(TAU * n * part(t, from, to)) * (1 - part(t, from, to)) ** 2
/** `n` swings that grow and fade: a wag, a shiver, a rock from foot to foot. */
const shake = (t: number, from: number, to: number, n: number) => Math.sin(TAU * n * part(t, from, to)) * Math.sin(Math.PI * part(t, from, to))
/** Held values with a quick snap from each to the next: `[time, value]` pairs in order, the first at time 0. The Hen's neck. */
const jerk = (t: number, keys: [number, number][], snap = 0.02) => {
  let i = keys.length - 1
  while (i > 0 && keys[i][0] > t) i--
  const next = keys[i + 1]
  if (!next || t <= next[0] - snap) return keys[i][1]
  return keys[i][1] + (next[1] - keys[i][1]) * ((t - (next[0] - snap)) / snap)
}

function act(name: string, kind: ActionKind, seconds: number, shape: (t: number) => Partial<Pose>): Action {
  return { name, kind, seconds, sample: (t) => ({ ...REST, ...shape(Math.min(1, Math.max(0, t))) }) }
}

/** Sorts a mover's actions by kind. */
function byKind(list: Action[]): Record<ActionKind, Action[]> {
  const sets: Record<ActionKind, Action[]> = { poke: [], stream: [], tickle: [], step: [], reach: [], 'sip-right': [], 'sip-short': [], 'sip-over': [], wait: [], clink: [], settle: [], show: [], hat: [], arrive: [], joke: [] }
  for (const action of list) sets[action.kind].push(action)
  return sets
}

/** A breath: a whole turn for every `1 / tempo` seconds, started at the phase. */
const breath = (seconds: number, tempo: number, phase: number) => TAU * (seconds * tempo + phase)

// The Bear: big, slow and heavy. Everything goes through his belly (squash)
// and his arms (`funny` lifts them), and everything takes a long time to stop.
const bear: Personality = {
  kind: 'bear',
  tempo: 0.22,
  idle: (s, phase) => {
    const b = breath(s, 0.22, phase)
    return { ...REST, squash: 0.03 * Math.sin(b), roll: 0.03 * Math.sin(b / 2), headPitch: 0.03 * Math.sin(b - 0.8), funny: 0.04 * Math.sin(b - 0.4) }
  },
  blinkEvery: [3.8, 7],
  blinkSeconds: 0.2,
  look: { stiffness: 30, damping: 9 },
  actions: byKind([
    // The belly rings like a jelly and the arms flap up once.
    act('belly-wobble', 'poke', 1.6, (t) => ({ squash: -0.14 * ring(t, 0, 1, 3.5), funny: 0.9 * hump(t, 0.05, 0.55), headPitch: -0.1 * hump(t, 0, 0.5), eyes: 1 + 0.25 * hump(t, 0, 0.4) })),
    // A slow rock from side to side with his eyes squeezed up.
    act('slow-chuckle', 'poke', 1.8, (t) => ({ roll: 0.18 * ring(t, 0, 1, 2), headRoll: -0.2 * ring(t, 0, 1, 2), twist: 0.1 * ring(t, 0.1, 1, 1.5), funny: 0.3 * hump(t, 0.1, 0.9), squash: 0.06 * hump(t, 0, 0.3), eyes: 1 - 0.4 * hump(t, 0.05, 0.5) })),
    // Head back, mouth to the stream, three big gulps.
    act('gulp-the-stream', 'stream', 2.0, (t) => ({ headPitch: -0.7 * hold(t, 0, 0.2, 0.8, 1) - 0.15 * beats(t, 0.25, 0.8, 3), squash: 0.05 * beats(t, 0.25, 0.8, 3), lean: -0.1 * hold(t, 0, 0.2, 0.8, 1), funny: 0.3 * hold(t, 0.05, 0.25, 0.8, 1), eyes: 1 - 0.6 * hold(t, 0.15, 0.3, 0.75, 0.9) })),
    act('belly-laugh', 'tickle', 1.5, (t) => ({ squash: -0.1 * beats(t, 0, 1, 5), funny: 0.5 * beats(t, 0.1, 0.9, 4), lean: -0.15 * hump(t, 0, 1), headPitch: -0.2 * hump(t, 0, 1), eyes: 1 - 0.8 * hold(t, 0.05, 0.2, 0.8, 0.95) })),
    act('slow-roll', 'tickle', 1.7, (t) => ({ roll: 0.25 * shake(t, 0, 1, 1.5), twist: 0.15 * shake(t, 0, 1, 1), headRoll: 0.2 * shake(t, 0.1, 1, 1.5), funny: 0.6 * hump(t, 0.2, 0.8), squash: 0.05 * hump(t, 0.5, 1) - 0.06 * hump(t, 0, 0.5) })),
    // A short heave up, then the thud: a deep squash and the arms swinging after it.
    act('thud', 'step', 0.8, (t) => ({ lift: 0.12 * toss(t, 0, 0.45), squash: 0.05 * hump(t, 0, 0.4) - 0.2 * hump(t, 0.4, 1), lean: 0.06 * hump(t, 0, 0.5), funny: 0.25 * hump(t, 0.35, 1), headPitch: 0.1 * hump(t, 0.45, 1) })),
    // He rocks back to get going, heaves forward until his belly meets the table, and only then do the paws come up.
    act('both-paws', 'reach', 1.2, (t) => ({ lean: 0.25 * hump(t, 0.2, 0.9) - 0.1 * hump(t, 0, 0.3), roll: 0.08 * shake(t, 0, 0.6, 1), funny: 0.6 * hold(t, 0.35, 0.6, 0.75, 1), squash: -0.1 * hump(t, 0.3, 0.9), headPitch: 0.2 * hump(t, 0.3, 0.9) })),
    // He drains it in four gulps, then sags in a long sigh and pats his belly.
    act('drain-and-sigh', 'sip-right', 5.8, (t) => ({ headPitch: 0.2 * hold(t, 0.62, 0.75, 0.9, 1) - 0.6 * hold(t, 0.05, 0.2, 0.5, 0.6), lean: -0.12 * hold(t, 0.05, 0.2, 0.5, 0.6), funny: 0.9 * hold(t, 0.03, 0.15, 0.5, 0.62) + 0.4 * beats(t, 0.66, 0.9, 3), squash: 0.06 * beats(t, 0.2, 0.5, 4) - 0.1 * hold(t, 0.6, 0.72, 0.9, 1), eyes: 1 - 0.9 * hold(t, 0.62, 0.72, 0.9, 0.98) })),
    // Right back for the one drop, then a long look into the cup with his head on one side.
    act('where-is-it', 'sip-short', 3.5, (t) => ({ headPitch: 0.5 * hold(t, 0.5, 0.6, 0.8, 0.9) - 0.9 * hold(t, 0.05, 0.2, 0.4, 0.5), funny: 0.9 * hold(t, 0.03, 0.15, 0.4, 0.5) + 0.3 * hold(t, 0.5, 0.6, 0.8, 0.9), headRoll: 0.15 * hold(t, 0.55, 0.65, 0.8, 0.9), lean: 0.15 * hold(t, 0.8, 0.88, 0.93, 1), eyes: 1 + 0.25 * hold(t, 0.5, 0.58, 0.8, 0.9) })),
    // He never finds too much, but should he: a slow lean back, a look down past his belly, and the belly settles after.
    act('rock-back', 'sip-over', 3.6, (t) => ({ lean: -0.25 * hold(t, 0.05, 0.3, 0.65, 0.85), headPitch: 0.3 * hold(t, 0.2, 0.35, 0.65, 0.8), funny: 0.3 * hold(t, 0.05, 0.3, 0.6, 0.8), squash: 0.1 * hump(t, 0.05, 0.35) - 0.06 * ring(t, 0.65, 1, 2), eyes: 1 + 0.4 * hold(t, 0.05, 0.15, 0.6, 0.75) })),
    // A look at the cup, a slow look away, and both arms rise and fall.
    act('slow-shrug', 'wait', 2.4, (t) => ({ headPitch: 0.25 * hold(t, 0, 0.15, 0.3, 0.4), headYaw: 0.5 * hold(t, 0.35, 0.5, 0.7, 0.85), funny: 0.35 * hump(t, 0.55, 0.95), squash: 0.04 * hump(t, 0.55, 0.95) })),
    // He sways in, his belly takes the bump, and he drinks in two gulps.
    act('big-clink', 'clink', 4.0, (t) => ({ lean: 0.3 * hold(t, 0.05, 0.3, 0.45, 0.55), roll: 0.08 * shake(t, 0.05, 0.35, 1), squash: 0.05 * beats(t, 0.68, 0.85, 2) - 0.08 * hump(t, 0.36, 0.46), funny: 0.5 * hold(t, 0.03, 0.25, 0.85, 0.97), headPitch: -0.6 * hold(t, 0.58, 0.68, 0.85, 0.95) })),
    // A yawn, and then his head sinks and his eyes close: he dozes.
    // By himself, now and then: his belly rumbles, and he looks down at it with round eyes and gives it a pat.
    act('belly-rumble', 'joke', 2.2, (t) => ({ squash: 0.06 * shake(t, 0.05, 0.55, 5), twist: 0.06 * shake(t, 0.05, 0.5, 3), headPitch: 0.5 * hold(t, 0.15, 0.3, 0.7, 0.85), eyes: 1 + 0.3 * hold(t, 0.1, 0.2, 0.6, 0.75), funny: 0.35 * hump(t, 0.6, 0.95) })),
    act('doze', 'settle', 2.6, (t) => ({ headPitch: 0.26 * ramp(t, 0.35, 1) - 0.3 * hump(t, 0, 0.4), headRoll: 0.24 * ramp(t, 0.45, 1), eyes: 1 - ramp(t, 0.3, 0.9), squash: 0.05 * hump(t, 0, 0.4) - 0.06 * ramp(t, 0.3, 1), roll: 0.05 * ramp(t, 0.4, 1), funny: -0.1 * ramp(t, 0.3, 1) })),
    // One paw goes out over the table and he turns after it, looks down at it, then looks up.
    act('paw-on-it', 'show', 3.0, (t) => ({ lean: 0.3 * hold(t, 0.1, 0.3, 0.7, 0.9), funny: 0.6 * hold(t, 0.1, 0.3, 0.7, 0.9), twist: 0.3 * hold(t, 0.1, 0.3, 0.7, 0.9), roll: -0.12 * hold(t, 0.12, 0.32, 0.7, 0.9), headPitch: 0.3 * hold(t, 0.15, 0.35, 0.5, 0.6), headYaw: 0.35 * hold(t, 0.6, 0.72, 0.85, 0.95) })),
    // His eyes go up, and after a while both paws go slowly up to feel for it.
    act('what-is-up-there', 'hat', 2.2, (t) => ({ eyes: 1 + 0.35 * hold(t, 0.05, 0.25, 0.8, 0.95), headPitch: -0.25 * hold(t, 0.05, 0.25, 0.8, 0.95), headRoll: 0.12 * ring(t, 0.2, 0.8, 2), funny: 0.7 * hold(t, 0.35, 0.55, 0.75, 0.9), squash: 0.05 * hold(t, 0.35, 0.55, 0.75, 0.9) })),
    // One landing and no bounce to speak of: he is too heavy.
    act('plop', 'arrive', 1.5, (t) => ({ lift: 0.5 * toss(t, 0, 0.35), squash: 0.06 * hump(t, 0.7, 1) - 0.25 * hump(t, 0.32, 0.7), funny: 0.7 * hump(t, 0.1, 0.6), headPitch: 0.2 * hump(t, 0.35, 0.8) })),
  ]),
}

// The Mouse: tiny, quick and neat. Small sharp moves, hardly any overshoot,
// and her tail (`funny` swings it, `funnyTwist` curls it) says what she feels.
const mouse: Personality = {
  kind: 'mouse',
  tempo: 0.9,
  idle: (s, phase) => {
    const b = breath(s, 0.9, phase)
    // The tail swishes on its own slow time, and the whiskers twitch in short bursts.
    const twitch = Math.max(0, Math.sin(b / 5)) ** 6
    return { ...REST, squash: 0.012 * Math.sin(b), funny: 0.15 * Math.sin(b / 3), funnyTwist: 0.1 * Math.sin(b / 4 + 1) + 0.08 * twitch * Math.sin(b * 6), headRoll: 0.02 * Math.sin(b / 2) }
  },
  blinkEvery: [2, 4.5],
  blinkSeconds: 0.08,
  look: { stiffness: 160, damping: 22 },
  actions: byKind([
    // Straight up, with her tail going round like a propeller.
    act('pop-up', 'poke', 0.5, (t) => ({ lift: 0.5 * toss(t, 0.05, 0.8), funny: hump(t, 0, 1) * Math.sin(TAU * 3 * t), funnyTwist: hump(t, 0, 1) * Math.cos(TAU * 3 * t), squash: 0.1 * hump(t, 0, 0.3) - 0.08 * hump(t, 0.75, 1), eyes: 1 + 0.3 * hump(t, 0, 0.6) })),
    // A start, and she freezes with her tail bolt upright, then looks sharply about.
    act('freeze-and-peek', 'poke', 0.6, (t) => ({ lift: 0.08 * toss(t, 0, 0.12), squash: -0.08 * hold(t, 0.1, 0.18, 0.5, 0.7), funny: 0.8 * hold(t, 0, 0.1, 0.5, 0.65), headYaw: 0.35 * shake(t, 0.5, 1, 2), eyes: 1 + 0.35 * hold(t, 0, 0.08, 0.5, 0.7) })),
    // The tail swings up over her head as an umbrella, and she hunches under it.
    act('tail-umbrella', 'stream', 1.0, (t) => ({ funny: 1.4 * hold(t, 0, 0.2, 0.8, 1), funnyTwist: 0.9 * hold(t, 0.1, 0.3, 0.75, 0.95), squash: -0.12 * hold(t, 0.05, 0.25, 0.8, 1), headPitch: 0.35 * hold(t, 0.05, 0.25, 0.8, 1), eyes: 1 - 0.6 * hold(t, 0.1, 0.25, 0.75, 0.9) })),
    act('wriggle', 'tickle', 0.6, (t) => ({ twist: 0.2 * shake(t, 0, 1, 4), funny: -0.6 * shake(t, 0, 1, 4), headRoll: 0.15 * shake(t, 0, 1, 2), lift: 0.04 * beats(t, 0, 1, 4) })),
    act('curl-up', 'tickle', 0.7, (t) => ({ squash: -0.15 * hump(t, 0, 1), funnyTwist: 1.2 * hump(t, 0, 1), headPitch: 0.4 * hump(t, 0, 0.9), lean: 0.1 * hump(t, 0, 1), lift: 0.03 * beats(t, 0.3, 0.8, 3), eyes: 1 - 0.7 * hump(t, 0.1, 0.9) })),
    // A tiny tick of a step, nose up: the tail streams behind and flicks up as she lands.
    act('tick', 'step', 0.18, (t) => ({ lift: 0.06 * toss(t, 0, 0.6), squash: 0.04 * hump(t, 0, 0.5), headPitch: -0.08 * hump(t, 0, 0.8), funny: 0.2 * hump(t, 0.6, 1) - 0.25 * hump(t, 0, 0.6) })),
    act('dart', 'reach', 0.5, (t) => ({ lean: 0.3 * hold(t, 0, 0.15, 0.5, 0.9), funny: -0.5 * hold(t, 0, 0.2, 0.5, 0.9), lift: 0.06 * hump(t, 0.1, 0.6), headPitch: 0.2 * hold(t, 0.05, 0.2, 0.5, 0.85) })),
    // Three dainty sips, then her tail curls and she gives two little hops.
    act('dainty-sips', 'sip-right', 4.0, (t) => ({ headPitch: -0.3 * beats(t, 0.1, 0.5, 3), funnyTwist: 0.8 * hold(t, 0.55, 0.65, 0.85, 0.95), funny: 0.4 * shake(t, 0.6, 0.95, 3), lift: 0.08 * beats(t, 0.6, 0.9, 2), headRoll: 0.15 * hold(t, 0.55, 0.65, 0.85, 0.95), eyes: 1 - 0.5 * hold(t, 0.55, 0.62, 0.85, 0.92) })),
    // Up on tiptoe for the drop, then her tail curls into a hook over the cup.
    act('tiptoe-for-a-drop', 'sip-short', 2.5, (t) => ({ headPitch: 0.4 * hold(t, 0.45, 0.52, 0.72, 0.8) - 0.8 * hold(t, 0.04, 0.12, 0.35, 0.42), lift: 0.1 * hold(t, 0.04, 0.12, 0.35, 0.42), funny: -0.4 * hold(t, 0.04, 0.12, 0.35, 0.42), headRoll: 0.25 * hold(t, 0.5, 0.56, 0.7, 0.78), funnyTwist: 0.5 * hold(t, 0.5, 0.6, 0.9, 1), lean: 0.15 * hold(t, 0.8, 0.86, 0.93, 1) })),
    // The cup is too heavy: she dips under it, shakes her wet whiskers hard, and sneezes.
    act('heavy-cup-sneeze', 'sip-over', 2.8, (t) => ({ lean: 0.25 * hold(t, 0.03, 0.15, 0.3, 0.4), headYaw: 0.5 * shake(t, 0.38, 0.68, 4), funny: 0.5 * shake(t, 0.4, 0.7, 4), headPitch: -0.3 * hump(t, 0.68, 0.82), squash: -0.1 * hold(t, 0.03, 0.15, 0.3, 0.4) - 0.3 * hump(t, 0.8, 0.9), lift: 0.1 * hump(t, 0.84, 0.96), eyes: 1 - 0.9 * hump(t, 0.78, 0.92) })),
    // A look at the cup, a quick look away, and the tail lifts and curls: her shrug.
    act('tail-shrug', 'wait', 1.6, (t) => ({ headPitch: 0.2 * hold(t, 0, 0.1, 0.25, 0.33), headYaw: -0.45 * hold(t, 0.33, 0.42, 0.68, 0.78), funny: 0.5 * hump(t, 0.5, 0.95), funnyTwist: 0.4 * hump(t, 0.5, 0.95) })),
    // She has to stand on tiptoe to reach the others' cups.
    act('tiptoe-clink', 'clink', 4.0, (t) => ({ lean: 0.25 * hold(t, 0.1, 0.22, 0.45, 0.52), lift: 0.12 * hold(t, 0.1, 0.22, 0.45, 0.52), squash: -0.06 * hump(t, 0.37, 0.43), headPitch: -0.4 * hold(t, 0.56, 0.62, 0.72, 0.78), funny: 0.5 * shake(t, 0.78, 1, 2) })),
    // She grooms: head down to one side, eyes half shut, tail round her feet.
    // By herself, now and then: two hiccups, each popping her off her seat with her tail straight up.
    act('hiccup', 'joke', 1.6, (t) => ({ lift: 0.12 * toss(t, 0.1, 0.25) + 0.12 * toss(t, 0.55, 0.7), funny: 0.8 * hump(t, 0.08, 0.3) + 0.8 * hump(t, 0.53, 0.75), squash: 0.08 * hump(t, 0.1, 0.22) + 0.08 * hump(t, 0.55, 0.67), headPitch: -0.2 * hump(t, 0.1, 0.3) - 0.2 * hump(t, 0.55, 0.75), eyes: 1 + 0.35 * hold(t, 0.1, 0.15, 0.75, 0.9) })),
    act('groom', 'settle', 1.2, (t) => ({ headPitch: 0.4 * ramp(t, 0.1, 0.7), headYaw: 0.5 * ramp(t, 0.1, 0.7), headRoll: 0.15 * beats(t, 0.1, 0.9, 3), funnyTwist: 0.9 * ramp(t, 0, 1), squash: -0.04 * ramp(t, 0, 0.6), eyes: 1 - 0.45 * ramp(t, 0.3, 1) })),
    // Up on tiptoe, she points with her tail and taps three times with the tip of it.
    act('tail-point', 'show', 2.0, (t) => ({ lean: 0.2 * hold(t, 0.1, 0.2, 0.7, 0.85), lift: 0.1 * hold(t, 0.1, 0.2, 0.7, 0.85), twist: -0.2 * hold(t, 0.1, 0.2, 0.7, 0.85), funny: 0.5 * hold(t, 0.1, 0.2, 0.7, 0.85), funnyTwist: -0.6 * beats(t, 0.25, 0.65, 3), headPitch: 0.25 * hold(t, 0.15, 0.25, 0.45, 0.55), headYaw: -0.35 * hold(t, 0.55, 0.6, 0.7, 0.76) })),
    // Her tail comes up and pats at it three times.
    act('feel-with-the-tail', 'hat', 1.2, (t) => ({ eyes: 1 + 0.4 * hold(t, 0.05, 0.12, 0.8, 0.95), headPitch: -0.2 * hold(t, 0.05, 0.15, 0.8, 0.95), funny: 0.9 * beats(t, 0.2, 0.8, 3), headRoll: 0.1 * shake(t, 0.2, 0.8, 3), squash: -0.06 * hold(t, 0.05, 0.15, 0.8, 0.95) })),
    // Two neat bounces, the second hardly there.
    act('hop-tick', 'arrive', 0.6, (t) => ({ lift: 0.3 * toss(t, 0, 0.5) + 0.06 * toss(t, 0.55, 0.8), squash: -0.1 * hump(t, 0.45, 0.6) - 0.04 * hump(t, 0.78, 0.92), funny: -0.5 * hump(t, 0, 0.5), funnyTwist: 0.5 * ring(t, 0.5, 1, 2) })),
  ]),
}

/** The stops the Hen's head makes at idle, one after another. */
const PEERS = [0, 1, 1, -0.6, 0, 0.5, -1, -1, 0.3, 0] as const

// The Hen: middle-sized, busy and fussy. Her head goes from one held pose to
// the next with a snap (`jerk`), and her comb (`funny` forward and back,
// `funnyTwist` side to side) flops after every one.
const hen: Personality = {
  kind: 'hen',
  tempo: 0.6,
  idle: (s, phase) => {
    const b = breath(s, 0.6, phase)
    // Two stops of the head for every breath; the comb is knocked by each snap and rings down before the next.
    const beat = (s * 0.6 + phase) * 2, at = Math.floor(beat), since = beat - at
    const stop = PEERS[((at % PEERS.length) + PEERS.length) % PEERS.length]
    return { ...REST, squash: 0.015 * Math.sin(b), headYaw: 0.14 * stop, headPitch: 0.05 * (at % 3 === 0 ? 1 : 0), funny: 0.1 * ring(since, 0, 1, 2) }
  },
  blinkEvery: [1.6, 3.6],
  blinkSeconds: 0.1,
  look: { stiffness: 420, damping: 26 },
  actions: byKind([
    // She puffs up, and her head snaps left, right, forward.
    act('puff-and-peer', 'poke', 0.9, (t) => ({ squash: 0.12 * hold(t, 0, 0.12, 0.7, 1), headYaw: jerk(t, [[0, 0], [0.1, 0.6], [0.32, -0.6], [0.55, 0]]), headPitch: jerk(t, [[0, 0], [0.55, 0.4], [0.8, 0]]), funny: 0.5 * ring(t, 0.1, 1, 3), eyes: 1 + 0.3 * hold(t, 0, 0.1, 0.6, 0.8) })),
    // A flap off the cloth and a ruffle all the way down.
    act('ruffle', 'poke', 1.0, (t) => ({ lift: 0.15 * toss(t, 0, 0.3), twist: 0.25 * ring(t, 0.1, 0.9, 4), headPitch: jerk(t, [[0, 0], [0.05, -0.4], [0.4, 0.3], [0.7, 0]]), funnyTwist: 0.6 * ring(t, 0.05, 1, 4), squash: 0.08 * hump(t, 0, 0.4) })),
    // She shakes all over, fast, and it dies away.
    act('shake-off', 'stream', 1.4, (t) => ({ twist: 0.4 * ring(t, 0, 1, 6), funnyTwist: 0.7 * ring(t, 0.03, 1, 6), squash: 0.08 * hump(t, 0, 0.5), headPitch: jerk(t, [[0, 0], [0.05, 0.3], [0.6, 0]]), eyes: 1 - 0.8 * hold(t, 0, 0.08, 0.5, 0.7) })),
    act('fuss', 'tickle', 1.0, (t) => ({ headYaw: jerk(t, [[0, 0], [0.08, -0.5], [0.25, 0.5], [0.42, -0.3], [0.6, 0.3], [0.78, 0]]), roll: 0.1 * shake(t, 0, 1, 3), funny: 0.5 * beats(t, 0, 1, 5), lift: 0.03 * beats(t, 0, 1, 5) })),
    act('feather-fluff', 'tickle', 1.1, (t) => ({ squash: 0.14 * hump(t, 0, 0.8), twist: 0.2 * shake(t, 0.1, 0.9, 5), headPitch: jerk(t, [[0, 0], [0.1, -0.3], [0.5, 0.2], [0.8, 0]]), headRoll: jerk(t, [[0, 0], [0.3, 0.3], [0.6, -0.3], [0.85, 0]]), funnyTwist: 0.5 * shake(t, 0.1, 1, 5) })),
    // A strut: the head goes forward first and the body catches it up.
    act('strut', 'step', 0.5, (t) => ({ headPitch: jerk(t, [[0, 0], [0.15, 0.35], [0.6, 0]]), lift: 0.07 * toss(t, 0.3, 0.9), funny: 0.3 * hump(t, 0.5, 1) - 0.4 * hump(t, 0.1, 0.5), roll: 0.05 * hump(t, 0, 1) })),
    // She eyes the cup sideways first, then pecks down at it.
    act('peck-and-lift', 'reach', 0.8, (t) => ({ headYaw: jerk(t, [[0, 0], [0.06, 0.5], [0.3, 0]]), headPitch: jerk(t, [[0, 0], [0.3, 0.6], [0.55, 0.15], [0.8, 0]]), lean: 0.15 * hold(t, 0.05, 0.2, 0.5, 0.9), funny: 0.5 * ring(t, 0.3, 0.9, 2), squash: -0.04 * hold(t, 0.05, 0.2, 0.5, 0.9) })),
    // She watches her spoon go round, then dips her beak and tips her head up to swallow, twice, and puffs.
    act('stir-dip-and-tip', 'sip-right', 5.0, (t) => ({ twist: 0.08 * shake(t, 0.03, 0.3, 4), headYaw: jerk(t, [[0, 0], [0.04, 0.25], [0.12, -0.25], [0.2, 0.25], [0.28, 0]]), headPitch: jerk(t, [[0, 0], [0.32, 0.8], [0.45, -0.6], [0.58, 0.8], [0.7, -0.6], [0.84, 0]]), funny: 0.6 * ring(t, 0.84, 1, 2), squash: 0.08 * hold(t, 0.84, 0.9, 0.95, 1), eyes: 1 - 0.6 * hold(t, 0.7, 0.73, 0.8, 0.84) })),
    // Up for the drop, down to peer in with one eye and then the other.
    act('one-eye-then-the-other', 'sip-short', 3.1, (t) => ({ headPitch: jerk(t, [[0, 0], [0.05, -0.9], [0.35, 0.6], [0.62, 0.2], [0.9, 0]]), headRoll: jerk(t, [[0, 0], [0.42, 0.35], [0.52, -0.35], [0.62, 0]]), funny: 0.4 * hold(t, 0.4, 0.45, 0.6, 0.7) - 0.5 * hold(t, 0.05, 0.1, 0.33, 0.4), lean: 0.14 * hold(t, 0.66, 0.74, 0.9, 1), eyes: 1 + 0.2 * hold(t, 0.36, 0.42, 0.6, 0.7) })),
    // Her beak goes in too deep: held there, bubbling, then up with a shake.
    act('beak-in-too-deep', 'sip-over', 4.1, (t) => ({ headPitch: 1.1 * hold(t, 0.05, 0.12, 0.55, 0.62) + 0.08 * beats(t, 0.18, 0.52, 6), squash: 0.03 * beats(t, 0.18, 0.52, 6), funny: 0.7 * hold(t, 0.05, 0.12, 0.55, 0.62), headYaw: 0.5 * ring(t, 0.62, 0.95, 4), funnyTwist: 0.6 * ring(t, 0.64, 1, 4), eyes: 1 + 0.3 * hold(t, 0.6, 0.65, 0.8, 0.9) })),
    // A peck of a look at the cup, a snap away, and a small ruffle: her shrug.
    act('ruffle-shrug', 'wait', 2.05, (t) => ({ headPitch: jerk(t, [[0, 0], [0.05, 0.4], [0.3, 0]]), headYaw: jerk(t, [[0, 0], [0.32, 0.6], [0.62, 0]]), squash: 0.06 * hump(t, 0.62, 0.95), funny: 0.3 * ring(t, 0.62, 1, 2) })),
    act('peck-clink', 'clink', 4.0, (t) => ({ lean: 0.22 * hold(t, 0.12, 0.26, 0.44, 0.54), headPitch: jerk(t, [[0, 0], [0.14, 0.3], [0.4, 0.45], [0.46, 0.3], [0.56, -0.7], [0.74, 0.2], [0.82, -0.7], [0.94, 0]]), funny: 0.5 * ring(t, 0.4, 0.7, 2) })),
    // She tucks her head: round to one side in two snaps, then down, fluffed up, eyes shut.
    // By herself, now and then: she nods off, her head sinking, starts awake with her comb flopping, and looks sharply left and right.
    act('nod-off', 'joke', 2.6, (t) => ({ headPitch: jerk(t, [[0, 0], [0.12, 0.2], [0.26, 0.45], [0.42, 0.75], [0.56, -0.25], [0.7, 0]]), eyes: 1 - 0.85 * hold(t, 0.1, 0.35, 0.5, 0.54) + 0.35 * hold(t, 0.55, 0.58, 0.75, 0.85), funny: 0.6 * ring(t, 0.55, 1, 3), headYaw: jerk(t, [[0, 0], [0.74, 0.5], [0.84, -0.5], [0.94, 0]]), squash: -0.05 * hold(t, 0.1, 0.4, 0.5, 0.56) })),
    act('tuck', 'settle', 1.8, (t) => ({ headYaw: jerk(t, [[0, 0], [0.15, 0.5], [0.45, 1.2]]), headPitch: jerk(t, [[0, 0], [0.45, 0.2], [0.7, 0.5]]), squash: 0.06 * ramp(t, 0.3, 1), funny: 0.3 * ramp(t, 0.5, 1), eyes: 1 - ramp(t, 0.75, 1) })),
    // A look each way, then her head goes down to the table and her wing goes out along it.
    act('wing-along', 'show', 2.6, (t) => ({ headYaw: jerk(t, [[0, 0], [0.12, -0.4], [0.3, 0.4], [0.5, 0]]), headPitch: jerk(t, [[0, 0], [0.5, 0.55], [0.8, 0]]), lean: 0.2 * hold(t, 0.08, 0.2, 0.75, 0.9), roll: 0.12 * hold(t, 0.1, 0.25, 0.7, 0.85), funny: 0.4 * hump(t, 0.75, 1) })),
    act('flat-comb', 'hat', 1.7, (t) => ({ eyes: 1 + 0.35 * hold(t, 0.05, 0.1, 0.85, 0.95), headPitch: jerk(t, [[0, 0], [0.06, -0.3], [0.85, 0]]), headRoll: jerk(t, [[0, 0], [0.25, 0.25], [0.45, -0.25], [0.65, 0]]), funny: -0.6 * hold(t, 0.05, 0.15, 0.8, 0.95), squash: -0.05 * hold(t, 0.05, 0.15, 0.8, 0.95) })),
    // She flutters down in three bounces, each smaller, and ruffles herself straight.
    act('flutter-down', 'arrive', 1.1, (t) => ({ lift: 0.4 * toss(t, 0, 0.4) + 0.12 * toss(t, 0.42, 0.62) + 0.05 * toss(t, 0.64, 0.78), roll: 0.12 * shake(t, 0, 0.6, 3), squash: 0.1 * hump(t, 0.75, 1) - 0.08 * hump(t, 0.38, 0.5), funnyTwist: 0.6 * ring(t, 0.4, 1, 3), headPitch: jerk(t, [[0, 0], [0.4, 0.3], [0.62, -0.15], [0.85, 0]]) })),
  ]),
}

// The Ducklings: two, alike. They rock from one big foot to the other (roll)
// and their tails wag (`funnyTwist`) and cock up (`funny`). The second one is
// the same mover played half a beat late, which the Director sees to.
const duckling: Personality = {
  kind: 'duckling',
  tempo: 0.45,
  idle: (s, phase) => {
    const b = breath(s, 0.45, phase)
    // A slow rock from foot to foot, and the tail wags in bursts.
    const burst = Math.max(0, Math.sin(b / 3)) ** 4
    return { ...REST, squash: 0.02 * Math.sin(b), roll: 0.04 * Math.sin(b / 2), funnyTwist: 0.18 * burst * Math.sin(b * 7), funny: 0.05 * burst }
  },
  blinkEvery: [2.6, 5.4],
  blinkSeconds: 0.12,
  look: { stiffness: 70, damping: 12 },
  actions: byKind([
    // A quick duck down, and the tail wags as it comes up.
    act('duck-and-wag', 'poke', 0.7, (t) => ({ squash: -0.18 * hump(t, 0, 0.45), headPitch: 0.3 * hump(t, 0, 0.45), funnyTwist: 0.8 * shake(t, 0.3, 1, 4), funny: 0.5 * hump(t, 0.25, 1), eyes: 1 - 0.6 * hump(t, 0, 0.4) })),
    act('bob-about', 'poke', 0.8, (t) => ({ lift: 0.08 * beats(t, 0, 0.6, 2), roll: 0.2 * shake(t, 0, 1, 2), funny: 0.5 * beats(t, 0, 0.6, 2), headPitch: -0.25 * hump(t, 0, 0.5), funnyTwist: 0.5 * shake(t, 0.5, 1, 3) })),
    // It paddles in the stream, foot to foot, tail up.
    act('paddle', 'stream', 1.2, (t) => ({ roll: 0.25 * shake(t, 0, 1, 3), lift: 0.06 * beats(t, 0, 1, 6), funny: 0.9 * hold(t, 0, 0.15, 0.8, 1), funnyTwist: 0.4 * shake(t, 0.1, 0.9, 6), headPitch: -0.2 * hold(t, 0, 0.2, 0.8, 1) })),
    act('wiggle-bottom', 'tickle', 0.8, (t) => ({ twist: 0.3 * shake(t, 0, 1, 3), funnyTwist: -0.9 * shake(t, 0, 1, 3), roll: 0.08 * shake(t, 0, 1, 1.5), squash: -0.05 * beats(t, 0, 1, 3) })),
    // Over onto one side with a foot kicking in the air.
    act('flop-and-kick', 'tickle', 0.9, (t) => ({ roll: 0.35 * hump(t, 0, 0.8), headRoll: -0.3 * hump(t, 0.05, 0.85), lift: 0.05 * beats(t, 0.2, 0.8, 3), funny: 0.6 * beats(t, 0.2, 0.8, 3), eyes: 1 - 0.7 * hump(t, 0.1, 0.8) })),
    // A waddle: over to one foot and back over the other, the tail swinging the opposite way.
    act('waddle', 'step', 0.42, (t) => ({ roll: 0.3 * shake(t, 0, 1, 1), twist: -0.15 * shake(t, 0, 1, 1), funnyTwist: 0.6 * shake(t, 0.1, 1, 1), lift: 0.04 * beats(t, 0, 1, 2) })),
    // It leans right over on one foot, tail up to keep its balance.
    act('one-foot-reach', 'reach', 0.7, (t) => ({ lean: 0.2 * hold(t, 0.05, 0.35, 0.6, 1), roll: 0.25 * hold(t, 0, 0.3, 0.6, 0.9), funny: 0.5 * hold(t, 0.1, 0.4, 0.6, 0.9), funnyTwist: 0.3 * shake(t, 0.4, 1, 3), headPitch: 0.2 * hold(t, 0.1, 0.4, 0.55, 0.9) })),
    // Two dabbles in the cup, a throw of the head to swallow, and a long happy wag.
    act('dabble', 'sip-right', 4.5, (t) => ({ headPitch: 0.7 * beats(t, 0.05, 0.45, 2) - 0.5 * hold(t, 0.5, 0.56, 0.66, 0.72), funny: 0.6 * hold(t, 0.05, 0.15, 0.4, 0.5) + 0.5 * hold(t, 0.7, 0.76, 0.92, 1), funnyTwist: 0.9 * shake(t, 0.7, 1, 5), roll: 0.15 * shake(t, 0.72, 1, 2), lift: 0.05 * beats(t, 0.72, 0.96, 3) })),
    // A quick tip back for the drop, then it peers in standing on one foot, tail in the air.
    act('peer-on-one-foot', 'sip-short', 2.8, (t) => ({ headPitch: 0.55 * hold(t, 0.4, 0.5, 0.74, 0.82) - 0.85 * hold(t, 0.05, 0.12, 0.26, 0.34), funny: 0.6 * hold(t, 0.42, 0.5, 0.74, 0.82) - 0.5 * hold(t, 0.05, 0.12, 0.26, 0.34), roll: 0.2 * hold(t, 0.44, 0.54, 0.72, 0.82), headRoll: -0.3 * hold(t, 0.5, 0.58, 0.72, 0.8), funnyTwist: 0.3 * shake(t, 0.5, 0.8, 2), lean: 0.15 * hold(t, 0.8, 0.87, 0.93, 1) })),
    // A start back onto its tail with wide eyes, and it wobbles on its feet until it is steady.
    act('whoa', 'sip-over', 3.2, (t) => ({ lean: -0.3 * hold(t, 0.04, 0.1, 0.3, 0.45), headPitch: -0.2 * hold(t, 0.04, 0.12, 0.3, 0.45), lift: 0.1 * hump(t, 0.04, 0.2), funny: -0.5 * hold(t, 0.06, 0.14, 0.4, 0.6), roll: 0.2 * ring(t, 0.3, 1, 3), funnyTwist: 0.6 * ring(t, 0.35, 1, 3), eyes: 1 + 0.4 * hold(t, 0.04, 0.1, 0.4, 0.55) })),
    // A look at the cup, a look away, and it shifts from one foot to the other.
    act('foot-to-foot', 'wait', 1.8, (t) => ({ headPitch: 0.3 * hold(t, 0, 0.12, 0.26, 0.36), headYaw: 0.5 * hold(t, 0.36, 0.48, 0.66, 0.78), roll: 0.12 * shake(t, 0.6, 1, 1), funny: -0.3 * hump(t, 0.6, 0.95) })),
    act('waddle-in-clink', 'clink', 4.0, (t) => ({ lean: 0.28 * hold(t, 0.08, 0.24, 0.46, 0.56), roll: 0.1 * shake(t, 0.08, 0.36, 2), lift: 0.05 * hump(t, 0.36, 0.44), funnyTwist: 0.7 * shake(t, 0.4, 0.6, 3), headPitch: 0.3 * hump(t, 0.88, 1) - 0.5 * hold(t, 0.6, 0.66, 0.8, 0.88) })),
    // By itself, now and then: a yawn so wide that it tips back onto its tail, and wobbles upright again.
    act('yawn-and-tip', 'joke', 2.0, (t) => ({ headPitch: -0.6 * hold(t, 0.1, 0.3, 0.55, 0.7), lean: -0.25 * hold(t, 0.3, 0.45, 0.6, 0.75), funny: 0.8 * hold(t, 0.3, 0.45, 0.6, 0.8), roll: 0.12 * shake(t, 0.6, 1, 2), eyes: 1 - 0.8 * hold(t, 0.12, 0.25, 0.5, 0.6), lift: 0.06 * hump(t, 0.7, 0.85) })),
    // It leans over against its twin, and its tail droops.
    act('lean-on-twin', 'settle', 1.5, (t) => ({ roll: 0.3 * ramp(t, 0.1, 0.8), headRoll: 0.2 * ramp(t, 0.3, 1), squash: -0.05 * ramp(t, 0, 1), funny: -0.3 * ramp(t, 0.2, 1), funnyTwist: 0.4 * shake(t, 0, 0.6, 2), eyes: 1 - 0.7 * ramp(t, 0.5, 1) })),
    // It holds out toward its twin, looks down, then looks across at the twin.
    act('rim-to-rim', 'show', 2.3, (t) => ({ lean: 0.25 * hold(t, 0.1, 0.3, 0.7, 0.9), roll: -0.18 * hold(t, 0.15, 0.35, 0.7, 0.88), headPitch: 0.3 * hold(t, 0.2, 0.35, 0.5, 0.6), headYaw: -0.4 * hold(t, 0.5, 0.6, 0.72, 0.85), funnyTwist: 0.5 * shake(t, 0.3, 0.7, 3) })),
    act('stagger-under-it', 'hat', 1.5, (t) => ({ eyes: 1 + 0.38 * hold(t, 0.05, 0.14, 0.8, 0.95), headPitch: -0.3 * hold(t, 0.05, 0.18, 0.8, 0.95), roll: 0.25 * shake(t, 0.15, 0.75, 2), twist: 0.2 * shake(t, 0.15, 0.75, 1.5), funnyTwist: 0.4 * shake(t, 0.2, 0.8, 4), squash: -0.08 * hold(t, 0.05, 0.15, 0.8, 0.95) })),
    // Two bounces, and the tail goes on wagging after the feet have stopped.
    act('plip-plop', 'arrive', 0.9, (t) => ({ lift: 0.35 * toss(t, 0, 0.4) + 0.1 * toss(t, 0.45, 0.7), squash: -0.14 * hump(t, 0.36, 0.5) - 0.06 * hump(t, 0.68, 0.82), roll: 0.15 * ring(t, 0.4, 1, 2), funnyTwist: 0.8 * ring(t, 0.45, 1, 3), funny: 0.5 * hump(t, 0, 0.5) })),
  ]),
}

export const PERSONALITIES: Record<MoverKind, Personality> = { bear, mouse, hen, duckling }

/** The actions a scene is made of: only one of them plays at a time. The rest (a poke, a tickle, the stream, a hat) play on top. */
const FOREGROUND: ReadonlySet<ActionKind> = new Set<ActionKind>(['sip-right', 'sip-short', 'sip-over', 'clink', 'show', 'arrive', 'reach'])

/** The `n`th number, from 0 up to 1, of the stream a seed gives: the same seed and place, the same number, with nothing kept between calls. */
function numberAt(seed: number, n: number): number {
  // The seed is spread out first, so that seats numbered 1, 2, 3 do not get streams that begin alike.
  const s = (Math.imul(seed ^ (seed >>> 16), 0x85ebca6b) + Math.imul(n, 0x6d2b79f5) + 0x9e3779b9) >>> 0
  let x = Math.imul(s ^ (s >>> 15), s | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296
}

type Play = { action: Action; start: number; amp: number }
/** The part of an action that a held one stays in: from here to there and back, for as long as it is held. */
const HELD_FROM = 0.3
const HELD_TO = 0.7

/**
 * One guest's motion over time. Seeded, so a run can be repeated; `seed`
 * differs per seat so two of a kind drift apart. The second Duckling passes
 * `lateBy` (seconds) and plays everything that much later: its whole time runs
 * behind, its idle and its blinks too.
 */
export class Director {
  readonly personality: Personality
  /** The guest is settled (after 'settle' has played it keeps that pose) or not. The view may set it for a table that is found already settled. */
  settled = false
  /** Which way a guest that settles against another leans: 1 as its action is written, -1 the other way. The troupe sets it for the Ducklings, so that each leans toward its twin. */
  side: 1 | -1 = 1
  private readonly seed: number
  private readonly lateBy: number
  private readonly phase: number
  /** How many numbers the plays have drawn. Blinks draw by the time, from a stream of their own, so a poke never moves a blink. */
  private drawn = 0
  private readonly plays = new Map<ActionKind, Play>()
  private readonly lastName = new Map<ActionKind, string>()
  /** How big the settle was played, which the kept pose keeps. */
  private keptAmp = 1
  /** The action that is held for as long as what causes it lasts: it plays to its middle and stays in it, to and fro, until it is let go. */
  private held: ActionKind | null = null

  constructor(who: GuestId, seed: number, lateBy = 0) {
    this.personality = PERSONALITIES[kindOf(who)]
    this.seed = seed
    this.lateBy = lateBy
    this.phase = numberAt(seed, -1)
  }

  private draw(): number {
    return numberAt(this.seed ^ 0x5bd1e995, this.drawn++)
  }

  /** Starts an action at time `now` (seconds) and returns the name of the variant chosen: never the same variant twice running when there are two. */
  trigger(kind: ActionKind, now: number): string {
    const variants = this.personality.actions[kind]
    let at = Math.floor(this.draw() * variants.length)
    if (variants.length > 1 && variants[at].name === this.lastName.get(kind)) at = (at + 1) % variants.length
    const action = variants[at]
    this.lastName.set(kind, action.name)
    if (FOREGROUND.has(kind)) for (const other of FOREGROUND) this.plays.delete(other)
    // A guest that arrives, or settles again, starts from sitting up.
    if (kind === 'settle' || kind === 'arrive') this.settled = false
    this.plays.set(kind, { action, start: now, amp: 0.9 + 0.2 * this.draw() })
    return action.name
  }

  /** Ends every action at once, each left at REST (a touch ends a scene). A settled guest stays settled, and one that was settling is settled. */
  finish(): void {
    const settling = this.plays.get('settle')
    if (settling) this.keep(settling)
    this.plays.clear()
    this.held = null
  }

  /**
   * Holds an action of this kind for as long as its cause lasts (the stream on
   * a guest), or lets it go with null: held, it plays up to its middle and
   * stays there, to and fro between `HELD_FROM` and `HELD_TO` of its length;
   * let go, it plays on to its end from wherever it is.
   */
  hold(kind: ActionKind | null, now: number): void {
    const own = now - this.lateBy
    const was = this.held ? this.plays.get(this.held) : undefined
    if (was && this.held !== kind) was.start = own - this.along(was, own, true) * was.action.seconds
    this.held = kind
  }

  /** How far along a play is at the guest's own time, 0 to 1 and beyond; a held one stays in its middle. */
  private along(play: Play, own: number, held: boolean): number {
    const t = (own - play.start) / play.action.seconds
    if (!held || t <= HELD_FROM) return t
    const span = HELD_TO - HELD_FROM, over = (t - HELD_FROM) % (2 * span)
    return HELD_FROM + (over < span ? over : 2 * span - over)
  }

  private keep(play: Play): void {
    this.settled = true
    this.keptAmp = play.amp
  }

  /** Drops the plays that are over at the guest's own time; a 'settle' that is over leaves the guest settled. */
  private tidy(own: number): void {
    for (const [kind, play] of this.plays) {
      if (own < play.start + play.action.seconds || kind === this.held) continue
      if (kind === 'settle') this.keep(play)
      this.plays.delete(kind)
    }
  }

  /** True while a foreground action is playing, or is about to for the Duckling that runs late. */
  busy(now: number): boolean {
    this.tidy(now - this.lateBy)
    for (const kind of this.plays.keys()) if (FOREGROUND.has(kind)) return true
    return false
  }

  /**
   * What a blink does to the eyes at the guest's own time: 1 between blinks,
   * down to a tenth in one. Time is cut into slots as long as the middle of
   * `blinkEvery`, and one blink starts in the first part of each, at a seeded
   * moment, so the gap from one blink to the next is always inside the range.
   */
  private blink(own: number): number {
    const [low, high] = this.personality.blinkEvery, slot = (low + high) / 2
    // The slot this moment is in, and the one before it, whose blink may still be closing.
    for (let i = Math.floor(own / slot) - 1; i <= Math.floor(own / slot); i++) {
      const u = (own - i * slot - numberAt(this.seed, i) * ((high - low) / 2)) / this.personality.blinkSeconds
      if (u >= 0 && u <= 1) return 1 - 0.9 * hold(u, 0, 0.25, 0.75, 1)
    }
    return 1
  }

  /** The pose at time `now`: idle, plus every playing action, plus a blink, with each play given a seeded amplitude between 0.9 and 1.1. `lift` is never below 0. */
  sample(now: number): Pose {
    const own = now - this.lateBy
    this.tidy(own)
    const sided = (pose: Pose): Pose => (this.side === 1 ? pose : { ...pose, roll: -pose.roll, headRoll: -pose.headRoll })
    let acted: Pose = this.settled ? sided(scaled(this.personality.actions.settle[0].sample(1), this.keptAmp)) : REST
    for (const [kind, play] of this.plays) {
      const t = this.along(play, own, kind === this.held)
      if (t > 0) acted = add(acted, kind === 'settle' ? sided(scaled(play.action.sample(t), play.amp)) : scaled(play.action.sample(t), play.amp))
    }
    const pose = add(this.personality.idle(own, this.phase), acted)
    // No blink over eyes that an action holds wide or nearly shut.
    if (acted.eyes <= 1.2 && acted.eyes >= 0.5) pose.eyes *= this.blink(own)
    pose.lift = Math.max(0, pose.lift)
    pose.eyes = Math.min(1.4, Math.max(0, pose.eyes))
    return pose
  }
}
