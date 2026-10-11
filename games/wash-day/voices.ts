import type { Note } from './audio'
import type { Kind } from './cloth'
import type { FriendKind } from './layout'
import { STRAPS, THWOP } from './motion'

// Every sound of the yard, as plain numbers. Nobody has heard them on the
// machine they were written on, so a test holds every pitch, peak and length
// in range. `r` is a number from 0 to 1 that picks the variant, so the same
// sound never comes twice alike.
//
// The grid of the design sheet is here cell by cell: `tubbed`, `ridge`,
// `lathered`, `wrung`, `pegged` and `donned` each give one garment's sound for
// one column, and no two garments share one.

type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'

/** A tone: wave, pitch, where it glides to (0 for nowhere), peak, attack, decay, delay. */
function tone(wave: Wave, frequency: number, glideTo: number, peak: number, attack: number, decay: number, delay = 0): Note {
  const note: Note = { kind: 'tone', wave, frequency, peak, attack, decay }
  if (glideTo > 0) note.glideTo = glideTo
  if (delay > 0) note.delay = delay
  return note
}

/** A band of noise: its middle, where it glides to (0 for nowhere), how narrow, peak, attack, decay, delay. */
function hiss(frequency: number, glideTo: number, q: number, peak: number, attack: number, decay: number, delay = 0): Note {
  const note: Note = { kind: 'noise', frequency, q, peak, attack, decay }
  if (glideTo > 0) note.glideTo = glideTo
  if (delay > 0) note.delay = delay
  return note
}

const later = (notes: readonly Note[], by: number): Note[] => notes.map((note) => ({ ...note, delay: (note.delay ?? 0) + by }))
const softer = (notes: readonly Note[], by: number): Note[] => notes.map((note) => ({ ...note, peak: note.peak * by }))

/** The same voice, later. */
export function after(notes: readonly Note[], seconds: number): Note[] {
  return later(notes, seconds)
}

/** The same voice, quieter: for what the wind does by itself. */
export function quiet(notes: readonly Note[], by = 0.5): Note[] {
  return softer(notes, by)
}

// --- The board --------------------------------------------------------------

/**
 * One ridge of the board under a cloth. `pace` is 0 for a slow finger to 1 for a fast one, and the pitch follows
 * the hand. Each cloth makes the board sound its own way: a sock zips high and quick, a shirt hums low and even,
 * dungarees thud and their buckles clink, a jumper is muffled to a fuf, the hat's bobble rattles like a pea, and a
 * scarf is one long zip.
 */
export function ridge(kind: Kind, pace: number, r: number): Note[] {
  switch (kind) {
    case 'sock': { const f = 900 + 900 * pace + 60 * r; return [tone('triangle', f, f * 1.3, 0.08, 0.002, 0.022), hiss(3400, 0, 4, 0.03, 0.001, 0.015)] }
    case 'shirt': { const f = 150 + 130 * pace + 8 * r; return [tone('sine', f, 0, 0.1, 0.012, 0.07), tone('sine', f * 2, 0, 0.03, 0.012, 0.05)] }
    case 'dungarees': { const f = 95 + 60 * pace + 10 * r; return [tone('sine', f, f * 0.7, 0.14, 0.004, 0.06), tone('triangle', 2300 + 500 * r, 0, 0.045, 0.001, 0.03, 0.02)] }
    case 'jumper': return [hiss(300 + 240 * pace + 40 * r, 0, 0.7, 0.07, 0.014, 0.05)]
    case 'hat': { const f = 620 + 500 * pace + 200 * r; return [tone('square', f, f * 0.8, 0.045, 0.001, 0.014), tone('sine', f * 0.5, 0, 0.05, 0.001, 0.03, 0.03)] }
    default: { const f = 420 + 1300 * pace + 40 * r; return [tone('sawtooth', f, f * 1.12, 0.045, 0.004, 0.05)] }
  }
}

/** One length of the scarf let go across the ridges: a long zip that rises. */
export function zip(r: number): Note[] {
  return [tone('sawtooth', 460 + 60 * r, 1500, 0.05, 0.01, 0.2), hiss(2600, 3800, 3, 0.025, 0.01, 0.16)]
}

/** A ridge of bare wood: drier, higher and hollow. */
export function tickDry(pace: number, r: number): Note[] {
  const f = 520 + 820 * pace + 60 * r
  return [tone('square', f, f * 0.9, 0.05, 0.002, 0.04), tone('sine', f * 0.5, 0, 0.07, 0.002, 0.06)]
}

