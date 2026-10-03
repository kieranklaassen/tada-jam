import type { ToyEvent } from './toybox'

// Every voice of the game as plain numbers: pitch, peak, attack and length.
// Nothing here makes a sound; `sound.ts` plays these through Web Audio. The
// test beside this file holds every voice inside the ranges stated below.

export type Part = {
  /** A pitched tone, or a band of noise. */
  kind: 'tone' | 'noise'
  wave?: OscillatorType
  /** Pitch in Hz (the middle of the band for noise), and where it glides to. */
  freq: number
  to?: number
  /** How narrow a band of noise is. */
  q?: number
  /** Loudest point, 0 to 1 before the master gain. */
  peak: number
  /** Seconds to the peak, and seconds from the peak to silence. */
  attack: number
  decay: number
  /** Seconds after the voice starts. */
  delay?: number
}

/** The ranges every part stays inside. */
export const RANGE = { lowHz: 70, highHz: 4200, mostPeak: 0.3, leastAttack: 0.002, longest: 0.9 } as const

/** The notes the tray rings, one for each column from left to right: a scale with no wrong notes in it. */
export const TRAY_NOTES = [523.25, 587.33, 659.25, 783.99, 880] as const

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** The voice for something that happened in the toy. */
export function voiceOf(event: ToyEvent): Part[] {
  switch (event.type) {
    case 'chirp': {
      // The motor setting off: higher the further it has to go.
      const far = clamp(event.distance / 24, 0, 1)
      return [
        { kind: 'tone', wave: 'square', freq: 300 + 380 * far, to: 420 + 520 * far, peak: 0.07, attack: 0.004, decay: 0.09 },
        { kind: 'noise', freq: 2600, q: 1.2, peak: 0.1, attack: 0.002, decay: 0.035 },
      ]
    }
    case 'tick':
      return [{ kind: 'tone', wave: 'square', freq: 1500, to: 1100, peak: 0.022, attack: 0.002, decay: 0.022 }]
    case 'buffer':
      // The bell at the end of the rail.
      return [
        { kind: 'tone', wave: 'sine', freq: 1568, peak: clamp(0.08 + event.speed / 500, 0.08, 0.2), attack: 0.002, decay: 0.55 },
        { kind: 'tone', wave: 'sine', freq: 3136, peak: 0.05, attack: 0.002, decay: 0.25 },
      ]
    case 'clack':
      return [
        { kind: 'noise', freq: 1800, q: 2, peak: 0.2, attack: 0.002, decay: 0.05 },
        { kind: 'tone', wave: 'triangle', freq: 220, to: 140, peak: 0.16, attack: 0.002, decay: 0.08 },
      ]
    case 'pop': {
      // A toy coming off its studs: lower for a big one, and a step higher for each toy it stood on.
      const up = 1 + 0.19 * clamp(event.level, 0, 2)
      return [{ kind: 'tone', wave: 'sine', freq: (event.heavy > 1 ? 300 : 440) * up, to: (event.heavy > 1 ? 720 : 1040) * up, peak: 0.24, attack: 0.004, decay: 0.11 }]
    }
    case 'settle':
      // What is left of a stack settling: a soft double click.
      return [
        { kind: 'noise', freq: 1500, q: 4, peak: 0.07, attack: 0.002, decay: 0.03, delay: 0.12 },
        { kind: 'noise', freq: 1250, q: 4, peak: 0.055, attack: 0.002, decay: 0.03, delay: 0.21 },
      ]
    case 'bite':
      return [
        { kind: 'noise', freq: 2400, q: 3, peak: 0.16, attack: 0.002, decay: 0.03 },
        { kind: 'noise', freq: 2000, q: 3, peak: 0.12, attack: 0.002, decay: 0.03, delay: 0.07 },
      ]
    case 'bonk': {
      const note = TRAY_NOTES[clamp(event.column, 0, TRAY_NOTES.length - 1)]
      return [
        { kind: 'tone', wave: 'triangle', freq: note, peak: 0.24, attack: 0.003, decay: 0.42 },
        { kind: 'tone', wave: 'sine', freq: note * 2, peak: 0.07, attack: 0.003, decay: 0.2 },
      ]
    }
    case 'ratchet': {
      // Quicker and higher as the hoist climbs, a third lower under a big toy.
      const base = event.heavy > 1 ? 392 : 523.25
      return [{ kind: 'tone', wave: 'triangle', freq: base * (1 + 0.9 * clamp(event.progress, 0, 1)), peak: 0.1, attack: 0.002, decay: 0.05 }]
    }
    case 'let-go':
      return [{ kind: 'noise', freq: 900, to: 2400, q: 1.5, peak: 0.1, attack: 0.004, decay: 0.07 }]
    case 'click': {
      // Plastic onto studs: brighter higher up a stack, deeper for a big toy.
      const high = 1 + 0.25 * clamp(event.level, 0, 2)
      return [
        { kind: 'noise', freq: (event.heavy > 1 ? 1300 : 2100) * high, q: 4, peak: 0.22, attack: 0.002, decay: 0.035 },
        { kind: 'tone', wave: 'triangle', freq: (event.heavy > 1 ? 150 : 250) * high, to: (event.heavy > 1 ? 100 : 170) * high, peak: event.heavy > 1 ? 0.24 : 0.16, attack: 0.002, decay: event.heavy > 1 ? 0.16 : 0.09 },
      ]
    }
    case 'boing':
      return [{ kind: 'tone', wave: 'sine', freq: 180, to: 520, peak: 0.2, attack: 0.01, decay: 0.28 }]
  }
}
