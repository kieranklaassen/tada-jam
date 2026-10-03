import type { Who } from './orders'
import { draw, pick } from './stream'

// The five customers as numbers. Each moves like itself and like no other:
// its own tempo, its own funny part, its own small things at idle and its own
// way of taking a poke, a snip, the roller, a splat, a bite or a step, and its
// own way of leaving with what it was served. The state machine that paces
// them is shared; not one curve is. Pure: it runs on
// the seconds it is handed and a stream of its own.
//
// - The pelican: slow, heavy, deadpan. Its pouch is the funny part.
// - The twins: quick and twitchy. Their noses are the funny part.
// - The ants: tiny, brisk, in unison. Their legs are the funny part.
// - The cat: languid, superior. Its tail is the funny part.
// - The boa: slow and endless. The far end of it, which arrives late, is the funny part.

/** What the figure needs. One record for every customer, read differently by each figure. */
export type CastPose = {
  /** The body's rise, in the figure's own units, and its lean, in radians. */
  bob: number
  lean: number
  /** 0 as it is, 1 rolled flat as a page. */
  flat: number
  /** Taller than it is, as it gathers itself or springs back. */
  stretch: number
  /** The head's turn away from where it faces. */
  head: number
  mouth: number
  /** 0 open, 1 shut. Below 0 the eyes are wide. */
  lids: number
  eyeX: number
  eyeY: number
  /** The funny part: the pouch's swing, the nose's twitch, the legs' stride, the tail's curl, the far end's lag. */
  part: number
  /** A second small part: the wing, the ears, the feelers, the whiskers, the tongue. */
  bit: number
  /** 1 whole, 0 just snipped: the tuft, feather tip or whisker end that pops back. */
  tuft: number
  /** Off the ground, in the figure's own units. */
  hop: number
  /** On its way out with what it was served: 0 where it stands, 1 out of sight. */
  away: number
  /** 0 facing as it stands, 1 turned about to go. */
  turn: number
}

export type Reaction = 'flinch' | 'snip' | 'flat' | 'lick' | 'gulp' | 'step' | 'leave'
export const REACTIONS: readonly Reaction[] = ['flinch', 'snip', 'flat', 'lick', 'gulp', 'step', 'leave']
/** The longest any customer takes to leave: a second. A touch never waits for it. */
export const LEAVE_AT_MOST = 1

type Sheet = {
  /** How fast it breathes: radians a second. */
  tempo: number
  /** Its small things at idle, and the seconds each takes. */
  idle: Readonly<Record<string, number>>
  /** The seconds each reaction takes. */
  react: Readonly<Record<Reaction, number>>
  /** The shortest and longest rest between two small things. */
  rest: readonly [number, number]
}

export const SHEETS: Readonly<Record<Who, Sheet>> = {
  pelican: { tempo: 0.9, idle: { blink: 0.34, preen: 2.2, gape: 1.7, shuffle: 1.3 }, react: { flinch: 0.7, snip: 0.9, flat: 1.1, lick: 1.2, gulp: 0.9, step: 1.1, leave: 1 }, rest: [2.2, 5] },
  twins: { tempo: 2.6, idle: { sniff: 0.7, startle: 0.45, squabble: 1.1, groom: 1.3 }, react: { flinch: 0.35, snip: 0.5, flat: 0.7, lick: 0.6, gulp: 0.4, step: 0.5, leave: 0.55 }, rest: [0.6, 1.8] },
  ants: { tempo: 4.2, idle: { feelers: 0.5, drill: 0.9, aboutFace: 0.8 }, react: { flinch: 0.3, snip: 0.4, flat: 0.8, lick: 0.5, gulp: 0.35, step: 0.6, leave: 0.7 }, rest: [0.8, 2.2] },
  cat: { tempo: 0.5, idle: { slowBlink: 1.5, tailFlick: 0.4, yawn: 2.1, lookAway: 1.9 }, react: { flinch: 0.9, snip: 1.3, flat: 1.4, lick: 1.6, gulp: 0.8, step: 1.2, leave: 0.9 }, rest: [2.6, 6] },
  boa: { tempo: 0.35, idle: { tongue: 0.5, sway: 2.6, coil: 1.9 }, react: { flinch: 1.2, snip: 1.1, flat: 1.6, lick: 1.4, gulp: 1.3, step: 1.8, leave: 1 }, rest: [3, 6.5] },
}