/** The fingertip sinks into mud: a short squelch. */
export function squelch(r: number): Note[] {
  return [hiss(420 + 120 * r, 190, 1.4, 0.16, 0.008, 0.09), tone('sine', 170 + 30 * r, 110, 0.1, 0.005, 0.07)]
}

/** Wet cloth dragged over the board. */
export function scrub(r: number): Note[] {
  return [hiss(1200 + 500 * r, 700, 0.8, 0.05, 0.01, 0.08)]
}

/** A patch of mud lets go. */
export function letGo(r: number): Note[] {
  return [tone('sine', 210 + 60 * r, 130, 0.09, 0.004, 0.05)]
}

/** Clean cloth under the finger: a squeak, higher the cleaner the cloth. */
export function squeak(clean: number, r: number): Note[] {
  const f = 1250 + 500 * clean + 80 * r
  return [tone('sine', f, f * 1.22, 0.05, 0.02, 0.07)]
}

/** The finger lifts and the wet cloth springs back. */
export function slap(r: number): Note[] {
  return [hiss(560 + 140 * r, 300, 1, 0.08, 0.004, 0.07)]
}

/** A bubble pops. A small bubble pips higher. */
export function pip(size: number, r: number): Note[] {
  const f = 2100 - 900 * size + 100 * r
  return [tone('sine', f, f * 1.6, 0.09, 0.002, 0.04)]
}

/** The heap of suds slides off into the tub. */
export function fizz(): Note[] {
  return [hiss(5200, 3000, 0.7, 0.06, 0.03, 0.5), tone('sine', 300, 140, 0.1, 0.01, 0.12, 0.12)]
}

/** The puddle gives up a dollop. */
export function blop(r: number): Note[] {
  return [tone('sine', 150 + 30 * r, 70, 0.22, 0.008, 0.16), tone('sine', 330 + 60 * r, 520, 0.08, 0.01, 0.06, 0.09)]
}

/** The dollop lands, or a thing lands in the puddle. */
export function splat(r: number): Note[] {
  return [hiss(700 + 200 * r, 240, 0.9, 0.18, 0.003, 0.12), tone('sine', 140, 85, 0.12, 0.004, 0.09)]
}

/** The tub's water, touched. */
export function plip(r: number): Note[] {
  const f = 700 + 300 * r
  return [tone('sine', f, f * 1.9, 0.1, 0.004, 0.07)]
}

/** A thing thrown through the air. */
export function whoosh(r: number): Note[] {
  return [hiss(800 + 200 * r, 1900, 1.5, 0.06, 0.05, 0.2)]
}

/** It lands, heavier for a heavier cloth. `weight` is 0 for a sock to 1 for wet wool. */
export function flump(weight: number): Note[] {
  return [hiss(520 - 260 * weight, 0, 1, 0.13, 0.004, 0.09 + 0.06 * weight), tone('sine', 200 - 80 * weight, 90, 0.1, 0.004, 0.08)]
}

/** The washing line, plucked. `along` is 0 at one end to 1 at the other. */
export function twang(along: number): Note[] {
  const f = 150 + 130 * Math.abs(along - 0.5) * 2
  return [tone('triangle', f, f * 0.97, 0.12, 0.004, 0.4), tone('sine', f * 2.01, 0, 0.04, 0.004, 0.2)]
}

/** Bare linen, touched: one thread plucked. Pitch follows where across the cloth. */
export function pluck(across: number, r: number): Note[] {
  const f = 240 + 200 * across + 12 * r
  return [tone('triangle', f, 0, 0.07, 0.003, 0.22)]
}

/** A thing noticed under a finger that has only just landed: one soft thread. */
export function noticed(r: number): Note[] {
  return [tone('triangle', 520 + 80 * r, 0, 0.05, 0.003, 0.09)]
}

// --- The grid: what each garment sounds like at each thing that happens to it --

