import type { Kind } from './cloth'
import type { FriendKind } from './layout'
import type { Mood } from './taste'

// How each character moves. Pure numbers: the view maps them onto stitched
// pieces. No two characters share a curve. Each has its own tempo, its own
// weight and its own funniest part, and its own answer to each thing that can
// happen to it (motion personality per character).
//
//   pig    slow breath, heavy and wobbly; the funniest part is the belly
//   heron  very slow sway, light and stiff; the funniest part is the neck
//   goat   quick sideways chewing, stocky and jerky; the funniest part is the beard
//   cat    a pendulum tail and a paw it keeps washing
//
// The second half of the file is how each garment moves at each station: in
// the tub, on the rail and on the line, one curve a garment a station.

export type Who = FriendKind | 'cat'

/** What can happen to a character. The moods are its answers to what it wears (taste.ts). */
export type Happening =
  | 'poke' | 'toss' | 'catch' | 'splat' | 'dripped' | 'tickle' | 'pegged' | 'refuse' | 'arrive' | 'bonk' | 'climb' | 'tubrub' | 'noticed' | 'don'
  | Mood

export type Pose = {
  /** The body up (negative) or down, in stage units. */
  bob: number
  /** Flatter and wider above 0, taller and thinner below. */
  squash: number
  /** The whole body leaning, in radians. */
  lean: number
  /** The head tilting, in radians. */
  head: number
  /** The arms (wings, forelegs) away from rest, in radians. */
  armL: number
  armR: number
  /** One leg lifted, 0 to 1. */
  leg: number
  ear: number
  tail: number
  /** The mouth: open 0 to 1 for pig, heron and cat; the goat's jaw goes sideways, -1 to 1. */
  jaw: number
  /** 0 open to 1 shut. */
  blink: number
  /** The funniest part: the pig's belly swing, the heron's neck stretch (0 folded to 1 straight up), the goat's beard, the cat's licking paw. */
  own: number
  /** The whole figure turning round to show itself: 0 to 1 is once round. */
  spin: number
  /** The head lifted off the shoulders, in stage units: a neck at full stretch. */
  neck: number
  /** Both arms folded in over the front, 0 to 1. */
  fold: number
  /** What it wears, hitched up (above 0) or slid down (below), in stage units. */
  hitch: number
}

export const TEMPO: Record<Who, number> = { pig: 2.7, heron: 5.6, goat: 0.86, cat: 3.9 }

const TAU = Math.PI * 2

function still(): Pose {
  return { bob: 0, squash: 0, lean: 0, head: 0, armL: 0, armR: 0, leg: 0, ear: 0, tail: 0, jaw: 0, blink: 0, own: 0, spin: 0, neck: 0, fold: 0, hitch: 0 }
}

/** A blink now and then, at a rhythm of the character's own: shut for a tenth of a second every `every` seconds, with a double one every third time. */
function blink(t: number, every: number): number {
  const phase = t % every, turn = Math.floor(t / every)
  if (phase < 0.11) return 1
  return turn % 3 === 2 && phase > 0.24 && phase < 0.33 ? 1 : 0
}

/** A quick bump that rises and falls once over `lasts` seconds, starting at `from` in a cycle of `every`. */
function bump(t: number, every: number, from: number, lasts: number): number {
  const phase = (t % every) - from
  return phase > 0 && phase < lasts ? Math.sin((phase / lasts) * Math.PI) : 0
}

/** A wobble that dies away: `swings` a second, gone after about `1 / fade` seconds. */
function wobble(age: number, swings: number, fade: number): number {
  return Math.exp(-age * fade) * Math.cos(age * swings * TAU)
}

function between(age: number, a: number, b: number): number {
  return Math.min(1, Math.max(0, (age - a) / (b - a)))
}

