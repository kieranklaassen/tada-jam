import { sinceBeat, type Act } from './acts'
import { GOOSE, PIG, SHEEP, SHEPHERD } from './layout'
import type { Kind } from './wool'

// How each felt figure holds itself, as plain numbers for the view. Every
// figure moves like itself and shares no curve with another:
// - the sheep is slow and heavy, and its jaw and ears are the funny part;
// - the goose is quick and jerky, and its neck is;
// - the shepherd is slow and top-heavy, and his hat brim and knees are;
// - the pig is round and bouncy, and its snout and tail are.
// Time is the toy's own clock, passed in.

// A mood is a moment on top of what a figure is doing: it looks at a thing that has just come alive, it is
// poked, it is tickled. None is a verdict on what the child laid: what a figure makes of a place is its act.
export type Mood = 'idle' | 'look' | 'poke' | 'tickle'
/** How long a mood lasts before the figure is idle again, in seconds. */
export const MOOD_SECONDS: Record<Mood, number> = { idle: Infinity, look: 1.2, poke: 1.1, tickle: 1.3 }

export type Pose = {
  /** The body: a slide in stage units, a stretch about the feet, a lean in radians. */
  dx: number; dy: number; sx: number; sy: number; lean: number
  /** The head against the body: a slide and a tilt. */
  headX: number; headY: number; headTilt: number
  /** The pupils, -1 to 1 each way; the lids, 0 open to 1 shut; the brows, -1 worried to 1 raised; the mouth, 0 shut to 1 open. */
  eyeX: number; eyeY: number; lid: number; brow: number; mouth: number
  /** The figure's own parts. Sheep: jaw sideways, ears (-1 flat to 1 up), tail. Goose: neck stretch, wing lift, beak. Shepherd: hat brim (-1 sagging, 1 tipped up, above 1 off his head), arm up to shade his eyes, knees knocking. Pig: snout, tail turn in radians, ears flapping. */
  a: number; b: number; c: number
}

export function rest(): Pose {
  return { dx: 0, dy: 0, sx: 1, sy: 1, lean: 0, headX: 0, headY: 0, headTilt: 0, eyeX: 0, eyeY: 0, lid: 0, brow: 0, mouth: 0, a: 0, b: 0, c: 0 }
}

const TAU = Math.PI * 2
const wave = (t: number, period: number, shift = 0): number => Math.sin((t / period + shift) * TAU)
const frac = (x: number): number => ((x % 1) + 1) % 1
/** 0 to 1 and back over the first `share` of each period. */
const burst = (t: number, period: number, share: number): number => { const u = frac(t / period); return u < share ? Math.sin((u / share) * Math.PI) : 0 }
/** 1 for the first `share` of each period and 0 for the rest: a blink. */
const blink = (t: number, period: number, seconds: number): number => (frac(t / period) * period < seconds ? 1 : 0)
/** Up fast and down slowly over a mood: 0 at its start and its end. */
const swell = (age: number, length: number): number => { const u = Math.min(1, Math.max(0, age / length)); return Math.sin(Math.pow(u, 0.6) * Math.PI) }
/** A wobble that dies away. */
const ring = (age: number, period: number, life: number): number => Math.sin((age / period) * TAU) * Math.exp(-age / life)

const IDLE = rest()
const FIELDS = Object.keys(IDLE) as (keyof Pose)[]

