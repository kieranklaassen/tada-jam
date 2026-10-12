import type { Note } from './audio'

// Every sound of the toy, kept as plain numbers, since nobody has heard the
// game before it is shown: the test beside this file holds each pitch, peak
// and length in range.
//
// Sight and sound run on one clock. A sound is asked for by the rules in the
// step in which its motion happens (toy.ts), and every note of it starts at
// once: no note carries a delay, so no voice can hide a wait inside itself.
// A sound that belongs to a later moment is a later step's sound.

export const SOUNDS = [
  'bite', 'scrape', 'clonk', 'crack', 'squeak',
  'ring', 'tock', 'thup', 'scrunch', 'ting', 'boop',
  'clink', 'crunch', 'thunk', 'flump', 'rumble', 'pat', 'tick', 'roundKnock',
  'plop', 'glug', 'fizz', 'splosh', 'bloop', 'crackle', 'creak', 'slush', 'plip', 'bubble',
  'drip', 'sigh', 'hiss', 'tingClear', 'squelch', 'fizzle', 'plink', 'blush',
  'bell', 'flute', 'drum', 'thud', 'glitter', 'reed',
  'puff', 'flake', 'shuffle', 'pack', 'snap', 'hatOn', 'hatOff',
  'yawn', 'stretch', 'skate', 'lampLit', 'snowfall',
  'harrumph', 'brr', 'oomph', 'squawk', 'grumble', 'polish',
  'chirrup', 'rap', 'oof', 'giggle', 'boing', 'tweet', 'thump',
] as const
export type SoundName = (typeof SOUNDS)[number]

/**
 * One sound the rules ask for. `pitch` is hertz where the sound has a note of its own (a block's note follows
 * its length), and `lively` from 0 to 1 is how fast or hard the thing was done. `scene` marks a sound a short
 * scene made: those stop in the frame a touch ends the scene.
 */
export type Sound = { name: SoundName; pitch?: number; lively?: number; scene?: true }

/** A block's own note: a short block is high and a long one low, one octave from the shortest to the longest. */
export function noteOfLength(len: number): number {
  return 1760 * 2 ** (-(Math.max(64, Math.min(300, len)) - 64) / 236)
}

const tone = (frequency: number, peak: number, attack: number, decay: number, wave: OscillatorType = 'sine', glideTo?: number): Note => ({ kind: 'tone', frequency, peak, attack, decay, wave, ...(glideTo ? { glideTo } : {}) })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })

/** The notes of one sound. Everything starts together. */
export function notesOf(sound: Sound): Note[] {
  const f = sound.pitch ?? 880, lively = Math.max(0, Math.min(1, sound.lively ?? 0.5))
  switch (sound.name) {
    // The saw.
    case 'bite': return [hiss(2600, 3, 0.2, 0.002, 0.05), tone(1900, 0.06, 0.002, 0.04, 'triangle')]
    case 'scrape': return [hiss(1300 + lively * 2200, 2.2, 0.07 + lively * 0.05, 0.004, 0.07)]
    case 'clonk': return [tone(210, 0.22, 0.003, 0.13, 'triangle', 150), hiss(520, 1.5, 0.1, 0.002, 0.06)]
    case 'crack': return [hiss(3200, 0.8, 0.3, 0.001, 0.09), tone(940, 0.12, 0.001, 0.07, 'square', 310), hiss(700, 1, 0.12, 0.002, 0.16)]
    case 'squeak': return [tone(1500, 0.08, 0.01, 0.12, 'sine', 2300), hiss(4200, 4, 0.05, 0.002, 0.05)]
    // A block's own note: a bar of ice has partials that are not whole multiples.
    case 'ring': return [tone(f, 0.2, 0.002, 0.95), tone(f * 2.76, 0.07, 0.002, 0.5), tone(f * 5.4, 0.03, 0.001, 0.22), hiss(5200, 5, 0.04, 0.001, 0.03)]
    case 'tock': return [tone(f * 0.5, 0.2, 0.003, 0.16, 'triangle'), hiss(900, 1.2, 0.09, 0.002, 0.07)]
    case 'thup': return [hiss(260, 0.7, 0.2, 0.006, 0.09), tone(120, 0.1, 0.004, 0.08)]
    case 'scrunch': return [hiss(3100, 1.6, 0.16, 0.003, 0.06), hiss(1500, 2, 0.1, 0.02, 0.07)]
    case 'ting': return [tone(3520, 0.1, 0.001, 0.4), tone(5270, 0.04, 0.001, 0.18)]
    case 'boop': return [tone(392, 0.2, 0.006, 0.2, 'sine', 330), tone(784, 0.05, 0.004, 0.09)]
    // Setting down.
    case 'clink': return [tone(f * 1.2, 0.12, 0.001, 0.3), tone(f * 3.3, 0.05, 0.001, 0.12), hiss(4600, 4, 0.06, 0.001, 0.03)]
    case 'crunch': return [hiss(420, 0.8, 0.2, 0.004, 0.14, 260), tone(f * 0.6, 0.04, 0.002, 0.2)]
    case 'thunk': return [tone(170, 0.2, 0.003, 0.15, 'triangle', 120), hiss(1500, 0.7, 0.09, 0.004, 0.2)]
    case 'flump': return [hiss(180, 0.6, 0.24, 0.02, 0.2, 110), hiss(2400, 0.5, 0.04, 0.03, 0.18)]
    case 'rumble': return [tone(78, 0.2, 0.03, 0.45, 'triangle', 62), hiss(240, 1.2, 0.12, 0.04, 0.4)]
    case 'pat': return [hiss(520, 0.9, 0.12, 0.004, 0.06)]
    case 'tick': return [tone(4200, 0.07, 0.001, 0.05), hiss(6200, 5, 0.03, 0.001, 0.02)]
    case 'roundKnock': return [tone(300, 0.2, 0.004, 0.18, 'sine', 240), tone(610, 0.05, 0.004, 0.1, 'triangle')]
    // Water.
    case 'plop': return [tone(340, 0.24, 0.004, 0.2, 'sine', 95), hiss(600, 0.9, 0.12, 0.004, 0.25)]
    case 'glug': return [tone(190, 0.26, 0.01, 0.3, 'sine', 70), hiss(320, 1.4, 0.1, 0.01, 0.3)]
    case 'fizz': return [hiss(5200, 0.7, 0.16, 0.04, 0.9, 2600), hiss(900, 0.6, 0.06, 0.05, 0.7)]
    case 'splosh': return [tone(420, 0.2, 0.004, 0.16, 'sine', 180), hiss(1100, 0.8, 0.14, 0.004, 0.3), tone(700, 0.05, 0.05, 0.3, 'sine', 1200)]
    case 'bloop': return [tone(260, 0.22, 0.006, 0.22, 'sine', 520), hiss(700, 1, 0.07, 0.004, 0.16)]
    case 'crackle': return [hiss(2400, 1.2, 0.14, 0.02, 0.4, 6200), tone(1200, 0.05, 0.02, 0.36, 'triangle', 2600)]
    case 'creak': return [tone(140, 0.12, 0.05, 0.5, 'sawtooth', 210), hiss(800, 6, 0.08, 0.04, 0.45, 1300)]
    case 'slush': return [hiss(1400, 0.5, 0.13, 0.08, 0.6, 500)]
    case 'bubble': return [tone(520 + lively * 260, 0.09, 0.006, 0.07, 'sine', 1040 + lively * 400), hiss(1500, 2, 0.03, 0.004, 0.05)]
    case 'plip': return [tone(900, 0.12, 0.003, 0.09, 'sine', 1500)]
    // A warm thumb.
    case 'drip': return [tone(1500 + lively * 500, 0.07, 0.002, 0.05, 'sine', 900)]
    case 'sigh': return [hiss(1800, 0.5, 0.1, 0.12, 0.6, 600)]
    case 'hiss': return [hiss(6400, 1.2, 0.12, 0.05, 0.7)]
    case 'tingClear': return [tone(f * 2, 0.14, 0.002, 0.6), tone(f * 5.5, 0.04, 0.002, 0.25)]
    case 'squelch': return [tone(240, 0.16, 0.02, 0.2, 'sawtooth', 90), hiss(700, 3, 0.14, 0.02, 0.22, 300)]
    case 'fizzle': return [hiss(7400, 2, 0.12, 0.01, 0.35, 4200)]
    case 'plink': return [tone(2500 + lively * 900, 0.09, 0.001, 0.12)]
    case 'blush': return [tone(1100, 0.1, 0.02, 0.2, 'sine', 1900), tone(1650, 0.04, 0.02, 0.16, 'sine', 2800)]
    // What the light does, as each lamp is lit.
    case 'bell': return [tone(1568, 0.14, 0.002, 1.1), tone(3136, 0.05, 0.002, 0.6), tone(4330, 0.02, 0.002, 0.3)]
    case 'flute': return [tone(784, 0.12, 0.08, 0.7), hiss(1568, 6, 0.06, 0.06, 0.6)]
    case 'drum': return [tone(98, 0.24, 0.004, 0.3, 'sine', 70), hiss(200, 1, 0.08, 0.004, 0.1)]
    case 'thud': return [tone(147, 0.18, 0.006, 0.16, 'sine', 110)]
    case 'glitter': return [tone(4186, 0.06, 0.001, 0.2), tone(5274, 0.05, 0.001, 0.16), tone(6272, 0.04, 0.001, 0.12), tone(7040, 0.03, 0.001, 0.1)]
    case 'reed': return [tone(349, 0.14, 0.04, 0.8, 'sawtooth'), tone(698, 0.04, 0.04, 0.6, 'square')]
    // The snow and the sky.
    case 'puff': return [hiss(700 + lively * 500, 0.7, 0.13, 0.012, 0.17)]
    case 'flake': return [tone(1870 + lively * 620, 0.05, 0.004, 0.22), tone(3740 + lively * 1240, 0.02, 0.004, 0.1)]
    case 'shuffle': return [hiss(900 + lively * 700, 0.6, 0.09, 0.02, 0.1)]
    case 'pack': return [hiss(380, 1.4, 0.2, 0.006, 0.12), hiss(2000, 2, 0.08, 0.004, 0.05)]
    case 'snap': return [tone(2960, 0.12, 0.001, 0.25), hiss(5000, 2, 0.12, 0.001, 0.03)]
    case 'hatOn': return [tone(262, 0.16, 0.004, 0.14, 'triangle', 196), tone(1046, 0.05, 0.002, 0.2)]
    case 'hatOff': return [tone(330, 0.14, 0.01, 0.3, 'sine', 660)]
    // The day turning.
    case 'yawn': return [tone(294, 0.14, 0.2, 1, 'sine', 147)]
    case 'stretch': return [tone(165, 0.14, 0.2, 0.9, 'sine', 392)]
    case 'skate': return [hiss(4800, 3, 0.07, 0.2, 1, 3000)]
    case 'lampLit': return [tone(1175 + lively * 590, 0.1, 0.004, 0.5), tone(2350 + lively * 1180, 0.03, 0.004, 0.3)]
    case 'snowfall': return [hiss(3600, 0.4, 0.05, 0.3, 0.9)]
    // The characters, each in its own register: the king lowest, the bird highest.
    case 'harrumph': return [tone(104, 0.2, 0.02, 0.34, 'sawtooth', 78), hiss(300, 0.9, 0.12, 0.03, 0.4)]
    case 'brr': return [tone(92, 0.16, 0.01, 0.5, 'square', 120), hiss(1100, 0.6, 0.1, 0.02, 0.5)]
    case 'oomph': return [tone(88, 0.2, 0.02, 0.22, 'triangle', 62)]
    case 'squawk': return [tone(130, 0.18, 0.01, 0.3, 'sawtooth', 420), hiss(1900, 2, 0.08, 0.01, 0.2)]
    case 'grumble': return [tone(72, 0.18, 0.06, 1.1, 'sawtooth', 62), tone(84, 0.08, 0.06, 1, 'square', 66), hiss(240, 0.8, 0.1, 0.08, 1)]
    case 'polish': return [tone(1900, 0.06, 0.03, 0.5, 'sine', 2500), hiss(3400, 5, 0.06, 0.03, 0.5)]
    case 'chirrup': return [tone(1320, 0.1, 0.006, 0.16, 'sine', 1980)]
    case 'rap': return [hiss(340, 1, 0.14, 0.004, 0.05), tone(1480, 0.03, 0.003, 0.05)]
    case 'oof': return [tone(520, 0.14, 0.01, 0.2, 'triangle', 310)]
    case 'giggle': return [tone(880, 0.1, 0.01, 0.28, 'triangle', 1320), hiss(2600, 1, 0.07, 0.005, 0.2)]
    case 'boing': return [tone(196, 0.18, 0.008, 0.4, 'triangle', 392)]
    case 'tweet': return [tone(2800, 0.08, 0.004, 0.09, 'sine', 3500)]
    case 'thump': return [tone(110, 0.2, 0.003, 0.09, 'sine', 80), hiss(400, 1, 0.08, 0.003, 0.05)]
    default:
      sound.name satisfies never
      return []
  }
}

/** Everything one step asked for, as the notes of one voice, so the first touch of a visit keeps all of it (audio.ts). */
export function notesOfAll(sounds: readonly Sound[]): Note[] {
  return sounds.flatMap(notesOf)
}