export type Actor = {
  who: Who
  t: number
  seed: number
  idle: string | null
  idleAge: number
  rest: number
  last: string | null
  react: Reaction | null
  reactAge: number
}

export const newActor = (who: Who, seed: number): Actor => ({ who, t: (seed % 97) / 10, seed, idle: null, idleAge: 0, rest: SHEETS[who].rest[0], last: null, react: null, reactAge: 0 })

/** A reaction starts at once and replaces whatever the customer was doing. */
export function reactTo(actor: Actor, reaction: Reaction): Actor {
  return { ...actor, react: reaction, reactAge: 0, idle: null, idleAge: 0, rest: Math.max(actor.rest, SHEETS[actor.who].rest[0] / 2) }
}

/** Plays `dt` seconds: a reaction runs out, a small thing ends, and after a rest the next is chosen, never the one before. */
export function stepActor(actor: Actor, dt: number): Actor {
  const sheet = SHEETS[actor.who]
  const next: Actor = { ...actor, t: actor.t + dt }
  if (next.react) {
    next.reactAge += dt
    if (next.reactAge >= sheet.react[next.react]) next.react = null
    return next
  }
  if (next.idle) {
    next.idleAge += dt
    if (next.idleAge >= sheet.idle[next.idle]) {
      next.last = next.idle
      next.idle = null
      const pause = draw(next.seed)
      next.seed = pause.state
      next.rest = sheet.rest[0] + pause.value * (sheet.rest[1] - sheet.rest[0])
    }
    return next
  }
  next.rest -= dt
  if (next.rest <= 0) {
    const chosen = pick(next.seed, Object.keys(sheet.idle).filter((one) => one !== next.last))
    next.seed = chosen.state
    next.idle = chosen.value
    next.idleAge = 0
  }
  return next
}

const bump = (t: number): number => Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)
const ramp = (t: number, from: number, to: number): number => Math.max(0, Math.min(1, (t - from) / (to - from)))
const REST: CastPose = { bob: 0, lean: 0, flat: 0, stretch: 0, head: 0, mouth: 0, lids: 0, eyeX: 0, eyeY: 0, part: 0, bit: 0, tuft: 1, hop: 0, away: 0, turn: 0 }

/**
 * A customer's pose now. `member` is which of several bodies this is: 0 or 1 for the twins, the place in the
 * file for an ant; it sets a body a little out of step with its neighbour.
 */
