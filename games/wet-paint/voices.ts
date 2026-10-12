import type { Note } from './audio'
import { BROWN, GREEN, ORANGE, VIOLET } from './colours'
import type { WaterState } from './water'

// Every sound of the toy as plain numbers. Nothing here touches Web Audio, so
// a test holds each voice in range on a machine that cannot hear
// (voices.test.ts), and `voiceOf` in audio.ts turns a list of notes into
// sound. No note starts late: a sound that comes later is asked for later, by
// the model, on the model's own clock.

/** What every voice is held to. */
export const LIMITS = { minFrequency: 60, maxFrequency: 4200, maxPeak: 0.2, minAttack: 0.002, maxSeconds: 1.2 } as const

/** How long a voice sounds, in seconds. */
export function seconds(notes: readonly Note[]): number {
  return notes.reduce((end, note) => Math.max(end, note.attack + note.decay), 0)
}

/** The pots' own notes: red in the middle, yellow bright, blue deep. */
export const POT_PITCH: readonly number[] = [392, 523.25, 261.63]

/** A mixed colour sounds between its two parents, and brown low and dull. */
export function mixPitch(colour: number): number {
  if (colour === ORANGE) return Math.sqrt(POT_PITCH[0] * POT_PITCH[1])
  if (colour === GREEN) return Math.sqrt(POT_PITCH[1] * POT_PITCH[2])
  if (colour === VIOLET) return Math.sqrt(POT_PITCH[0] * POT_PITCH[2])
  if (colour === BROWN) return 142
  return 330
}

/** Three ways to say the same thing, so no sound comes twice running. */
const TURN = [1, 1.122, 0.891] as const
const turn = (variant: number): number => TURN[((variant % 3) + 3) % 3]

/** The note of any colour on the water: a pot's own, or a mix's. */
export function pitchOf(colour: number): number {
  return colour >= 1 && colour <= 3 ? POT_PITCH[colour - 1] : mixPitch(colour)
}

/**
 * A drop on the water, by what it lands in (the Drop column of the grid). Plain water: a plip at the pot's pitch
 * and a swell that rises while the bloom spreads. Its own colour: lower and rounder the more of it there is
 * (`fuller`, 0 to 1). Rings: the new pot's note over the old colour's. Two colours: a plip that splits in two.
 * A mix: a plip with a short dull thud under it. `other` is the colour it lands in or beside.
 */
export function dropVoice(pot: number, variant: number, state: WaterState = 'plain', fuller = 0, other = 0): Note[] {
  const pitch = POT_PITCH[pot] * turn(variant) * (state === 'bloom' ? 1 - 0.3 * fuller : 1)
  const plip: Note = { kind: 'tone', frequency: pitch * 0.72, glideTo: pitch * 1.3, peak: 0.16, attack: 0.004, decay: 0.1 + (state === 'bloom' ? 0.08 * fuller : 0) }
  const splash: Note = { kind: 'noise', frequency: 2400 - (state === 'bloom' ? 900 * fuller : 0), q: 0.8, peak: 0.035, attack: 0.002, decay: 0.05 }
  if (state === 'rings') return [plip, splash, { kind: 'tone', wave: 'triangle', frequency: pitchOf(other) / 2, peak: 0.09, attack: 0.01, decay: 0.3 }]
  if (state === 'two') return [
    { kind: 'tone', frequency: pitch, glideTo: pitch * 1.26, peak: 0.12, attack: 0.004, decay: 0.2 },
    { kind: 'tone', frequency: pitch, glideTo: pitch * 0.79, peak: 0.12, attack: 0.004, decay: 0.2 },
    splash,
  ]
  if (state === 'mix') return [plip, { kind: 'tone', wave: 'triangle', frequency: 96, glideTo: 70, peak: 0.15, attack: 0.004, decay: 0.09 }]
  return [plip, splash, { kind: 'tone', wave: 'triangle', frequency: pitch / 2, glideTo: (pitch / 2) * 1.5, peak: 0.05, attack: 0.28, decay: 0.36 }]
}