/** How a figure holds itself with no feeling on it: alive, and looking where its eyes are drawn. */
function idleInto(who: number, t: number, gazeX: number, p: Pose): void {
  if (who === SHEEP) {
    // Idle: a slow breath, a sideways chew in spells, an ear that flicks, a slow blink.
    const chewing = burst(t, 4.2, 0.62)
    p.sy = 1 + 0.022 * wave(t, 3.8); p.sx = 1 - 0.012 * wave(t, 3.8)
    p.a = chewing * wave(t, 0.86); p.b = 0.25 + 0.75 * burst(t, 5.3, 0.06); p.c = 0.4 * wave(t, 1.7)
    p.headY = 1.5 * chewing * Math.abs(wave(t, 0.86)); p.headX = 5 * gazeX; p.headTilt = 0.04 * gazeX
    p.lid = blink(t, 4.7, 0.14)
  } else if (who === GOOSE) {
    // Idle: the head darts in steps, the feet pad in spells, a quick double blink.
    const dart = Math.round(1.5 * wave(t, 2.3)) / 1.5
    p.headX = 6 * dart + 4 * gazeX; p.headTilt = 0.1 * Math.round(wave(t, 3.1, 0.2)) + 0.05 * gazeX
    p.dy = -2.2 * burst(t, 3.3, 0.3) * Math.abs(wave(t, 0.3)); p.a = 0.12 + 0.1 * Math.round(wave(t, 2.9, 0.4))
    p.lid = Math.max(blink(t, 3.1, 0.07), blink(t + 0.16, 3.1, 0.07)); p.b = 0.05 * burst(t, 6.1, 0.1)
  } else if (who === SHEPHERD) {
    // Idle: he rocks on his heels with a hand over his eyes, and blinks slowly.
    p.lean = 0.026 * wave(t, 4.4); p.b = 0.82 + 0.06 * wave(t, 2.2); p.a = 0.12 * wave(t, 7)
    p.headTilt = -0.05 + 0.03 * gazeX; p.headX = 3 * gazeX; p.lid = blink(t, 5.9, 0.26); p.sy = 1 + 0.008 * wave(t, 4.4, 0.25)
  } else if (who === PIG) {
    // Idle: it snuffles in spells, its tail curls and uncurls, its belly breathes quickly.
    p.a = burst(t, 2.7, 0.45) * wave(t, 0.14); p.b = 0.9 * wave(t, 3.1); p.c = 0.15 * burst(t, 4.9, 0.08)
    p.sy = 1 + 0.026 * wave(t, 1.9); p.sx = 1 - 0.016 * wave(t, 1.9); p.headX = 5 * gazeX; p.headY = 2 * burst(t, 2.7, 0.45)
    p.lid = blink(t, 3.7, 0.11)
  }
}

/** The body's own height at scale 1, for an act that turns a figure onto its back. */
const TALL = [120, 150, 300, 104]

/**
 * What an act adds to the idle pose. Each line is one figure's own way of doing one thing; none is shared.
 * A coat's act is done by all four, each with the parts it has.
 */
