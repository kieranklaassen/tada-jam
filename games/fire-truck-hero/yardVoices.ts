// Every sound of the yard, as plain numbers: one voice for each cell of the
// grid (grid.ts), and the voices of the animals, the gate and the scenes. No
// audio API here. A voice is a few partials, as in voices.ts, and the test
// beside this file holds every one inside the ranges stated there, since the
// machine these were written on cannot be heard.
//
// Each sound is what the thing itself would sound like: plastic bonks, wood
// knocks, water gurgles, steam fades. Nothing here tells the child how they
// did. No voice is used twice, and the five results of one thing start far
// apart in pitch, so they can be told apart by ear (ART.md, "The
// object-by-action grid").

import { CELLS } from './grid'
import type { Partial, VoiceSpec } from './voices'

/** How many variants a sound has. They take turns, so a repeated sound is never the same twice. */
export const YARD_VARIANTS = 3

/** How far each variant moves the pitch of a sound. */
const SHIFTS = [1, 1.08, 0.93]

/** The same for a plucked note, which moves less so that a step up still sounds like a step up. */
const NOTE_SHIFTS = [1, 1.04, 0.96]

/** A gentle run of notes with no half steps in it, low to high. The seed and the petals climb it. */
const RUN = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]

const clamp = (value: number, low: number, high: number) => (Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low)

/** Which variant a number of any size or sign picks. */
const turnOf = (variant: number) => (Number.isFinite(variant) ? ((Math.round(variant) % YARD_VARIANTS) + YARD_VARIANTS) % YARD_VARIANTS : 0)

/** The same voice with every pitch moved by `shift`. */
function tuned(voice: VoiceSpec, shift: number): VoiceSpec {
  if (shift === 1) return voice
  return voice.map((partial): Partial => {
    const moved = { ...partial, frequency: partial.frequency * shift }
    if (partial.glideTo !== undefined) moved.glideTo = partial.glideTo * shift
    return moved
  })
}

/** One cell's sound. `full` is how much water the thing already holds, 0 to 1. */
type Make = (full: number) => VoiceSpec

/** The small fire. More water in it is a smaller flame, which hisses shorter and thinner. */
const FIRE: Readonly<Record<string, Make>> = {
  /** The flame ducks: a short hiss, and a puff of steam just after it. */
  'hiss-short': (full) => [
    { kind: 'noise', at: 0, frequency: 3200, glideTo: 1800, q: 0.7 + 0.2 * full, peak: 0.12 - 0.05 * full, attack: 0.004, decay: 0.16 - 0.07 * full },
    { kind: 'noise', at: 0.05, frequency: 4400, glideTo: 3800, q: 0.9, peak: 0.04 - 0.015 * full, attack: 0.03, decay: 0.22 - 0.08 * full },
  ],
  /** It goes out: a long hiss that falls, a low soft puff as the flame dies, and steam rising after. */
  'hiss-falling': () => [
    { kind: 'noise', at: 0, frequency: 2400, glideTo: 500, q: 0.6, peak: 0.13, attack: 0.01, decay: 0.6 },
    { kind: 'tone', at: 0, frequency: 160, glideTo: 90, wave: 'sine', peak: 0.05, attack: 0.01, decay: 0.12 },
    { kind: 'noise', at: 0.12, frequency: 4800, glideTo: 3600, q: 0.8, peak: 0.05, attack: 0.08, decay: 0.6 },
  ],
  /** The wet logs knock together three times, as wood does, each knock softer. */
  'wood-knock': () => [
    { kind: 'tone', at: 0, frequency: 420, glideTo: 380, wave: 'sine', peak: 0.12, attack: 0.002, decay: 0.05 },
    { kind: 'noise', at: 0, frequency: 1200, q: 2, peak: 0.04, attack: 0.002, decay: 0.03 },
    { kind: 'tone', at: 0.14, frequency: 340, glideTo: 310, wave: 'sine', peak: 0.1, attack: 0.002, decay: 0.06 },
    { kind: 'tone', at: 0.31, frequency: 400, glideTo: 365, wave: 'sine', peak: 0.06, attack: 0.002, decay: 0.05 },
  ],
  /** The flame leans away: a soft "fft" of air, with the flutter of the flame under it. */
  fft: (full) => [
    { kind: 'noise', at: 0, frequency: 1500, glideTo: 2600, q: 0.9, peak: 0.07 - 0.02 * full, attack: 0.02, decay: 0.09 },
    { kind: 'tone', at: 0, frequency: 110, glideTo: 90, wave: 'triangle', peak: 0.03, attack: 0.02, decay: 0.1 },
  ],
  /** Flung drops make it spit: three sharp crackles at uneven gaps and a tiny pip of steam. */
  crackle: () => [
    { kind: 'noise', at: 0, frequency: 4200, q: 3, peak: 0.07, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.07, frequency: 3000, q: 3, peak: 0.06, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.11, frequency: 5000, q: 3, peak: 0.05, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.16, frequency: 4600, q: 1, peak: 0.03, attack: 0.02, decay: 0.12 },
  ],
}