/**
 * A pull through the water (the Pull column): a swish that is higher and louder the faster the finger goes
 * (`speed` 0 to 1). On clear water it is thin. Through a colour, that colour's note glides under it, so a pull
 * through rings steps from note to note. Through brown it is a low, dull blub.
 */
export function swishVoice(speed: number, through: number): Note[] {
  const fast = Math.min(1, Math.max(0, speed))
  const swish: Note = { kind: 'noise', frequency: 520 + 1900 * fast, q: through === 0 ? 2.6 : 1.2, peak: 0.025 + 0.04 * fast, attack: 0.02, decay: 0.13 }
  if (through === 0) return [swish]
  if (through === BROWN) return [swish, { kind: 'tone', frequency: 150, glideTo: 96, peak: 0.07, attack: 0.01, decay: 0.12 }]
  const note = pitchOf(through) / 2
  return [swish, { kind: 'tone', frequency: note, glideTo: note * (1 + 0.18 * fast), peak: 0.035, attack: 0.03, decay: 0.14 }]
}

/** A bead of mixed colour coming up: one small blip at the mix's pitch. Brought up by the comb, it is struck like a wooden bar. */
export function beadVoice(colour: number, variant: number, wooden = false): Note[] {
  const pitch = mixPitch(colour) * turn(variant)
  if (colour === BROWN) return [{ kind: 'tone', frequency: pitch, glideTo: pitch * 0.8, peak: 0.1, attack: 0.006, decay: 0.12 }]
  if (wooden) return [
    { kind: 'tone', frequency: pitch * 2, peak: 0.1, attack: 0.002, decay: 0.09 },
    { kind: 'tone', frequency: pitch * 5.4, peak: 0.03, attack: 0.002, decay: 0.03 },
  ]
  return [{ kind: 'tone', wave: 'triangle', frequency: pitch * 2, glideTo: pitch * 2.4, peak: 0.07, attack: 0.003, decay: 0.07 }]
}

/** The stick dipped in a pot: a glug in the liquid, with the pot's note rising out of it. */
export function glugVoice(pot: number, variant: number): Note[] {
  const pitch = POT_PITCH[pot] * turn(variant)
  return [
    { kind: 'tone', frequency: 190, glideTo: 108, peak: 0.14, attack: 0.005, decay: 0.14 },
    { kind: 'noise', frequency: 700, q: 3, peak: 0.045, attack: 0.01, decay: 0.1 },
    { kind: 'tone', wave: 'triangle', frequency: pitch * 0.8, glideTo: pitch, peak: 0.05, attack: 0.03, decay: 0.2 },
  ]
}

/** The cat, poked: a chirrup, a short mew or a falling meow. */
export function catVoice(variant: number): Note[] {
  const which = ((variant % 3) + 3) % 3
  if (which === 0) return [
    { kind: 'tone', wave: 'triangle', frequency: 520, glideTo: 780, peak: 0.09, attack: 0.03, decay: 0.2 },
    { kind: 'tone', frequency: 1040, glideTo: 1560, peak: 0.03, attack: 0.03, decay: 0.18 },
  ]
  if (which === 1) return [{ kind: 'tone', wave: 'triangle', frequency: 820, glideTo: 900, peak: 0.08, attack: 0.02, decay: 0.12 }]
  return [
    { kind: 'tone', wave: 'triangle', frequency: 760, glideTo: 430, peak: 0.09, attack: 0.05, decay: 0.38 },
    { kind: 'tone', frequency: 1520, glideTo: 860, peak: 0.025, attack: 0.05, decay: 0.3 },
  ]
}

/** The cat's eyes caught by a bloom: a small questioning trill. */
export function trillVoice(): Note[] {
  return [{ kind: 'tone', wave: 'triangle', frequency: 610, glideTo: 700, peak: 0.045, attack: 0.02, decay: 0.1 }]
}

/** One breath of a purr. */
export function purrVoice(variant: number): Note[] {
  return [
    { kind: 'noise', frequency: 120 * turn(variant), q: 5, peak: 0.07, attack: 0.06, decay: 0.26 },
    { kind: 'tone', wave: 'triangle', frequency: 98, peak: 0.04, attack: 0.06, decay: 0.24 },
  ]
}

