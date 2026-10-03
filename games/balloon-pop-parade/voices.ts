import type { KindName } from './bodies'

// Every sound of the game as plain numbers, so a test can hold each one inside
// a stated range without hearing it. A voice is a few partials: an enveloped
// tone that may glide, or an enveloped band of noise. sounds.ts turns them
// into Web Audio. Nothing here is a verdict: there is no chime for right and
// no buzz for wrong, only what vinyl, rubber and air do.

export type Partial = {
  /** A tone of this wave, or a band of noise. */
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'
  /** Seconds after the voice starts. */
  at: number
  /** Hz: the pitch of a tone, or the middle of a band of noise. */
  from: number
  /** Hz the pitch glides to by the end; the same as `from` for a steady one. */
  to: number
  /** Loudness at the top of the envelope, 0 to 1 before the master gain. */
  peak: number
  /** Seconds to the top, and seconds to fall away. */
  attack: number
  decay: number
  /** How narrow a band of noise is; unused by a tone. */
  q?: number
}

export type VoiceId =
  | 'squeak' | 'letGo' | 'whistle' | 'pop' | 'raspberry' | 'thud' | 'bloop' | 'boop' | 'liftOff'
  | `${KindName}Catch` | `${KindName}Refuse` | `${KindName}Poke` | `${KindName}Startle`

/** The ranges every partial stays inside, and the longest a voice may last. */
export const LIMITS = { lowest: 55, highest: 5200, loudest: 0.5, shortestAttack: 0.002, longest: 1.3 } as const

const tone = (wave: Partial['wave'], at: number, from: number, to: number, peak: number, attack: number, decay: number): Partial => ({ wave, at, from, to, peak, attack, decay })
const hiss = (at: number, from: number, to: number, q: number, peak: number, attack: number, decay: number): Partial => ({ wave: 'noise', at, from, to, peak, attack, decay, q })