/** The paddling pool: hollow plastic when dry, and deeper water the fuller it is. */
const POOL: Readonly<Record<string, Make>> = {
  /** A gulp on hollow plastic: a low "bonk" that falls at once, the tick of the hit and a short ring. */
  bonk: () => [
    { kind: 'tone', at: 0, frequency: 220, glideTo: 140, wave: 'sine', peak: 0.15, attack: 0.003, decay: 0.12 },
    { kind: 'noise', at: 0, frequency: 1400, q: 1.5, peak: 0.05, attack: 0.002, decay: 0.03 },
    { kind: 'tone', at: 0, frequency: 330, glideTo: 300, wave: 'sine', peak: 0.04, attack: 0.003, decay: 0.09 },
  ],
  /** A splash into the pool, lower and longer the more water is in it, and a drop that jumps back up. */
  'splash-deep': (full) => [
    { kind: 'tone', at: 0, frequency: 300 - 140 * full, glideTo: 180 - 80 * full, wave: 'sine', peak: 0.1, attack: 0.004, decay: 0.14 + 0.06 * full },
    { kind: 'noise', at: 0, frequency: 1100 - 500 * full, glideTo: 700 - 300 * full, q: 1, peak: 0.13, attack: 0.004, decay: 0.16 + 0.08 * full },
    { kind: 'tone', at: 0.06, frequency: 520 - 180 * full, glideTo: 900 - 300 * full, wave: 'sine', peak: 0.05, attack: 0.004, decay: 0.08 },
  ],
  /** Water runs over the rim: three low gurgles that each bend upward, over the run of the water. */
  'gurgle-over': () => [
    { kind: 'tone', at: 0, frequency: 150, glideTo: 230, wave: 'sine', peak: 0.09, attack: 0.015, decay: 0.1 },
    { kind: 'tone', at: 0.14, frequency: 180, glideTo: 270, wave: 'sine', peak: 0.09, attack: 0.015, decay: 0.1 },
    { kind: 'tone', at: 0.3, frequency: 165, glideTo: 250, wave: 'sine', peak: 0.09, attack: 0.015, decay: 0.1 },
    { kind: 'noise', at: 0, frequency: 700, glideTo: 500, q: 1.2, peak: 0.04, attack: 0.05, decay: 0.45 },
  ],
  /** A run of four light slaps on the water. On a dry pool they are lower and tighter, a rattle on a drum. */
  'light-slaps': (full) => {
    const middle = 520 + 480 * full
    const q = 5 - 3 * full
    return [
      { kind: 'noise', at: 0, frequency: middle, q, peak: 0.07, attack: 0.002, decay: 0.04 },
      { kind: 'noise', at: 0.09, frequency: middle * 1.15, q, peak: 0.06, attack: 0.002, decay: 0.04 },
      { kind: 'noise', at: 0.17, frequency: middle * 0.92, q, peak: 0.07, attack: 0.002, decay: 0.04 },
      { kind: 'noise', at: 0.26, frequency: middle * 1.08, q, peak: 0.05, attack: 0.002, decay: 0.04 },
    ]
  },
  /** Flung drops patter on the surface: four small drops at uneven gaps, each rising. */
  patter: () => [
    { kind: 'tone', at: 0, frequency: 900, glideTo: 1300, wave: 'sine', peak: 0.05, attack: 0.003, decay: 0.04 },
    { kind: 'tone', at: 0.08, frequency: 1150, glideTo: 1550, wave: 'sine', peak: 0.04, attack: 0.003, decay: 0.04 },
    { kind: 'tone', at: 0.19, frequency: 800, glideTo: 1150, wave: 'sine', peak: 0.05, attack: 0.003, decay: 0.04 },
    { kind: 'tone', at: 0.27, frequency: 1000, glideTo: 1400, wave: 'sine', peak: 0.03, attack: 0.003, decay: 0.04 },
  ],
}

