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
  | 'squeak' | 'letGo' | 'whistle' | 'pop' | 'raspberry' | 'bloop' | 'boop' | 'squeal' | 'bonk' | 'stringHum' | 'frogSlurp'
  | 'heels' | 'cloudSqueak' | 'patter' | 'hillBoing' | 'spout' | 'bounce' | 'cheep' | 'stomp' | 'whoop' | 'rustle'
  | `${KindName}Catch` | `${KindName}Refuse` | `${KindName}Poke` | `${KindName}Startle` | `${KindName}LiftOff` | `${KindName}Land` | `${KindName}Step`

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
  // A new balloon drifts into its place.
  bloop: [tone('sine', 0, 420, 760, 0.1, 0.01, 0.12)],
  // A touch on nothing in particular: the air answers softly.
  boop: [tone('sine', 0, 540, 470, 0.09, 0.006, 0.12)],
  // Two balloons in two hands rub together: a long rubbery squeal.
  squeal: [tone('sine', 0, 820, 1260, 0.14, 0.05, 0.5), hiss(0, 2400, 3000, 10, 0.08, 0.04, 0.45)],
  // A balloon swings round on its string and bumps a head: hollow.
  bonk: [tone('sine', 0, 320, 240, 0.3, 0.003, 0.12), tone('triangle', 0, 640, 480, 0.06, 0.003, 0.05)],
  // A string plucked like a rubber band.
  stringHum: [tone('triangle', 0, 190, 150, 0.2, 0.003, 0.36)],
  // A troop stops its sway all at once: a squeak of heels.
  heels: [tone('sine', 0, 1500, 1050, 0.12, 0.004, 0.09)],
  // A cloud is a pillow too: a soft breathy squeak, and its drops pattering down.
  cloudSqueak: [tone('sine', 0, 620, 880, 0.12, 0.02, 0.16), hiss(0, 1400, 1900, 3, 0.05, 0.02, 0.14)],
  patter: [0, 0.07, 0.13, 0.21, 0.27, 0.36, 0.44].map((at, i) => tone('sine', at, 1900 + ((i * 370) % 800), 1500 + ((i * 370) % 800), 0.07, 0.003, 0.035)),
  // The hill is an air bed: a touch on it sends a slow wobble through.
  hillBoing: [tone('sine', 0, 140, 95, 0.25, 0.01, 0.3), tone('triangle', 0, 280, 190, 0.06, 0.01, 0.2)],
  // The whale in the pool blows: a wet rush of air going up.
  spout: [hiss(0, 700, 2600, 3, 0.16, 0.02, 0.3), tone('sine', 0.02, 320, 640, 0.08, 0.03, 0.22)],
  // A palm is shaken: its leaves rub together, twice, dry and soft.
  rustle: [hiss(0, 3200, 2200, 1.4, 0.07, 0.02, 0.16), hiss(0.14, 2600, 3600, 1.4, 0.05, 0.02, 0.18)],
  // The beach ball comes down on the air bed: hollow and soft.
  bounce: [tone('sine', 0, 250, 150, 0.22, 0.004, 0.14), hiss(0, 700, 400, 1.2, 0.06, 0.003, 0.05)],
  // The keeper of the far hill: two small high notes, far off.
  cheep: [tone('sine', 0, 2100, 2700, 0.08, 0.005, 0.06), tone('sine', 0.1, 2300, 3000, 0.08, 0.005, 0.07)],
  // The whole place comes down with a step of the march: the air bed thumps, low and round.
  stomp: [tone('sine', 0, 120, 70, 0.3, 0.004, 0.16), hiss(0, 320, 180, 1.3, 0.08, 0.003, 0.07)],
  // The troop leaps together: a rush of air that climbs, as a slide-whistle does.
  whoop: [tone('sine', 0, 380, 1250, 0.16, 0.03, 0.42), tone('triangle', 0.02, 190, 620, 0.07, 0.03, 0.4)],
  // The tongues go home.
  frogSlurp: [hiss(0, 700, 1900, 4, 0.14, 0.03, 0.16)],

  // The duck: high, quick and nasal.
  duckCatch: [tone('square', 0, 760, 1180, 0.1, 0.006, 0.09), tone('sine', 0.08, 1180, 1500, 0.14, 0.006, 0.14)],
  duckRefuse: [tone('square', 0, 900, 620, 0.11, 0.005, 0.08), tone('square', 0.11, 820, 560, 0.11, 0.005, 0.1), hiss(0.54, 1800, 900, 1.5, 0.22, 0.003, 0.06)],
  duckPoke: [tone('square', 0, 1250, 1700, 0.1, 0.004, 0.07), tone('sine', 0, 1250, 1700, 0.1, 0.004, 0.09)],
  duckStartle: [tone('square', 0, 1500, 900, 0.12, 0.004, 0.16)],
  // Carried off: a flurry of wing-flaps. Down again: a soft bump.
  duckLiftOff: [0, 0.1, 0.2, 0.31, 0.43, 0.56, 0.7, 0.85].map((at) => hiss(at, 620, 900, 1.6, 0.15, 0.008, 0.05)),
  duckStep: [tone('sine', 0, 1400, 1750, 0.08, 0.004, 0.04)],
  duckLand: [tone('sine', 0, 190, 110, 0.26, 0.004, 0.13), hiss(0, 500, 300, 1.5, 0.08, 0.003, 0.06)],

  // The frog: a wet twang and a low double note.
  frogCatch: [tone('triangle', 0, 240, 620, 0.2, 0.005, 0.08), tone('sine', 0.07, 620, 310, 0.18, 0.006, 0.2), hiss(0, 1200, 2400, 3, 0.07, 0.004, 0.06)],
  // The throat swells as it is drawn swelling, and the boing sounds as the balloon meets it (`cue.hit` in clips.ts).
  frogRefuse: [tone('sine', 0.28, 180, 420, 0.24, 0.01, 0.16), tone('sine', 0.52, 420, 200, 0.2, 0.006, 0.2)],
  frogPoke: [tone('triangle', 0, 520, 700, 0.14, 0.005, 0.07), tone('triangle', 0.1, 600, 820, 0.14, 0.005, 0.09)],
  frogStartle: [tone('sawtooth', 0, 300, 140, 0.13, 0.006, 0.26)],
  // Carried off: a rising slide-whistle. Down again: two boings.
  frogLiftOff: [tone('sine', 0, 420, 1500, 0.15, 0.05, 0.85)],
  frogStep: [tone('sine', 0, 300, 520, 0.12, 0.005, 0.07)],
  frogLand: [tone('sine', 0, 200, 430, 0.24, 0.006, 0.14), tone('sine', 0.3, 230, 400, 0.16, 0.006, 0.12)],

  // The hippo: low, slow and honking.
  hippoCatch: [tone('sawtooth', 0, 150, 190, 0.12, 0.03, 0.3), tone('sine', 0, 150, 190, 0.22, 0.03, 0.34)],
  // The long breath in is heard as it is drawn, and the sneeze as it folds the hippo in half (`cue.hit` in clips.ts).
  hippoRefuse: [hiss(0.38, 700, 1000, 2, 0.08, 0.16, 0.1), hiss(0.7, 1500, 500, 0.8, 0.4, 0.004, 0.2), tone('sine', 0.7, 190, 90, 0.24, 0.006, 0.2)],
  hippoPoke: [tone('sine', 0, 260, 200, 0.2, 0.02, 0.34), tone('triangle', 0, 520, 400, 0.06, 0.02, 0.3)],
  // It does not notice for a beat: a long low hum that rises at the end.
  hippoStartle: [tone('sine', 0.42, 150, 160, 0.18, 0.08, 0.3), tone('sine', 0.72, 160, 250, 0.18, 0.05, 0.28)],
  // The string strains with a rising creak; then it sits down, hard: a deep thud.
  hippoLiftOff: [tone('sawtooth', 0, 85, 170, 0.09, 0.2, 0.75), hiss(0.1, 420, 980, 12, 0.1, 0.2, 0.6)],
  hippoStep: [tone('sine', 0, 110, 70, 0.3, 0.004, 0.12), hiss(0, 260, 160, 1.4, 0.08, 0.003, 0.06)],
  hippoLand: [tone('sine', 0, 105, 58, 0.45, 0.004, 0.3), hiss(0, 300, 160, 1.2, 0.18, 0.003, 0.12)],

  // The crab: clicks and snips.
  crabCatch: [hiss(0, 3600, 3000, 6, 0.26, 0.002, 0.03), hiss(0.09, 4200, 3400, 6, 0.26, 0.002, 0.03), tone('sine', 0.12, 1500, 1900, 0.1, 0.004, 0.1)],
  // A snip as it pinches, and a ping as its eyes shoot up.
  crabRefuse: [hiss(0.43, 3800, 2600, 5, 0.3, 0.002, 0.035), tone('square', 0.45, 2100, 1500, 0.07, 0.002, 0.04), tone('sine', 0.53, 2300, 3300, 0.12, 0.004, 0.14)],
  crabPoke: [hiss(0, 3300, 3000, 7, 0.22, 0.002, 0.025), hiss(0.08, 3900, 3400, 7, 0.22, 0.002, 0.025)],
  // A scuttle of feet, then one small blip as it peeks.
  crabStartle: [...[0, 0.05, 0.1, 0.16, 0.22].map((at) => hiss(at, 3000, 2600, 8, 0.14, 0.002, 0.02)), tone('sine', 0.52, 1500, 1900, 0.1, 0.004, 0.08)],
  // Carried off: a whirr that climbs. Down again: a clatter of legs.
  crabLiftOff: [tone('sawtooth', 0, 120, 520, 0.08, 0.06, 0.85), hiss(0, 900, 2700, 4, 0.07, 0.06, 0.85)],
  crabStep: [hiss(0, 3200, 2900, 7, 0.14, 0.002, 0.02), hiss(0.045, 3500, 3100, 7, 0.12, 0.002, 0.02)],
  crabLand: [0, 0.05, 0.11, 0.18, 0.27].map((at, i) => hiss(at, 2600 - i * 200, 2200 - i * 200, 6, 0.2 - i * 0.02, 0.002, 0.03)),
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