export const VOICES: Record<VoiceId, readonly Partial[]> = {
  // A finger on rubber: a quick chirp up, with a rub of narrow noise under it.
  squeak: [tone('sine', 0, 980, 1650, 0.2, 0.006, 0.09), hiss(0, 2600, 3400, 9, 0.1, 0.004, 0.07)],
  // The balloon springs back and leaves: a small rubbery twang.
  letGo: [tone('triangle', 0, 520, 300, 0.16, 0.004, 0.1)],
  // It swoops down to the friend.
  whistle: [hiss(0, 900, 2600, 5, 0.1, 0.05, 0.32), tone('sine', 0.02, 700, 1300, 0.05, 0.05, 0.28)],
  // A snap and a low thump of air.
  pop: [hiss(0, 2200, 900, 0.7, 0.42, 0.002, 0.07), tone('sine', 0, 210, 80, 0.3, 0.003, 0.12), tone('square', 0, 1400, 500, 0.06, 0.002, 0.03)],
  // A balloon going flat as it flies off: a run of short low blats that slow down.
  raspberry: [0, 0.07, 0.15, 0.24, 0.35, 0.48, 0.63].map((at, i) => tone('sawtooth', at, 150 - i * 9, 110 - i * 8, 0.16 - i * 0.012, 0.004, 0.05 + i * 0.008)),
  // A heavy toy sits down.
  thud: [tone('sine', 0, 130, 62, 0.42, 0.004, 0.22), hiss(0, 320, 180, 1.2, 0.16, 0.003, 0.1)],
  // A new balloon drifts into its place.
  bloop: [tone('sine', 0, 420, 760, 0.1, 0.01, 0.12)],
  // A touch on nothing in particular: the air answers softly.
  boop: [tone('sine', 0, 540, 470, 0.09, 0.006, 0.12)],
  // Carried off its feet: a slide up that wobbles.
  liftOff: [tone('sine', 0, 330, 990, 0.14, 0.04, 0.6), tone('triangle', 0.05, 336, 1010, 0.07, 0.04, 0.55)],

  // The duck: high, quick and nasal.
  duckCatch: [tone('square', 0, 760, 1180, 0.1, 0.006, 0.09), tone('sine', 0.08, 1180, 1500, 0.14, 0.006, 0.14)],
  duckRefuse: [tone('square', 0, 900, 620, 0.11, 0.005, 0.08), tone('square', 0.11, 820, 560, 0.11, 0.005, 0.1), hiss(0.2, 1800, 900, 1.5, 0.2, 0.003, 0.06)],
  duckPoke: [tone('square', 0, 1250, 1700, 0.1, 0.004, 0.07), tone('sine', 0, 1250, 1700, 0.1, 0.004, 0.09)],
  duckStartle: [tone('square', 0, 1500, 900, 0.12, 0.004, 0.16)],

  // The frog: a wet twang and a low double note.
  frogCatch: [tone('triangle', 0, 240, 620, 0.2, 0.005, 0.08), tone('sine', 0.07, 620, 310, 0.18, 0.006, 0.2), hiss(0, 1200, 2400, 3, 0.07, 0.004, 0.06)],
  frogRefuse: [tone('sine', 0, 180, 420, 0.24, 0.01, 0.16), tone('sine', 0.17, 420, 200, 0.2, 0.006, 0.2)],
  frogPoke: [tone('triangle', 0, 520, 700, 0.14, 0.005, 0.07), tone('triangle', 0.1, 600, 820, 0.14, 0.005, 0.09)],
  frogStartle: [tone('sawtooth', 0, 300, 140, 0.13, 0.006, 0.26)],

  // The hippo: low, slow and honking.
  hippoCatch: [tone('sawtooth', 0, 150, 190, 0.12, 0.03, 0.3), tone('sine', 0, 150, 190, 0.22, 0.03, 0.34)],
  hippoRefuse: [hiss(0, 700, 1000, 2, 0.08, 0.16, 0.1), hiss(0.26, 1500, 500, 0.8, 0.4, 0.004, 0.2), tone('sine', 0.26, 190, 90, 0.24, 0.006, 0.2)],
  hippoPoke: [tone('sine', 0, 260, 200, 0.2, 0.02, 0.34), tone('triangle', 0, 520, 400, 0.06, 0.02, 0.3)],
  hippoStartle: [tone('sine', 0.3, 170, 240, 0.2, 0.05, 0.3)],

  // The crab: clicks and snips.
  crabCatch: [hiss(0, 3600, 3000, 6, 0.26, 0.002, 0.03), hiss(0.09, 4200, 3400, 6, 0.26, 0.002, 0.03), tone('sine', 0.12, 1500, 1900, 0.1, 0.004, 0.1)],
  crabRefuse: [hiss(0, 3800, 2600, 5, 0.3, 0.002, 0.035), tone('square', 0.02, 2100, 1500, 0.07, 0.002, 0.04)],
  crabPoke: [hiss(0, 3300, 3000, 7, 0.22, 0.002, 0.025), hiss(0.08, 3900, 3400, 7, 0.22, 0.002, 0.025)],
  crabStartle: [tone('sine', 0, 1300, 2300, 0.13, 0.004, 0.14)],
}

/** How long a voice lasts, start to silence. */
export function voiceLength(partials: readonly Partial[]): number {
  return partials.reduce((end, p) => Math.max(end, p.at + p.attack + p.decay), 0)
}

/**
 * A voice with its pitch moved by `pitch` (1 is as written) and its loudness by `gain`: the same squeak never
 * sounds twice alike, and a slow press squeaks lower. The result stays inside the limits.
 */
export function varied(id: VoiceId, pitch = 1, gain = 1): Partial[] {
  const clampHz = (hz: number) => Math.min(LIMITS.highest, Math.max(LIMITS.lowest, hz))
  return VOICES[id].map((p) => ({ ...p, from: clampHz(p.from * pitch), to: clampHz(p.to * pitch), peak: Math.min(LIMITS.loudest, p.peak * gain) }))
}