/** Which stage the plant is at, 0 to 3, from how much water the seed holds. */
const stageOf = (full: number) => Math.round(full * 3)

/** The seed in its pot. Each stage of the plant is one note higher on the run. */
const SEED: Readonly<Record<string, Make>> = {
  /** The shoot pokes up: one plucked note, its ring an octave above, and the soft pat of wet soil. */
  pluck: (full) => [
    { kind: 'tone', at: 0, frequency: RUN[stageOf(full)], wave: 'triangle', peak: 0.12, attack: 0.003, decay: 0.22 },
    { kind: 'tone', at: 0, frequency: RUN[stageOf(full)] * 2, wave: 'sine', peak: 0.03, attack: 0.003, decay: 0.1 },
    { kind: 'noise', at: 0, frequency: 500, q: 1, peak: 0.04, attack: 0.004, decay: 0.05 },
  ],
  /** The flower is open: the same pluck two notes further up the run, ringing longer. */
  'pluck-high': (full) => [
    { kind: 'tone', at: 0, frequency: RUN[stageOf(full) + 2], wave: 'triangle', peak: 0.11, attack: 0.003, decay: 0.3 },
    { kind: 'tone', at: 0, frequency: RUN[stageOf(full) + 2] * 2, wave: 'sine', peak: 0.03, attack: 0.003, decay: 0.18 },
  ],
  /** Water dribbles into the saucer with three thin tinkles, and then the flower's cup tips: "bloop". */
  'tinkle-bloop': () => [
    { kind: 'tone', at: 0, frequency: 2600, wave: 'sine', peak: 0.05, attack: 0.002, decay: 0.06 },
    { kind: 'tone', at: 0.07, frequency: 2200, wave: 'sine', peak: 0.04, attack: 0.002, decay: 0.06 },
    { kind: 'tone', at: 0.13, frequency: 2900, wave: 'sine', peak: 0.04, attack: 0.002, decay: 0.06 },
    { kind: 'tone', at: 0.3, frequency: 260, glideTo: 520, wave: 'sine', peak: 0.1, attack: 0.01, decay: 0.1 },
  ],
  /** The leaves flutter: four dry papery brushes, close together. */
  'papery-rustle': () => [
    { kind: 'noise', at: 0, frequency: 3000, q: 1.5, peak: 0.05, attack: 0.01, decay: 0.05 },
    { kind: 'noise', at: 0.07, frequency: 3600, q: 1.5, peak: 0.04, attack: 0.01, decay: 0.05 },
    { kind: 'noise', at: 0.13, frequency: 2700, q: 1.5, peak: 0.05, attack: 0.01, decay: 0.05 },
    { kind: 'noise', at: 0.2, frequency: 3300, q: 1.5, peak: 0.03, attack: 0.01, decay: 0.05 },
  ],
  /** The pot drinks from below: one long quiet slurp that sinks slowly. */
  'quiet-slurp': () => [
    { kind: 'noise', at: 0, frequency: 900, glideTo: 450, q: 7, peak: 0.05, attack: 0.08, decay: 0.55 },
    { kind: 'tone', at: 0, frequency: 200, glideTo: 150, wave: 'sine', peak: 0.02, attack: 0.08, decay: 0.4 },
  ],
}

/** The voices of the notes, which move less from variant to variant. */
const NOTES: ReadonlySet<string> = new Set(['pluck', 'pluck-high'])

