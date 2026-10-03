import type { Kind } from './kinds'

// Every sound of the game as plain numbers: pitch, peak, attack and length
// for each part of a voice. Nothing here touches Web Audio, so a test can
// hold each voice inside a stated range on a machine that cannot hear
// (voices.test.ts). sounds.ts turns a voice into nodes.

export type Part = {
  /** An oscillator shape, or a band of noise. */
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'
  /** Hz: the pitch, or the middle of the noise band. */
  freq: number
  /** 0 to 1 gain at the top of the envelope. */
  peak: number
  /** Seconds up to the peak, and seconds down from it. */
  attack: number
  decay: number
  /** Hz the pitch slides to over the whole part. */
  glideTo?: number
  /** For noise: how narrow the band is. */
  q?: number
  /** Seconds after the voice starts. */
  delay?: number
}

export type VoiceSpec = readonly Part[]

/** What every voice is held to. */
export const LIMITS = { minFreq: 60, maxFreq: 4200, maxPeak: 0.2, minAttack: 0.002, maxSeconds: 0.9 } as const

/** How long a voice sounds, in seconds. */
export function seconds(spec: VoiceSpec): number {
  return spec.reduce((end, p) => Math.max(end, (p.delay ?? 0) + p.attack + p.decay), 0)
}

/** The steps the count climbs: a major scale from middle C, one step for every piece of a kind on the pizza. */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19] as const
const MIDDLE_C = 261.63

/** The pitch of the `count`th piece of a kind: one step higher for every piece, and the same for every kind. */
export function stepFreq(count: number): number {
  const i = Math.max(0, Math.min(SCALE.length - 1, Math.round(count) - 1))
  return MIDDLE_C * 2 ** (SCALE[i] / 12)
}

/** Touch-down on a tub or a piece: a small pop as the piece comes up. */
export const pop: VoiceSpec = [{ wave: 'sine', freq: 420, peak: 0.13, attack: 0.003, decay: 0.07, glideTo: 780 }]

/** How each kind lands: the same climbing note, in the kind's own voice, with the kind's own knock under it. */
export function plop(kind: Kind, count: number): VoiceSpec {
  const f = stepFreq(count)
  switch (kind) {
    case 'pepper':
      return [{ wave: 'triangle', freq: f, peak: 0.17, attack: 0.003, decay: 0.16 }, { wave: 'noise', freq: 3000, q: 4, peak: 0.07, attack: 0.002, decay: 0.03 }]
    case 'mushroom':
      return [{ wave: 'sine', freq: f, peak: 0.17, attack: 0.006, decay: 0.22, glideTo: f * 0.94 }, { wave: 'sine', freq: 110, peak: 0.14, attack: 0.003, decay: 0.09, glideTo: 80 }]
    case 'olive':
      return [{ wave: 'sine', freq: f, peak: 0.16, attack: 0.003, decay: 0.14 }, { wave: 'sine', freq: f * 2, peak: 0.1, attack: 0.002, decay: 0.05, glideTo: f }]
    case 'cheese':
      return [{ wave: 'triangle', freq: f, peak: 0.16, attack: 0.004, decay: 0.2 }, { wave: 'noise', freq: 900, q: 1, peak: 0.11, attack: 0.002, decay: 0.07 }]
    case 'sock':
      return [{ wave: 'sine', freq: f, peak: 0.15, attack: 0.008, decay: 0.24 }, { wave: 'noise', freq: 300, q: 0.8, peak: 0.13, attack: 0.004, decay: 0.13 }]
    case 'worm':
      return [{ wave: 'square', freq: f * 0.8, peak: 0.07, attack: 0.004, decay: 0.2, glideTo: f }, { wave: 'sine', freq: f, peak: 0.1, attack: 0.02, decay: 0.2, delay: 0.03 }]
  }
}

/** A piece taken off: the note it landed on, falling to the one below. `count` is how many of the kind are left. */
export function pip(_kind: Kind, count: number): VoiceSpec {
  return [{ wave: 'triangle', freq: stepFreq(count + 1), peak: 0.13, attack: 0.003, decay: 0.12, glideTo: count > 0 ? stepFreq(count) : stepFreq(1) * 0.84 }]
}

/** A piece back in its tub. */
export const home: VoiceSpec = [{ wave: 'sine', freq: 230, peak: 0.09, attack: 0.003, decay: 0.08, glideTo: 160 }, { wave: 'noise', freq: 1400, q: 2, peak: 0.04, attack: 0.002, decay: 0.04 }]

/** A piece bouncing off a full pizza. */
export const boing: VoiceSpec = [{ wave: 'sine', freq: 180, peak: 0.16, attack: 0.004, decay: 0.3, glideTo: 520 }, { wave: 'triangle', freq: 360, peak: 0.06, attack: 0.004, decay: 0.2, glideTo: 880, delay: 0.04 }]

/** The pizza tapped: a wobble, low and round. */
export const jiggle: VoiceSpec = [
  { wave: 'sine', freq: 150, peak: 0.13, attack: 0.005, decay: 0.1, glideTo: 190 },
  { wave: 'sine', freq: 190, peak: 0.1, attack: 0.005, decay: 0.1, glideTo: 150, delay: 0.09 },
  { wave: 'sine', freq: 150, peak: 0.07, attack: 0.005, decay: 0.12, glideTo: 180, delay: 0.18 },
]

/** The oven poked while it has nothing to do: a hollow knock. */
export const knock: VoiceSpec = [{ wave: 'sine', freq: 120, peak: 0.16, attack: 0.003, decay: 0.12, glideTo: 90 }, { wave: 'noise', freq: 500, q: 3, peak: 0.07, attack: 0.002, decay: 0.05 }]

/**
 * A customer's babble: a few notes on its own pitch with clear intonation and
 * no words. `shape` is the tune: rising asks, falling grumbles, a hop is glee.
 */
export function babble(voiceHz: number, shape: 'ask' | 'glee' | 'grumble' | 'giggle'): VoiceSpec {
  const tunes = { ask: [1, 1.12, 1.34], glee: [1.2, 1.5, 1.2, 1.6], grumble: [1, 0.86, 0.75], giggle: [1.5, 1.34, 1.5, 1.34, 1.6] } as const
  const each = shape === 'giggle' ? 0.07 : 0.11
  return tunes[shape].map((k, i) => ({ wave: i % 2 === 0 ? ('triangle' as const) : ('sine' as const), freq: voiceHz * k, peak: 0.13, attack: 0.012, decay: each, glideTo: voiceHz * k * (shape === 'grumble' ? 0.92 : 1.06), delay: i * each }))
}
