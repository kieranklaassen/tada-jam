// How each animal moves like itself. Pure numbers: the view maps them onto
// stickers. A character in this look reacts with its whole sticker, so a move
// is an offset, a tilt and a squash of the whole figure, plus the face it
// wears. Nothing here is shared between two animals: every curve is timed by
// the animal's own tempo, weight and overshoot (cast.ts), and each has an idle
// life and small delights that no other has.
//
// No clock is read: every function takes game time in seconds.

import { CAST, type Species } from './cast'

export type Face = 'calm' | 'glad' | 'wow' | 'bliss' | 'wary'

/** An offset from where the figure sits, in design units, a tilt in radians and a squash, with the face worn. */
export type Pose = { x: number; y: number; rot: number; sx: number; sy: number; face: Face }

export const REST: Readonly<Pose> = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, face: 'calm' }

const TAU = Math.PI * 2
const FASTEST = 3.2

/** How long one beat of a reaction lasts for this animal, in seconds: the bear is slow, the hedgehog quick. */
export function beatSeconds(species: Species): number {
  return 0.5 / (0.55 + 0.45 * (CAST[species].tempo / FASTEST))
}

/** How long after a thing lands the animal starts to answer it: a heavy one is late. Under a fifth of a second for all. */
export function lateness(species: Species): number {
  return 0.03 + 0.12 * CAST[species].weight
}

/**
 * The way this animal gets from one pose to the next, for progress 0 to 1.
 * An exact animal (the cat) eases in and out and never passes its mark; a
 * bouncy one (the dog) shoots past and comes back; a heavy one starts late.
 */
export function ease(species: Species, progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  const { overshoot, weight } = CAST[species]
  // A heavy start: progress is held back at first, more for more weight.
  const late = Math.pow(p, 1 + weight * 0.9)
  const back = overshoot * 2.6
  const through = late - 1
  const out = 1 + (back + 1) * through * through * through + back * through * through
  const smooth = late * late * (3 - 2 * late)
  // With no overshoot the curve is the smooth one; with more it leans to the one that passes its mark.
  const mix = Math.min(1, overshoot * 1.6)
  return smooth * (1 - mix) + out * mix
}

/**
 * The rock of the whole sticker when a thing lands on it, for `since`
 * seconds after the landing: down and wide, then up, then still. A heavy
 * animal rocks deep and slowly; a light one twitches.
 */
export function jolt(species: Species, since: number): { sx: number; sy: number; rot: number } {
  if (since < 0) return { sx: 1, sy: 1, rot: 0 }
  const { weight, overshoot } = CAST[species]
  const rate = 15 - 8 * weight
  const depth = (0.07 + 0.09 * weight) * Math.exp(-since * (5.5 - 2.5 * overshoot))
  const wave = Math.cos(since * rate)
  return { sx: 1 + depth * wave * 0.7, sy: 1 - depth * wave, rot: -0.05 * (1 - weight * 0.5) * Math.exp(-since * 5) * Math.sin(since * rate * 0.5) }
}