function actInto(who: number, act: Act, t: number, p: Pose): void {
  // `t` is the act's own age: seconds on the toy's clock since the figure began it. What happens at a moment (a
  // sneeze, a shake, a bump) is read from the act's beats (acts.ts), where its sound is released too.
  const since = sinceBeat(act, t)
  switch (act) {
    // The sheep.
    case 'graze': p.headY = 20 + 3 * Math.abs(wave(t, 0.5)); p.headTilt = 0.12; p.a = wave(t, 0.42); p.b = 0.6; break
    case 'soaked': { const shake = since < 0.65 ? Math.sin((since / 0.65) * Math.PI) : 0; p.sy -= 0.07; p.sx += 0.03; p.b = -1; p.brow = -0.6; p.lean = 0.13 * shake * wave(t, 0.09); p.a = 0; break }
    case 'lost': p.b = 1; p.brow = -0.4; p.eyeX = wave(t, 1.1); p.headTilt = 0.08 * wave(t, 2.3); p.dx = 2 * wave(t, 0.07); p.sy -= 0.03; p.a = 0; break
    case 'sneeze': { const u = t < 8.4 ? frac(t / 2.8) : 2; if (u < 0.7) { p.headY = -9 * (u / 0.7); p.mouth = 0.5 * (u / 0.7); p.lid = u > 0.5 ? 1 : 0 } else if (u < 0.8) { p.headY = 16; p.mouth = 1; p.sx += 0.07; p.b = -1 } p.a = 0; break }
    case 'squint': p.mouth = 0.5 + 0.5 * Math.abs(wave(t, 0.3)); p.sy += 0.035 * wave(t, 0.3); p.b = -0.6; p.lid = 1; p.brow = -0.7; p.headY = 6; p.a = 0; break
    case 'pant': p.mouth = 0.5 + 0.5 * Math.abs(wave(t, 0.3)); p.sy += 0.035 * wave(t, 0.3); p.b = -0.3; p.a = 0; break
    case 'stand': p.headTilt += 0.06; break
    // The goose.
    case 'swim': p.dy = 1.6 * wave(t, 1.1); p.a = 0.2; p.lean = 0.04 * wave(t, 2.2); break
    case 'ride': p.dy = 2.2 * wave(t, 0.5); p.b = 0.15; p.lean = 0.07 * wave(t, 0.4); break
    case 'fly': p.b = Math.abs(wave(t, 0.16)); p.a = 0.6; p.c = 0.3; break
    case 'dance': p.b = 0.7 + 0.3 * wave(t, 0.5); p.dy = -12 * Math.abs(wave(t, 0.6)); p.lean = 0.13 * wave(t, 1.2); p.brow = 1; p.c = 0.5 * Math.abs(wave(t, 0.3)); p.a = 0.5; break
    case 'hiss': p.a = -0.5; p.c = 0.7; p.headX -= 14; p.brow = -1; p.lean = -0.06; break
    case 'circle': p.a = 0.9; p.lean = 0.06 * wave(t, 0.5); break
    // The shepherd.
    case 'ridge': p.b = 0.82; p.lean = 0.035 * wave(t, 0.7); p.dy = -2.5 * Math.abs(wave(t, 0.35)); break
    case 'wet': p.sy = 0.74; p.a = -1; p.b = 0; p.brow = -0.7; p.headY = 8; p.c = 0.3 * Math.abs(wave(t, 0.4)); p.lean = 0; break
    case 'feel': p.b = 0.5; p.headTilt = -0.16; p.brow = 0.7; p.lean = -0.03; p.a = 0.3; break
    case 'warm': p.b = 0.45 + 0.04 * wave(t, 0.8); p.lean = 0.06; p.brow = 0.6; p.mouth = 0.2; p.a = 0.2; break
    case 'hat': p.b = 1; p.c = Math.abs(wave(t, 0.2)); p.mouth = 0.6; p.brow = 0.8; p.lean = 0.07; break
    case 'doze': p.lean = 0.17; p.lid = 1; p.headTilt = 0.2; p.headY = 4 + 2 * wave(t, 3.2); p.b = 0; p.a = -0.3; break
    case 'gaze': break
    // The pig.
    case 'wallow': p.lean = Math.PI + 0.14 * wave(t, 0.6); p.dy = -TALL[PIG]; p.sx += 0.04 * wave(t, 0.3); p.mouth = 0.6; p.brow = 1; p.b = t * 6; break
    case 'root': p.headY = 10; p.a = wave(t, 0.2); p.headX -= 6 * Math.abs(wave(t, 0.9)); p.sy -= 0.03 * burst(t, 4, 0.3); break
    case 'gobble': p.mouth = Math.abs(wave(t, 0.22)); p.sx += 0.08; p.headY = 8; p.a = 0.5 * wave(t, 0.22); break
    case 'roll': p.c = 0.3 * wave(t, 0.4); break
    case 'fan': p.c = wave(t, 0.25); p.mouth = 0.4; p.sy -= 0.04; p.a = 0; break
    case 'snuffle': p.a = wave(t, 0.14); p.headY = 4; p.headX -= 5; break
    // A coat, on any of the four.
    case 'eat': p.headTilt = 0.42; p.mouth = Math.abs(wave(t, 0.25)); p.lean = 0.1 * wave(t, 0.8); if (who === GOOSE) p.c = Math.abs(wave(t, 0.25)); if (who === SHEEP || who === PIG) p.a = wave(t, 0.25); break
    case 'blind': { const bump = since < 0.264 ? Math.sin((since / 0.264) * Math.PI) : 0; p.sx += 0.08 * bump; p.sy -= 0.06 * bump; p.brow = -0.5; if (who === SHEPHERD) p.b = 0.55; if (who === GOOSE) p.b = 0.3; break }
    case 'shiver': { const shake = since < 0.72 ? Math.sin((since / 0.72) * Math.PI) : 0; p.dx = 2 * wave(t, 0.07); p.lean = 0.2 * shake * wave(t, 0.1); p.sy -= 0.03; p.brow = -0.5; if (who === GOOSE) p.b = 0.5 * shake; if (who === SHEEP) p.b = -1; break }
    case 'strut': p.lean = -0.08; p.dy = -5 * Math.abs(wave(t, 0.5)); p.brow = 1; p.headTilt = -0.1; if (who === GOOSE) p.a = 0.8; if (who === PIG) p.b = t * 4; break
    case 'muddy':
      if (who === PIG) { p.lean = Math.PI + 0.3 * wave(t, 0.9); p.dy = -TALL[PIG]; p.mouth = 0.7; p.brow = 1; p.b = t * 8 }
      else { p.lean = 0.08 * wave(t, 0.5); p.brow = -0.8; p.headTilt = 0.2 * wave(t, 1); if (who === GOOSE) p.b = 0.6; if (who === SHEPHERD) { p.b = 0.5; p.c = 0.5 * Math.abs(wave(t, 0.5)) } if (who === SHEEP) p.b = -0.6 }
      break
    // In the hand: it dangles.
    case 'held': p.lean = 0.16 * wave(t, 0.5); p.sy += 0.04; p.mouth = 0.3; p.brow = 0.8; break
    case 'dish': break
  }
}