/** The pose of a character with nothing happening to it, at game time `t`. */
export function idle(who: Who, t: number): Pose {
  const pose = still()
  if (who === 'pig') {
    const breath = Math.sin((t / TEMPO.pig) * TAU)
    pose.squash = 0.035 * breath
    pose.bob = -2 * breath
    pose.own = 0.5 * Math.sin((t / TEMPO.pig) * TAU - 0.9)
    pose.ear = 0.5 * bump(t, 4.3, 1.1, 0.22) - 0.35 * bump(t, 6.1, 3.0, 0.18)
    pose.tail = 0.6 * Math.sin(t * 5.1) * bump(t, 5.2, 2.2, 1.4)
    pose.head = 0.05 * Math.sin((t / TEMPO.pig) * TAU * 0.5)
    pose.jaw = 0.25 * bump(t, 7.7, 5.0, 0.5)
    pose.blink = blink(t + 0.4, 3.7)
    return pose
  }
  if (who === 'heron') {
    const sway = Math.sin((t / TEMPO.heron) * TAU)
    pose.lean = 0.03 * sway
    pose.own = 0.42 + 0.1 * Math.sin((t / TEMPO.heron) * TAU + 1.3) + 0.3 * bump(t, 9.4, 6.2, 1.6)
    pose.head = 0.12 * Math.sin((t / TEMPO.heron) * TAU * 2 + 0.4)
    // It stands on one leg for a long while, then changes its mind.
    const tuck = (t % 11.2) / 11.2
    pose.leg = tuck < 0.08 ? tuck / 0.08 : tuck < 0.62 ? 1 : tuck < 0.7 ? 1 - (tuck - 0.62) / 0.08 : 0
    pose.ear = 0.3 * Math.sin(t * 1.9) * (0.4 + 0.6 * pose.leg)
    pose.armL = 0.03 * sway
    pose.blink = blink(t + 1.9, 5.3)
    return pose
  }
  if (who === 'goat') {
    const chew = Math.sin((t / TEMPO.goat) * TAU)
    // The jaw goes round sideways and stops dead now and then, mid-chew.
    const stopped = bump(t, 6.4, 4.4, 1.0) > 0
    pose.jaw = stopped ? 0.6 : chew
    pose.own = stopped ? 0 : 0.5 * Math.sin((t / TEMPO.goat) * TAU - 1.2)
    pose.head = stopped ? 0.22 : 0.03 * chew
    pose.ear = 0.7 * bump(t, 3.1, 0.6, 0.12) + 0.5 * bump(t, 3.1, 0.82, 0.12)
    pose.tail = bump(t, 2.3, 1.0, 0.15)
    pose.bob = -1.2 * Math.abs(chew)
    pose.blink = blink(t + 2.6, 4.6)
    return pose
  }
  const swing = Math.sin((t / TEMPO.cat) * TAU)
  pose.tail = 0.5 * swing
  // The paw goes up to the mouth and is licked three times, then rests.
  const wash = (t % 8.8) / 8.8
  pose.own = wash < 0.1 ? wash / 0.1 : wash < 0.42 ? 1 : wash < 0.5 ? 1 - (wash - 0.42) / 0.08 : 0
  pose.jaw = pose.own === 1 ? 0.5 + 0.5 * Math.sin(t * 9) : 0
  pose.head = pose.own === 1 ? 0.18 + 0.05 * Math.sin(t * 9) : 0.04 * swing
  pose.ear = 0.5 * bump(t, 5.9, 3.3, 0.14)
  pose.squash = 0.02 * Math.sin((t / TEMPO.cat) * TAU * 2)
  pose.blink = wash > 0.6 && wash < 0.9 ? 0.7 : blink(t + 3.1, 6.1)
  return pose
}


/** How long each character's answer to a happening runs, in seconds. */
export const LASTS: Record<Happening, number> = {
  poke: 1.3, toss: 0.7, catch: 0.8, splat: 1.5, dripped: 1.2, tickle: 0.9, pegged: 2.2, refuse: 1.6, arrive: 0.9, bonk: 1.2, climb: 1.1, tubrub: 0.7, noticed: 0.35, don: 1.6,
  strut: 1.6, trip: 1.8, plank: 1.6, preen: 1.8, shudder: 1.5, lick: 2.3, sneeze: 1.7, pleased: 1.4, patch: 1.4, squelch: 1.2, bubbly: 1.2, proud: 1.8,
}

