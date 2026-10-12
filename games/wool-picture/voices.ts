import type { Note } from './audio'
import type { Kind } from './wool'

// Every sound of the toy as plain numbers, written from the sheet's words:
// nobody has listened to them yet. A sound with more than one part in time is
// a cue: a list of parts, each with the moment it starts after the cue does.
// The toy's own clock plays a cue's parts when they fall due (toy.ts), so no
// note carries a delay and nothing waits on the audio clock.

export type Part = { after: number; notes: Note[] }
export type Cue = readonly Part[]

/** Each bowl's own low note, by dye: green, white, blue, yellow, russet. */
export const DYE_NOTE: readonly number[] = [196, 392, 262, 330, 147]

const tone = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number, wave: OscillatorType = 'sine'): Note => ({ kind: 'tone', frequency, peak, attack, decay, glideTo, wave })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })
const now = (...notes: Note[]): Cue => [{ after: 0, notes }]
/** One short note each `gap` seconds, starting `from` seconds in. */
const run = (from: number, gap: number, make: (i: number) => Note, count: number): Part[] => Array.from({ length: count }, (_, i) => ({ after: from + i * gap, notes: [make(i)] }))

/** A puff of wool landing: a short breath with the bowl's note under it. A bigger tuft is a lower, fuller breath. */
export function puff(dye: number, size: number): Note[] {
  return [hiss(1500 + size * 300, 0.7, 0.11 - size * 0.02, 0.008, 0.15, 800), tone(DYE_NOTE[dye], 0.09, 0.012, 0.24)]
}

/** One grain of the dry brushing a moving finger makes: brighter with speed (0 to 1), fainter as the tuft thins (1 to 0). */
export function brush(speed: number, amount: number): Note[] {
  return [hiss(1200 + 2600 * speed, 1.2, 0.02 + 0.05 * amount, 0.02, 0.09)]
}

/** One grain of a finger that waits and presses wool down. */
export function pat(amount: number): Note[] {
  return [hiss(650, 0.8, 0.015 + 0.025 * amount, 0.015, 0.07)]
}

/** The lift: the wool clings with a small soft tick at twice the bowl's note. */
export function clung(dye: number): Note[] {
  return [tone(DYE_NOTE[dye] * 2, 0.045, 0.005, 0.1, DYE_NOTE[dye] * 1.8, 'triangle')]
}

/** A tuft drawn up out of a bowl: a soft pluck at the bowl's note, higher the thinner the tuft. */
export function pluck(dye: number, size: number): Note[] {
  const note = DYE_NOTE[dye] * [1, 1.5, 2][size]
  return [tone(note, 0.14, 0.004, 0.26, note * 0.97, 'triangle'), hiss(2400, 1.5, 0.05, 0.004, 0.07, 3600)]
}

/** A touch on the bare room: a soft pat on felt. */
export const roomPat: Note[] = [hiss(480, 0.8, 0.05, 0.006, 0.09, 300)]
/** A peg, knocked. */
export const pegKnock: Note[] = [tone(250, 0.12, 0.003, 0.09, 205, 'triangle'), tone(500, 0.05, 0.003, 0.05)]
/** The moth taking off: five quick papery beats. */
export const mothFlutter: Cue = run(0, 0.06, (i) => hiss(4600 + i * 220, 3, 0.05, 0.004, 0.04), 5)