/** The dry ground. Its three landings follow the sand's own in voices.ts: a pat, a "plip" and a squelch. */
const PATCH: Readonly<Record<string, Make>> = {
  /** A blot on sand: a soft "pat", a little lower on sand that is already damp. */
  pat: (full) => [
    { kind: 'noise', at: 0, frequency: 620 - 200 * full, glideTo: 400 - 120 * full, q: 1.1, peak: 0.1, attack: 0.004, decay: 0.08 },
    { kind: 'tone', at: 0, frequency: 200 - 50 * full, glideTo: 130 - 30 * full, wave: 'sine', peak: 0.06, attack: 0.004, decay: 0.07 },
  ],
  /** The puddle stands: a drop's "plip", which rises. */
  plip: () => [
    { kind: 'tone', at: 0, frequency: 660, glideTo: 1320, wave: 'sine', peak: 0.11, attack: 0.004, decay: 0.09 },
    { kind: 'noise', at: 0, frequency: 1800, q: 0.9, peak: 0.04, attack: 0.004, decay: 0.06 },
  ],
  /** Mud: a low wet squelch, and a blob thrown up out of it. */
  squelch: () => [
    { kind: 'noise', at: 0, frequency: 340, glideTo: 170, q: 3, peak: 0.14, attack: 0.01, decay: 0.2 },
    { kind: 'tone', at: 0.02, frequency: 120, glideTo: 80, wave: 'sine', peak: 0.1, attack: 0.01, decay: 0.14 },
    { kind: 'tone', at: 0.14, frequency: 180, glideTo: 260, wave: 'sine', peak: 0.04, attack: 0.01, decay: 0.06 },
  ],
  /** A line drawn with water: the whisper of sand drinking, wide, soft and high. */
  'sand-whisper': () => [
    { kind: 'noise', at: 0, frequency: 2600, glideTo: 2000, q: 0.7, peak: 0.05, attack: 0.04, decay: 0.3 },
    { kind: 'noise', at: 0, frequency: 4200, q: 1, peak: 0.02, attack: 0.05, decay: 0.2 },
  ],
  /** Run-off creeps along the ground: three faint drops over a thin run of water. */
  'faint-trickle': () => [
    { kind: 'tone', at: 0, frequency: 1500, glideTo: 1900, wave: 'sine', peak: 0.03, attack: 0.004, decay: 0.04 },
    { kind: 'tone', at: 0.09, frequency: 1250, glideTo: 1600, wave: 'sine', peak: 0.03, attack: 0.004, decay: 0.04 },
    { kind: 'tone', at: 0.2, frequency: 1750, glideTo: 2100, wave: 'sine', peak: 0.025, attack: 0.004, decay: 0.04 },
    { kind: 'noise', at: 0, frequency: 1200, q: 2, peak: 0.02, attack: 0.06, decay: 0.35 },
  ],
}