/** Dropped in the tub. */
export function tubbed(kind: Kind): Note[] {
  switch (kind) {
    case 'sock': return [tone('sine', 880, 1700, 0.1, 0.004, 0.06)]
    case 'shirt': return [tone('sine', 190, 120, 0.11, 0.05, 0.2), tone('sine', 230, 140, 0.09, 0.05, 0.22, 0.3), tone('sine', 170, 110, 0.08, 0.05, 0.24, 0.62)]
    case 'dungarees': return [tone('sine', 110, 55, 0.2, 0.01, 0.3), tone('sine', 300, 480, 0.06, 0.01, 0.07, 0.4), tone('sine', 260, 430, 0.06, 0.01, 0.07, 0.58)]
    case 'jumper': return [hiss(500, 1500, 2.2, 0.09, 0.2, 0.6), tone('sine', 240, 420, 0.06, 0.25, 0.5)]
    case 'hat': return [tone('sine', 420, 600, 0.07, 0.01, 0.07), tone('sine', 150, 80, 0.16, 0.02, 0.22, 0.9)]
    default: return [hiss(900, 2600, 1.2, 0.07, 0.12, 0.3), hiss(2600, 900, 1.2, 0.06, 0.12, 0.3, 0.4)]
  }
}

/** Soaped with the bar. */
export function lathered(kind: Kind): Note[] {
  switch (kind) {
    case 'sock': return [hiss(1800, 2600, 1.5, 0.05, 0.1, 0.25), tone('sine', 1500, 2100, 0.09, 0.01, 0.09, 0.45)]
    case 'shirt': return [hiss(4200, 0, 0.8, 0.07, 0.05, 0.45), hiss(3600, 0, 0.8, 0.05, 0.05, 0.4, 0.06)]
    case 'dungarees': return [hiss(700, 0, 1.2, 0.05, 0.08, 0.3), tone('sawtooth', 130, 90, 0.1, 0.02, 0.12, 0.5), tone('sawtooth', 115, 75, 0.09, 0.02, 0.14, 0.72)]
    case 'jumper': return [hiss(2600, 5200, 0.6, 0.07, 0.3, 0.6), hiss(5600, 0, 0.9, 0.04, 0.2, 0.5, 0.3)]
    case 'hat': return [hiss(2000, 3200, 1.4, 0.05, 0.08, 0.3), tone('sine', 1100, 1500, 0.06, 0.02, 0.08, 0.42)]
    default: return Array.from({ length: 8 }, (_, i): Note => hiss(2400 + 380 * i, 0, 5, 0.06, 0.002, 0.03, i * 0.085))
  }
}

/** The foam ball the hat's bobble has turned into, pressed. */
export function foamSqueak(r: number): Note[] {
  return [tone('sine', 1000 + 200 * r, 1700, 0.08, 0.015, 0.09), tone('sine', 1700, 1100, 0.05, 0.01, 0.08, 0.1)]
}

/**
 * Wrung on the rail. `left` is how much water is still in it, 1 to 0: a scarf squeaks higher as it runs dry.
 * `gush` is the dungarees giving it all up at once, or the hat's one fat spurt.
 */
export function wrung(kind: Kind, left: number, gush: boolean, r: number): Note[] {
  switch (kind) {
    case 'sock': return [tone('sine', 2300 + 300 * r, 3100, 0.07, 0.01, 0.06), hiss(3000, 1800, 2, 0.05, 0.01, 0.12, 0.05)]
    case 'shirt': return [tone('sawtooth', 190 + 20 * r, 260, 0.06, 0.05, 0.4), hiss(1500, 900, 1, 0.05, 0.05, 0.3, 0.1)]
    case 'dungarees': return gush
      ? [hiss(900, 300, 0.7, 0.18, 0.01, 0.45), tone('sine', 150, 80, 0.12, 0.01, 0.3)]
      : [tone('sawtooth', 78 + 10 * r, 62, 0.1, 0.06, 0.3), tone('sawtooth', 81 + 10 * r, 64, 0.06, 0.06, 0.3)]
    case 'jumper': return [hiss(520 + 120 * r, 300, 1.1, 0.12, 0.02, 0.16), tone('sine', 210, 150, 0.07, 0.01, 0.1)]
    case 'hat': return [tone('sine', 300, 900, 0.1, 0.01, 0.12), hiss(1400, 2800, 1.4, 0.08, 0.01, 0.16), ...later(splat(r), 0.5)]
    default: { const f = 700 + 1500 * (1 - left) + 40 * r; return [tone('sine', f, f * 1.25, 0.06, 0.02, 0.12)] }
  }
}

