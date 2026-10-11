// Every sound of the toy, as plain numbers: pitch, loudness, attack and
// length. No audio API here. sound.ts turns a voice into sound through the
// builders in audio.ts, and the test beside this file holds every voice inside
// stated ranges, since the machine these were written on cannot be heard.
//
// A voice is a few partials played together. Each is a tone or a band of
// noise with an envelope. Sound is dense and varied, never just louder: the
// hose is pitched by how far the water goes, a landing by how wet the sand
// already is, and each sound has variants that take turns (ART.md, "The toy").

export type Partial = {
  kind: 'tone' | 'noise'
  /** Seconds after the voice starts. */
  at: number
  /** Hz: the pitch of a tone, or the middle of a band of noise. */
  frequency: number
  /** Hz the pitch slides to by the end, when it slides. */
  glideTo?: number
  /** The shape of a tone. */
  wave?: 'sine' | 'triangle' | 'square'
  /** How narrow a band of noise is: under 1 is a wide hiss. */
  q?: number
  /** The loudest it gets, from 0 to 1 before the master volume. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds to die away after the peak. */
  decay: number
}

export type VoiceSpec = readonly Partial[]

/** The ranges every partial stays inside. The test holds each voice to them. */
export const LIMITS = {
  frequency: [60, 6000],
  peak: [0.01, 0.2],
  attack: [0.002, 0.08],
  decay: [0.03, 0.6],
  /** No voice is longer than this, start to silence, so the yard is quiet within a second of the child stopping. */
  longestS: 0.9,
  /** The peaks of one voice add up to no more than this. */
  loudest: 0.42,
  partials: 4,
} as const

/** How many variants a landing has. */
export const SPLAT_VARIANTS = 4

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** How long a voice lasts, start to silence. */
export function lengthOf(voice: VoiceSpec): number {
  return Math.max(...voice.map((partial) => partial.at + partial.attack + partial.decay))
}

/**
 * The hose, for one gulp leaving it. `reach` is how far the water has to go,
 * in yard units: a near target is a low gurgle and a far one a higher hiss.
 * Gulps of a stream overlap into one long hiss.
 */
export function hose(reach: number): VoiceSpec {
  const far = clamp(reach / 13, 0, 1)
  return [
    { kind: 'noise', at: 0, frequency: 900 + 1500 * far, glideTo: 760 + 1100 * far, q: 0.8, peak: 0.1, attack: 0.02, decay: 0.34 },
    { kind: 'tone', at: 0, frequency: 250 - 90 * far, glideTo: 380 - 120 * far, wave: 'sine', peak: 0.07 - 0.04 * far, attack: 0.012, decay: 0.14 },
  ]
}

/** The first gulp of a touch: the pop of water starting, on top of the hose. */
export function spurt(): VoiceSpec {
  return [{ kind: 'tone', at: 0, frequency: 310, glideTo: 560, wave: 'sine', peak: 0.12, attack: 0.004, decay: 0.07 }]
}

/**
 * A gulp landing on sand. `wet` is how wet the sand already is, 0 to 1: dry
 * sand is a soft high pat and wet sand a lower, fuller one. `variant` picks
 * one of the variants.
 */
export function splat(wet: number, variant: number): VoiceSpec {
  const w = clamp(wet, 0, 1)
  const shift = [1, 1.12, 0.9, 1.05][((Math.round(variant) % SPLAT_VARIANTS) + SPLAT_VARIANTS) % SPLAT_VARIANTS]
  return [
    { kind: 'noise', at: 0, frequency: (620 - 260 * w) * shift, glideTo: (380 - 140 * w) * shift, q: 1.1, peak: 0.13, attack: 0.004, decay: 0.11 + 0.05 * w },
    { kind: 'tone', at: 0, frequency: (210 - 70 * w) * shift, glideTo: (120 - 30 * w) * shift, wave: 'sine', peak: 0.09, attack: 0.004, decay: 0.09 },
  ]
}

/** A gulp landing in standing water: a drop's "plip", which rises. */
export function plip(variant: number): VoiceSpec {
  const shift = [1, 1.15, 0.88, 1.06][((Math.round(variant) % SPLAT_VARIANTS) + SPLAT_VARIANTS) % SPLAT_VARIANTS]
  return [
    { kind: 'tone', at: 0, frequency: 640 * shift, glideTo: 1280 * shift, wave: 'sine', peak: 0.11, attack: 0.004, decay: 0.09 },
    { kind: 'noise', at: 0, frequency: 1800, q: 0.9, peak: 0.04, attack: 0.004, decay: 0.06 },
  ]
}

/** A gulp landing in mud: a low wet squelch. */
export function squelch(variant: number): VoiceSpec {
  const shift = [1, 0.9, 1.1, 0.95][((Math.round(variant) % SPLAT_VARIANTS) + SPLAT_VARIANTS) % SPLAT_VARIANTS]
  return [
    { kind: 'noise', at: 0, frequency: 340 * shift, glideTo: 170 * shift, q: 3, peak: 0.14, attack: 0.01, decay: 0.2 },
    { kind: 'tone', at: 0.02, frequency: 120 * shift, glideTo: 80 * shift, wave: 'sine', peak: 0.1, attack: 0.01, decay: 0.14 },
  ]
}

/** The truck's horn: two notes together, twice. A toy's "meep meep". */
export function honk(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 392, wave: 'triangle', peak: 0.11, attack: 0.008, decay: 0.16 },
    { kind: 'tone', at: 0, frequency: 494, wave: 'triangle', peak: 0.09, attack: 0.008, decay: 0.16 },
    { kind: 'tone', at: 0.2, frequency: 392, wave: 'triangle', peak: 0.11, attack: 0.008, decay: 0.24 },
    { kind: 'tone', at: 0.2, frequency: 494, wave: 'triangle', peak: 0.09, attack: 0.008, decay: 0.24 },
  ]
}

/** The truck landing from its hop. */
export function thud(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 130, glideTo: 70, wave: 'sine', peak: 0.16, attack: 0.004, decay: 0.14 },
    { kind: 'noise', at: 0, frequency: 300, q: 0.8, peak: 0.05, attack: 0.004, decay: 0.07 },
  ]
}

/** The truck's springs when a gulp rocks it back: a short quiet creak. */
export function creak(variant: number): VoiceSpec {
  const shift = [1, 1.1, 0.92][((Math.round(variant) % 3) + 3) % 3]
  return [{ kind: 'tone', at: 0, frequency: 230 * shift, glideTo: 180 * shift, wave: 'triangle', peak: 0.035, attack: 0.01, decay: 0.08 }]
}

/** Picks variants in turn so that none comes twice running. A fixed stream: the same play makes the same sounds. */
export class Variants {
  private last = -1
  private seed: number

  constructor(seed = 0x9e3779b9) {
    this.seed = seed >>> 0 || 1
  }

  next(count: number): number {
    if (count <= 1) return 0
    this.seed ^= this.seed << 13
    this.seed ^= this.seed >>> 17
    this.seed ^= this.seed << 5
    let pick = (this.seed >>> 0) % count
    if (pick === this.last) pick = (pick + 1) % count
    this.last = pick
    return pick
  }
}