export function poseOf(actor: Actor, member = 0): CastPose {
  const pose: CastPose = { ...REST }
  const t = actor.t, m = member
  const idle = actor.idle, i = idle ? actor.idleAge / SHEETS[actor.who].idle[idle] : 0
  const react = actor.react, r = react ? actor.reactAge / SHEETS[actor.who].react[react] : 0
  switch (actor.who) {
    case 'pelican': {
      // Slow and heavy: the body barely moves, and the pouch swings after it, late.
      pose.bob = 1.6 * Math.sin(t * 0.9)
      pose.part = 0.12 * Math.sin(t * 0.9 - 1.3)
      pose.lids = 0.35
      if (idle === 'blink') pose.lids = 0.35 + 0.65 * bump(i)
      if (idle === 'preen') { pose.head = -0.9 * bump(i); pose.bit = bump(ramp(i, 0.2, 0.9)); pose.lids = 0.7 }
      if (idle === 'gape') { pose.mouth = 0.8 * ramp(i, 0, 0.7) * (i < 0.86 ? 1 : 0); pose.part = 0.4 * bump(ramp(i, 0.86, 1)) }
      if (idle === 'shuffle') { pose.lean = 0.07 * Math.sin(i * Math.PI * 4); pose.hop = 2 * Math.abs(Math.sin(i * Math.PI * 4)) }
      if (react === 'flinch') { pose.stretch = 0.16 * bump(ramp(r, 0, 0.5)); pose.lids = -0.5 * (1 - r); pose.part = 0.7 * Math.sin(r * 9) * (1 - r) }
      if (react === 'snip') { pose.tuft = r < 0.55 ? 0 : ramp(r, 0.55, 0.7) * (1 + 0.3 * bump(ramp(r, 0.7, 1))); pose.eyeY = -0.9 * (1 - r); pose.lids = 0 }
      if (react === 'flat') { pose.flat = r < 0.55 ? ramp(r, 0, 0.12) : 1 - ramp(r, 0.55, 0.66); pose.stretch = 0.3 * bump(ramp(r, 0.66, 1)); pose.part = 0.6 * bump(ramp(r, 0.66, 1)) }
      if (react === 'lick') { pose.mouth = 0.5 * bump(r); pose.head = 0.35 * Math.sin(r * Math.PI * 2); pose.lids = 0.9 * bump(r) }
      if (react === 'gulp') { pose.mouth = bump(ramp(r, 0, 0.4)); pose.part = bump(ramp(r, 0.3, 1)); pose.stretch = 0.1 * bump(ramp(r, 0.3, 0.7)) }
      if (react === 'step') { pose.lean = 0.13 * Math.sin(r * Math.PI * 3); pose.hop = 3 * Math.abs(Math.sin(r * Math.PI * 3)); pose.part = 0.5 * Math.sin(r * Math.PI * 3 - 1) }
      // It waddles out at one heavy pace, rocking from foot to foot, and the pouch swings after it.
      if (react === 'leave') { pose.turn = 1; pose.away = r; pose.lean = 0.16 * Math.sin(r * Math.PI * 6); pose.hop = 4 * Math.abs(Math.sin(r * Math.PI * 6)); pose.part = 0.9 * Math.sin(r * Math.PI * 6 - 1.3); pose.lids = 0.6 }
      break
    }
    case 'twins': {
      // Quick and twitchy: the nose never stops for long, and the two are never in step.
      pose.bob = 1.2 * Math.sin(t * 2.6 + m * 1.7)
      const burst = Math.max(0, Math.sin(t * 1.3 + m * 2.4))
      pose.part = 0.5 * Math.sin(t * 17 + m * 3.1) * burst
      pose.bit = 0.15 * Math.sin(t * 2.6 + m * 1.7 - 0.6)
      if (idle === 'sniff') { pose.part = Math.sin(i * Math.PI * 12 + m); pose.head = 0.25 * bump(i) * (m ? -1 : 1) }
      if (idle === 'startle') { pose.hop = 9 * bump(ramp(i, m * 0.18, 0.6 + m * 0.18)); pose.bit = 1 - i; pose.lids = -0.6 * (1 - i) }
      if (idle === 'squabble') { pose.lean = 0.22 * Math.sin(i * Math.PI * 5) * (m ? -1 : 1); pose.mouth = 0.6 * Math.abs(Math.sin(i * Math.PI * 5 + m * 1.5)) }
      if (idle === 'groom') { pose.head = 0.7 * bump(i) * (m ? 0 : 1); pose.part = 0.3 * Math.sin(i * 40) * (m ? 1 : 0) }
      if (react === 'flinch') { pose.hop = 12 * bump(r); pose.bit = 1.2 * (1 - r); pose.lean = -0.2 * bump(r) }
      if (react === 'snip') { pose.tuft = r < 0.5 ? 0 : ramp(r, 0.5, 0.6); pose.part = Math.sin(r * 50) * (1 - r); pose.eyeX = Math.sin(r * 20) * (1 - r) }
      if (react === 'flat') { pose.flat = r < 0.5 ? 1 : 1 - ramp(r, 0.5, 0.58); pose.hop = 14 * bump(ramp(r, 0.58, 1)); pose.bit = bump(ramp(r, 0.58, 1)) }
      if (react === 'lick') { pose.mouth = Math.abs(Math.sin(r * Math.PI * 6)); pose.part = Math.sin(r * 60) }
      if (react === 'gulp') { pose.mouth = bump(r); pose.hop = 4 * bump(r) }
      if (react === 'step') { pose.hop = 7 * Math.abs(Math.sin(r * Math.PI * 4 + m)); pose.lean = 0.1 * Math.sin(r * Math.PI * 8) }
      // They scurry, one bolting first and the other after it, ears back and noses going.
      if (react === 'leave') { pose.turn = 1; pose.away = ramp(r, m * 0.3, 0.7 + m * 0.3); pose.hop = 10 * Math.abs(Math.sin(r * Math.PI * 5 + m * 1.3)); pose.part = Math.sin(r * 70 + m); pose.bit = -0.8; pose.lean = -0.25 }
      break
    }
    case 'ants': {
      // Tiny, brisk, in unison: a wave runs down the file, and the legs never rest.
      pose.bob = 0.8 * Math.sin(t * 4.2 - m * 0.7)
      pose.part = t * 4.2 - m * 0.7
      pose.bit = 0.2 * Math.sin(t * 6 - m)
      if (idle === 'feelers') pose.bit = Math.sin(i * Math.PI * 6 - m * 0.4)
      if (idle === 'drill') pose.hop = 6 * bump(ramp(i, m * 0.07, m * 0.07 + 0.3))
      if (idle === 'aboutFace') pose.head = Math.PI * bump(ramp(i, m * 0.05, m * 0.05 + 0.6))
      if (react === 'flinch') { pose.hop = 8 * bump(ramp(r, m * 0.06, m * 0.06 + 0.5)); pose.bit = 1 }
      if (react === 'snip') { pose.tuft = r < 0.5 ? 0 : 1; pose.bit = -1 + ramp(r, 0.5, 1) }
      if (react === 'flat') { pose.flat = r < 0.6 ? 1 : 1 - ramp(r, 0.6 + m * 0.03, 0.7 + m * 0.03) }
      if (react === 'lick') { pose.lean = 0.5 * Math.sin(r * Math.PI * 4 + m); pose.part = r * 40 }
      if (react === 'gulp') { pose.mouth = bump(r); pose.stretch = 0.3 * bump(r) }
      if (react === 'step') { pose.part = t * 4.2 * 2 - m * 0.7; pose.bob = 2 * Math.sin(r * Math.PI * 6 - m) }
      // They turn about as one and march off in step, every ant at the same height at the same moment.
      if (react === 'leave') { pose.turn = 1; pose.away = r; pose.part = t * 4.2 * 3; pose.bob = 2.4 * Math.sin(r * Math.PI * 8); pose.bit = 0.9 }
      break
    }
    case 'cat': {
      // Languid: almost nothing moves but the tail, which curls slowly and then flicks.
      pose.bob = 0.7 * Math.sin(t * 0.5)
      pose.part = 0.5 + 0.35 * Math.sin(t * 0.5 * 1.3) + 0.25 * Math.max(0, Math.sin(t * 0.21)) ** 12 * Math.sin(t * 19)
      pose.lids = 0.45
      if (idle === 'slowBlink') pose.lids = 0.45 + 0.55 * bump(i)
      if (idle === 'tailFlick') pose.part += 0.9 * bump(i)
      if (idle === 'yawn') { pose.mouth = bump(ramp(i, 0.15, 0.85)); pose.lids = 1; pose.stretch = 0.12 * bump(i); pose.bit = bump(i) }
      if (idle === 'lookAway') { pose.head = -0.8 * bump(ramp(i, 0, 1)); pose.lids = 0.7 }
      if (react === 'flinch') { pose.lids = -0.8 * (1 - ramp(r, 0, 0.3)) + 0.45 * ramp(r, 0.3, 1); pose.part = 1.4 * (1 - r); pose.bit = 1 - r }
      if (react === 'snip') { pose.tuft = r < 0.6 ? 0 : ramp(r, 0.6, 0.75); pose.head = -0.5 * bump(ramp(r, 0.1, 0.9)); pose.lids = 0.2; pose.eyeX = -0.8 * bump(r) }
      if (react === 'flat') { pose.flat = r < 0.6 ? 1 : 1 - ramp(r, 0.6, 0.72); pose.part = 1.6 * bump(ramp(r, 0.72, 1)); pose.lids = -0.6 * bump(ramp(r, 0.6, 1)) }
      if (react === 'lick') { pose.mouth = 0.4 * bump(r); pose.head = 0.5 * bump(ramp(r, 0, 0.5)) - 0.5 * bump(ramp(r, 0.5, 1)); pose.lids = 1; pose.bit = Math.sin(r * Math.PI * 5) }
      if (react === 'gulp') { pose.mouth = 0.7 * bump(ramp(r, 0, 0.5)); pose.lids = 0.9 }
      if (react === 'step') { pose.stretch = 0.2 * bump(ramp(r, 0, 0.5)); pose.lean = -0.08 * bump(r); pose.part = 1.1 * ramp(r, 0, 1) }
      // It does not hurry: a long stretch first, eyes shut, then it turns its back and is gone, tail straight up.
      if (react === 'leave') { pose.stretch = 0.24 * bump(ramp(r, 0, 0.35)); pose.lids = 1 - 0.4 * ramp(r, 0.3, 0.5); pose.turn = ramp(r, 0.28, 0.32); pose.away = ramp(r, 0.3, 1) ** 2; pose.part = 1.7; pose.head = -0.5 * ramp(r, 0.3, 0.5) }
      break
    }
    case 'boa': {
      // Slow and endless: a wave travels the length of it, and the far end does everything last.
      pose.bob = 2 * Math.sin(t * 0.35)
      pose.part = t * 0.35
      pose.bit = 0
      pose.lids = 0.2
      if (idle === 'tongue') pose.bit = Math.abs(Math.sin(i * Math.PI * 3))
      if (idle === 'sway') { pose.head = 0.5 * Math.sin(i * Math.PI * 2); pose.lean = 0.1 * Math.sin(i * Math.PI * 2 - 0.8) }
      if (idle === 'coil') { pose.stretch = 0.15 * bump(i); pose.part = t * 0.35 + 1.5 * bump(i) }
      if (react === 'flinch') { pose.head = -0.6 * bump(ramp(r, 0, 0.4)); pose.stretch = 0.25 * bump(ramp(r, 0.3, 1)); pose.lids = -0.7 * (1 - r) }
      if (react === 'snip') { pose.tuft = r < 0.5 ? 0 : ramp(r, 0.5, 0.65); pose.bit = 1 - r; pose.head = 0.3 * Math.sin(r * Math.PI * 3) }
      if (react === 'flat') { pose.flat = r < 0.5 ? 1 : 1 - ramp(r, 0.5, 0.9); pose.part = t * 0.35 + 3 * ramp(r, 0.5, 1) }
      if (react === 'lick') { pose.bit = Math.abs(Math.sin(r * Math.PI * 4)); pose.head = 0.4 * bump(r) }
      if (react === 'gulp') { pose.mouth = bump(ramp(r, 0, 0.3)); pose.hop = 0; pose.stretch = 0.2 * bump(ramp(r, 0.2, 1)) }
      if (react === 'step') { pose.part = t * 0.35 + 4 * r; pose.head = 0.3 * bump(r) }
      // It pours itself out head first, slowly and then all at once, and the far end is the last of it to go.
      if (react === 'leave') { pose.turn = 1; pose.away = r * r; pose.part = t * 0.35 + 8 * r; pose.head = 0.3 * Math.sin(r * Math.PI * 2); pose.bit = bump(r) }
      break
    }
  }
  return pose
}