/** The boat: a hollow hull that rings, drums, glugs and knocks. */
const BOAT: Readonly<Record<string, Make>> = {
  /** A gulp on the empty hull: it rings hollow, one steady note with a thinner one above it. */
  'hollow-ring': () => [
    { kind: 'tone', at: 0, frequency: 360, wave: 'sine', peak: 0.11, attack: 0.003, decay: 0.2 },
    { kind: 'tone', at: 0, frequency: 545, wave: 'sine', peak: 0.04, attack: 0.003, decay: 0.12 },
    { kind: 'noise', at: 0, frequency: 1600, q: 2, peak: 0.04, attack: 0.002, decay: 0.03 },
  ],
  /** Water drums into the hull, three quick beats, lower the more water is already in it. */
  'drumming-deeper': (full) => {
    const beat = 260 - 110 * full
    return [
      { kind: 'tone', at: 0, frequency: beat, glideTo: beat * 0.8, wave: 'sine', peak: 0.09, attack: 0.003, decay: 0.06 },
      { kind: 'tone', at: 0.08, frequency: beat * 1.06, glideTo: beat * 0.85, wave: 'sine', peak: 0.09, attack: 0.003, decay: 0.06 },
      { kind: 'tone', at: 0.16, frequency: beat * 0.96, glideTo: beat * 0.77, wave: 'sine', peak: 0.09, attack: 0.003, decay: 0.06 },
      { kind: 'noise', at: 0, frequency: 800 - 300 * full, q: 1.2, peak: 0.04, attack: 0.003, decay: 0.05 },
    ]
  },
  /** It sinks with three glugs, each a little lower, and pops up again. */
  glug: () => [
    { kind: 'tone', at: 0, frequency: 110, glideTo: 170, wave: 'sine', peak: 0.11, attack: 0.02, decay: 0.11 },
    { kind: 'tone', at: 0.2, frequency: 100, glideTo: 155, wave: 'sine', peak: 0.11, attack: 0.02, decay: 0.11 },
    { kind: 'tone', at: 0.4, frequency: 92, glideTo: 140, wave: 'sine', peak: 0.1, attack: 0.02, decay: 0.11 },
    { kind: 'tone', at: 0.62, frequency: 300, glideTo: 600, wave: 'sine', peak: 0.05, attack: 0.004, decay: 0.07 },
  ],
  /** The stream slaps its side: a short flat slap, and the hull under it. */
  'side-slap': () => [
    { kind: 'noise', at: 0, frequency: 1050, q: 1.8, peak: 0.12, attack: 0.002, decay: 0.05 },
    { kind: 'tone', at: 0, frequency: 200, glideTo: 170, wave: 'sine', peak: 0.06, attack: 0.003, decay: 0.09 },
  ],
  /** It lifts off the bottom with one wooden knock, and the hollow of the hull answers. */
  'hull-knock': () => [
    { kind: 'tone', at: 0, frequency: 450, glideTo: 400, wave: 'sine', peak: 0.13, attack: 0.002, decay: 0.05 },
    { kind: 'tone', at: 0, frequency: 170, wave: 'sine', peak: 0.05, attack: 0.003, decay: 0.1 },
    { kind: 'noise', at: 0, frequency: 2000, q: 2, peak: 0.03, attack: 0.002, decay: 0.03 },
  ],
}

/** The wheel: ticks, a whirr, a whistle, a clack and a creak, by how fast it turns. */
const WHEEL: Readonly<Record<string, Make>> = {
  /** Part of a turn: four ticks of a ratchet, each later and softer than the last as it slows. */
  ratchet: () => [
    { kind: 'noise', at: 0, frequency: 3400, q: 4, peak: 0.08, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.06, frequency: 3300, q: 4, peak: 0.07, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.14, frequency: 3200, q: 4, peak: 0.06, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.25, frequency: 3100, q: 4, peak: 0.05, attack: 0.002, decay: 0.03 },
  ],
  /** It spins steadily: a whirr that climbs, with the hum of the axle under it. */
  'whirr-rising': () => [
    { kind: 'noise', at: 0, frequency: 500, glideTo: 1500, q: 8, peak: 0.1, attack: 0.06, decay: 0.5 },
    { kind: 'tone', at: 0, frequency: 130, glideTo: 260, wave: 'triangle', peak: 0.03, attack: 0.06, decay: 0.4 },
  ],
  /** It spins to a blur and whistles: a soft tone that slides up high, with air in it. */
  whistle: () => [
    { kind: 'tone', at: 0, frequency: 1300, glideTo: 2600, wave: 'sine', peak: 0.07, attack: 0.05, decay: 0.4 },
    { kind: 'noise', at: 0, frequency: 3000, glideTo: 4500, q: 6, peak: 0.03, attack: 0.06, decay: 0.35 },
  ],
  /** One flick, half a turn: a single clack. */
  clack: () => [
    { kind: 'noise', at: 0, frequency: 1900, q: 3, peak: 0.11, attack: 0.002, decay: 0.035 },
    { kind: 'tone', at: 0, frequency: 620, glideTo: 560, wave: 'triangle', peak: 0.06, attack: 0.002, decay: 0.04 },
  ],
  /** Turned slowly from below: a quiet wooden creak that sinks, and a second one after it. */
  'slow-creak': () => [
    { kind: 'tone', at: 0, frequency: 310, glideTo: 220, wave: 'triangle', peak: 0.04, attack: 0.06, decay: 0.5 },
    { kind: 'tone', at: 0.38, frequency: 250, glideTo: 190, wave: 'triangle', peak: 0.03, attack: 0.06, decay: 0.4 },
  ],
}