/** One hump: up from `a` and back down by `b`. */
function hump(age: number, a: number, b: number): number {
  return Math.sin(between(age, a, b) * Math.PI)
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/**
 * What a happening adds to the idle pose, `age` seconds after it began. `variant` picks one of three ways the
 * character has of taking a poke. Writes into `pose` and returns it. Every answer has eased out by its end.
 */
export function react(who: Who, what: Happening, variant: number, age: number, pose: Pose): Pose {
  const lasts = LASTS[what]
  if (age < 0 || age > lasts) return pose
  const out = 1 - between(age, lasts - 0.25, lasts)
  const hold = between(age, 0, 0.15) * out
  if (who === 'pig') return pig(what, variant, age, out, hold, pose)
  if (who === 'heron') return heron(what, variant, age, out, hold, pose)
  if (who === 'goat') return goat(what, variant, age, out, hold, pose)
  // The cat takes everything the same way but a poke: it only turns an ear.
  if (what === 'poke') {
    pose.squash -= 0.2 * hump(age, 0, 0.3) * (variant === 1 ? 0 : 1)
    pose.tail += 1.1 * wobble(age, 2.2, 2) * out
    pose.jaw = Math.max(pose.jaw, age < 0.4 && variant !== 1 ? 1 : 0)
    pose.head += (variant === 2 ? -0.25 : 0.2) * out
    if (variant === 1) pose.blink = 1
  } else {
    pose.ear += 0.9 * wobble(age, 6, 3) * out
  }
  return pose
}

function pig(what: Happening, variant: number, age: number, out: number, hold: number, pose: Pose): Pose {
  switch (what) {
    case 'poke':
      // Jelly: the whole pig wobbles like a pudding and the belly swings after it.
      pose.squash += 0.22 * wobble(age, 3.2, 3.2) * (variant === 1 ? 0.5 : 1) * out
      pose.own += 1.4 * wobble(age + 0.08, 3.2, 2.4) * out
      if (variant === 1) pose.bob -= 46 * hump(age, 0, 0.5)
      if (variant === 1) pose.ear += 0.9 * Math.sin(age * 22) * out
      if (variant === 2) pose.tail += 2.2 * Math.sin(age * 26) * out
      if (variant === 2) pose.head -= 0.3 * hump(age, 0, 0.9)
      pose.jaw = Math.max(pose.jaw, hump(age, 0, 0.5))
      break
    case 'toss':
      pose.lean += 0.14 * hump(age, 0, 0.16) - 0.2 * hump(age, 0.16, 0.7)
      pose.armL -= 1.3 * hump(age, 0.1, 0.7)
      pose.armR -= 1.3 * hump(age, 0.1, 0.7)
      pose.squash += 0.1 * wobble(Math.max(0, age - 0.2), 4, 5) * out
      break
    case 'catch':
      pose.squash += 0.18 * wobble(age, 3.6, 4) * out
      pose.armL -= 0.5 * (1 - between(age, 0, 0.4))
      pose.armR -= 0.5 * (1 - between(age, 0, 0.4))
      pose.own += 0.8 * wobble(age, 3.6, 3) * out
      break
    case 'splat':
      // Splashed, and it likes it: snout up and a wriggle from side to side.
      pose.head -= 0.34 * hold
      pose.lean += 0.12 * Math.sin(age * 15) * out
      pose.tail += 1.8 * Math.sin(age * 30) * out
      pose.own += 0.9 * Math.sin(age * 15 + 1) * out
      pose.jaw = Math.max(pose.jaw, 0.8 * out)
      break
    case 'dripped':
      // A drop from the line: it lifts its snout to it and its ears flap.
      pose.head -= 0.3 * hold
      pose.bob -= 6 * hump(age, 0, 0.5)
      pose.ear += 0.8 * Math.sin(age * 18) * out
      pose.own += 1.2 * Math.sin(age * 10) * out
      break
    case 'tickle':
      pose.squash += 0.12 * Math.sin(age * 30) * out
      pose.lean += 0.08 * Math.sin(age * 24) * out
      pose.own += 1.2 * Math.sin(age * 30 + 1) * out
      pose.tail += 2 * Math.sin(age * 34) * out
      pose.jaw = Math.max(pose.jaw, out)
      break
    case 'pegged':
      // It holds quite still with the peg on its ear, then one flick of the ear sends it off.
      pose.squash *= 1 - hold
      pose.own *= 1 - hold
      pose.head += 0.16 * hold
      pose.ear += 2.2 * hump(age, 1.7, 1.95)
      break
    case 'refuse':
      pose.fold = hold
      pose.squash += 0.05 * hold
      pose.head += 0.08 * Math.sin(age * 12) * out
      break
    case 'arrive':
      pose.armL -= 0.5 * hump(age, 0, 0.6)
      pose.squash += 0.12 * wobble(age, 3, 4) * out
      break
    case 'bonk':
      pose.squash += 0.25 * wobble(age, 4, 4) * out
      pose.own += 1.3 * wobble(age, 4, 3) * out
      if (age < 0.3) pose.blink = 1
      break
    case 'climb':
      // A belly-flop.
      pose.bob -= 70 * hump(age, 0, 0.45)
      pose.squash += 0.3 * wobble(Math.max(0, age - 0.45), 3, 4) * (age > 0.45 ? out : 0)
      pose.armL -= 1.2 * hump(age, 0, 0.5)
      pose.armR -= 1.2 * hump(age, 0, 0.5)
      break
    case 'tubrub':
      // Up to its snout, blowing bubbles.
      pose.jaw = Math.max(pose.jaw, hump(age, 0, 0.7))
      pose.bob += 3 * Math.sin(age * 20) * out
      pose.ear += 0.6 * Math.sin(age * 20) * out
      break
    case 'noticed':
      pose.squash += 0.06 * hump(age, 0, 0.35)
      pose.ear += 0.5 * hump(age, 0, 0.35)
      break
    case 'don':
      pose.armL -= 1.6 * hump(age, 0, 1.5)
      pose.armR -= 1.6 * hump(age, 0, 1.5)
      pose.squash -= 0.05 * hold
      break
    case 'strut':
      // It squeezes in, sucks in its belly and struts on the spot with its snout up.
      pose.squash -= 0.14 * hold
      pose.own *= 1 - hold
      pose.head -= 0.2 * hold
      pose.bob -= 8 * Math.abs(Math.sin(age * 9)) * between(age, 0.5, 0.7) * out
      pose.lean += 0.07 * Math.sin(age * 9) * between(age, 0.5, 0.7) * out
      pose.tail += 1.5 * Math.sin(age * 20) * out
      break
    case 'trip': {
      // It hitches the thing up, it slides down, and the pig trips on the hem and sits down with a bump.
      pose.armL -= 0.9 * hump(age, 0, 0.5)
      pose.armR -= 0.9 * hump(age, 0, 0.5)
      // The thing goes up with the arms, slides down past where it was, and stays down round its ankles until it is up again.
      pose.hitch = 26 * hump(age, 0, 0.5) - 20 * between(age, 0.5, 0.7) * out
      pose.lean += 0.3 * hump(age, 0.55, 0.85)
      const sat = between(age, 0.75, 0.85) * out
      pose.bob += 46 * sat
      pose.squash += (0.1 + 0.2 * wobble(Math.max(0, age - 0.85), 3.5, 4)) * sat
      pose.own += 1.5 * wobble(Math.max(0, age - 0.85), 3.5, 3) * sat
      pose.jaw = Math.max(pose.jaw, hump(age, 0.8, 1.2))
      if (age > 0.8 && age < 1.1) pose.blink = 1
      break
    }
    case 'patch':
      pose.head += 0.35 * hold
      pose.ear -= 0.6 * hold
      break
    case 'squelch':
      pose.bob += 6 * Math.sin(age * 14) * out
      pose.squash += 0.1 * Math.sin(age * 14) * out
      pose.tail += 1.6 * Math.sin(age * 22) * out
      break
    case 'bubbly':
      pose.head -= 0.2 * Math.sin(age * 4) * out
      pose.jaw = Math.max(pose.jaw, 0.5 * hold)
      pose.ear += 0.6 * Math.sin(age * 9) * out
      break
    case 'proud':
      pose.squash -= 0.08 * hold
      pose.bob -= 8 * hold
      pose.armL -= 0.3 * hold
      pose.armR -= 0.3 * hold
      pose.spin = smooth(between(age, 0.5, 1.4))
      break
    default:
      break
  }
  return pose
}

function heron(what: Happening, variant: number, age: number, out: number, hold: number, pose: Pose): Pose {
  switch (what) {
    case 'poke': {
      // The neck shoots straight up and comes down slowly, like a jack-in-the-box wound back in.
      const up = variant === 1 ? 0.35 : 1
      pose.own += (1 - pose.own) * up * (age < 0.09 ? age / 0.09 : 1 - between(age, 0.5, 1.3))
      pose.armL -= 1.1 * hump(age, 0, 0.45) * (variant === 2 ? 0.3 : 1)
      pose.armR += 1.1 * hump(age, 0, 0.45) * (variant === 2 ? 0.3 : 1)
      if (variant === 1) pose.lean += 0.05 * Math.sin(age * 58) * out
      if (variant === 2) pose.bob -= 30 * Math.abs(Math.sin(age * 9)) * out
      if (variant === 2) pose.leg = Math.max(pose.leg, out)
      pose.jaw = Math.max(pose.jaw, age < 0.3 ? 1 : 0)
      pose.ear += 1.2 * out
      break
    }
    case 'toss':
      // It does not throw: it flicks the thing away with one wing and looks elsewhere.
      pose.armL -= 1.9 * hump(age, 0.05, 0.4)
      pose.head += 0.3 * hump(age, 0.2, 0.7)
      pose.own += 0.2 * hump(age, 0, 0.7)
      break
    case 'catch':
      pose.own -= 0.3 * hump(age, 0, 0.5)
      pose.armL -= 0.8 * (1 - between(age, 0, 0.5))
      pose.lean -= 0.08 * wobble(age, 2, 4) * out
      break
    case 'splat':
      // Splashed, and it hates it: a leg comes up, a wing goes over the head, and it shivers.
      pose.leg = Math.max(pose.leg, out)
      pose.armR += 2.0 * hold
      pose.lean += 0.04 * Math.sin(age * 64) * out
      pose.own -= 0.25 * out
      pose.ear += 1.4 * out
      pose.jaw = Math.max(pose.jaw, 0.5 + 0.5 * Math.sin(age * 44)) * out
      break
    case 'dripped':
      // One wing opens over its head and it glares up at the line.
      pose.armR += 2.3 * hold
      pose.head -= 0.5 * hold
      pose.own += 0.2 * hold
      pose.ear += 1.2 * hold
      break
    case 'tickle':
      pose.own += 0.25 * Math.sin(age * 26) * out
      pose.lean += 0.05 * Math.sin(age * 30) * out
      pose.leg = Math.max(pose.leg, Math.abs(Math.sin(age * 12)) * out)
      pose.jaw = Math.max(pose.jaw, (0.5 + 0.5 * Math.sin(age * 40)) * out)
      break
    case 'pegged':
      // It holds its head quite still, cross-eyed at the peg on its beak, then shakes it off.
      pose.head *= 1 - hold
      pose.own += 0.15 * hold
      pose.head += 0.5 * Math.sin((age - 1.7) * 40) * hump(age, 1.7, 2.0)
      break
    case 'refuse':
      pose.fold = hold
      pose.own -= 0.3 * hold
      pose.head += 0.25 * hold
      break
    case 'arrive':
      pose.armL -= 0.4 * hump(age, 0, 0.6)
      pose.own += 0.3 * hump(age, 0, 0.8)
      break
    case 'bonk':
      // The neck goes down like a spring and comes back.
      pose.own -= 0.5 * wobble(age, 3, 3) * out
      pose.ear -= 1.0 * hold
      if (age < 0.3) pose.blink = 1
      break
    case 'climb':
      // One careful foot first.
      pose.leg = Math.max(pose.leg, hump(age, 0, 0.8))
      pose.bob -= 10 * hump(age, 0, 0.8)
      pose.own += 0.3 * hump(age, 0, 0.8)
      break
    case 'tubrub':
      // On one leg, and a shriek.
      pose.leg = Math.max(pose.leg, out)
      pose.own += 0.6 * hump(age, 0, 0.3)
      pose.jaw = Math.max(pose.jaw, hump(age, 0, 0.5))
      pose.armL -= 0.8 * hump(age, 0, 0.5)
      pose.armR += 0.8 * hump(age, 0, 0.5)
      break
    case 'noticed':
      pose.own += 0.15 * hump(age, 0, 0.35)
      pose.ear += 0.6 * hump(age, 0, 0.35)
      break
    case 'don':
      pose.armL -= 1.3 * hump(age, 0, 1.5)
      pose.armR += 1.3 * hump(age, 0, 1.5)
      pose.own += 0.2 * hold
      break
    case 'plank':
      // Its wings will not fold: it stands as stiff as a plank and rocks from foot to foot.
      pose.armL -= 1.2 * hold
      pose.armR += 1.2 * hold
      pose.own += (1 - pose.own) * hold
      pose.head *= 1 - hold
      pose.leg *= 1 - hold
      pose.lean += 0.12 * Math.sin(age * 7) * out * between(age, 0.3, 0.5)
      break
    case 'preen':
      // Up to its full height, then it draws its beak down the thing, twice.
      pose.own += (1 - pose.own) * hold
      pose.bob -= 6 * hold
      pose.ear += 1.2 * hold
      pose.head += 0.5 * Math.sin(age * 8) * between(age, 0.6, 0.8) * out
      pose.armL -= 0.3 * hold
      break
    case 'shudder':
      // Wings out stiff, and it shudders the drops off with a rattle of its beak.
      // A damp thing with sleeves (variant 1) is the worst: the wings go wider and the whole bird shakes.
      pose.armL -= (variant === 1 ? 1.9 : 1.5) * hold
      pose.armR += (variant === 1 ? 1.9 : 1.5) * hold
      pose.lean += (variant === 1 ? 0.09 : 0.05) * Math.sin(age * 70) * out
      if (variant === 1) pose.bob += 5 * Math.sin(age * 61) * out
      pose.own -= 0.2 * hold
      pose.jaw = Math.max(pose.jaw, (0.5 + 0.5 * Math.sin(age * 44)) * out)
      break
    case 'patch':
      pose.head += 0.5 * hold
      pose.own -= 0.35 * hold
      pose.ear -= 0.5 * hold
      break
    case 'squelch':
      pose.leg = Math.max(pose.leg, Math.abs(Math.sin(age * 10)) * out)
      pose.lean += 0.03 * Math.sin(age * 20) * out
      break
    case 'bubbly':
      pose.jaw = Math.max(pose.jaw, hump(age, 0.3, 0.5) + hump(age, 0.8, 1.0))
      pose.own += 0.3 * hump(age, 0.2, 1.0)
      pose.head -= 0.3 * hold
      break
    case 'proud':
      pose.own += (1 - pose.own) * hold
      pose.ear += 1.5 * hold
      pose.armL -= 0.2 * hold
      pose.spin = smooth(between(age, 0.5, 1.4))
      break
    default:
      break
  }
  return pose
}

function goat(what: Happening, variant: number, age: number, out: number, hold: number, pose: Pose): Pose {
  switch (what) {
    case 'poke': {
      // A stiff-legged jump straight up, all four at once, and the beard arrives late.
      const jump = hump(age, 0.05, 0.5)
      pose.bob -= (variant === 2 ? 28 : 64) * jump
      pose.squash -= 0.1 * jump - 0.16 * wobble(Math.max(0, age - 0.5), 5, 7) * (age > 0.5 ? out : 0)
      pose.own += 1.6 * Math.sin(between(age, 0.15, 0.8) * TAU) * out
      pose.ear += 1.0 * jump
      if (variant === 1) pose.head += 0.4 * (age < 0.6 ? between(age, 0, 0.1) : out)
      if (variant === 2) pose.lean += 0.2 * hump(age, 0, 0.35) - 0.08 * hump(age, 0.35, 1)
      pose.jaw = age < 0.6 ? 0 : pose.jaw
      break
    }
    case 'toss':
      // A butt of the head sends it off.
      pose.lean -= 0.12 * hump(age, 0, 0.14)
      pose.lean += 0.3 * hump(age, 0.14, 0.5)
      pose.head += 0.3 * hump(age, 0.14, 0.5)
      pose.armL -= 0.9 * hump(age, 0.1, 0.5)
      pose.armR -= 0.9 * hump(age, 0.1, 0.5)
      pose.own += 1.2 * wobble(Math.max(0, age - 0.3), 4, 5) * out
      break
    case 'catch':
      pose.bob += 8 * wobble(age, 5, 6) * out
      pose.armL -= 0.7 * (1 - between(age, 0, 0.3))
      pose.armR -= 0.7 * (1 - between(age, 0, 0.3))
      pose.tail += out
      break
    case 'splat': {
      // It smells the mud: the head goes back, holds, and the sneeze throws it forward.
      const back = between(age, 0, 0.3) * (1 - between(age, 0.34, 0.4))
      const thrown = age > 0.36 ? wobble(age - 0.36, 3, 4) * out : 0
      pose.head += -0.42 * back + 0.5 * thrown
      pose.bob += 16 * thrown
      pose.own += 1.5 * thrown
      pose.ear += 1.2 * thrown
      pose.jaw = age < 0.36 ? 0 : pose.jaw
      pose.blink = age > 0.3 && age < 0.6 ? 1 : pose.blink
      break
    }
    case 'dripped':
      // It shakes its head until its ears and its beard fly.
      pose.head += 0.3 * Math.sin(age * 22) * out
      pose.ear += 1.5 * Math.sin(age * 22 + 1) * out
      pose.own += 1.4 * Math.sin(age * 22 - 1) * out
      break
    case 'tickle':
      pose.bob -= 14 * Math.abs(Math.sin(age * 16)) * out
      pose.own += 1.5 * Math.sin(age * 20) * out
      pose.jaw = Math.sin(age * 25) * out
      pose.tail += out
      break
    case 'pegged':
      // It looks down its nose at the peg on its beard, then one flick of the beard sends it off.
      pose.head += 0.2 * hold - 0.3 * hump(age, 1.7, 1.95)
      pose.jaw *= 1 - hold
      pose.own *= 1 - hold
      pose.own += 2.5 * hump(age, 1.7, 1.95)
      break
    case 'refuse':
      pose.fold = hold
      pose.head -= 0.25 * hold
      pose.bob -= 8 * hump(age, 0.3, 0.5)
      break
    case 'arrive':
      pose.lean -= 0.15 * hump(age, 0, 0.4)
      pose.bob += 6 * wobble(age, 4, 5) * out
      pose.armL -= 0.4 * hump(age, 0, 0.6)
      break
    case 'bonk':
      pose.head += 0.4 * wobble(age, 3, 3) * out
      pose.ear += 1.2 * wobble(age, 3, 2.5) * out
      if (age < 0.3) pose.blink = 1
      break
    case 'climb':
      // A hop, all four at once.
      pose.bob -= 60 * hump(age, 0, 0.5)
      pose.squash += 0.2 * wobble(Math.max(0, age - 0.5), 4, 5) * (age > 0.5 ? out : 0)
      break
    case 'tubrub':
      // A mouthful of suds, and a hiccup.
      pose.jaw = age < 0.4 ? Math.sin(age * 30) : pose.jaw * out
      pose.bob -= 18 * hump(age, 0.3, 0.48)
      pose.own += 1.5 * hump(age, 0.3, 0.54)
      break
    case 'noticed':
      pose.ear += hump(age, 0, 0.35)
      pose.head += 0.1 * hump(age, 0, 0.35)
      break
    case 'don':
      pose.armL -= 1.2 * hump(age, 0, 1.5)
      pose.armR -= 1.2 * hump(age, 0, 1.5)
      pose.head -= 0.2 * hold
      break
    case 'lick':
      // Head down to the suds, a chew, and then a hiccup for each bubble: each lifts it off its feet and flings its beard.
      pose.head += 0.45 * hump(age, 0, 0.4)
      pose.jaw = age > 0.4 && age < 0.85 ? Math.sin(age * 28) : pose.jaw
      for (const at of HICCUPS) {
        pose.bob -= 22 * hump(age, at, at + 0.18)
        pose.own += 1.6 * hump(age, at, at + 0.28)
        pose.head -= 0.12 * hump(age, at, at + 0.18)
        if (age > at && age < at + 0.14) { pose.blink = 1; pose.jaw = 0.9 }
      }
      break
    case 'sneeze': {
      // The sneeze. After it the goat turns its nose away and wears the thing at the full stretch of its neck: that
      // lasts as long as the thing is on it, so it is no part of this answer (`stretched`).
      const back = between(age, 0, 0.3) * (1 - between(age, 0.34, 0.4))
      const thrown = age > 0.36 ? wobble(age - 0.36, 3, 5) * out : 0
      pose.head += -0.42 * back + 0.5 * thrown
      pose.own += 1.5 * thrown
      pose.blink = age > 0.3 && age < 0.6 ? 1 : pose.blink
      break
    }
    case 'pleased':
      pose.neck += 14 * hold
      pose.head += 0.15 * Math.sin(age * 5) * out
      pose.tail += 1.5 * Math.sin(age * 14) * out
      pose.ear += 0.8 * hold
      break
    case 'patch':
      pose.head += 0.3 * hold
      pose.ear -= 0.8 * hold
      break
    case 'squelch':
      pose.bob -= 10 * Math.abs(Math.sin(age * 12)) * out
      pose.tail += Math.sin(age * 18) * out
      break
    case 'bubbly':
      pose.jaw = Math.sin(age * 20) * out
      pose.ear += Math.sin(age * 10) * out
      break
    case 'proud':
      pose.neck += 10 * hold
      pose.squash -= 0.06 * hold
      pose.tail += hold
      pose.spin = smooth(between(age, 0.5, 1.4))
      break
    default:
      break
  }
  return pose
}

/** How long a garment takes to go on, in seconds. */
export const DON_S = 1.5
/** When, in the seconds a jumper takes to go on, the head pops through: until then it sticks halfway, over the head. */
export const THWOP = 0.8
/** When, in the seconds the dungarees take to go on, each strap pings up over its shoulder. */
export const STRAPS: readonly [number, number] = [1.0, 1.14]

/** When in its answer to a soapy thing the goat hiccups, in seconds: once for each bubble. */
export const HICCUPS: readonly number[] = [0.9, 1.3, 1.7]
/** When in the sneeze the goat has turned its nose away and its neck goes up. */
export const SNEEZED = 0.7
/** How far the goat's head is from its shoulders at the full stretch of its neck, in stage units. */
export const STRETCH = 38

/** The goat in a muddy thing: its nose turned away and its neck at full stretch, `by` of the way (0 to 1). Writes into `pose`. */
export function stretched(pose: Pose, by: number): Pose {
  pose.neck += STRETCH * by
  pose.head -= 0.3 * by
  return pose
}

/** Picks which of `count` variants comes next, never the one before. `r` is a number from 0 to 1. */
export function nextVariant(last: number, count: number, r: number): number {
  const step = 1 + Math.min(count - 2, Math.floor(r * (count - 1)))
  return last < 0 ? Math.min(count - 1, Math.floor(r * count)) : (last + step) % count
}

/** How many steps each kind takes to cross the yard: the pig shuffles, the heron stalks, the goat trots. */
export const STRIDE: Record<FriendKind, number> = { pig: 34, heron: 96, goat: 52 }

/**
 * A friend walking, each in its own walk. `steps` counts its steps so far, with a fraction. The pig shuffles with
 * its knees together and its belly swinging, the heron stalks one long leg at a time with its neck pumping, and
 * the goat trots in quick double beats with its tail up. A heron in a tight thing (`stiff`) cannot fold its wings and
 * walks as stiff as a plank: wings out, no knee, no neck, rocking from foot to foot. Writes into `pose` and returns it.
 */
export function walk(who: FriendKind, steps: number, pose: Pose, stiff = false): Pose {
  const swing = Math.sin(steps * Math.PI)
  if (who === 'heron' && stiff) {
    pose.armL -= 1.2
    pose.armR += 1.2
    pose.own = 1
    pose.head = 0
    pose.leg = 0
    pose.lean += 0.14 * swing
    pose.bob -= 3 * Math.abs(swing)
    return pose
  }
  if (who === 'pig') {
    pose.lean += 0.07 * swing
    pose.bob -= 3 * Math.abs(swing)
    pose.own += 1.1 * Math.sin(steps * Math.PI - 1)
    pose.tail += 0.8 * swing
  } else if (who === 'heron') {
    pose.leg = Math.max(0, swing)
    pose.bob -= 6 * Math.max(0, swing)
    pose.own += 0.25 * Math.sin(steps * Math.PI + 1.5)
    pose.head += 0.08 * swing
  } else {
    pose.bob -= 10 * Math.abs(Math.sin(steps * TAU))
    pose.head += 0.1 * Math.sin(steps * TAU)
    pose.tail += 1
    pose.ear += 0.6 * Math.sin(steps * TAU)
    pose.own += 0.8 * Math.sin(steps * TAU - 1)
  }
  return pose
}

// --- The garments at their stations ------------------------------------------

/**
 * How a hanging or floating thing is drawn against where it rests: moved, turned, stretched. `bobble` is the hat's
 * bobble, -1 to 1. `sleeves` is how far each of the shirt's sleeves hangs out from straight down, left and right,
 * in radians: `SLEEVE` as the shirt is cut, more when it is lifted, below 0 when it is swung in across the front.
 */
export type Hang = { dx: number; dy: number; turn: number; sx: number; sy: number; bobble: number; sleeves: [number, number] }

/** How far out from straight down a sleeve of the shirt lies as the shirt is cut. */
export const SLEEVE = 0.81
/** Swung in this far, the two cuffs lie one over the other in front of the shirt. */
export const SLEEVES_IN = -1
/** When the shirt's sleeves clap, in seconds from the first clap: the three claps its voice on the line has. */
export const CLAPS: readonly number[] = [0, 0.16, 0.34]

function hang(): Hang {
  return { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, bobble: 0, sleeves: [SLEEVE, SLEEVE] }
}

/**
 * A garment in the tub, `age` seconds after it was dropped in, at game time `t`. The sock floats toe up and
 * turns once; the shirt's sleeves spread; the dungarees sink straight down; the jumper swells; the hat floats
 * upside down, tips and goes under (its bobble is left up as a float, which the view draws); the scarf swims once round the tub.
 */
export function tubPose(kind: Kind, age: number, t: number): Hang {
  const pose = hang()
  if (kind === 'sock') {
    pose.turn = -2 + TAU * smooth(age / 1.6)
    pose.dy = 3 * Math.sin(t * 2)
  } else if (kind === 'shirt') {
    // The sleeves float up and spread like arms, and wave a little on the water; the body fills.
    const up = smooth(age / 1.4)
    pose.sleeves = [SLEEVE + (2 - SLEEVE) * up + 0.12 * Math.sin(t * 1.3), SLEEVE + (2 - SLEEVE) * up + 0.12 * Math.sin(t * 1.1 + 2)]
    pose.sx = 0.9 + 0.14 * up
    pose.sy = 0.72 + 0.12 * up
    pose.dy = 2 * Math.sin(t * 1.1)
    pose.turn = 0.05 * Math.sin(t * 0.7)
  } else if (kind === 'dungarees') {
    pose.dy = 30 * smooth(age / 0.5)
  } else if (kind === 'jumper') {
    pose.sx = pose.sy = 1 + 0.4 * smooth(age / 1.6)
    pose.dy = 4 + 1.5 * Math.sin(t * 0.9)
  } else if (kind === 'hat') {
    pose.turn = Math.PI + 0.9 * smooth((age - 1.2) / 0.5)
    pose.dy = age < 1.2 ? 2 * Math.sin(t * 3) : 34 * smooth((age - 1.4) / 0.6)
  } else {
    const round = TAU * smooth(age / 2.4)
    pose.dx = (Math.cos(round) - 1) * 126
    pose.dy = Math.sin(round) * 18
    pose.turn = Math.sin(round) * 0.6 + 0.04 * Math.sin(t * 1.6)
    // It uncoils: short as it lands, and out to its whole length as it sets off round the tub.
    pose.sx = 0.45 + 0.65 * smooth(age / 0.8)
  }
  return pose
}

/**
 * A garment on the rail, wrung `twist` of the way (0 to 1). The sock goes to a tight screw, the shirt's sleeves
 * wind round each other, the dungarees hardly give, the jumper sags, the hat is squeezed flat like a sponge and
 * the scarf becomes a rope.
 */
export function railPose(kind: Kind, twist: number): Hang {
  const pose = hang()
  if (kind === 'sock') { pose.sx = 1 - 0.6 * twist; pose.turn = 0.6 * twist }
  else if (kind === 'shirt') {
    // The sleeves swing in across the front until one cuff lies over the other, wound together.
    const wound = SLEEVE + (SLEEVES_IN - SLEEVE) * smooth(twist)
    pose.sleeves = [wound, wound]
    pose.sx = 1 - 0.35 * twist; pose.sy = 1 + 0.1 * twist; pose.turn = -0.15 * twist
  }
  else if (kind === 'dungarees') pose.sx = 1 - 0.12 * twist
  else if (kind === 'jumper') { pose.sx = 1 - 0.3 * twist; pose.sy = 1 + 0.2 * twist }
  else if (kind === 'hat') { pose.sx = 1 + 0.25 * twist; pose.sy = 1 - 0.45 * twist }
  else { pose.sx = 1 - 0.7 * twist; pose.sy = 1 + 0.25 * twist; pose.turn = 0.25 * twist }
  return pose
}

/**
 * A garment on the line at game time `t`. `wind` is -1 to 1, `gust` the seconds since the last gust began, `wet`
 * its water in tenths, and `left`, `right` whether each of its pegs is on. The sock spins by its toe, the shirt's
 * sleeves wave, the dungarees hang heavy, the jumper stretches down with its water, the hat swings like a bell
 * and its bobble knocks, and the scarf lifts out flat like a flag. One peg hangs it crooked.
 */
export function linePose(kind: Kind, t: number, wind: number, gust: number, wet: number, left: boolean, right: boolean, clap = -1): Hang {
  const pose = hang()
  if (kind === 'sock') {
    pose.turn = 2.6 + 0.25 * wind + (gust < 0.9 ? TAU * smooth(gust / 0.9) : 0)
  } else if (kind === 'shirt') {
    pose.turn = 0.05 * wind
    // The sleeves wave in the wind, each at its own beat, and clap against each other: `clap` is the seconds since
    // the first of its three claps, or below 0 when it is not clapping.
    let meet = 0
    if (clap >= 0) for (const at of CLAPS) meet = Math.max(meet, hump(clap, at - 0.07, at + 0.07))
    const wave = 0.2 + 0.25 * Math.abs(wind)
    pose.sleeves = [SLEEVE + wave * Math.sin(t * 5.2), SLEEVE + wave * Math.sin(t * 4.3 + 1.9)].map((out) => out + (SLEEVES_IN - out) * meet) as [number, number]
  } else if (kind === 'dungarees') {
    pose.dy = 10
    pose.turn = 0.02 * wind
  } else if (kind === 'jumper') {
    // Its arms nearly reach whoever stands below, and no further: `JUMPER_STRETCH` is held clear of every head by a test.
    pose.sy = 1 + JUMPER_STRETCH.sy * wet
    pose.dy = JUMPER_STRETCH.dy * wet
    pose.turn = 0.03 * wind
  } else if (kind === 'hat') {
    const swing = Math.sin(t * HAT_SWINGS) * hatSway(wind, gust)
    pose.turn = Math.PI + 0.32 * swing
    pose.bobble = swing
  } else {
    const lift = Math.min(1, Math.max(0, 0.35 + 0.6 * wind + (gust < 1 ? 0.5 * hump(gust, 0, 1) : 0)))
    // From hanging down from its peg to flat on the wind, and a little above.
    pose.turn = 0.8 - 1.0 * lift
    pose.sx = 1 + 0.04 * Math.sin(t * 9) * lift
  }
  if (left !== right) {
    // One peg: it hangs from that one, crooked, and swings.
    pose.dx += left ? -14 : 14
    pose.turn += (left ? 0.45 : -0.45) + 0.2 * Math.sin(t * 2.1) * (0.5 + 0.5 * Math.abs(wind))
    pose.dy += 8
  } else if (!left) {
    pose.dy += 6
  }
  return pose
}

/** How far the jumper on the line stretches down with each tenth of water in it: longer by `sy` of itself, lower by `dy` units. */
export const JUMPER_STRETCH = { sy: 0.03, dy: 1.5 }

/** The wind in the line at game time `t`, -1 to 1: a slow breath with a quicker one under it. */
/** The hat on the line swings like a bell, this fast, and its bobble knocks against the rim at the end of every swing. */
export const HAT_SWINGS = 2.4
/** A gust sets the hat swinging wide for this long (seconds): two swings at the least. */
export const HAT_GUSTED = 3
/** How wide the hat swings, 0 to 1: with the wind, and widest after a gust. */
export function hatSway(wind: number, gust: number): number {
  return Math.min(1, 0.4 + 0.6 * Math.abs(wind) + (gust < HAT_GUSTED ? 0.5 * hump(gust, 0, HAT_GUSTED) : 0))
}
/** How many times the bobble has knocked by this time: one more at the end of each swing, to one side and then the other. */
export const hatKnocks = (t: number): number => Math.floor((t * HAT_SWINGS) / Math.PI + 0.5)

export function windAt(t: number): number {
  return 0.6 * Math.sin(t * 0.9) + 0.25 * Math.sin(t * 2.3 + 1)
}

/** Seconds between two gusts. */
export const GUST_EVERY = 9