/** Pegged on the line, and in each gust after. */
export function pegged(kind: Kind, r: number): Note[] {
  switch (kind) {
    case 'sock': return Array.from({ length: 6 }, (_, i): Note => hiss(1700 + 200 * r, 0, 3, 0.05, 0.002, 0.02, i * 0.035))
    case 'shirt': return [hiss(900 + 100 * r, 0, 1, 0.09, 0.003, 0.05), hiss(1000, 0, 1, 0.08, 0.003, 0.05, 0.16), hiss(850, 0, 1, 0.07, 0.003, 0.05, 0.34)]
    case 'dungarees': return [tone('triangle', 98, 92, 0.14, 0.004, 0.5), tone('sine', 196, 0, 0.05, 0.004, 0.25)]
    case 'jumper': return [tone('sine', 1300 + 80 * r, 2300, 0.07, 0.002, 0.05), tone('sine', 1250, 2200, 0.06, 0.002, 0.05, 0.26), tone('sine', 1350, 2400, 0.05, 0.002, 0.05, 0.52)]
    case 'hat': return [tone('triangle', 520 + 30 * r, 0, 0.09, 0.002, 0.05), tone('triangle', 480, 0, 0.08, 0.002, 0.05, 0.2)]
    default: return [hiss(2600 + 300 * r, 0, 1.6, 0.12, 0.001, 0.035), hiss(2000, 0, 1.2, 0.05, 0.02, 0.12, 0.05)]
  }
}

/** The hat's bobble knocks against its rim at the end of a swing: tok to one side, a little lower to the other. */
export function knock(side: number, r: number): Note[] {
  return [tone('triangle', side % 2 === 0 ? 520 + 30 * r : 480, 0, 0.09, 0.002, 0.05)]
}

/** One drop from a wet thing on the line. */
export function drip(r: number): Note[] {
  return [tone('sine', 1500 + 300 * r, 2500, 0.045, 0.002, 0.04)]
}

/** A peg goes on, or comes off. */
export function clack(on: boolean, r: number): Note[] {
  return [tone('triangle', (on ? 1500 : 1150) + 100 * r, 0, 0.07, 0.001, 0.03), tone('sine', on ? 700 : 560, 0, 0.04, 0.001, 0.04)]
}

/** Put on a body. */
export function donned(kind: Kind, r: number): Note[] {
  switch (kind) {
    case 'sock': return [tone('sawtooth', 300 + 30 * r, 900, 0.06, 0.12, 0.05), hiss(2200, 0, 2, 0.1, 0.001, 0.04, 0.18)]
    case 'shirt': return [hiss(1300, 800, 1, 0.05, 0.05, 0.2), tone('sine', 2400 + 100 * r, 0, 0.1, 0.001, 0.22, 0.45), tone('sine', 4810, 0, 0.03, 0.001, 0.14, 0.45)]
    // The legs go in with a wheeze, and then each strap pings up over its shoulder.
    case 'dungarees': return [hiss(500, 800, 3, 0.06, 0.12, 0.2, 0.1), hiss(800, 500, 3, 0.06, 0.12, 0.2, 0.5), tone('sine', 1500, 0, 0.08, 0.001, 0.12, STRAPS[0]), tone('sine', 1750, 0, 0.08, 0.001, 0.12, STRAPS[1])]
    case 'jumper': return [hiss(300, 0, 0.9, 0.08, 0.05, 0.14), hiss(280, 0, 0.9, 0.07, 0.05, 0.14, 0.24), hiss(320, 0, 0.9, 0.07, 0.05, 0.12, 0.48), tone('sine', 170, 380, 0.14, 0.004, 0.08, THWOP), hiss(900, 0, 1, 0.08, 0.002, 0.05, THWOP)]
    case 'hat': return [tone('square', 250 + 20 * r, 235, 0.06, 0.02, 0.2, 0.3), tone('square', 252, 236, 0.05, 0.02, 0.18, 0.56)]
    default: return [0, 0.22, 0.44].flatMap((delay, i) => [hiss(700 + 80 * i, 380, 1.3, 0.09, 0.02, 0.08, delay)])
  }
}

/** The shirt's button flies off. */
export function ping(r: number): Note[] {
  return [tone('sine', 2900 + 200 * r, 0, 0.08, 0.001, 0.25)]
}

// --- The rest of the yard through the wash -----------------------------------

/** The cat rubbed on the board: one step of a scale, higher the fluffier it has got. `step` is 0 to 10. */
export function yowl(step: number, r: number): Note[] {
  const f = 440 * Math.pow(2, step / 12) * (1 + 0.01 * r)
  return [tone('sawtooth', f, f * 1.12, 0.06, 0.03, 0.16), tone('sine', f * 2, f * 2.2, 0.03, 0.03, 0.12)]
}