/** The cat. Every sound of hers is a quiet one: she is put out, never hurt, and never startling. */
const CAT: Readonly<Record<string, Make>> = {
  /** She leaps straight up with a squeak: short, high and rising. */
  squeak: () => [
    { kind: 'tone', at: 0, frequency: 1400, glideTo: 2100, wave: 'sine', peak: 0.06, attack: 0.006, decay: 0.07 },
    { kind: 'tone', at: 0, frequency: 700, glideTo: 1050, wave: 'triangle', peak: 0.02, attack: 0.006, decay: 0.06 },
  ],
  /** She shakes herself: a rattle of three flying drops, and then a low grumble as she stalks off. */
  'rattle-and-grumble': () => [
    { kind: 'noise', at: 0, frequency: 2600, q: 3, peak: 0.03, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.04, frequency: 3000, q: 3, peak: 0.03, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.08, frequency: 2300, q: 3, peak: 0.03, attack: 0.002, decay: 0.03 },
    { kind: 'tone', at: 0.2, frequency: 95, glideTo: 80, wave: 'triangle', peak: 0.04, attack: 0.05, decay: 0.35 },
  ],
  /** She climbs the truck: three thin scratches of claws at uneven gaps, and the tin roof rings a little. */
  'claws-scrabble': () => [
    { kind: 'noise', at: 0, frequency: 4800, q: 5, peak: 0.035, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.05, frequency: 4300, q: 5, peak: 0.035, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.12, frequency: 5000, q: 5, peak: 0.035, attack: 0.002, decay: 0.03 },
    { kind: 'tone', at: 0.12, frequency: 1900, wave: 'triangle', peak: 0.02, attack: 0.002, decay: 0.06 },
  ],
  /** Ears flat, she hisses: one short breath. */
  'hiss-cat': () => [{ kind: 'noise', at: 0, frequency: 3600, glideTo: 3000, q: 1.5, peak: 0.07, attack: 0.02, decay: 0.18 }],
  /** A drop on her nose: a short burst of a sneeze and a tiny high note after it. */
  sneeze: () => [
    { kind: 'noise', at: 0, frequency: 2000, glideTo: 1400, q: 1, peak: 0.07, attack: 0.004, decay: 0.06 },
    { kind: 'tone', at: 0.08, frequency: 1800, glideTo: 2300, wave: 'sine', peak: 0.03, attack: 0.004, decay: 0.05 },
  ],
}

/** Every cell's sound, by the voice id the grid gives it. */
const CELL_VOICES: Readonly<Record<string, Make>> = { ...FIRE, ...POOL, ...SEED, ...PATCH, ...BOAT, ...WHEEL, ...CAT }

/** What a voice id nobody knows sounds like: a soft pat, softer than the one on sand. */
const softPat: Make = () => [
  { kind: 'noise', at: 0, frequency: 560, glideTo: 380, q: 1.1, peak: 0.06, attack: 0.004, decay: 0.07 },
  { kind: 'tone', at: 0, frequency: 190, glideTo: 130, wave: 'sine', peak: 0.03, attack: 0.004, decay: 0.06 },
]

/** The voice ids of the 35 cells, in the order of the grid. */
export const YARD_VOICE_IDS: readonly string[] = CELLS.map((cell) => cell.voice)

/**
 * The sound of one cell of the grid. `fullness` is how much water the thing
 * already holds, 0 to 1, and is heard where the sheet says it is: a fuller
 * pool splashes deeper, a later stage of the plant is a higher note, a fuller
 * boat drums lower, a smaller flame hisses shorter and thinner. `variant`
 * picks one of the variants. A voice id nobody knows is a soft pat.
 */
export function cellVoice(voiceId: string, fullness = 0, variant = 0): VoiceSpec {
  const make = Object.hasOwn(CELL_VOICES, voiceId) ? CELL_VOICES[voiceId] : softPat
  const shifts = NOTES.has(voiceId) ? NOTE_SHIFTS : SHIFTS
  return tuned(make(clamp(fullness, 0, 1)), shifts[turnOf(variant)])
}

/** A whole number from `low` to `high` out of any number at all. */
const stepOf = (value: number, low: number, high: number) => Math.round(clamp(value, low, high))