/** What each kind sounds like as it comes alive, in the grid's words. */
export const WAKE: Record<Kind, Cue> = {
  // A slow hum that rises and settles.
  hill: now(tone(98, 0.13, 0.5, 0.9, 131)),
  // A dry, leafy rustle.
  bush: run(0, 0.075, (i) => hiss(2800 + (i % 2) * 700, 2, 0.055, 0.006, 0.05), 5),
  // A long whisper that falls.
  treetop: now(hiss(2500, 1.5, 0.07, 0.25, 0.95, 700)),
  // A breathy hush that slides from one side to the other.
  mist: [{ after: 0, notes: [hiss(950, 0.9, 0.06, 0.3, 0.3, 520)] }, { after: 0.55, notes: [hiss(520, 0.9, 0.06, 0.3, 0.35, 950)] }],
  // A soft sigh upward with a few small crackles.
  smoke: [{ after: 0, notes: [hiss(600, 1, 0.06, 0.3, 0.5, 1800)] }, ...run(0.5, 0.14, (i) => hiss(3600 + i * 300, 5, 0.035, 0.003, 0.03), 3)],
  // A hollow swell. The patter of drops follows it only when drops are drawn (`cloudPatter`).
  cloud: [{ after: 0, notes: [tone(147, 0.11, 0.35, 0.55), hiss(400, 0.6, 0.05, 0.3, 0.5)] }],
  // A deep plop with a ring that falls away.
  pond: [{ after: 0, notes: [tone(180, 0.15, 0.005, 0.32, 70)] }, { after: 0.08, notes: [tone(520, 0.06, 0.02, 0.6, 340)] }],
  // A babble of quick small notes that tumble along.
  stream: run(0, 0.07, (i) => tone(720 + ((i * 290) % 560), 0.055, 0.006, 0.07, 800 + ((i * 290) % 560)), 8),
  // A whistle that rises.
  wind: now(hiss(520, 9, 0.09, 0.5, 0.5, 2600)),
  // A dry swish that comes and goes.
  corn: run(0, 0.3, () => hiss(3800, 1.4, 0.05, 0.12, 0.14), 3),
  // A crackle over a low flutter.
  fire: [{ after: 0, notes: [tone(86, 0.07, 0.05, 0.7, 78, 'triangle')] }, ...run(0.04, 0.11, (i) => hiss(2300 + ((i * 530) % 900), 4, 0.05, 0.003, 0.035), 6)],
  // A warm swell of two notes a fifth apart.
  sun: now(tone(330, 0.09, 0.4, 1, undefined), tone(495, 0.06, 0.45, 0.95)),
  // A low thud and a crumble.
  earth: [{ after: 0, notes: [tone(72, 0.16, 0.006, 0.28, 46)] }, ...run(0.12, 0.09, (i) => hiss(300 + i * 40, 0.7, 0.045, 0.01, 0.07), 4)],
  // A slow wooden creak.
  trunk: [{ after: 0, notes: [tone(108, 0.05, 0.3, 0.3, 158, 'sawtooth')] }, { after: 0.62, notes: [tone(150, 0.04, 0.2, 0.35, 118, 'sawtooth')] }],
  // Papery flicks that fall.
  leaves: run(0, 0.13, (i) => hiss(4300 - i * 520, 2.5, 0.05, 0.004, 0.05), 5),
  // Too slight to live: one faint tuft of air.
  fluff: now(hiss(1500, 1, 0.03, 0.01, 0.08)),
}

/** The patter of a cloud's drops, after its swell: heard only when the cloud wakes with drops falling under it (toy.ts). */
export const cloudPatter: Cue = run(0.7, 0.085, (i) => tone(1500 + ((i * 370) % 800), 0.04, 0.003, 0.05), 7)

/** A figure's voice has two uses: it looks at a thing, or it is poked. None says it is pleased, and none is angry. */
export type Feeling = 'look' | 'poke'

/**
 * Each figure's own voice. The sheep bleats in wavering steps, the goose honks in hard blasts, the shepherd
 * hums a question, the pig grunts low, and squeals high at a poke. `variant` picks one of three forms of a
 * poke, so the same figure poked again answers a little differently.
 */
export function folkVoice(who: number, feeling: Feeling, variant: number): Cue {
  const lift = feeling === 'poke' ? 1 + 0.07 * (variant % 3) : 1
  const bend = feeling === 'look' ? 1.04 : 1.12
  switch (who) {
    case 0:
      return run(0, 0.09, (i) => tone((i % 2 ? 300 : 335) * lift, 0.07, 0.01, 0.08, (i % 2 ? 300 : 335) * lift * (i === 2 ? bend : 1), 'triangle'), feeling === 'look' ? 2 : 3)
    case 1:
      return run(0, 0.16, (i) => tone(430 * lift, 0.06, 0.006, 0.1, 430 * lift * (i ? bend : 0.94), 'square'), feeling === 'look' ? 1 : 2)
    case 2:
      return now(tone(215 * lift, 0.09, 0.05, 0.26, 215 * lift * bend * 1.15))
    default:
      return feeling === 'poke'
        ? [{ after: 0, notes: [tone(96 * lift, 0.09, 0.008, 0.09, 82, 'sawtooth')] }, { after: 0.13, notes: [tone(720 * lift, 0.05, 0.02, 0.16, 1080 * lift)] }]
        : run(0, 0.14, () => tone(96 * lift, 0.09, 0.008, 0.1, 80 * bend, 'sawtooth'), 1)
  }
}

/** A thing's own sound as it comes through a white veil: every note lower and fainter. */
export function muffled(cue: Cue): Cue {
  return cue.map((part) => ({ after: part.after, notes: part.notes.map((note) => ({ ...note, frequency: note.frequency * 0.6, glideTo: note.glideTo === undefined ? undefined : note.glideTo * 0.6, peak: note.peak * 0.55 })) }))
}

/** How long a cue runs from its first note to the end of its last, in seconds. */
export function cueLength(cue: Cue): number {
  return Math.max(0, ...cue.map((part) => part.after + Math.max(...part.notes.map((note) => note.attack + note.decay))))
}