/** A number from 0 to 1 that is fixed for a whole number `n` and a salt: the same every time, with no stream to draw from. */
export function fixed(n: number, salt: number): number {
  let h = (Math.imul(n | 0, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

/** A bump from 0 up to 1 and back to 0 over progress 0 to 1. */
function bump(progress: number): number {
  return progress <= 0 || progress >= 1 ? 0 : Math.sin(progress * Math.PI)
}

/** How many delights each animal has. The director picks one for each window of time, never the same twice running. */
export const DELIGHTS = 3

/** How long one window of idle life lasts for this animal, in seconds: a delight plays at its start. */
export function idleWindow(species: Species): number {
  return 4.2 + 3.2 * CAST[species].weight + 1.1 * (1 - CAST[species].tempo / FASTEST)
}

/** Which delight plays in idle window `n` for the animal with this seed: never the one before it. */
export function delightFor(n: number, seed: number): number {
  if (n <= 0) return Math.floor(fixed(0, seed) * DELIGHTS)
  const before = delightFor(n - 1, seed)
  return (before + 1 + Math.floor(fixed(n, seed) * (DELIGHTS - 1))) % DELIGHTS
}

/** Whether the eyes are shut at time `t`: a short blink at this animal's own moments. */
export function blinking(species: Species, t: number, seed: number): boolean {
  const every = 2.4 + 2.8 * CAST[species].weight + fixed(seed, 7) * 1.5
  return (t + fixed(seed, 11) * every) % every < 0.12
}

/**
 * The idle life of each animal while the child just watches: its breathing
 * and the delight of the window `t` falls in. Each is written by hand for
 * the animal: none is another's with a different phase.
 */
export function idle(species: Species, t: number, seed: number): Pose {
  const { tempo } = CAST[species]
  const span = idleWindow(species)
  const n = Math.floor(t / span), into = t - n * span
  const which = delightFor(n, seed)
  const breath = Math.sin(TAU * (t * tempo * 0.2 + fixed(seed, 3)))
  const pose: Pose = { ...REST }
  switch (species) {
    case 'bear': {
      // The belly breathes wide and slow. Delights: a great yawn, a slow scratch-sway, a nod that almost drops off.
      pose.sx = 1 + breath * 0.022
      pose.sy = 1 - breath * 0.026
      const d = bump(into / 2.6)
      if (which === 0) { pose.sy += d * 0.07; pose.sx -= d * 0.03; pose.face = d > 0.35 ? 'bliss' : 'calm' }
      else if (which === 1) pose.rot = d * 0.07 * Math.sin(into * 2.4)
      else { pose.rot = d * 0.1; pose.y = d * 5; pose.face = d > 0.6 ? 'bliss' : 'calm' }
      break
    }
    case 'rabbit': {
      // Quick shallow breaths, then stillness. Delights: a start and freeze, two little hops on the spot, a quick look left and right.
      pose.sy = 1 + breath * 0.014
      if (which === 0) { const d = into < 0.12 ? into / 0.12 : into < 0.9 ? 1 : Math.max(0, 1 - (into - 0.9) / 0.15); pose.sy += d * 0.06; pose.sx -= d * 0.03; pose.face = d > 0.5 ? 'wow' : 'calm' }
      else if (which === 1) pose.y = -14 * Math.abs(Math.sin(Math.min(into, 0.7) / 0.7 * TAU))
      else pose.rot = into < 0.8 ? 0.09 * Math.sign(Math.sin(into / 0.8 * TAU)) * bump(((into / 0.4) % 1)) : 0
      break
    }
    case 'cat': {
      // Barely breathes, perfectly still. Delights: a slow lean and a slow return, a long stretch tall, one slow blink of bliss.
      pose.sy = 1 + breath * 0.01
      const d = into < 3.4 ? into / 3.4 : 1
      if (which === 0) pose.rot = 0.06 * Math.sin(d * TAU) * (1 - d)
      else if (which === 1) { pose.sy += 0.07 * bump(d) * bump(d); pose.sx -= 0.035 * bump(d) * bump(d) }
      else pose.face = into > 0.6 && into < 2.2 ? 'bliss' : 'calm'
      break
    }
    case 'dog': {
      // Pants with its whole body, and never quite sits still. Delights: a wag that shakes it all, a bounce and overshoot, a tilt of the head held.
      const pant = Math.sin(TAU * t * tempo * 0.55)
      pose.sy = 1 + pant * 0.016
      pose.y = Math.abs(pant) * -1.5
      if (which === 0) { pose.rot = 0.05 * Math.sin(into * 17) * bump(into / 1.6); pose.face = into < 1.6 ? 'glad' : 'calm' }
      else if (which === 1) pose.y += -22 * Math.abs(Math.sin(Math.min(into, 0.9) / 0.9 * Math.PI * 3)) * Math.exp(-into * 1.4)
      else pose.rot = into < 1.9 ? 0.13 * Math.min(1, into / 0.15) * (into > 1.6 ? (1.9 - into) / 0.3 : 1) : 0
      break
    }
    case 'hedgehog': {
      // Tiny fast breaths, a constant fine tremor of busyness. Delights: a rock that nearly rolls, a sneeze-sized start, a shuffle side to side.
      pose.sy = 1 + breath * 0.03
      pose.sx = 1 - breath * 0.018
      if (which === 0) pose.rot = 0.22 * Math.sin(into * 5.2) * bump(into / 1.9)
      else if (which === 1) { const d = bump(Math.min(1, into / 0.28)); pose.y = -9 * d; pose.sy += 0.09 * d }
      else pose.x = 9 * Math.sin(into * 9) * bump(into / 1.5)
      break
    }
    case 'duck': {
      // Sways as it sits, top-heavy. Delights: a waddle from foot to foot, a head bob that travels down it, a shake of the tail end.
      pose.rot = 0.03 * Math.sin(TAU * t * tempo * 0.16)
      pose.sy = 1 + breath * 0.018
      if (which === 0) { const d = bump(into / 2.2); pose.rot += 0.11 * d * Math.sin(into * 6.3); pose.y = -4 * d * Math.abs(Math.sin(into * 6.3)) }
      else if (which === 1) { const d = bump(Math.min(1, into / 0.5)); pose.sy -= 0.07 * d; pose.sx += 0.05 * d }
      else pose.x = 5 * Math.sin(into * 21) * bump(into / 0.9)
      break
    }
  }
  return pose
}

/** Adds one pose's offsets on top of another's and keeps the face of the one on top unless it is calm. */
export function add(under: Pose, over: Pose): Pose {
  return {
    x: under.x + over.x,
    y: under.y + over.y,
    rot: under.rot + over.rot,
    sx: under.sx * over.sx,
    sy: under.sy * over.sy,
    face: over.face !== 'calm' ? over.face : under.face,
  }
}
