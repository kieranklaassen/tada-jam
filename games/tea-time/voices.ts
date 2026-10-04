// Every sound of the toy, as plain numbers. A voice is a few parts, each a
// short tone or a short band of noise with a pitch, a peak, an attack and a
// length. Nothing here touches Web Audio: sound.ts builds the nodes, and the
// test beside this file holds every part inside the ranges below, because the
// machine these were written on cannot be listened to.
//
// The ranges: pitch 60 to 6000 Hz, peak 0.02 to 0.3 (the master gain and the
// compressor are in audio.ts), attack at least 2 ms, and no voice longer than
// 1.6 s from its start to the end of its last part.

export type Part = {
  kind: 'tone' | 'noise'
  /** Seconds after the voice starts. */
  at: number
  /** Hz: the pitch of a tone, or the middle of a band of noise. */
  pitch: number
  /** Hz the pitch glides to by the end of the part, if it glides. */
  to?: number
  /** A tone's wave, or how narrow a band of noise is (under 1 a hiss, over 8 nearly a whistle). */
  wave?: 'sine' | 'triangle'
  q?: number
  peak: number
  attack: number
  /** Seconds the part takes to die away after its attack. */
  decay: number
}

export type VoiceSpec = readonly Part[]

export const LIMITS = { minPitch: 60, maxPitch: 6000, minPeak: 0.02, maxPeak: 0.3, minAttack: 0.002, maxSeconds: 1.6 } as const

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** How long a voice lasts, from its start to the end of its last part. */
export function lengthOf(voice: VoiceSpec): number {
  return voice.reduce((end, part) => Math.max(end, part.at + part.attack + part.decay), 0)
}

/** The finger lands on the pot: a low ceramic knock and the lid's chatter. */
export const potPress: VoiceSpec = [
  { kind: 'tone', at: 0, pitch: 310, to: 240, wave: 'sine', peak: 0.2, attack: 0.003, decay: 0.09 },
  { kind: 'noise', at: 0.012, pitch: 3400, q: 5, peak: 0.07, attack: 0.002, decay: 0.03 },
  { kind: 'noise', at: 0.055, pitch: 3900, q: 5, peak: 0.05, attack: 0.002, decay: 0.03 },
  { kind: 'noise', at: 0.105, pitch: 3600, q: 5, peak: 0.035, attack: 0.002, decay: 0.035 },
]

/** One drop into tea or an empty cup: a plip that chirps upward, higher in a fuller cup. `level` is 0 to 1. */
export function plip(level: number): VoiceSpec {
  const base = 620 + 520 * clamp(level, 0, 1)
  return [
    { kind: 'tone', at: 0, pitch: base, to: base * 2.1, wave: 'sine', peak: 0.17, attack: 0.004, decay: 0.07 },
    { kind: 'tone', at: 0.03, pitch: base * 1.5, to: base * 2.6, wave: 'sine', peak: 0.05, attack: 0.004, decay: 0.05 },
  ]
}

/** A drop on the cloth: a soft pat with no ring to it. */
export const pat: VoiceSpec = [
  { kind: 'noise', at: 0, pitch: 420, q: 1.1, peak: 0.13, attack: 0.003, decay: 0.07 },
  { kind: 'tone', at: 0, pitch: 150, to: 95, wave: 'sine', peak: 0.08, attack: 0.003, decay: 0.06 },
]

/**
 * One grain of the running stream; the toy plays one about every eleventh of
 * a second while tea runs. The pitch of a filling cup climbs as the space
 * above the tea gets shorter, so the child can hear how full it is: `level`
 * is 0 to 1, `strength` is the stream's share of steady, and `turn` counts
 * the grains so that no two neighbours are alike.
 */
export function trickle(level: number, strength: number, turn: number): VoiceSpec {
  const air = 330 + 1250 * clamp(level, 0, 1) ** 1.35
  const waver = 1 + 0.07 * Math.sin(turn * 2.4) + 0.04 * Math.sin(turn * 5.1)
  const loud = 0.05 + 0.07 * clamp(strength, 0, 1)
  return [
    { kind: 'noise', at: 0, pitch: air * waver, q: 7, peak: loud, attack: 0.012, decay: 0.15 },
    { kind: 'noise', at: 0.02, pitch: 1900 + 500 * Math.sin(turn * 1.7), q: 0.9, peak: loud * 0.45, attack: 0.01, decay: 0.12 },
    { kind: 'tone', at: 0.01, pitch: air * waver * 0.5, to: air * waver * 0.62, wave: 'sine', peak: loud * 0.5, attack: 0.01, decay: 0.09 },
  ]
}

/** The pot's glug, every few grains while it pours: a low bubble that drops. */
export function glug(turn: number): VoiceSpec {
  const pitch = 128 + 22 * Math.sin(turn * 1.9)
  return [{ kind: 'tone', at: 0, pitch, to: pitch * 0.62, wave: 'sine', peak: 0.16, attack: 0.012, decay: 0.12 }]
}