/** The cat shakes itself from nose to tail. */
export function brrrt(r: number): Note[] {
  return Array.from({ length: 10 }, (_, i): Note => hiss(900 + 60 * i + 100 * r, 0, 2, 0.07, 0.003, 0.025, i * 0.04))
}

/** The cat purrs. */
export function purr(r: number): Note[] {
  return Array.from({ length: 8 }, (_, i): Note => tone('triangle', 62 + 4 * r, 0, 0.09, 0.02, 0.05, i * 0.09))
}

/** The cat meets the tub's water. */
export function hissed(r: number): Note[] {
  return [tone('sawtooth', 900 + 100 * r, 1500, 0.07, 0.01, 0.18), hiss(4200, 0, 0.8, 0.07, 0.02, 0.3, 0.05)]
}

/** A peg runs down the ridges like a stick along railings. */
export function clatter(r: number): Note[] {
  return Array.from({ length: 12 }, (_, i): Note => tone('square', 700 + 70 * i + 60 * r, 0, 0.05, 0.001, 0.02, i * 0.055))
}

/** A peg wrung: a rubber toy, then its spring. */
export function rubber(r: number): Note[] {
  return [tone('sine', 900 + 100 * r, 1900, 0.08, 0.03, 0.08), tone('sine', 1900, 1000, 0.06, 0.02, 0.08, 0.12), tone('triangle', 180, 320, 0.09, 0.004, 0.06, 0.3), tone('triangle', 200, 340, 0.06, 0.004, 0.06, 0.42), tone('triangle', 215, 350, 0.04, 0.004, 0.06, 0.53)]
}

/** Two pegs chained: a jingle. */
export function jingle(r: number): Note[] {
  return [tone('sine', 3100 + 200 * r, 0, 0.05, 0.001, 0.12), tone('sine', 3700, 0, 0.04, 0.001, 0.1, 0.07), tone('sine', 3300, 0, 0.03, 0.001, 0.1, 0.16)]
}

/** A peg flicked off, or anything that pops. */
export function pop(r: number): Note[] {
  return [tone('sine', 500 + 80 * r, 1300, 0.11, 0.002, 0.04)]
}

/** The soap sledges down the board and into the tub. */
export function whee(r: number): Note[] {
  return [tone('sine', 700 + 60 * r, 1500, 0.07, 0.05, 0.35), ...later(plop(r), 0.5)]
}

export function plop(r: number): Note[] {
  return [tone('sine', 300 + 40 * r, 120, 0.14, 0.004, 0.1), tone('sine', 500, 900, 0.05, 0.004, 0.05, 0.08)]
}

/** The soap shoots out of the grip. */
export function pfft(r: number): Note[] {
  return [hiss(1800 + 300 * r, 4200, 1.6, 0.11, 0.004, 0.12), ...later(plop(r), 0.62)]
}

/** The soap lands on a head. */
export function bonk(r: number): Note[] {
  return [tone('sine', 260 + 30 * r, 180, 0.16, 0.002, 0.09), tone('triangle', 520, 0, 0.05, 0.002, 0.05), ...later(pip(0.3, r), 0.16)]
}

/** A slippery thing under a finger. */
export function slither(r: number): Note[] {
  return [tone('sine', 1300 + 200 * r, 900, 0.05, 0.02, 0.1)]
}

// --- The gate, the wind and the walks ---------------------------------------

export function creak(r: number): Note[] {
  return [tone('sawtooth', 130 + 20 * r, 220, 0.06, 0.08, 0.3), tone('sawtooth', 320, 250, 0.03, 0.08, 0.25, 0.1)]
}

/** The gate rattles and stays shut. */
export function rattleGate(r: number): Note[] {
  return Array.from({ length: 5 }, (_, i): Note => tone('square', 170 + 25 * (i % 2) + 10 * r, 0, 0.06, 0.002, 0.035, i * 0.07))
}

export function latch(r: number): Note[] {
  return [tone('triangle', 340 + 30 * r, 0, 0.1, 0.002, 0.06), tone('triangle', 900, 0, 0.04, 0.001, 0.03, 0.03)]
}

/** A gust in the line. */
export function gust(r: number): Note[] {
  return [hiss(600 + 100 * r, 1300, 0.7, 0.045, 0.3, 0.5)]
}

