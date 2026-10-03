import { FRIENDS, type FriendId } from './world'

// Every sound of the game as plain numbers: a voice is a short list of parts,
// each one enveloped tone or band of noise. Pure, so a test can hold every
// part inside a stated range on a machine that cannot hear. `sound.ts` turns
// a voice into Web Audio nodes.

export type Part = {
  kind: 'tone' | 'noise'
  /** Seconds after the voice starts. */
  delay: number
  /** Hz: the pitch of a tone, or the middle of a band of noise. */
  frequency: number
  /** Hz to glide to by the end, or 0 to hold. */
  glideTo: number
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** How narrow a band of noise is; unused by a tone. */
  q: number
  /** Gain at the top of the envelope. */
  peak: number
  /** Seconds to the peak, then seconds to fade. */
  attack: number
  decay: number
}

/** The ranges every part of every voice stays inside. */
export const RANGE = {
  frequency: [50, 3200],
  peak: [0.01, 0.26],
  attack: [0.002, 0.25],
  decay: [0.03, 1.4],
  /** The longest a whole voice lasts, in seconds. */
  length: 1.9,
  /** The most parts one voice has. */
  parts: 5,
} as const

function tone(frequency: number, peak: number, attack: number, decay: number, glideTo = 0, wave: Part['wave'] = 'sine', delay = 0): Part {
  return { kind: 'tone', delay, frequency, glideTo, wave, q: 0, peak, attack, decay }
}

function hiss(frequency: number, q: number, peak: number, attack: number, decay: number, glideTo = 0, delay = 0): Part {
  return { kind: 'noise', delay, frequency, glideTo, wave: 'sine', q, peak, attack, decay }
}

/** Each friend's own pitch and timbre. A bigger body speaks lower. */
export const THROAT: Readonly<Record<FriendId, { pitch: number; wave: Part['wave']; peak: number }>> = {
  pim: { pitch: 980, wave: 'triangle', peak: 0.13 },
  mog: { pitch: 620, wave: 'sine', peak: 0.15 },
  dot: { pitch: 520, wave: 'sine', peak: 0.12 },
  bo: { pitch: 150, wave: 'triangle', peak: 0.2 },
}

/** How many ways each friend has of saying a thing, so no two in a row need sound the same. */
export const VARIANTS = 3

/** The answer to a finger: Pim squeaks up, Mog chirrups in two, Dot hums two soft notes, Bo rumbles. */
export function chirp(id: FriendId, variant: number): Part[] {
  const v = ((variant % VARIANTS) + VARIANTS) % VARIANTS, t = THROAT[id], p = t.pitch * (1 + 0.06 * (v - 1))
  if (id === 'pim') return [tone(p, t.peak, 0.006, 0.09, p * (1.45 + 0.1 * v), t.wave)]
  if (id === 'mog') return [tone(p, t.peak, 0.01, 0.07, p * 1.2, t.wave), tone(p * 1.25, t.peak * 0.9, 0.01, 0.12, p * (1.5 + 0.08 * v), t.wave, 0.09)]
  if (id === 'dot') return [tone(p, t.peak, 0.02, 0.16, 0, t.wave), tone(p * (v === 2 ? 1.5 : 1.335), t.peak, 0.02, 0.22, 0, t.wave, 0.15)]
  return [tone(p, t.peak, 0.03, 0.3, p * 0.8, t.wave), tone(p * 0.5, t.peak * 0.8, 0.03, 0.34, p * 0.42, 'sine')]
}

/** Leaving the ground: a quick rising whistle, lower and slower for a bigger friend. */
export function leap(id: FriendId): Part[] {
  const p = THROAT[id].pitch * 0.8
  return [tone(p, 0.07, 0.01, FRIENDS[id].hopSeconds * 0.5, p * 1.7, 'sine')]
}