/** Tea running over into the saucer or onto the cloth: a flat patter, lower and duller than the stream. */
export function patter(turn: number): VoiceSpec {
  return [
    { kind: 'noise', at: 0, pitch: 520 + 90 * Math.sin(turn * 3.1), q: 1.4, peak: 0.1, attack: 0.004, decay: 0.07 },
    { kind: 'noise', at: 0.045, pitch: 430 + 70 * Math.sin(turn * 4.3), q: 1.4, peak: 0.07, attack: 0.004, decay: 0.06 },
  ]
}

/** A cup is tapped: it rings like a small bell, lower the fuller it is and higher the smaller it is. `scale` is the cup's size against a house cup. */
export function cupRing(level: number, scale: number): VoiceSpec {
  const pitch = (1320 / clamp(scale, 0.4, 1.2)) * (1 - 0.34 * clamp(level, 0, 1))
  return [
    { kind: 'tone', at: 0, pitch, wave: 'sine', peak: 0.16, attack: 0.002, decay: 0.85 },
    // A bell's second partial; a thimble's would be above what a small speaker gives, so it is held under the top of the range.
    { kind: 'tone', at: 0, pitch: Math.min(pitch * 2.76, LIMITS.maxPitch - 200), wave: 'sine', peak: 0.05, attack: 0.002, decay: 0.3 },
    { kind: 'noise', at: 0, pitch: 4200, q: 3, peak: 0.05, attack: 0.002, decay: 0.02 },
  ]
}

/** The stream stops and the pot rights itself: the lid drops home. */
export const lidClick: VoiceSpec = [
  { kind: 'noise', at: 0.1, pitch: 3100, q: 4, peak: 0.08, attack: 0.002, decay: 0.03 },
  { kind: 'tone', at: 0.1, pitch: 880, to: 700, wave: 'triangle', peak: 0.07, attack: 0.002, decay: 0.07 },
]

/** The pot hops to another place: a soft rush of air, rising. */
export const hop: VoiceSpec = [
  { kind: 'noise', at: 0, pitch: 520, to: 1500, q: 0.8, peak: 0.07, attack: 0.05, decay: 0.2 },
  { kind: 'tone', at: 0, pitch: 260, to: 420, wave: 'sine', peak: 0.08, attack: 0.02, decay: 0.16 },
]

/** It lands: a ceramic knock on the cloth and a slosh inside. */
export const land: VoiceSpec = [
  { kind: 'tone', at: 0, pitch: 210, to: 150, wave: 'sine', peak: 0.2, attack: 0.003, decay: 0.11 },
  { kind: 'noise', at: 0.02, pitch: 700, to: 420, q: 1.6, peak: 0.07, attack: 0.02, decay: 0.16 },
  { kind: 'noise', at: 0.03, pitch: 3300, q: 4, peak: 0.05, attack: 0.002, decay: 0.03 },
]

/** A saucer is tapped: it rattles down like a spun coin, the ticks coming closer together. */
export const saucerRattle: VoiceSpec = [0, 0.09, 0.165, 0.225, 0.272, 0.308, 0.336].map((at, i) => ({ kind: 'noise' as const, at, pitch: 2500 + i * 110, q: 6, peak: 0.1 - i * 0.01, attack: 0.002, decay: 0.035 }))

/** A tap on the bare cloth: a dull thump. */
export const clothThump: VoiceSpec = [
  { kind: 'tone', at: 0, pitch: 120, to: 80, wave: 'sine', peak: 0.2, attack: 0.004, decay: 0.1 },
  { kind: 'noise', at: 0, pitch: 300, q: 0.9, peak: 0.06, attack: 0.004, decay: 0.05 },
]

/** The sponge is pressed: a wet squelch that sinks. `wet` is 0 to 1, how much tea it holds. */
export function squelch(wet: number): VoiceSpec {
  const w = clamp(wet, 0, 1)
  return [
    { kind: 'noise', at: 0, pitch: 900 - 250 * w, to: 360, q: 2.2, peak: 0.1 + 0.06 * w, attack: 0.015, decay: 0.16 },
    { kind: 'tone', at: 0.02, pitch: 240, to: 150, wave: 'sine', peak: 0.07, attack: 0.02, decay: 0.1 },
  ]
}

/** One stroke of the sponge over a puddle: a squeak that rises, and the tea going into it. */
export function squeak(turn: number): VoiceSpec {
  const pitch = 1150 + 180 * Math.sin(turn * 2.2)
  return [
    { kind: 'tone', at: 0, pitch, to: pitch * 1.32, wave: 'triangle', peak: 0.06, attack: 0.02, decay: 0.09 },
    { kind: 'noise', at: 0, pitch: 1400, to: 700, q: 1.5, peak: 0.06, attack: 0.02, decay: 0.12 },
  ]
}

/** One stroke of the sponge over dry cloth: a soft brush and no squeak. */
export const brush: VoiceSpec = [{ kind: 'noise', at: 0, pitch: 1700, to: 1100, q: 0.7, peak: 0.045, attack: 0.02, decay: 0.1 }]