/** One step of a friend's own walk. */
export function step(kind: FriendKind, r: number): Note[] {
  if (kind === 'pig') return [hiss(240 + 40 * r, 0, 1.4, 0.07, 0.01, 0.06)]
  if (kind === 'heron') return [tone('triangle', 980 + 80 * r, 0, 0.04, 0.001, 0.03)]
  return [tone('square', 300 + 30 * r, 0, 0.045, 0.001, 0.025), tone('square', 330, 0, 0.04, 0.001, 0.025, 0.09)]
}

/** A wet thing walks: a squelch at the step. */
export function squish(r: number): Note[] {
  return [hiss(380 + 80 * r, 700, 1.6, 0.09, 0.03, 0.08), tone('sine', 220, 300, 0.05, 0.03, 0.06)]
}

/** Flies round a muddy patch. */
export function buzz(r: number): Note[] {
  const f = 210 + 30 * r
  return [tone('sawtooth', f, f * 1.1, 0.035, 0.08, 0.3), tone('sawtooth', f * 1.02, f * 0.95, 0.03, 0.1, 0.3, 0.08)]
}

// --- The friends' own voices -------------------------------------------------

const grunt = (f: number, delay: number, up: number): Note[] => [tone('sawtooth', f * up, f * up * 0.7, 0.1, 0.012, 0.09, delay), hiss(320, 0, 2.5, 0.07, 0.01, 0.08, delay)]
const beak = (r: number, delay: number, i = 0): Note => tone('triangle', 1500 + 300 * r + 40 * i, 0, 0.06, 0.002, 0.022, delay)
const shake = (f: number, n: number, from: number): Note[] => Array.from({ length: n }, (_, i): Note => tone('sawtooth', f * (i % 2 ? 1.08 : 1), 0, 0.08, 0.008, 0.05, from + i * 0.055))

/** The pig: fat grunts, low, with a squeal for the third variant. */
export function oink(variant: number, r: number): Note[] {
  const f = 170 + 30 * r
  if (variant === 0) return [...grunt(f, 0, 1), ...grunt(f, 0.16, 1.15)]
  if (variant === 1) return [...grunt(f, 0, 1.1), ...grunt(f, 0.13, 1), ...grunt(f, 0.26, 1.25)]
  return [...grunt(f, 0, 1), tone('sawtooth', 520, 880, 0.07, 0.03, 0.2, 0.14)]
}

/** The pig is splashed or dripped on and likes it: a snort that climbs. */
export function snort(r: number): Note[] {
  return [hiss(260 + 40 * r, 0, 3, 0.1, 0.01, 0.07), hiss(300, 0, 3, 0.1, 0.01, 0.07, 0.11), tone('sawtooth', 240, 460, 0.08, 0.03, 0.16, 0.22)]
}

/** The heron: one harsh squawk and a rattle of the beak. */
export function squawk(variant: number, r: number): Note[] {
  const f = 760 + 120 * r
  const cry: Note[] = [tone('square', f, f * 0.62, 0.07, 0.01, 0.16), hiss(2400, 0, 1.2, 0.05, 0.01, 0.12)]
  if (variant === 0) return cry
  if (variant === 1) return [0, 0.06, 0.12, 0.18, 0.24].map((delay) => beak(r, delay))
  return [...cry, beak(r, 0.2), beak(r, 0.26), beak(r, 0.32)]
}

/** The heron is wet and hates it: only the beak, fast. */
export function rattle(r: number): Note[] {
  return Array.from({ length: 7 }, (_, i): Note => beak(r, i * 0.045, i))
}

/** The goat: a bleat that shakes. */
export function bleat(variant: number, r: number): Note[] {
  const f = 380 + 50 * r
  if (variant === 0) return shake(f, 5, 0)
  if (variant === 1) return [...shake(f, 2, 0), ...shake(f, 3, 0.2)]
  return [tone('sawtooth', f * 0.8, f * 1.1, 0.08, 0.02, 0.12), ...shake(f, 4, 0.16)]
}

/** The goat smells mud: a breath in, then the sneeze. */
export function sneeze(r: number): Note[] {
  return [tone('sine', 300 + 30 * r, 520, 0.05, 0.1, 0.2), hiss(3200, 1400, 0.8, 0.16, 0.004, 0.16, 0.34)]
}