/**
 * A figure's pose. `age` is seconds since its mood began, `gazeX` and `gazeY` where its eyes are drawn to (-1 to
 * 1), and `variant` which of its forms a poke takes. `act` is what it does where it stands (acts.ts), `turn`
 * and `hat` are what its walk adds (a turn of the whole body, and how far its hat has flown), and `actAge` is
 * how long it has been doing the act, on the same clock as `t`.
 */
export function poseOf(who: number, t: number, mood: Mood, age: number, gazeX: number, gazeY: number, variant: number, out: Pose, act: Act = 'dish', turn = 0, hat = 0, actAge = t): Pose {
  const p = out
  p.dx = 0; p.dy = 0; p.sx = 1; p.sy = 1; p.lean = 0; p.headX = 0; p.headY = 0; p.headTilt = 0
  p.eyeX = gazeX; p.eyeY = gazeY; p.lid = 0; p.brow = 0; p.mouth = 0; p.a = 0; p.b = 0; p.c = 0
  const len = MOOD_SECONDS[mood], e = mood === 'idle' ? 0 : swell(age, len)
  const side = variant % 2 ? -1 : 1
  idleInto(who, t, gazeX, p)
  if (act !== 'dish') actInto(who, act, actAge, p)
  p.lean += turn
  if (hat > 0) p.a = hat
  if (mood === 'idle') return p
  for (const field of FIELDS) IDLE[field] = p[field]
  if (who === SHEEP) {
    if (mood === 'look') { p.headTilt += 0.14 * e * side; p.b = 0.8; p.a *= 0.3 }
    if (mood === 'poke') { const w = ring(age, 0.22, 0.35); p.sx += 0.09 * w; p.sy -= 0.07 * w; p.lean = 0.06 * side * e; p.mouth = e; p.b = -0.5 + e; p.brow = 0.6 * e }
    if (mood === 'tickle') { p.sy += 0.06 * e * wave(age, 0.18); p.sx -= 0.04 * e * wave(age, 0.18); p.mouth = e; p.b = 1; p.brow = e; p.lid = e > 0.5 ? 1 : 0; p.a = wave(age, 0.18) }
  } else if (who === GOOSE) {
    if (mood === 'look') { p.headTilt = 0.22 * e * side; p.a = 0.35 * e }
    if (mood === 'poke') { const flaps = 0.14 + 0.05 * (variant % 3); p.dy = -20 * e * Math.abs(wave(age, 0.55)); p.b = e * Math.abs(wave(age, flaps)); p.c = e; p.a = 0.4 * e; p.brow = 0.8 * e }
    if (mood === 'tickle') { p.a = 0.5 * e * wave(age, 0.14); p.headTilt = 0.3 * e * wave(age, 0.14); p.b = 0.5 * e * Math.abs(wave(age, 0.14)); p.c = e; p.brow = e }
  } else if (who === SHEPHERD) {
    if (mood === 'look') { p.b = 0.82 - 0.5 * e; p.headTilt += 0.1 * e * side; p.brow = 0.4 * e }
    if (mood === 'poke') { const hop = Math.abs(ring(age, 0.6, 0.4)); p.a = 1 + 1.4 * hop; p.lean = 0.1 * side * ring(age, 0.5, 0.3); p.b = 0.82 * (1 - e); p.mouth = 0.7 * e; p.brow = e; p.c = 0.4 * e }
    if (mood === 'tickle') { p.c = e * Math.abs(wave(age, 0.2)); p.sy -= 0.05 * e; p.lean = 0.07 * e * wave(age, 0.4); p.mouth = e; p.brow = e; p.b = 0.3 * e; p.a = 0.6 * e }
  } else if (who === PIG) {
    if (mood === 'look') { p.headX += 7 * e * side; p.a = 0.4 * e; p.c = 0.5 * e }
    if (mood === 'poke') { p.lean = 0.22 * e * side; p.sx += 0.07 * ring(age, 0.18, 0.3); p.mouth = e; p.b = age * 9; p.brow = 0.7 * e; p.dy = -4 * e }
    if (mood === 'tickle') { p.lean = 0.35 * e * wave(age, 0.26); p.dy = -8 * e * Math.abs(wave(age, 0.26)); p.mouth = e; p.b = age * 14; p.brow = e; p.c = e * wave(age, 0.13) }
  }
  // A feeling comes on in a moment and lets go over a third of a second, so no part snaps back when it is over.
  const hold = Math.max(0, Math.min(1, age / 0.06, (len - age) / 0.3))
  for (const field of FIELDS) p[field] = IDLE[field] + (p[field] - IDLE[field]) * hold
  return p
}

/** The things each figure is drawn to, by its fixed tastes: where the idle hand takes it, and which of them speaks when one comes alive. */
export const LOVES: readonly (readonly Kind[])[] = [['hill', 'bush'], ['pond', 'stream', 'wind', 'cloud'], ['hill', 'fire', 'trunk'], ['earth', 'corn']]

export type MothPose = { wing: number; feeler: number; bob: number; bite: number }

/** The moth: its wings tremble and it cleans a feeler in spells; in flight (`flying` from 0 to 1) its wings beat fast. */
export function mothPose(t: number, flying: boolean, biteAge: number, out: MothPose): MothPose {
  // Eating: three quick bites, `biteAge` seconds after the first.
  out.bite = biteAge >= 0 && biteAge < 0.36 ? Math.abs(Math.sin((biteAge / 0.12) * Math.PI)) : 0
  if (!flying) {
    out.wing = 0.12 * burst(t, 2.1, 0.3) * wave(t, 0.07)
    out.feeler = burst(t, 6.4, 0.3) * Math.abs(wave(t, 0.5))
    out.bob = 0.6 * wave(t, 1.3)
  } else {
    out.wing = wave(t, 0.09)
    out.feeler = 0
    out.bob = 0
  }
  return out
}
