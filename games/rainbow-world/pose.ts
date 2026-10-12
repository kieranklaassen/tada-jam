import { carriedBy, parentOf } from './stack'
import type { Piece } from './thing'

// The pose of a thing that no scene is leading, as numbers. Two parts: what its place calls for at rest (a lid
// stays tilted, a doll in a cradle sleeps, the tall doll strains under a load), which is a view of `on` and
// `turned` and so the same after a load; and the short answer it may be in the middle of, a pure function of
// the seconds since `stirAt` on the world's clock. Nothing here draws, sounds or reads another clock.

type Pieces = readonly Piece[]
const smooth = (t: number): number => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u) }

/** A lid across a cradle stays tilted by this much. */
export const LID_TILT = 0.14
/** The ticks and tocks of a lid teetering: seconds after it lands, and how wide the teeter still is. They slow. */
export const TEETER: readonly { at: number; wide: number }[] = [{ at: 0, wide: 1 }, { at: 0.24, wide: 0.7 }, { at: 0.54, wide: 0.46 }, { at: 0.9, wide: 0.26 }, { at: 1.32, wide: 0.12 }]
const TEETER_END = 1.8
/** Seconds the horse shakes a ring round its neck, and the moments of its dry knocks. */
export const SHAKE = 0.62
export const RATTLES: readonly number[] = [0.04, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52]
/** Seconds a doll shuffles about under a collar, and when it squeaks. */
export const SHUFFLE = 1.3, SHUFFLE_SQUEAK = 0.32
/** A cradle rocks once under the silk: seconds, and its two soft knocks at the ends of the rock. */
export const ROCK_ONCE = 0.8
export const ROCK_ONCE_KNOCKS: readonly number[] = [0.2, 0.6]
/** A cradle rocks under the horse: seconds, its creaks, and when the horse neighs. */
export const ROCK_HORSE = 1.9
export const ROCK_HORSE_CREAKS: readonly number[] = [0, 0.45, 0.9, 1.35]
export const ROCK_HORSE_NEIGH = 1.5
/** A doll in the basket ducks and comes up: seconds, and when it squeaks as it comes up. */
export const BOO = 0.9, BOO_SQUEAK = 0.5

/** How far the tall doll leans to each side as it strains under a load, at the most. */
export const STRAIN_WOBBLE = 0.05

/** How far a lid has teetered from its resting tilt. Each tick or tock is the moment it passes through rest. */
export function teeter(since: number): number {
  if (since < 0 || since >= TEETER_END) return 0
  for (let i = TEETER.length - 1; i >= 0; i--) {
    if (since < TEETER[i].at) continue
    const to = i + 1 < TEETER.length ? TEETER[i + 1].at : TEETER_END
    return (i % 2 ? -1 : 1) * 0.3 * TEETER[i].wide * Math.sin(((since - TEETER[i].at) / (to - TEETER[i].at)) * Math.PI)
  }
  return 0
}

/** What a thing's place calls for when nothing is happening to it. */
export function restPose(pieces: Pieces, p: Piece, out: { tilt: number; duck: number; shut: number; mood: number } = { tilt: 0, duck: 0, shut: 0, mood: 0 }): typeof out {
  const lower = parentOf(pieces, p), load = carriedBy(pieces, p)
  out.tilt = 0; out.duck = 0; out.shut = 0; out.mood = 0
  if (p.at !== 'mat') return out
  if (p.def.kind === 'arch' && !p.turned && lower?.def.kind === 'arch' && lower.turned) out.tilt = LID_TILT
  if (p.def.kind === 'doll') {
    // A doll in a cradle sleeps. Sleep is a view of what it rests on.
    if (lower?.def.kind === 'arch' && lower.turned) out.shut = 1
    // The tall doll wants to be the highest: it grins on top of a doll and strains under a doll or the horse (its face while it carries).
    if (p.def.id === 'doll-tall') {
      if (load && load.def.kind !== 'silk') out.mood = -1
      else if (lower?.def.kind === 'doll') out.mood = 1
    }
    // Under the horse a doll's knees stay a little bent.
    if (load?.def.kind === 'horse') out.duck = 0.25
  }
  // The horse is pleased in a cradle, with a doll on its back, and carried.
  if (p.def.kind === 'horse' && ((lower?.def.kind === 'arch' && lower.turned) || lower?.def.kind === 'doll' || load?.def.kind === 'doll')) out.mood = 1
  return out
}

const rest = { tilt: 0, duck: 0, shut: 0, mood: 0 }

/** Sets a thing's pose to what its place calls for, at once: on load and when the game goes to rest. */
export function settlePose(pieces: Pieces, p: Piece): void {
  restPose(pieces, p, rest)
  p.tilt = rest.tilt; p.duck = rest.duck; p.shut = rest.shut; p.mood = rest.mood
  p.spin = 0; p.way = 0; p.stir = null; p.stirAt = -Infinity; p.led = false
}

/** Moves a thing's pose on by `h` seconds: its short answer if it is in one, and otherwise towards rest. A led thing is the scene's. */
export function stepPose(pieces: Pieces, p: Piece, time: number, h: number): void {
  if (p.led) return
  restPose(pieces, p, rest)
  const since = time - p.stirAt
  let tilt = rest.tilt, duck = rest.duck, spin = 0
  switch (p.stir) {
    case 'teeter':
      tilt += teeter(since)
      break
    case 'shuffle':
      if (since < SHUFFLE) { tilt += 0.13 * Math.sin(since * 17) * (1 - since / SHUFFLE); duck += 0.12 * (1 - since / SHUFFLE) }
      break
    case 'shake':
      if (since < SHAKE) { if (p.def.kind === 'arch') spin = Math.PI * 4 * smooth(since / SHAKE); else tilt += 0.05 * Math.sin(since * 40) }
      break
    case 'rockOnce':
      if (since < ROCK_ONCE) tilt += 0.17 * Math.sin((since / ROCK_ONCE) * Math.PI * 2) * (1 - 0.4 * (since / ROCK_ONCE))
      break
    case 'rockHorse':
      if (since < ROCK_HORSE) tilt += 0.2 * Math.sin((since / 0.9) * Math.PI * 2) * (1 - since / ROCK_HORSE)
      break
    case 'boo':
      if (since < BOO) duck = Math.sin(smooth(since / BOO) * Math.PI)
      break
    case null:
      break
  }
  // The tall doll under a load strains: it wobbles, now more and now less, and what it carries wobbles with it. Its knees give a little.
  const strain = p.def.id === 'doll-tall' ? Math.max(0, -p.mood) : 0
  if (strain > 0) { tilt += STRAIN_WOBBLE * strain * Math.sin(time * 9) * (0.55 + 0.45 * Math.sin(time * 1.3)); duck += 0.07 * strain * (0.5 + 0.5 * Math.sin(time * 4.5)) }
  const ease = 1 - Math.exp(-h * 7)
  p.tilt = tilt
  p.spin = spin
  p.duck = p.stir === 'boo' && since < BOO ? duck : p.duck + (duck - p.duck) * ease
  p.shut += (rest.shut - p.shut) * ease
  p.mood += (rest.mood - p.mood) * ease
  p.way = 0
}