/** The cat: one mew, up and over. */
export function mew(variant: number, r: number): Note[] {
  const f = 640 + 80 * r
  if (variant === 0) return [tone('sine', f, f * 1.4, 0.08, 0.04, 0.12), tone('sine', f * 1.4, f * 0.9, 0.07, 0.01, 0.2, 0.14)]
  if (variant === 1) return [tone('triangle', 90, 0, 0.08, 0.05, 0.5), tone('triangle', 94, 0, 0.06, 0.05, 0.5, 0.1)]
  return [tone('sine', f * 1.2, f * 0.8, 0.08, 0.02, 0.16)]
}

/** Tickled: each laughs in its own voice. */
export function laugh(kind: FriendKind, r: number): Note[] {
  if (kind === 'pig') return [0, 0.1, 0.2, 0.3].flatMap((delay, i) => [tone('sawtooth', (300 + 40 * i) * (1 + 0.1 * r), 220, 0.07, 0.01, 0.05, delay)])
  if (kind === 'heron') return [0, 0.09, 0.18, 0.27, 0.36].map((delay, i) => tone('square', 900 - 60 * i + 60 * r, 700, 0.05, 0.005, 0.04, delay))
  return [0, 0.08, 0.16, 0.24, 0.32, 0.4].map((delay, i) => tone('sawtooth', (420 + 30 * (i % 2)) * (1 + 0.08 * r), 0, 0.06, 0.006, 0.035, delay))
}

/** Dripped on from the line: each takes it by its taste. */
export function drippedOn(kind: FriendKind, r: number): Note[] {
  if (kind === 'pig') return snort(r)
  if (kind === 'heron') return [tone('square', 820 + 80 * r, 560, 0.06, 0.01, 0.1), beak(r, 0.16), beak(r, 0.21), beak(r, 0.26)]
  return shake(360 + 30 * r, 3, 0)
}

/** A peg on an ear, a beak or a beard: a small puzzled sound, then the flick. */
export function puzzled(kind: FriendKind, r: number): Note[] {
  const f = kind === 'pig' ? 200 : kind === 'heron' ? 700 : 400
  return [tone(kind === 'heron' ? 'square' : 'sawtooth', f * (1 + 0.06 * r), f * 1.3, 0.06, 0.04, 0.16)]
}

/** The gate rattles and this one has nothing on: a small no. */
export function unsure(kind: FriendKind, r: number): Note[] {
  const f = kind === 'pig' ? 180 : kind === 'heron' ? 640 : 350
  return [tone('sawtooth', f * (1 + 0.05 * r), f * 0.8, 0.06, 0.02, 0.1), tone('sawtooth', f * 0.9, f * 0.7, 0.05, 0.02, 0.12, 0.16)]
}

/** In the tub: the pig blows bubbles, the heron shrieks at each rub, the goat hiccups on the suds it eats. */
export function tubVoice(kind: FriendKind, r: number): Note[] {
  if (kind === 'pig') return [tone('sine', 150 + 20 * r, 260, 0.1, 0.02, 0.07), tone('sine', 170, 300, 0.1, 0.02, 0.07, 0.14), tone('sine', 520, 900, 0.04, 0.005, 0.04, 0.1), tone('sine', 560, 950, 0.04, 0.005, 0.04, 0.24)]
  if (kind === 'heron') return [tone('square', 1250 + 200 * r, 1700, 0.07, 0.008, 0.14), hiss(3000, 0, 1.4, 0.05, 0.008, 0.1)]
  return [hiss(700, 0, 2, 0.05, 0.02, 0.06), hiss(760, 0, 2, 0.05, 0.02, 0.06, 0.12), tone('sine', 380 + 40 * r, 760, 0.1, 0.004, 0.05, 0.3)]
}

/** A friend climbs into the tub, each in its own way: a belly-flop, one careful foot, a hop. */
export function climbIn(kind: FriendKind, r: number): Note[] {
  if (kind === 'pig') return [hiss(500, 200, 0.7, 0.2, 0.004, 0.3), tone('sine', 120, 60, 0.16, 0.004, 0.2)]
  if (kind === 'heron') return [tone('sine', 900 + 100 * r, 1700, 0.07, 0.004, 0.06), tone('sine', 800, 1500, 0.06, 0.004, 0.06, 0.4)]
  return [tone('square', 300, 0, 0.05, 0.001, 0.03), hiss(700, 300, 0.9, 0.14, 0.004, 0.18, 0.2), tone('sine', 420 + 40 * r, 620, 0.06, 0.02, 0.1, 0.3)]
}