/**
 * The bell on the gate, for its first, second or third ring: a clear note
 * with its octave above it and the tick of the drop that struck it. Each ring
 * is one step higher than the last, as the latch lifts.
 */
export function bellRing(ring: number): VoiceSpec {
  const note = [880, 987.77, 1108.73][stepOf(ring, 1, 3) - 1]
  return [
    { kind: 'tone', at: 0, frequency: note, wave: 'sine', peak: 0.12, attack: 0.004, decay: 0.5 },
    { kind: 'tone', at: 0, frequency: note * 2, wave: 'sine', peak: 0.03, attack: 0.004, decay: 0.25 },
    { kind: 'noise', at: 0, frequency: 3000, q: 3, peak: 0.03, attack: 0.002, decay: 0.03 },
  ]
}

/** The gate swings open: a wooden creak that sinks, and a soft bump as it comes to rest. */
export function gateSwings(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 280, glideTo: 200, wave: 'triangle', peak: 0.05, attack: 0.05, decay: 0.45 },
    { kind: 'tone', at: 0, frequency: 425, glideTo: 300, wave: 'triangle', peak: 0.02, attack: 0.05, decay: 0.3 },
    { kind: 'tone', at: 0.55, frequency: 120, glideTo: 80, wave: 'sine', peak: 0.1, attack: 0.004, decay: 0.12 },
    { kind: 'noise', at: 0.55, frequency: 300, q: 0.8, peak: 0.03, attack: 0.004, decay: 0.06 },
  ]
}

/** One putt of the toy truck's motor as it rolls on. Two pitches take turns, step by step. */
export function truckRolls(step: number): VoiceSpec {
  const even = Number.isFinite(step) ? Math.abs(Math.round(step)) % 2 === 0 : true
  const putt = even ? 92 : 104
  return [
    { kind: 'tone', at: 0, frequency: putt, glideTo: putt * 0.85, wave: 'triangle', peak: 0.06, attack: 0.006, decay: 0.07 },
    { kind: 'noise', at: 0, frequency: 220, q: 1.2, peak: 0.025, attack: 0.004, decay: 0.04 },
  ]
}

/** The duck, sprayed: a toy's quack, two short nasal bumps that fall. */
export function duckQuack(variant = 0): VoiceSpec {
  return tuned(
    [
      { kind: 'tone', at: 0, frequency: 660, glideTo: 560, wave: 'square', peak: 0.05, attack: 0.008, decay: 0.07 },
      { kind: 'tone', at: 0.13, frequency: 620, glideTo: 540, wave: 'square', peak: 0.045, attack: 0.008, decay: 0.09 },
    ],
    NOTE_SHIFTS[turnOf(variant)],
  )
}

/** The duck taps the dry floor of the pool with its beak: tick, tick, on hollow plastic. */
export function duckTapsFloor(): VoiceSpec {
  return [
    { kind: 'noise', at: 0, frequency: 2400, q: 4, peak: 0.05, attack: 0.002, decay: 0.03 },
    { kind: 'tone', at: 0, frequency: 500, glideTo: 420, wave: 'sine', peak: 0.03, attack: 0.002, decay: 0.03 },
    { kind: 'noise', at: 0.11, frequency: 2200, q: 4, peak: 0.05, attack: 0.002, decay: 0.03 },
    { kind: 'tone', at: 0.11, frequency: 470, glideTo: 400, wave: 'sine', peak: 0.03, attack: 0.002, decay: 0.03 },
  ]
}

/**
 * The bee: a short buzz that wobbles, made of two tones a few Hz apart. It
 * is level as she circles, and slides up when drops land on her wings.
 */
export function beeBuzz(rising: boolean): VoiceSpec {
  const buzz: Partial[] = [
    { kind: 'tone', at: 0, frequency: 200, wave: 'square', peak: 0.03, attack: 0.03, decay: 0.3 },
    { kind: 'tone', at: 0, frequency: 207, wave: 'square', peak: 0.03, attack: 0.03, decay: 0.3 },
  ]
  return rising ? buzz.map((partial) => ({ ...partial, glideTo: partial.frequency * 1.5 })) : buzz
}