/** A landing. The pitch falls with the friend's weight; `hard` is 0 to 1. */
export function thump(weight: number, on: 'plank' | 'sand' | 'friend', hard: number): Part[] {
  const h = Math.min(1, Math.max(0, hard)), low = 360 / weight
  if (on === 'sand') return [tone(low * 0.85, 0.1 + 0.08 * h, 0.004, 0.14 + 0.04 * weight, low * 0.6), hiss(900, 0.7, 0.05 + 0.07 * h, 0.01, 0.2 + 0.05 * weight, 400)]
  if (on === 'friend') return [tone(low * 1.5, 0.09 + 0.07 * h, 0.004, 0.12, low * 0.9, 'triangle'), tone(low * 3, 0.05, 0.01, 0.1, low * 4.2, 'sine', 0.05)]
  return [tone(low, 0.12 + 0.1 * h, 0.003, 0.12 + 0.05 * weight, low * 0.6), tone(low * 2.76, 0.05 + 0.04 * h, 0.003, 0.08, 0, 'triangle')]
}

/** An end of the plank coming down on the sand: a dull knock and a spray of grains. `speed` is radians a second. */
export function knock(speed: number): Part[] {
  const h = Math.min(1, speed / 3.5)
  return [tone(120 - 30 * h, 0.1 + 0.14 * h, 0.003, 0.16 + 0.12 * h, 60), hiss(1500, 0.6, 0.04 + 0.12 * h, 0.006, 0.25 + 0.3 * h, 500)]
}

/** Being thrown: the friend's own voice sliding up as it flies, longer for a faster throw. */
export function whoop(id: FriendId, speed: number): Part[] {
  const t = THROAT[id], long = Math.min(0.7, 0.18 + speed * 0.03)
  if (id === 'mog') return [tone(t.pitch * 1.3, t.peak, 0.02, long, t.pitch * 0.7, 'sawtooth')]
  if (id === 'bo') return [tone(t.pitch, t.peak, 0.03, 0.3, t.pitch * 1.3, t.wave)]
  return [tone(t.pitch, t.peak, 0.015, long, t.pitch * (id === 'pim' ? 2.2 : 1.5), t.wave)]
}

/** The plank straining without tipping, or rocked by a finger. */
export function creak(strength: number): Part[] {
  const s = Math.min(1, Math.max(0, strength))
  return [hiss(420, 14, 0.05 + 0.07 * s, 0.03, 0.22, 300), hiss(660, 18, 0.03 + 0.05 * s, 0.05, 0.2, 560, 0.12)]
}

/** The plank floating level: one soft chord that holds a while. */
export function levelHum(): Part[] {
  return [tone(262, 0.07, 0.2, 1.2), tone(330, 0.06, 0.22, 1.15), tone(392, 0.05, 0.25, 1.1)]
}

/** Picked up by the finger: a small surprised gulp upward. */
export function lift(id: FriendId): Part[] {
  const p = THROAT[id].pitch
  return [tone(p * 0.9, THROAT[id].peak * 0.8, 0.01, 0.12, p * 1.3, THROAT[id].wave)]
}

/** Sliding down the plank: a whistle that falls. */
export function slide(): Part[] {
  return [tone(1300, 0.08, 0.02, 0.42, 480, 'sine'), hiss(2200, 2, 0.03, 0.02, 0.4, 900)]
}

/** A finger's poke in the sand. */
export function poke(): Part[] {
  return [hiss(1900, 0.8, 0.09, 0.004, 0.11, 900), tone(180, 0.05, 0.004, 0.07, 110)]
}

/** A finger drawn through the sand: a short dry hiss, a little higher the faster it goes. `speed` is tray units a second. */
export function drag(speed: number): Part[] {
  const s = Math.min(1, speed / 12)
  return [hiss(1400 + 1400 * s, 0.9, 0.03 + 0.05 * s, 0.02, 0.12)]
}

export function lengthOf(voice: readonly Part[]): number {
  return voice.reduce((end, part) => Math.max(end, part.delay + part.attack + part.decay), 0)
}