/** What a friend says to what it wears. Each is to the garment, by the friend's own taste. */
export function mood(kind: FriendKind, what: string, r: number): Note[] {
  if (kind === 'pig') {
    if (what === 'strut') return [tone('sawtooth', 90 + 10 * r, 150, 0.07, 0.1, 0.25), ...later(grunt(190, 0, 1), 0.45), ...later(grunt(190, 0, 1.2), 0.62)]
    if (what === 'trip') return [tone('sine', 420, 180, 0.07, 0.01, 0.2, 0.5), tone('sine', 95, 60, 0.2, 0.004, 0.14, 0.8), hiss(300, 0, 1, 0.12, 0.004, 0.08, 0.8)]
    if (what === 'proud') return [...grunt(200, 0, 1), ...grunt(200, 0.14, 1.26), ...grunt(200, 0.28, 1.5)]
    if (what === 'patch') return [...grunt(150, 0, 0.9), ...later(buzz(r), 0.2)]
    if (what === 'squelch') return [...squish(r), ...later(snort(r), 0.2)]
    return [...grunt(180, 0, 1.1), ...later(pip(0.2, r), 0.2), ...later(pip(0.6, r), 0.34)]
  }
  if (kind === 'heron') {
    if (what === 'shudder') return [...rattle(r), tone('square', 700, 480, 0.06, 0.01, 0.14, 0.34)]
    if (what === 'plank') return [tone('sawtooth', 240 + 20 * r, 250, 0.05, 0.05, 0.3), beak(r, 0.4), beak(r, 0.7)]
    if (what === 'preen') return [tone('sine', 620 + 40 * r, 930, 0.07, 0.08, 0.2), tone('sine', 930, 1240, 0.06, 0.06, 0.24, 0.3)]
    if (what === 'proud') return [tone('sine', 700 + 40 * r, 1050, 0.07, 0.05, 0.16), beak(r, 0.3), beak(r, 0.38)]
    if (what === 'patch') return [tone('square', 560, 420, 0.05, 0.02, 0.16), ...later(buzz(r), 0.2)]
    if (what === 'squelch') return [...squish(r), ...later(rattle(r), 0.15)]
    return [tone('square', 760, 900, 0.05, 0.02, 0.1), ...later(pip(0.1, r), 0.18), ...later(pip(0.5, r), 0.3)]
  }
  // The lick and the chew. The hiccups come after, one for each bubble: `hiccup`.
  if (what === 'lick') return [hiss(900 + 60 * r, 500, 2, 0.06, 0.03, 0.09), hiss(700, 0, 2, 0.05, 0.02, 0.06, 0.45), hiss(760, 0, 2, 0.05, 0.02, 0.06, 0.6), hiss(720, 0, 2, 0.05, 0.02, 0.06, 0.75)]
  if (what === 'sneeze') return sneeze(r)
  if (what === 'pleased') return [tone('sawtooth', 330 + 30 * r, 440, 0.07, 0.03, 0.14), ...shake(440, 3, 0.18)]
  if (what === 'proud') return [...shake(400 + 30 * r, 2, 0), tone('sawtooth', 500, 600, 0.07, 0.02, 0.2, 0.14)]
  if (what === 'patch') return [...sneeze(r), ...later(buzz(r), 0.5)]
  if (what === 'squelch') return [...squish(r), ...later(shake(340, 2, 0), 0.2)]
  return [...shake(420, 2, 0), ...later(pip(0.3, r), 0.16), ...later(pip(0.7, r), 0.3)]
}

/** One hiccup of the goat, with a bleat at it. */
export function hiccup(r: number): Note[] {
  return [tone('sine', 400 + 40 * r, 800, 0.1, 0.004, 0.05), ...later(shake(390 + 20 * r, 2, 0), 0.07)]
}

/** A friend stops at its place and holds its garment out. */
export function arrived(kind: FriendKind, r: number): Note[] {
  if (kind === 'pig') return grunt(160 + 20 * r, 0, 1)
  if (kind === 'heron') return [beak(r, 0), beak(r, 0.07)]
  return shake(360 + 30 * r, 2, 0)
}

/** How long a voice lasts from its start, in seconds. */
export function lengthOf(notes: readonly Note[]): number {
  return notes.reduce((end, note) => Math.max(end, (note.delay ?? 0) + note.attack + note.decay), 0)
}
