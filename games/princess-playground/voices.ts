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

/** Sliding down the plank: a whistle that rises. */
export function slide(): Part[] {
  return [tone(480, 0.08, 0.02, 0.42, 1300, 'sine'), hiss(900, 2, 0.03, 0.02, 0.4, 2200)]
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

// --- The sounds of the grid's cells that the voices above do not already make ---

/** Pim on the low end: a tiny tick, and two stamps of a small foot. */
export function tick(): Part[] {
  return [tone(1500, 0.07, 0.003, 0.04, 1200, 'triangle'), tone(420, 0.06, 0.004, 0.05, 300, 'triangle', 0.16), tone(420, 0.06, 0.004, 0.05, 300, 'triangle', 0.3)]
}

/** Pim dangling on the high end: a trill. */
export function trill(): Part[] {
  return [0, 1, 2, 3].map((n) => tone(n % 2 ? 1320 : 1100, 0.07, 0.006, 0.07, 0, 'triangle', n * 0.08))
}

/** A light clack: a small friend tipping the plank. */
export function clack(): Part[] {
  return [tone(900, 0.1, 0.003, 0.05, 600, 'square'), hiss(2600, 3, 0.04, 0.003, 0.06)]
}

/** Pim on top of someone: a boing, then she crows. */
export function crow(): Part[] {
  return [tone(300, 0.1, 0.006, 0.2, 620, 'sine'), tone(1000, 0.1, 0.01, 0.1, 1500, 'triangle', 0.2), tone(1500, 0.1, 0.01, 0.2, 1300, 'triangle', 0.32)]
}

/** Pim underneath someone: a raspberry. */
export function raspberry(): Part[] {
  return [tone(110, 0.1, 0.01, 0.34, 80, 'sawtooth'), hiss(260, 6, 0.07, 0.01, 0.34, 180)]
}

/** Pim's crown slipping: a tiny rattle after a soft pat. */
export function rattle(): Part[] {
  return [0, 1, 2].map((n) => hiss(3000, 9, 0.04, 0.003, 0.03, 0, 0.12 + n * 0.05))
}

/** Mog on a high perch: a purr. */
export function purr(): Part[] {
  return [tone(70, 0.11, 0.08, 0.9, 0, 'sawtooth'), hiss(140, 4, 0.05, 0.08, 0.9)]
}

/** Mog kneading: two muffled pats and a short chirr. */
export function knead(): Part[] {
  return [tone(160, 0.08, 0.006, 0.07, 110), tone(160, 0.08, 0.006, 0.07, 110, 'sine', 0.2), tone(700, 0.08, 0.02, 0.14, 900, 'sine', 0.44)]
}

/** Mog turning in his hollow: a dry scrunch. */
export function scrunch(): Part[] {
  return [hiss(1100, 1.2, 0.08, 0.03, 0.26, 700)]
}

/** Mog landed on: a short sharp hiss. */
export function spit(): Part[] {
  return [hiss(2800, 1.6, 0.1, 0.004, 0.3, 1900)]
}

/** Mog thrown: a yowl that falls. It replaces the whoop for him where the game wants it longer. */
export function yowl(): Part[] {
  return [tone(900, 0.13, 0.03, 0.5, 420, 'sawtooth')]
}

/** Dot on the low end: a two-note hum. `alone` lets it die away at once. */
export function hum(alone: boolean): Part[] {
  return alone ? [tone(392, 0.08, 0.04, 0.2), tone(330, 0.05, 0.04, 0.3, 0, 'sine', 0.2)] : [tone(392, 0.09, 0.04, 0.3), tone(494, 0.09, 0.04, 0.45, 0, 'sine', 0.26)]
}

/** Dot tipping the plank: a clear ring over the knock. */
export function ringOver(): Part[] {
  return [tone(1568, 0.08, 0.004, 0.6, 0, 'sine'), tone(2349, 0.03, 0.004, 0.4, 0, 'sine')]
}

/** Dot up high and not tipping it: one long high note. */
export function longNote(): Part[] {
  return [tone(988, 0.08, 0.12, 0.9, 0, 'sine')]
}

/** Dot on or under a friend: a low duet, two voices a third apart. */
export function duet(): Part[] {
  return [tone(196, 0.09, 0.1, 0.9, 0, 'sine'), tone(247, 0.08, 0.14, 0.86, 0, 'triangle')]
}

/** Dot in the sand beside a friend: one soft note. */
export function softNote(): Part[] {
  return [tone(659, 0.07, 0.05, 0.4, 0, 'sine')]
}

/** Dot drawing its swirl: a faint slow scratch. */
export function scratch(): Part[] {
  return [hiss(1700, 2.4, 0.04, 0.2, 0.9, 1300)]
}

/** Bo asleep: one snore, in and out. */
export function snore(): Part[] {
  return [hiss(180, 5, 0.07, 0.25, 0.5, 240), tone(82, 0.07, 0.25, 0.5, 0, 'sawtooth'), hiss(320, 3, 0.04, 0.2, 0.5, 200, 0.8)]
}

/** Bo on the high end: the slam, a crack with a low boom under it. */
export function slam(): Part[] {
  return [hiss(2400, 1, 0.14, 0.002, 0.07), tone(70, 0.22, 0.004, 0.5, 52), tone(140, 0.06, 0.004, 0.2, 90, 'triangle')]
}

/** A friend squashed under Bo: a wheeze. */
export function wheeze(): Part[] {
  return [hiss(900, 7, 0.07, 0.03, 0.4, 500), tone(520, 0.04, 0.03, 0.4, 300, 'sine')]
}

/** Bo sinking into the sand: a sigh. */
export function sigh(): Part[] {
  return [hiss(700, 1.5, 0.06, 0.15, 0.7, 380)]
}

/** Bo high up at last: a slow rumbling chuckle. */
export function chuckle(): Part[] {
  return [0, 1, 2, 3].map((n) => tone(120 - n * 6, 0.1, 0.02, 0.14, 95, 'triangle', n * 0.2))
}

/** Pim flying: a squeal, higher and longer the higher she is thrown. `high` is 0 for the least toss to 1 for the greatest. */
export function squeal(high = 0): Part[] {
  const h = Math.min(1, Math.max(0, high))
  return [tone(1200, 0.12, 0.02, 0.4 + 0.35 * h, 2000 + 1000 * h, 'triangle')]
}

/** The low end tapped: a dull clonk. */
export function clonk(): Part[] {
  return [tone(150, 0.14, 0.003, 0.14, 100, 'triangle'), hiss(1200, 0.8, 0.03, 0.004, 0.1)]
}

/** The high end tapped and sprung back: a twang. */
export function twang(): Part[] {
  return [tone(240, 0.12, 0.004, 0.4, 330, 'sawtooth'), tone(480, 0.04, 0.004, 0.3, 660, 'sine')]
}

/** Sand running off the plank: a dry trickle. */
export function trickle(): Part[] {
  return [hiss(2600, 1.4, 0.04, 0.05, 0.6, 1800)]
}

/** An end biting the sand: a crunch, deeper the heavier the end. */
export function crunch(weight: number): Part[] {
  const w = Math.min(9, Math.max(0, weight))
  return [hiss(700 - 40 * w, 0.9, 0.06 + 0.012 * w, 0.004, 0.16 + 0.02 * w, 300), tone(110 - 5 * w, 0.05 + 0.01 * w, 0.004, 0.14, 60)]
}

/** Grains sliding back into a bite as the end lifts: a short whisper. */
export function whisper(): Part[] {
  return [hiss(3000, 1, 0.03, 0.04, 0.22, 2200)]
}

/** Thrown grains settling on heads: a light patter. */
export function patter(): Part[] {
  return [0, 1, 2, 3, 4].map((n) => hiss(2000 + n * 180, 5, 0.03, 0.003, 0.04, 0, 0.06 * n + (n % 2) * 0.02))
}

/** The rake drawn across the tray: a long even comb through the sand. */
export function comb(): Part[] {
  return [hiss(1500, 1.1, 0.07, 0.15, 1.2, 1900), hiss(600, 2, 0.03, 0.15, 1.2)]
}

/** The asker's small hop on the spot: a short hopeful two-note peep in its own voice. */
export function ask(id: FriendId): Part[] {
  const p = THROAT[id].pitch
  return [tone(p, THROAT[id].peak * 0.6, 0.02, 0.1, 0, THROAT[id].wave), tone(p * 1.19, THROAT[id].peak * 0.6, 0.02, 0.16, 0, THROAT[id].wave, 0.13)]
}

export function lengthOf(voice: readonly Part[]): number {
  return voice.reduce((end, part) => Math.max(end, part.delay + part.attack + part.decay), 0)
}