/** A knock on the table or the wall, and a deeper one on the rim of the tray. */
export function knockVoice(onRim: boolean, variant: number): Note[] {
  const pitch = (onRim ? 150 : 220) * turn(variant)
  return [
    { kind: 'tone', wave: 'triangle', frequency: pitch, glideTo: pitch * 0.72, peak: 0.12, attack: 0.002, decay: onRim ? 0.13 : 0.07 },
    { kind: 'noise', frequency: 900, q: 2, peak: 0.04, attack: 0.002, decay: 0.03 },
  ]
}

/** Cloth on the line, flicked. */
export function clothVoice(variant: number): Note[] {
  return [{ kind: 'noise', frequency: 1500 * turn(variant), glideTo: 600, q: 0.9, peak: 0.06, attack: 0.01, decay: 0.14 }]
}

/** The bird at the window. */
export function cheepVoice(variant: number): Note[] {
  const up = variant % 2 === 0
  return [{ kind: 'tone', frequency: up ? 2400 : 2900, glideTo: up ? 3200 : 2200, peak: 0.07, attack: 0.008, decay: 0.07 }]
}

// --- The tools on the water -------------------------------------------------

/**
 * The comb (the Comb column). Plain water: its teeth tick in a dry rattle. One colour: a zip that runs up in
 * pitch as the stroke goes on (`along`, 0 to 1). Rings: one note of a harp-like run, the note of the colour
 * under the tooth whose turn it is (`under`). Two colours: a zip, the beads giving the struck bars. A mix: a
 * low rasp.
 */
export function combVoice(state: WaterState, along: number, under: number, variant: number): Note[] {
  const far = Math.min(1, Math.max(0, along))
  if (state === 'plain') return [{ kind: 'noise', frequency: 3100 * turn(variant), q: 6, peak: 0.05, attack: 0.002, decay: 0.018 }]
  if (state === 'rings') return [{ kind: 'tone', wave: 'triangle', frequency: pitchOf(under) * 2, peak: 0.09, attack: 0.003, decay: 0.26 }]
  if (state === 'mix') return [{ kind: 'tone', wave: 'sawtooth', frequency: 84 * turn(variant), peak: 0.045, attack: 0.01, decay: 0.09 }, { kind: 'noise', frequency: 420, q: 2, peak: 0.04, attack: 0.01, decay: 0.07 }]
  const pitch = 700 + 1500 * far
  return [{ kind: 'noise', frequency: pitch, glideTo: pitch * 1.25, q: state === 'two' ? 5 : 9, peak: 0.055, attack: 0.004, decay: 0.07 }]
}

/**
 * The straw (the Straw column), one breath of it; `deep` is how far the dent has deepened, 0 to 1. Plain water:
 * a hollow puff. One colour: a breathy whistle that rises while the dent deepens. Rings: a whistle that wobbles.
 * Two colours: a fluttering, bubbling puff. A mix: a low hoot.
 */
export function strawVoice(state: WaterState, deep: number, variant: number): Note[] {
  const d = Math.min(1, Math.max(0, deep)), breath: Note = { kind: 'noise', frequency: 900, q: 1.4, peak: 0.04, attack: 0.02, decay: 0.12 }
  if (state === 'plain') return [{ kind: 'noise', frequency: 380, q: 3.5, peak: 0.08, attack: 0.015, decay: 0.16 }, { kind: 'tone', frequency: 196, glideTo: 170, peak: 0.04, attack: 0.02, decay: 0.14 }]
  if (state === 'bloom') return [breath, { kind: 'tone', frequency: 620 + 520 * d, glideTo: 660 + 560 * d, peak: 0.045, attack: 0.03, decay: 0.12 }]
  if (state === 'rings') return [breath, { kind: 'tone', frequency: variant % 2 === 0 ? 780 : 930, glideTo: variant % 2 === 0 ? 930 : 780, peak: 0.045, attack: 0.03, decay: 0.13 }]
  if (state === 'two') return [{ kind: 'noise', frequency: 520 * turn(variant), q: 4, peak: 0.07, attack: 0.004, decay: 0.045 }, { kind: 'tone', frequency: 310 * turn(variant), glideTo: 470, peak: 0.05, attack: 0.004, decay: 0.05 }]
  return [{ kind: 'tone', frequency: 172, glideTo: 158, peak: 0.1, attack: 0.04, decay: 0.2 }, { kind: 'noise', frequency: 300, q: 2, peak: 0.03, attack: 0.03, decay: 0.15 }]
}

