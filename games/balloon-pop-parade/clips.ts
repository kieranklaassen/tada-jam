import type { KindName } from './bodies'
import { copyPose, restPose, type Pose } from './pose'

// How each kind of friend moves, as numbers and nothing else. No two kinds
// share a motion: each has its own tempo, its own weight and its own funniest
// part, and its own way to stand, catch, refuse, be carried off, be startled
// by a pop and be poked (pack: game-design, characters-with-opinions.md; the
// jam's motion-personality pattern). A clip writes onto a pose that already
// holds the friend's resting life, so the two blend.
//
// Time is the attended clock's seconds. Nothing here reads a clock or draws a
// random number: the caller passes the time into the clip and a seed for the
// friend, so a test can sample any moment of any motion.

export type ClipId = 'catch' | 'refuse' | 'liftOff' | 'popped' | 'poke' | 'pokeB' | 'wave' | 'proud' | 'march'

export type Personality = {
  /** Breaths a second at rest, and how deep. */
  breath: number
  depth: number
  /** Seconds between blinks. */
  blinkEvery: number
  /** How long each clip lasts, in seconds. */
  lasts: Record<ClipId, number>
  /**
   * Moments inside a clip that something else waits for: `hit`, when the refused balloon is struck; `grab`, when a
   * caught string is in hand; `letGo`, when a friend that was carried off lets the bunch go; `land`, when it is
   * back on the hill.
   */
  cue: { hit: number; grab: number; letGo: number; land: number }
  /** How high a lift-off carries it, in its own heights: the hippo barely leaves the ground. */
  carried: number
  /** How long it takes to walk from the edge to the middle, in seconds, and how many steps (or hops) that is. */
  walk: number
  steps: number
}