/** The bee lands on the open flower: two soft notes, the second lower, as it dips under her. */
export function beeLands(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 392, wave: 'triangle', peak: 0.05, attack: 0.01, decay: 0.12 },
    { kind: 'tone', at: 0.14, frequency: 330, wave: 'triangle', peak: 0.045, attack: 0.01, decay: 0.2 },
  ]
}

/** The snail glides along the wet line: a quiet slow slide, gently up and then down again. */
export function snailGlides(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 280, glideTo: 330, wave: 'sine', peak: 0.035, attack: 0.08, decay: 0.3 },
    { kind: 'tone', at: 0.3, frequency: 330, glideTo: 285, wave: 'sine', peak: 0.035, attack: 0.08, decay: 0.45 },
  ]
}

/** The worm comes up out of the mud: a small "bloop" that rises. */
export function wormPops(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 240, glideTo: 520, wave: 'sine', peak: 0.09, attack: 0.008, decay: 0.09 },
    { kind: 'noise', at: 0, frequency: 900, q: 2, peak: 0.02, attack: 0.004, decay: 0.03 },
  ]
}

/** The last of the steam over the wet logs: soft and high, gone in a little over half a second. */
export function steamFades(): VoiceSpec {
  return [
    { kind: 'noise', at: 0, frequency: 4600, glideTo: 3800, q: 0.8, peak: 0.04, attack: 0.06, decay: 0.56 },
    { kind: 'noise', at: 0, frequency: 3000, q: 0.7, peak: 0.02, attack: 0.06, decay: 0.4 },
  ]
}

/** One drop falling from a wet log or a leaf: a tiny "plink". */
export function drip(variant = 0): VoiceSpec {
  return tuned(
    [
      { kind: 'tone', at: 0, frequency: 1800, glideTo: 2400, wave: 'sine', peak: 0.05, attack: 0.002, decay: 0.05 },
      { kind: 'tone', at: 0, frequency: 900, glideTo: 1200, wave: 'sine', peak: 0.02, attack: 0.002, decay: 0.04 },
    ],
    SHIFTS[turnOf(variant)],
  )
}

/** One petal of the flower opening, `step` 0 to 4: five soft notes, each one higher up the run. */
export function petalOpens(step: number): VoiceSpec {
  const note = RUN[stepOf(step, 0, 4) + 3]
  return [
    { kind: 'tone', at: 0, frequency: note, wave: 'triangle', peak: 0.06, attack: 0.01, decay: 0.25 },
    { kind: 'tone', at: 0, frequency: note * 2, wave: 'sine', peak: 0.015, attack: 0.01, decay: 0.12 },
  ]
}

/** The cat by the fire: a low soft purr, trembling between two tones that lie close together. */
export function catPurr(): VoiceSpec {
  return [
    { kind: 'tone', at: 0, frequency: 78, wave: 'triangle', peak: 0.04, attack: 0.08, decay: 0.6 },
    { kind: 'tone', at: 0, frequency: 84, wave: 'triangle', peak: 0.04, attack: 0.08, decay: 0.6 },
  ]
}

/** The small spit of water with which the truck shows a new thing: the pop of the hose at half its loudness and a little higher. */
export function showSpit(): VoiceSpec {
  return [{ kind: 'tone', at: 0, frequency: 350, glideTo: 630, wave: 'sine', peak: 0.06, attack: 0.004, decay: 0.07 }]
}

/** A gulp landing on the truck itself, which takes no water: a short hollow patter, two taps on plastic. */
export function onPlastic(variant = 0): VoiceSpec {
  return tuned(
    [
      { kind: 'noise', at: 0, frequency: 1500, q: 1.5, peak: 0.07, attack: 0.002, decay: 0.04 },
      { kind: 'tone', at: 0, frequency: 260, glideTo: 210, wave: 'sine', peak: 0.07, attack: 0.003, decay: 0.06 },
      { kind: 'noise', at: 0.07, frequency: 1300, q: 1.5, peak: 0.04, attack: 0.002, decay: 0.04 },
      { kind: 'tone', at: 0.07, frequency: 230, glideTo: 190, wave: 'sine', peak: 0.04, attack: 0.003, decay: 0.05 },
    ],
    SHIFTS[turnOf(variant)],
  )
}