/**
 * The soap landing (the Soap column). Plain water: a squeak. One colour: a squeak. Rings: a falling squeak. Two
 * colours: one long squeak. A mix: a wet squelch. What follows (a pop, a fizz, a crackle) is `soapTailVoice`,
 * asked for by the model in the frame it happens.
 */
export function soapVoice(state: WaterState, variant: number): Note[] {
  const t = turn(variant)
  if (state === 'mix') return [{ kind: 'noise', frequency: 340, glideTo: 180, q: 2.4, peak: 0.11, attack: 0.01, decay: 0.2 }, { kind: 'tone', frequency: 130, glideTo: 86, peak: 0.08, attack: 0.01, decay: 0.16 }]
  if (state === 'rings') return [{ kind: 'tone', frequency: 2300 * t, glideTo: 1200, peak: 0.07, attack: 0.01, decay: 0.2 }]
  if (state === 'two') return [{ kind: 'tone', frequency: 1500 * t, glideTo: 1900, peak: 0.065, attack: 0.03, decay: 0.55 }]
  if (state === 'bloom') return [{ kind: 'tone', frequency: 1350 * t, glideTo: 1800, peak: 0.07, attack: 0.012, decay: 0.17 }]
  return [{ kind: 'tone', frequency: 1700 * t, glideTo: 2250, peak: 0.07, attack: 0.008, decay: 0.11 }]
}

/** What follows the soap: the bubble's pop on plain water, a fizz as a bloom thins to a ring, a crackle as rings are pushed out. Nothing for the others. */
export function soapTailVoice(state: WaterState, variant: number): Note[] | null {
  if (state === 'plain') return popVoice(variant)
  if (state === 'bloom') return [{ kind: 'noise', frequency: 3600, q: 1.2, peak: 0.05, attack: 0.02, decay: 0.3 }]
  if (state === 'rings') return [{ kind: 'noise', frequency: 2200 * turn(variant), q: 7, peak: 0.07, attack: 0.002, decay: 0.03 }, { kind: 'noise', frequency: 3300, q: 7, peak: 0.05, attack: 0.012, decay: 0.03 }]
  return null
}

/** A bubble bursting. */
export function popVoice(variant: number): Note[] {
  return [{ kind: 'tone', frequency: 880 * turn(variant), glideTo: 1500, peak: 0.1, attack: 0.002, decay: 0.035 }, { kind: 'noise', frequency: 2600, q: 1, peak: 0.04, attack: 0.002, decay: 0.02 }]
}

/** A tool taken up from the cloth, or the stick taken back: the comb twangs, the straw toks, the soap squeaks wetly, the stick clacks. */
export function takeVoice(tool: 'finger' | 'comb' | 'straw' | 'soap'): Note[] {
  if (tool === 'comb') return [{ kind: 'tone', wave: 'triangle', frequency: 1320, glideTo: 1180, peak: 0.07, attack: 0.002, decay: 0.16 }, { kind: 'tone', wave: 'triangle', frequency: 1760, peak: 0.04, attack: 0.002, decay: 0.1 }]
  if (tool === 'straw') return [{ kind: 'tone', frequency: 420, glideTo: 380, peak: 0.1, attack: 0.003, decay: 0.07 }, { kind: 'noise', frequency: 800, q: 4, peak: 0.04, attack: 0.003, decay: 0.05 }]
  if (tool === 'soap') return [{ kind: 'tone', frequency: 1250, glideTo: 1650, peak: 0.06, attack: 0.02, decay: 0.09 }, { kind: 'noise', frequency: 500, q: 2, peak: 0.05, attack: 0.01, decay: 0.08 }]
  return [{ kind: 'tone', wave: 'triangle', frequency: 640, glideTo: 560, peak: 0.08, attack: 0.002, decay: 0.05 }]
}