export const PERSONALITIES: Record<KindName, Personality> = {
  duck: { breath: 0.42, depth: 0.02, blinkEvery: 2.6, lasts: { catch: 0.7, refuse: 1.0, liftOff: 1.9, popped: 0.9, poke: 0.6, pokeB: 0.75, wave: 0.7, proud: 1.1, march: 1.3 }, cue: { hit: 0.56, grab: 0.1, letGo: 1.0, land: 1.3 }, carried: 0.75, walk: 1.3, steps: 6 },
  frog: { breath: 0.22, depth: 0.012, blinkEvery: 4.2, lasts: { catch: 0.85, refuse: 1.05, liftOff: 2.0, popped: 0.95, poke: 0.7, pokeB: 0.9, wave: 0.8, proud: 1.3, march: 1.6 }, cue: { hit: 0.52, grab: 0.38, letGo: 1.05, land: 1.35 }, carried: 0.9, walk: 1.5, steps: 3 },
  hippo: { breath: 0.16, depth: 0.03, blinkEvery: 5.1, lasts: { catch: 1.15, refuse: 1.3, liftOff: 2.1, popped: 1.35, poke: 0.95, pokeB: 1.3, wave: 1.1, proud: 1.6, march: 2.0 }, cue: { hit: 0.72, grab: 0.5, letGo: 1.05, land: 1.22 }, carried: 0.09, walk: 2.0, steps: 4 },
  crab: { breath: 0.6, depth: 0.014, blinkEvery: 1.9, lasts: { catch: 0.6, refuse: 0.98, liftOff: 1.8, popped: 0.86, poke: 0.5, pokeB: 0.65, wave: 0.6, proud: 0.9, march: 1.1 }, cue: { hit: 0.45, grab: 0.08, letGo: 1.0, land: 1.3 }, carried: 0.95, walk: 1.0, steps: 2 },
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** 0 before `a`, 1 after `b`, eased between. */
export function ramp(t: number, a: number, b: number): number {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** Up and down again between `a` and `b`. */
export function hump(t: number, a: number, b: number): number {
  return Math.sin(clamp01((t - a) / (b - a)) * Math.PI)
}
/** A wobble that starts at `from` and dies away: what a pillow of air does after anything happens to it. */
export function wobble(t: number, from: number, rate: number, dies: number): number {
  return t < from ? 0 : Math.sin((t - from) * rate) * Math.exp(-(t - from) * dies)
}
/** Up to 1 between `a` and `b`, held, and back down between `c` and `d`. */
export function hold(t: number, a: number, b: number, c: number, d: number): number {
  return ramp(t, a, b) * (1 - ramp(t, c, d))
}

/** A blink at this friend's own rhythm: 0 open, 1 shut. */
export function blinkAt(kind: KindName, time: number, seed: number): number {
  const every = PERSONALITIES[kind].blinkEvery
  const phase = (time / every + seed * 0.37) % 1
  const width = 0.13 / every
  return phase > 1 - width ? Math.sin(((phase - (1 - width)) / width) * Math.PI) : 0
}

/**
 * The resting life of a friend, written onto a pose whose place is already set: reaching up while it has no
 * balloon, holding the string and looking at its balloon once it has one. `reach` is how far its arms swing up.
 * `sway` is the clock its breathing and swaying run on: the same as `time`, unless something has stopped it still.
 */
export function rest(kind: KindName, holds: boolean, reach: number, time: number, seed: number, pose: Pose, sway = time): void {
  const p = PERSONALITIES[kind], t = sway + seed * 1.7
  const breath = Math.sin(t * p.breath * Math.PI * 2)
  pose.squash = 1 + breath * p.depth
  pose.blink = blinkAt(kind, time, seed)
  if (holds) {
    pose.armR = reach
    // Its free arm comes down, so a friend that has its balloon never looks like one that still reaches up. The
    // crab's claw cannot hang (`lowest` in bodies.ts): it comes down as far as it goes, low and out in front.
    pose.armL = 0.2
    pose.nod = -0.3
    // The balloon hangs to the side of its string hand, which is the child's right: a positive turn looks that way.
    pose.headTurn = 0.14
    pose.tilt = -0.07
  } else {
    pose.armL = reach
    pose.armR = reach
    pose.nod = -0.42
    pose.squash += 0.03
  }
  if (kind === 'duck') {
    // Quick and light: up on its toes, the tail never quite still.
    pose.wag = Math.sin(t * 9) * 0.16 * (0.5 + 0.5 * Math.sin(t * 0.9))
    pose.y += Math.abs(Math.sin(t * 2.6)) * 0.03
    pose.lean = Math.sin(t * 2.6) * 0.03
    if (!holds) { pose.armL += Math.sin(t * 7) * 0.1; pose.armR -= Math.sin(t * 7) * 0.1 }
  } else if (kind === 'frog') {
    // Still, with a throat that swells and sinks.
    pose.puff = 1 + (0.5 + 0.5 * Math.sin(t * 1.5)) * 0.22
    if (!holds) { pose.armL += Math.sin(t * 1.1) * 0.05; pose.armR += Math.sin(t * 1.1 + 2) * 0.05 }
  } else if (kind === 'hippo') {
    // Slow and heavy: a sway from foot to foot, the belly breathing. Its eyes are on top of its head, so it looks up without tipping back far.
    pose.nod *= 0.4
    pose.lean = Math.sin(t * 0.9) * 0.035
    pose.puff = 1 + breath * 0.05
    pose.tilt += Math.sin(t * 0.45) * 0.05
  } else {
    // Stop and go: a small step sideways, a wait, a step back; the stalks sway.
    const step = Math.floor(t * 1.3), within = (t * 1.3) % 1
    pose.x += ((step % 4 === 0 ? 1 : step % 4 === 2 ? -1 : 0) * hump(within, 0, 0.35)) * 0.07
    pose.wag = Math.sin(t * 2.3) * 0.12
    pose.puff = 1 + Math.sin(t * 3.1) * 0.03
    if (!holds) { pose.armL += hump(within, 0.5, 0.62) * -0.35; pose.armR += hump(within, 0.7, 0.82) * -0.35 }
  }
}

const scratch = restPose()
const CHANNELS = Object.keys(scratch) as (keyof Pose)[]
/** Seconds a clip takes to take over from the resting life, and to hand back to it. */
const BLEND_IN = 0.07
const BLEND_OUT = 0.14

/**
 * One clip of one kind at `t` seconds in, written onto a pose that holds the resting life. It takes over from the
 * resting life within a few frames and hands back to it at its end, so nothing snaps. `height` is the friend's
 * own height and `reach` its arms' swing.
 */
export function clip(kind: KindName, id: ClipId, t: number, height: number, reach: number, pose: Pose): void {
  const p = PERSONALITIES[kind]
  copyPose(scratch, pose)
  if (id === 'liftOff') liftOff(kind, t, height, reach, scratch, p)
  else if (kind === 'duck') duck(id, t, scratch, reach)
  else if (kind === 'frog') frog(id, t, scratch)
  else if (kind === 'hippo') hippo(id, t, scratch)
  else crab(id, t, scratch, reach)
  const weight = ramp(t, 0, BLEND_IN) * (1 - ramp(t, p.lasts[id] - BLEND_OUT, p.lasts[id]))
  for (const channel of CHANNELS) pose[channel] += (scratch[channel] - pose[channel]) * weight
}

function duck(id: ClipId, t: number, pose: Pose, reach: number): void {
  if (id === 'catch') {
    // A flap up to meet it, and the tail goes.
    pose.y += hump(t, 0.02, 0.34) * 0.42
    pose.squash += hump(t, 0.02, 0.3) * 0.12 - hump(t, 0.32, 0.46) * 0.2 + wobble(t, 0.46, 30, 9) * 0.08
    pose.armL = 0.2 + hump(t, 0, 0.3) * 1.6
    pose.nod = -0.5 + ramp(t, 0.3, 0.55) * 0.22
    pose.wag = wobble(t, 0.2, 40, 4.5) * 0.8
    pose.flick = hump(t, 0.2, 0.7) * 0.35
  } else if (id === 'refuse') {
    // A look at it and a look down at itself, from one colour to the other; a turn of the back, a swat with the tail, and round again.
    pose.headTurn = hold(t, 0, 0.14, 0.2, 0.3) * 0.5
    pose.nod = -0.1 + hump(t, 0.2, 0.4) * 0.5
    pose.armL = pose.armR = 0.3
    pose.turn = hold(t, 0.3, 0.5, 0.72, 0.96) * Math.PI
    pose.flick = hump(t, 0.48, 0.66) * 1.3
    pose.bow = hump(t, 0.46, 0.7) * -0.28
    pose.wag = wobble(t, 0.6, 34, 6) * 0.5
    pose.squash += wobble(t, 0.56, 26, 8) * 0.06
  } else if (id === 'popped') {
    // Straight up, and down on its bottom.
    pose.y += hump(t, 0, 0.42) * 0.95
    pose.armL = pose.armR = 1.5 + hump(t, 0, 0.4) * 0.6
    pose.squash += hump(t, 0, 0.2) * 0.14 - hold(t, 0.4, 0.46, 0.6, 0.85) * 0.22 + wobble(t, 0.46, 28, 7) * 0.07
    pose.bow = hold(t, 0.4, 0.48, 0.62, 0.88) * -0.3
    // Sat down, it looks at the hand that held the string, which is on the child's right.
    pose.nod = -0.1 - hold(t, 0.48, 0.58, 0.8, 0.9) * 0.2
    pose.headTurn = hold(t, 0.48, 0.58, 0.8, 0.9) * 0.45
  } else if (id === 'poke') {
    pose.squash += -hump(t, 0, 0.18) * 0.2 + wobble(t, 0.18, 30, 8) * 0.08
    pose.y += hump(t, 0.1, 0.3) * 0.08
    pose.wag = wobble(t, 0.04, 44, 6) * 0.9
    pose.lean += wobble(t, 0.05, 20, 7) * 0.08
  } else if (id === 'pokeB') {
    // The other way a duck takes a poke: a bow, bottom up, and the tail shaken at the sky.
    pose.bow = hold(t, 0, 0.14, 0.5, 0.72) * 0.42
    pose.flick = hold(t, 0.05, 0.2, 0.5, 0.7) * 1.1
    pose.wag = Math.sin(t * 40) * 0.55 * hold(t, 0.12, 0.2, 0.5, 0.66)
    pose.nod += hold(t, 0, 0.14, 0.5, 0.72) * 0.35
    pose.squash += wobble(t, 0.55, 28, 8) * 0.06
  } else if (id === 'proud') {
    // Chest out, the free wing flapped twice, the tail up.
    pose.bow = hold(t, 0, 0.2, 0.8, 1.05) * -0.22
    pose.armL = 0.2 + hump(t, 0.15, 0.4) * 1.5 + hump(t, 0.45, 0.7) * 1.5
    pose.flick = hold(t, 0.1, 0.25, 0.8, 1.0) * 0.8
    pose.wag = wobble(t, 0.2, 36, 3.5) * 0.5
    pose.y += hump(t, 0.72, 0.98) * 0.2
    pose.nod = -0.5
  } else if (id === 'march') {
    // Three quick steps on the spot, rolling from foot to foot.
    const step = marchStep(t, 1.3)
    pose.lean += Math.sin(step * Math.PI) * 0.16 * hold(t, 0, 0.1, 1.15, 1.3)
    pose.y += Math.abs(Math.sin(step * Math.PI)) * 0.12 * hold(t, 0, 0.1, 1.15, 1.3)
    pose.wag = Math.sin(step * Math.PI * 2) * 0.4
  } else {
    // A wave: one wing, quick.
    pose.armL = reach * 0.9 + Math.sin(t * 26) * 0.35 * hold(t, 0, 0.1, 0.5, 0.7)
    pose.y += hump(t, 0, 0.3) * 0.12
  }
}

function frog(id: ClipId, t: number, pose: Pose): void {
  if (id === 'catch') {
    // A crouch, the tongue out and in, then one short hop.
    pose.squash += -hold(t, 0, 0.1, 0.14, 0.22) * 0.18 + hump(t, 0.45, 0.7) * 0.1 + wobble(t, 0.7, 24, 8) * 0.06
    pose.nod = -0.55 + ramp(t, 0.38, 0.6) * 0.28
    pose.puff = 1 + hump(t, 0.38, 0.85) * 0.6
    pose.y += hump(t, 0.46, 0.72) * 0.28
    pose.armL = 0.3
  } else if (id === 'refuse') {
    // A look at it and a look down at itself, from one colour to the other; the throat blown up like a ball, and the balloon bounced off it.
    pose.headTurn = hold(t, 0, 0.14, 0.2, 0.3) * 0.4
    pose.armL = pose.armR = 0.5 + hump(t, 0.3, 0.7) * 0.5
    pose.puff = 1 + hold(t, 0.28, 0.5, 0.56, 0.74) * 0.95 + wobble(t, 0.54, 30, 6) * 0.2
    pose.bow = hump(t, 0.4, 0.66) * -0.2
    pose.squash += hump(t, 0.3, 0.52) * 0.08
    pose.nod = -0.5 + hump(t, 0.18, 0.42) * 0.8
  } else if (id === 'popped') {
    // The throat goes flat, stays flat, and swells again past where it was.
    pose.puff = 1 - hold(t, 0, 0.14, 0.5, 0.66) * 0.7 + wobble(t, 0.62, 18, 5) * 0.35
    pose.squash += -hold(t, 0, 0.12, 0.5, 0.7) * 0.16
    pose.armL = pose.armR = 0.4
    // Its eyes open again on the hand that held the string.
    pose.nod = -0.05 - hold(t, 0.5, 0.6, 0.84, 0.95) * 0.2
    pose.headTurn = hold(t, 0.5, 0.6, 0.84, 0.95) * 0.4
    pose.blink = Math.max(pose.blink, hold(t, 0.05, 0.12, 0.4, 0.5))
  } else if (id === 'poke') {
    // A crouch and a hop on the spot, arms flung wide, throat out.
    pose.y += hump(t, 0.16, 0.5) * 0.46
    pose.squash += -hump(t, 0, 0.16) * 0.22 + hump(t, 0.16, 0.36) * 0.14 + wobble(t, 0.5, 22, 7) * 0.09
    pose.armL = pose.armR = 1.3 + hump(t, 0.16, 0.5) * 0.5
    pose.puff = 1 + hump(t, 0, 0.6) * 0.7
  } else if (id === 'pokeB') {
    // The other way a frog takes a poke: it shuts its eyes and its throat goes out twice, the second time further,
    // and that one lifts it off the ground. However a frog takes a poke, it hops on the spot.
    pose.puff = 1 + hump(t, 0.04, 0.34) * 0.7 + hump(t, 0.36, 0.8) * 1.0
    pose.y += hump(t, 0.42, 0.74) * 0.34
    pose.blink = Math.max(pose.blink, hold(t, 0.02, 0.1, 0.62, 0.78))
    pose.squash += -hump(t, 0, 0.3) * 0.08 - hump(t, 0.36, 0.7) * 0.1
    pose.tilt += hump(t, 0.36, 0.85) * 0.14
  } else if (id === 'proud') {
    // It sits up tall and blows its throat right out, holds it, and lets it down with a wobble.
    pose.squash += hold(t, 0, 0.3, 0.85, 1.15) * 0.1
    pose.puff = 1 + hold(t, 0.1, 0.45, 0.85, 1.0) * 1.0 + wobble(t, 0.95, 22, 6) * 0.25
    pose.nod = -0.55
    pose.armL = 0.3 + hold(t, 0.1, 0.4, 0.85, 1.1) * 0.9
  } else if (id === 'march') {
    // Three small hops on the spot.
    const step = marchStep(t, 1.6), within = step % 1
    pose.y += hump(within, 0.2, 0.9) * 0.3 * hold(t, 0, 0.05, 1.5, 1.6)
    pose.squash += (-hump(within, 0, 0.25) * 0.12 + hump(within, 0.3, 0.7) * 0.08) * hold(t, 0, 0.05, 1.5, 1.6)
    pose.puff = 1 + hump(within, 0.2, 0.9) * 0.3
  } else {
    pose.armR = 1.2 + hold(t, 0, 0.15, 0.6, 0.8) * (1.3 + Math.sin(t * 12) * 0.25)
    pose.puff = 1 + hump(t, 0, 0.8) * 0.3
  }
}

function hippo(id: ClipId, t: number, pose: Pose): void {
  if (id === 'catch') {
    // A wide slow yawn, the string dropping in, and the head coming down on it.
    // The yawn: the jaw drops wide and the top of the head tips back, only as far as the face can still be seen.
    // The mouth is at its widest as the string drops in, and shuts on it.
    pose.jaw = hold(t, 0.04, 0.4, 0.6, 0.92) * 0.85
    pose.nod = -0.17 - hold(t, 0, 0.42, 0.55, 0.95) * 0.3
    pose.squash += hold(t, 0, 0.42, 0.55, 0.95) * 0.05
    pose.squash += hump(t, 0, 0.5) * 0.06 - hump(t, 0.5, 0.75) * 0.08 + wobble(t, 0.75, 12, 4) * 0.04
    pose.puff = 1 + wobble(t, 0.5, 13, 3.5) * 0.14
    pose.armL = 0.25
    pose.tilt += hump(t, 0.55, 1.1) * 0.12
  } else if (id === 'refuse') {
    // A look at it and a slow look down at its own belly, from one colour to the other; a long breath in, and a sneeze that folds it in half.
    pose.headTurn = hold(t, 0, 0.16, 0.22, 0.34) * 0.35
    pose.armL = pose.armR = 0.4
    pose.nod = -0.2 + hump(t, 0.2, 0.42) * 0.5 - hold(t, 0.4, 0.66, 0.68, 0.74) * 0.5 + hump(t, 0.7, 0.95) * 0.5
    pose.bow = -hold(t, 0.36, 0.66, 0.68, 0.74) * 0.16 + hump(t, 0.7, 1.0) * 0.5
    pose.squash += hold(t, 0.36, 0.66, 0.68, 0.74) * 0.1 - hump(t, 0.7, 0.9) * 0.14
    pose.puff = 1 + hold(t, 0.36, 0.66, 0.7, 0.76) * 0.18 + wobble(t, 0.72, 14, 3.5) * 0.2
  } else if (id === 'popped') {
    // It does not notice for a beat; then it looks up, slowly, to where its balloon was: over its string hand.
    pose.nod = -0.3 - hold(t, 0.45, 0.85, 1.05, 1.3) * 0.45
    pose.headTurn = hold(t, 0.45, 0.85, 1.05, 1.3) * 0.3
    pose.armL = pose.armR = 0.25 + ramp(t, 0.9, 1.3) * 0.8
    pose.tilt += hold(t, 0.5, 0.9, 1.05, 1.3) * 0.12
  } else if (id === 'poke') {
    pose.puff = 1 + wobble(t, 0, 15, 3.6) * 0.3
    pose.lean += wobble(t, 0.05, 7.5, 2.4) * 0.16
    pose.tilt += wobble(t, 0.12, 7.5, 2.4) * -0.22
    pose.squash += -hump(t, 0, 0.26) * 0.09
  } else if (id === 'pokeB') {
    // The other way a hippo takes a poke: a slow look round at whoever did it, a yawn, and back.
    pose.headTurn = hold(t, 0.1, 0.45, 0.85, 1.2) * 0.5
    pose.nod += -hold(t, 0.45, 0.7, 0.9, 1.15) * 0.45
    pose.jaw = hold(t, 0.45, 0.7, 0.9, 1.15) * 0.6
    pose.puff = 1 + wobble(t, 0, 13, 3) * 0.16
    pose.tilt += hold(t, 0.1, 0.45, 0.85, 1.2) * 0.14
  } else if (id === 'proud') {
    // Belly out, leaning back, the head tipping slowly from side to side.
    pose.bow = hold(t, 0, 0.5, 1.1, 1.5) * -0.18
    pose.puff = 1 + hold(t, 0.1, 0.6, 1.1, 1.45) * 0.26
    pose.tilt += Math.sin(t * 5.2) * 0.2 * hold(t, 0.2, 0.5, 1.2, 1.5)
    pose.armL = 0.25 + hold(t, 0.2, 0.6, 1.1, 1.4) * 0.5
  } else if (id === 'march') {
    // Three heavy stomps, and the belly goes on wobbling after each.
    const step = marchStep(t, 2.0), within = step % 1
    const on = hold(t, 0, 0.1, 1.85, 2.0)
    pose.lean += Math.sin(step * Math.PI) * 0.17 * on
    pose.squash += (-hump(within, 0.75, 1.0) * 0.13 - hump(within, 0, 0.2) * 0.13) * on
    pose.puff = 1 + Math.sin(within * Math.PI * 3) * 0.22 * (1 - within) * on
    pose.y += hump(within, 0.3, 0.8) * 0.11 * on
    pose.armL = 0.3 + Math.abs(Math.sin(step * Math.PI)) * 0.7 * on
    pose.tilt += Math.sin(step * Math.PI) * -0.12 * on
  } else {
    pose.armR = 0.3 + hold(t, 0, 0.35, 0.8, 1.05) * 2.2
    pose.lean += hump(t, 0, 1.1) * -0.06
  }
}

function crab(id: ClipId, t: number, pose: Pose, reach: number): void {
  // Whatever a crab does, its claws stay up, and only one dips at a time: let down, they would stick out sideways
  // into the friend beside it, and two dipped towards each other would meet.
  if (id === 'catch') {
    // Snip, snip, and a quick shuffle.
    pose.armR = reach - hump(t, 0.02, 0.1) * 0.6 - hump(t, 0.14, 0.22) * 0.5
    pose.armL = reach - hump(t, 0.25, 0.5) * 0.5
    pose.x += Math.sin(t * 30) * 0.1 * hold(t, 0.2, 0.25, 0.4, 0.55)
    pose.puff = 1 + hump(t, 0.05, 0.5) * 0.25
  } else if (id === 'refuse') {
    // The stalks lean to look at it and dip to look at its own shell, from one colour to the other; a pinch by mistake, and the eyes shoot up.
    pose.wag = hold(t, 0.06, 0.16, 0.24, 0.32) * 0.5
    pose.armL = reach
    // The claw comes down and forwards onto the balloon, and never out towards the friend beside it.
    pose.armR = reach - hump(t, 0.37, 0.49) * 0.7
    pose.armRForward = hump(t, 0.33, 0.53) * 1.1
    pose.puff = 1 - hump(t, 0.24, 0.44) * 0.3 + hold(t, 0.46, 0.53, 0.75, 0.95) * 0.95
    pose.squash += -hump(t, 0.46, 0.58) * 0.12 + wobble(t, 0.58, 34, 9) * 0.05
  } else if (id === 'popped') {
    // It hides its eyes behind its claws, then peeks. Quick, like everything it does.
    t *= 1.22
    pose.puff = 1 - hold(t, 0, 0.12, 0.58, 0.7) * 0.75 - hold(t, 0.58, 0.7, 0.85, 1.02) * 0.3
    pose.armL = pose.armR = reach - 0.25
    pose.armLForward = pose.armRForward = hold(t, 0, 0.14, 0.62, 0.95) * 1.2
    pose.squash += -hold(t, 0, 0.1, 0.6, 0.9) * 0.12
    // The peek is at the claw that held the string: the stalks swing to it, once they are up out of the shell again.
    pose.wag = hold(t, 0.72, 0.82, 0.94, 1.04) * 0.28
  } else if (id === 'poke') {
    pose.x += hump(t, 0.04, 0.2) * 0.28 - hump(t, 0.22, 0.4) * 0.2
    pose.armL = reach - hump(t, 0.02, 0.1) * 0.5
    pose.armR = reach - hump(t, 0.1, 0.18) * 0.5
    pose.squash += wobble(t, 0, 36, 9) * 0.06
  } else if (id === 'pokeB') {
    // The other way a crab takes a poke: down flat, eyes right up, and up again with a clack of the free claw as it
    // shuffles off to the side and back. However a crab takes a poke, it shuffles sideways.
    pose.squash += -hold(t, 0, 0.1, 0.3, 0.42) * 0.24 + wobble(t, 0.42, 34, 9) * 0.06
    pose.x += -hump(t, 0.36, 0.5) * 0.26 + hump(t, 0.5, 0.62) * 0.14
    pose.puff = 1 + hold(t, 0.04, 0.14, 0.34, 0.5) * 0.8
    pose.armL = reach - Math.abs(Math.sin(t * 24)) * 0.5 * hold(t, 0.36, 0.42, 0.55, 0.62)
    pose.wag = wobble(t, 0.3, 30, 7) * 0.3
  } else if (id === 'proud') {
    // The free claw high and clacking, the eyes up on their stalks, a shimmy.
    pose.armL = reach - Math.abs(Math.sin(t * 22)) * 0.55 * hold(t, 0.05, 0.15, 0.7, 0.85)
    pose.puff = 1 + hold(t, 0.05, 0.2, 0.65, 0.85) * 0.55
    pose.x += Math.sin(t * 24) * 0.07 * hold(t, 0.1, 0.2, 0.7, 0.85)
    pose.squash += hump(t, 0.05, 0.4) * 0.07
  } else if (id === 'march') {
    // Three quick shuffles from side to side.
    const step = marchStep(t, 1.1)
    pose.x += Math.sin(step * Math.PI) * 0.16 * hold(t, 0, 0.08, 1.0, 1.1)
    pose.lean += Math.cos(step * Math.PI) * 0.07 * hold(t, 0, 0.08, 1.0, 1.1)
    pose.wag = Math.sin(step * Math.PI) * -0.3
  } else {
    // A wave: one claw clacking, a bob forwards to see who it was, a small step to the side and back.
    pose.armL = reach - Math.abs(Math.sin(t * 20)) * 0.5 * hold(t, 0, 0.08, 0.45, 0.6)
    pose.armR = reach
    pose.bow = hump(t, 0, 0.5) * 0.24
    pose.squash += -hump(t, 0, 0.3) * 0.1
    pose.x += hump(t, 0.05, 0.3) * 0.14 - hump(t, 0.3, 0.55) * 0.1
  }
}

/** How many steps of a three-step march have been taken `t` seconds into one that lasts `lasts`: 0 to 3. */
export function marchStep(t: number, lasts: number): number {
  return clamp01(t / lasts) * 3
}

/**
 * How far along a walk a friend is when `u` of its time has gone: the duck and the hippo go steadily, the frog
 * moves only while it is in the air, and the crab goes in bursts with a stop between.
 */
export function stride(kind: KindName, u: number): number {
  const steps = PERSONALITIES[kind].steps, at = clamp01(u) * steps, step = Math.min(steps - 1, Math.floor(at)), within = at - step
  if (kind === 'frog') return (step + ramp(within, 0.2, 0.85)) / steps
  if (kind === 'crab') return (step + ramp(within, 0, 0.6)) / steps
  return clamp01(u)
}

/**
 * A friend on its way somewhere, `u` of the way through its walk, going right (`direction` 1) or left (-1),
 * written onto a pose that holds its resting life. Each kind has its own gait: the duck waddles, the frog hops,
 * the hippo plods, and the crab scuttles sideways without ever turning away from the child.
 */
export function walk(kind: KindName, u: number, direction: number, pose: Pose): void {
  if (u <= 0 || u >= 1) return
  const steps = PERSONALITIES[kind].steps, at = u * steps, within = at % 1, ease = hold(u, 0, 0.08, 0.92, 1)
  // Each turns the way it goes only as far as it can between its neighbours: the narrow duck a long way, the wide
  // frog and hippo a little, the crab not at all.
  if (kind === 'duck') {
    pose.turn = direction * 1.0 * ease
    pose.lean += Math.sin(at * Math.PI) * 0.17 * ease
    pose.y += Math.abs(Math.sin(at * Math.PI)) * 0.08 * ease
    pose.wag = Math.sin(at * Math.PI * 2) * 0.45
  } else if (kind === 'frog') {
    pose.turn = direction * 0.35 * ease
    pose.y += hump(within, 0.2, 0.85) * 0.75
    pose.squash += -hump(within, 0, 0.22) * 0.16 + hump(within, 0.25, 0.6) * 0.14 - hump(within, 0.85, 1) * 0.12
    pose.puff = 1 + hump(within, 0.2, 0.85) * 0.4
  } else if (kind === 'hippo') {
    pose.turn = direction * 0.25 * ease
    pose.lean += Math.sin(at * Math.PI) * 0.08 * ease
    pose.y += hump(within, 0.2, 0.8) * 0.05
    pose.squash += -hump(within, 0.8, 1) * 0.05 - hump(within, 0, 0.2) * 0.05
    pose.puff = 1 + Math.sin(within * Math.PI * 2) * 0.09
  } else {
    pose.lean += direction * -0.12 * hold(within, 0, 0.15, 0.5, 0.65) * ease
    pose.y += Math.abs(Math.sin(within * Math.PI * 5)) * 0.04 * (within < 0.6 ? 1 : 0)
    pose.wag = direction * -0.35 * hold(within, 0, 0.15, 0.5, 0.65)
  }
  // A friend without a balloon walks with both arms down and swinging, as the troop that waits stands, and reaches
  // up as it stops. One that holds a string has that hand up and its free arm down already, and keeps them so:
  // one arm up and one down is only ever the stance of a friend that has its balloon.
  if (pose.armL > 1) {
    const swing = Math.sin(at * Math.PI) * 0.1
    pose.armL += (0.16 + swing - pose.armL) * ease
    pose.armR += (0.16 - swing - pose.armR) * ease
  }
}

/** Carried off its feet by more balloons than it should have, each kind in its own way, then let go and down again. */
function liftOff(kind: KindName, t: number, height: number, reach: number, pose: Pose, p: Personality): void {
  const { letGo, land } = p.cue
  // Up while it holds on, and down faster than it went up.
  const fall = clamp01((t - letGo) / (land - letGo))
  const up = ramp(t, 0, letGo) * (1 - fall * fall)
  pose.y += up * p.carried * height
  pose.armL = pose.armR = reach
  const down = t >= land
  if (kind === 'duck') {
    // Flapping all the way, then on its bottom.
    const flap = Math.sin(t * 34) * 0.55 * hold(t, 0.1, 0.2, letGo, land)
    pose.armL = 1.7 + flap
    pose.armR = reach
    pose.squash += up * 0.1 - (down ? hold(t, land, land + 0.05, land + 0.25, land + 0.5) * 0.24 : 0) + wobble(t, land, 26, 6) * 0.08
    pose.bow = down ? hold(t, land, land + 0.06, land + 0.3, land + 0.55) * -0.32 : up * 0.1
    pose.wag = wobble(t, land, 40, 5) * 0.7
  } else if (kind === 'frog') {
    // It hangs on by its tongue, stretched long, its arms dangling and paddling; then two bounces.
    const hangs = hold(t, 0.08, 0.2, letGo, land)
    pose.armL = reach - hangs * (reach - 0.5 - Math.sin(t * 13) * 0.25)
    pose.armR = reach - hangs * (reach - 0.5 + Math.sin(t * 13) * 0.25)
    pose.squash += up * 0.34 - hump(t, land, land + 0.14) * 0.26 - hump(t, land + 0.32, land + 0.44) * 0.14
    pose.y += hump(t, land + 0.12, land + 0.34) * 0.26
    pose.puff = 1 + up * 0.5
    pose.nod = -0.6
  } else if (kind === 'hippo') {
    // Only its toes leave the ground, trembling; then it sits down, hard.
    pose.squash += up * 0.14 - hump(t, land, land + 0.3) * 0.24 + wobble(t, land + 0.1, 11, 3.2) * 0.08
    pose.lean += Math.sin(t * 46) * 0.012 * hold(t, 0.3, 0.5, letGo, land)
    pose.bow = hold(t, land, land + 0.1, land + 0.5, land + 0.85) * -0.26
    pose.puff = 1 + wobble(t, land, 12, 2.6) * 0.3
    pose.nod = -0.5 + ramp(t, land, land + 0.3) * 0.5
  } else {
    // Round and round like a propeller, and down on its side.
    // Three whole turns, so it lands facing the child again.
    pose.turn = t < land ? ramp(t, 0, land) * Math.PI * 6 : 0
    pose.lean += hold(t, letGo, land, land + 0.15, land + 0.45) * 0.22
    pose.x += wobble(t, land, 20, 5) * 0.12
    pose.squash += -hump(t, land, land + 0.2) * 0.2
    pose.puff = 1 + up * 0.5
  }
}