// --- The cat's row -----------------------------------------------------------

/** A drop on its paw: a startled meow. */
export function startledVoice(): Note[] {
  return [{ kind: 'tone', wave: 'triangle', frequency: 640, glideTo: 1180, peak: 0.11, attack: 0.012, decay: 0.2 }, { kind: 'tone', frequency: 1280, glideTo: 2300, peak: 0.03, attack: 0.012, decay: 0.16 }]
}

/** One small bloom flicked off the paw, landing. */
export function spatterVoice(colour: number, variant: number): Note[] {
  const pitch = pitchOf(colour) * 2 * turn(variant)
  return [{ kind: 'tone', frequency: pitch, glideTo: pitch * 1.4, peak: 0.07, attack: 0.002, decay: 0.045 }, { kind: 'noise', frequency: 3000, q: 1, peak: 0.03, attack: 0.002, decay: 0.03 }]
}

/** Combed: a chirrup over the comb's zip. */
export function chirrupVoice(variant: number): Note[] {
  return [
    { kind: 'tone', wave: 'triangle', frequency: 700 * turn(variant), glideTo: 1050, peak: 0.07, attack: 0.02, decay: 0.12 },
    { kind: 'noise', frequency: 1500, glideTo: 2100, q: 8, peak: 0.045, attack: 0.004, decay: 0.08 },
  ]
}

/** Blown at: a rush of wind. */
export function windVoice(variant: number): Note[] {
  return [{ kind: 'noise', frequency: 1300 * turn(variant), glideTo: 700, q: 0.7, peak: 0.07, attack: 0.04, decay: 0.2 }]
}

/** And the sneeze that follows. */
export function sneezeVoice(): Note[] {
  return [{ kind: 'noise', frequency: 2600, glideTo: 900, q: 0.9, peak: 0.13, attack: 0.004, decay: 0.12 }, { kind: 'tone', wave: 'triangle', frequency: 900, glideTo: 420, peak: 0.07, attack: 0.004, decay: 0.1 }]
}

/** A bubble growing on its nose: a rising bloop. */
export function bloopVoice(): Note[] {
  return [{ kind: 'tone', frequency: 240, glideTo: 620, peak: 0.1, attack: 0.03, decay: 0.5 }]
}

/** Soap on the water startles it: a short, sharp mew. */
export function yelpVoice(): Note[] {
  return [{ kind: 'tone', wave: 'triangle', frequency: 980, glideTo: 1240, peak: 0.08, attack: 0.006, decay: 0.07 }]
}

/** Its look at a print that is mostly brown: a short low "bleh". */
export function blehVoice(): Note[] {
  return [{ kind: 'tone', wave: 'triangle', frequency: 300, glideTo: 205, peak: 0.08, attack: 0.03, decay: 0.24 }, { kind: 'noise', frequency: 600, q: 2, peak: 0.03, attack: 0.03, decay: 0.15 }]
}

/** Its paw dabbing the water: a small wet pat, with no note of any colour. */
export function dabVoice(): Note[] {
  return [{ kind: 'noise', frequency: 1100, glideTo: 500, q: 1.6, peak: 0.07, attack: 0.003, decay: 0.07 }]
}

/** Its tongue on its paw. */
export function lickVoice(variant: number): Note[] {
  return [{ kind: 'noise', frequency: 1900 * turn(variant), glideTo: 2600, q: 3, peak: 0.035, attack: 0.02, decay: 0.07 }]
}

// --- The paper ----------------------------------------------------------------

/** A sheet of paper: pulled from under the cat (0), laid on the water (1), peeled up wet (2), swinging on its peg (3). */
export function paperVoice(what: 0 | 1 | 2 | 3): Note[] {
  if (what === 0) return [{ kind: 'noise', frequency: 2800, glideTo: 1500, q: 0.8, peak: 0.07, attack: 0.01, decay: 0.16 }]
  if (what === 1) return [{ kind: 'noise', frequency: 600, glideTo: 300, q: 1, peak: 0.09, attack: 0.01, decay: 0.2 }, { kind: 'tone', frequency: 150, glideTo: 110, peak: 0.06, attack: 0.01, decay: 0.12 }]
  if (what === 2) return [{ kind: 'noise', frequency: 900, glideTo: 2400, q: 1.4, peak: 0.08, attack: 0.05, decay: 0.3 }]
  return [{ kind: 'noise', frequency: 1700, glideTo: 1100, q: 1.2, peak: 0.045, attack: 0.02, decay: 0.14 }]
}

/** One drip off a wet print. */
export function dripVoice(variant: number): Note[] {
  const pitch = 1250 * turn(variant)
  return [{ kind: 'tone', frequency: pitch, glideTo: pitch * 1.5, peak: 0.07, attack: 0.002, decay: 0.05 }]
}

/** The cat's hop off the paper: a soft thump on the table. */
export function thumpVoice(): Note[] {
  return [{ kind: 'tone', frequency: 110, glideTo: 72, peak: 0.15, attack: 0.004, decay: 0.1 }, { kind: 'noise', frequency: 300, q: 1, peak: 0.04, attack: 0.004, decay: 0.05 }]
}

/** A peg closing on the line. */
export function pegVoice(): Note[] {
  return [{ kind: 'tone', wave: 'triangle', frequency: 1500, glideTo: 1200, peak: 0.09, attack: 0.002, decay: 0.035 }, { kind: 'noise', frequency: 2400, q: 3, peak: 0.04, attack: 0.002, decay: 0.02 }]
}

/** A tool sliding over the table (0), drawn through the water (1), and coming to rest on the cloth (2). */
export function slideVoice(what: 0 | 1 | 2): Note[] {
  if (what === 0) return [{ kind: 'noise', frequency: 1400, glideTo: 2000, q: 1.5, peak: 0.05, attack: 0.03, decay: 0.3 }]
  if (what === 1) return [{ kind: 'noise', frequency: 700, glideTo: 1200, q: 1.3, peak: 0.06, attack: 0.03, decay: 0.3 }]
  return [{ kind: 'tone', wave: 'triangle', frequency: 520, glideTo: 430, peak: 0.07, attack: 0.002, decay: 0.05 }, { kind: 'noise', frequency: 900, q: 1, peak: 0.03, attack: 0.002, decay: 0.03 }]
}

const STATES: readonly WaterState[] = ['plain', 'bloom', 'rings', 'two', 'mix']

/** One of each voice at its extremes, for the test that holds them in range. */
export function everyVoice(): Note[][] {
  const all: Note[][] = [trillVoice(), startledVoice(), sneezeVoice(), bloopVoice(), yelpVoice(), blehVoice(), dabVoice(), thumpVoice(), pegVoice()]
  for (const what of [0, 1, 2, 3] as const) all.push(paperVoice(what))
  for (const what of [0, 1, 2] as const) all.push(slideVoice(what))
  for (const tool of ['finger', 'comb', 'straw', 'soap'] as const) all.push(takeVoice(tool))
  for (let variant = 0; variant < 3; variant++) {
    for (let pot = 0; pot < 3; pot++) {
      for (const state of STATES) all.push(dropVoice(pot, variant, state, 0, pot + 1), dropVoice(pot, variant, state, 1, BROWN))
      all.push(glugVoice(pot, variant))
    }
    for (let colour = 0; colour <= BROWN; colour++) all.push(swishVoice(0, colour), swishVoice(1, colour), spatterVoice(Math.max(1, colour), variant))
    for (const colour of [ORANGE, GREEN, VIOLET, BROWN]) all.push(beadVoice(colour, variant), beadVoice(colour, variant, true))
    for (const state of STATES) {
      all.push(combVoice(state, 0, 1, variant), combVoice(state, 1, BROWN, variant), strawVoice(state, 0, variant), strawVoice(state, 1, variant), soapVoice(state, variant))
      const tail = soapTailVoice(state, variant)
      if (tail) all.push(tail)
    }
    all.push(catVoice(variant), purrVoice(variant), knockVoice(true, variant), knockVoice(false, variant), clothVoice(variant), cheepVoice(variant), popVoice(variant), chirrupVoice(variant), windVoice(variant), lickVoice(variant), dripVoice(variant))
  }
  return all
}
