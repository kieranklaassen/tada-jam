import { GUEST_IDS, type GuestId } from './guests'

// Every sound of the toy as plain numbers. Nobody on the machine that wrote
// them could hear them: they are written from the design sheet's words and
// held inside stated ranges by a test, so that a wrong one is a wrong number
// and not a surprise. `sound.ts` turns a list of notes into a voice for
// `audio.ts`. Peaks are quiet on purpose: the master gain and the compressor
// are the template's, and the lead checks loudness on a real machine.

export type Note = {
  /** A pitched tone, or a band of noise. */
  kind: 'tone' | 'noise'
  /** For a tone: the shape of its wave. */
  wave: OscillatorType
  /** Seconds after the sound starts. */
  at: number
  /** Hz: the tone's pitch, or the middle of the noise's band. */
  pitch: number
  /** Hz it slides to by its end, or 0 to stay. */
  glide: number
  /** Loudness at its loudest, 0 to 1. */
  peak: number
  /** Seconds to reach it. */
  attack: number
  /** Seconds it then takes to die away. */
  length: number
  /** For noise: how narrow the band is. */
  q: number
}

export type Sound = readonly Note[]

/** The ranges every note is held in. */
export const RANGE = { pitch: [40, 5200], peak: [0.01, 0.3], attack: [0.002, 0.25], length: [0.03, 1.2], total: 1.6, q: [0.4, 12] } as const

const tone = (at: number, pitch: number, length: number, peak: number, wave: OscillatorType = 'sine', glide = 0, attack = 0.006): Note => ({ kind: 'tone', wave, at, pitch, glide, peak, attack, length, q: 1 })
const hiss = (at: number, pitch: number, length: number, peak: number, q = 1, glide = 0, attack = 0.004): Note => ({ kind: 'noise', wave: 'sine', at, pitch, glide, peak, attack, length, q })

/** How long a sound lasts, to the end of its last note. */
export function lengthOf(sound: Sound): number {
  return sound.reduce((end, note) => Math.max(end, note.at + note.attack + note.length), 0)
}

// --- Each guest's own grunt -------------------------------------------------

type Grunt = { wave: OscillatorType; pitch: number; glide: number; length: number; peak: number; second: number; breath: number }

/** A guest's voice: where it sits, where it slides, how long it is, whether it has a second syllable (a ratio of the first's pitch) and how much breath is in it. */
export const GRUNT: Readonly<Record<GuestId, Grunt>> = {
  troll: { wave: 'sawtooth', pitch: 82, glide: 0.8, length: 0.26, peak: 0.16, second: 0, breath: 0.03 },
  bat: { wave: 'triangle', pitch: 1480, glide: 1.35, length: 0.07, peak: 0.1, second: 1.19, breath: 0 },
  blob: { wave: 'sine', pitch: 196, glide: 0.62, length: 0.2, peak: 0.2, second: 0, breath: 0.05 },
  yeti: { wave: 'triangle', pitch: 58, glide: 1.25, length: 0.42, peak: 0.2, second: 0, breath: 0.07 },
  lizard: { wave: 'square', pitch: 620, glide: 0.9, length: 0.05, peak: 0.05, second: 0.84, breath: 0.02 },
  cook: { wave: 'triangle', pitch: 131, glide: 1.12, length: 0.3, peak: 0.17, second: 0.75, breath: 0 },
  fly: { wave: 'sawtooth', pitch: 880, glide: 1.06, length: 0.11, peak: 0.045, second: 0, breath: 0 },
  singer: { wave: 'sine', pitch: 740, glide: 1.5, length: 0.36, peak: 0.12, second: 0, breath: 0.04 },
}

/** How many ways each guest grunts. */
export const GRUNTS = 3

/**
 * A guest's grunt when a finger lands on it. `variant` is one of its ways of
 * grunting; `where` is how high on its body the finger landed (0 at its feet,
 * 1 at the top of its head), which raises the pitch; `speed` is how fast the
 * finger came (0 to 1), which shortens it. Asleep, it is lower, slower and
 * breathier: a snort.
 */
export function grunt(id: GuestId, variant: number, where: number, speed: number, awake = true): Sound {
  const voice = GRUNT[id]
  const way = ((Math.floor(variant) % GRUNTS) + GRUNTS) % GRUNTS
  const lift = 0.92 + 0.22 * Math.max(0, Math.min(1, where))
  // Never below what a tablet's speaker can sound.
  const pitch = Math.max(46, voice.pitch * lift * [1, 1.122, 0.891][way] * (awake ? 1 : 0.8))
  const length = voice.length * (1.15 - 0.4 * Math.max(0, Math.min(1, speed))) * (awake ? 1 : 1.5)
  const glide = Math.max(42, pitch * (way === 2 ? 2 - voice.glide : voice.glide))
  const notes: Note[] = [tone(0, pitch, length, voice.peak, voice.wave, glide)]
  if (voice.second > 0) notes.push(tone(length * 0.9, pitch * voice.second, length * 0.8, voice.peak * 0.8, voice.wave, pitch * voice.second * voice.glide))
  const breath = voice.breath + (awake ? 0 : 0.04)
  // The breath sits well above the note, and never above what a small speaker carries.
  if (breath > 0) notes.push(hiss(0, Math.min(4200, pitch * 6), length * 1.2, breath, 0.8, Math.min(2600, pitch * 3)))
  return notes
}

// --- The page being drawn again ----------------------------------------------

/** The pen redrawing the page from a guest's place: a dry scratch that rises, ending on that guest's own note. */
export function sweepTo(id: GuestId): Sound {
  const voice = GRUNT[id]
  return [hiss(0, 1700, 0.3, 0.05, 1.6, 4300, 0.03), hiss(0.08, 2600, 0.2, 0.03, 3, 5000, 0.02), tone(0.26, voice.pitch * 2, 0.16, 0.05, 'sine', voice.pitch * 2 * voice.glide)]
}

/** Back to the plain page: the same scratch falling. */
export const sweepPlain: Sound = [hiss(0, 4000, 0.28, 0.045, 1.6, 1500, 0.03), hiss(0.06, 3000, 0.18, 0.025, 3, 1100, 0.02)]

// --- Carrying and setting down ------------------------------------------------

/** Picked up: a short "hup" in its own voice and the rattle of its luggage. */
export function lifted(id: GuestId): Sound {
  const voice = GRUNT[id]
  return [tone(0, voice.pitch * 1.2, 0.09, voice.peak * 0.7, voice.wave, voice.pitch * 1.7), hiss(0.05, 900, 0.05, 0.05, 5), hiss(0.11, 1250, 0.04, 0.04, 6), hiss(0.16, 800, 0.05, 0.03, 5)]
}

/** Moves in: the bag thuds and the bedsprings squeak as the bed is tested. */
export const movesIn: Sound = [hiss(0, 110, 0.16, 0.24, 1.1, 60), tone(0, 70, 0.14, 0.14, 'sine', 45), tone(0.22, 950, 0.07, 0.05, 'triangle', 1450), tone(0.33, 1250, 0.08, 0.05, 'triangle', 800)]

/** Two share a room: a double creak of springs. */
export const shares: Sound = [tone(0, 700, 0.1, 0.05, 'triangle', 1100), tone(0.13, 1000, 0.1, 0.05, 'triangle', 640), tone(0.3, 760, 0.1, 0.045, 'triangle', 1180), tone(0.43, 1060, 0.1, 0.045, 'triangle', 690)]

/** Two swap rooms: two sets of footsteps passing in the corridor. */
export const swaps: Sound = [0, 1, 2, 3, 4, 5].map((step) => hiss(step * 0.085, step % 2 ? 210 : 320, 0.05, 0.11, 3))

/** Stuck half through the plaster with a crunch, then out into the nearer room with a pop. */
export const throughTheWall: Sound = [hiss(0, 680, 0.14, 0.2, 0.7, 380), hiss(0.03, 2300, 0.09, 0.07, 1.4), tone(0.3, 300, 0.07, 0.14, 'sine', 920, 0.003)]

/** Set down in the lobby: the bag down, one step. */
export const toLobby: Sound = [hiss(0, 150, 0.1, 0.16, 1.2, 90), hiss(0.14, 280, 0.05, 0.08, 3)]

/** Onto the bench: the bench creaks under it. */
export const toBench: Sound = [tone(0, 240, 0.2, 0.07, 'sawtooth', 170, 0.03), hiss(0.02, 130, 0.1, 0.12, 1.1)]

/** A full room turns a guest away: the springs twang it back. */
export const noBed: Sound = [tone(0, 420, 0.22, 0.08, 'triangle', 640), tone(0.02, 630, 0.2, 0.05, 'triangle', 420)]

/** Put back where it stood: nothing changed, just its feet. */
export const putBack: Sound = [hiss(0, 260, 0.05, 0.08, 3), hiss(0.07, 220, 0.05, 0.06, 3)]

// --- The house itself ---------------------------------------------------------

/** The day-and-night wheel: a ratchet of clicks, then the hour's own sound, low and hollow for the night and bright for the day. */
export function wheelTurns(to: 'day' | 'night'): Sound {
  const clicks = [0, 1, 2, 3, 4].map((click) => hiss(click * 0.045, 2100 + click * 140, 0.03, 0.06, 7))
  const hour = to === 'night' ? [tone(0.26, 196, 0.5, 0.09, 'sine', 185, 0.03), tone(0.32, 294, 0.42, 0.045, 'sine', 277, 0.03)] : [tone(0.26, 523, 0.22, 0.08, 'triangle'), tone(0.4, 784, 0.3, 0.07, 'triangle')]
  return [...clicks, ...hour]
}

/** A knock on a wall or a floor: two raps on plaster. */
export const knock: Sound = [hiss(0, 190, 0.05, 0.2, 4), tone(0, 150, 0.05, 0.1, 'sine', 110, 0.003), hiss(0.12, 200, 0.05, 0.16, 4), tone(0.12, 145, 0.05, 0.08, 'sine', 105, 0.003)]

/** A lamp set swinging: its chain tinkles. */
export const lamp: Sound = [tone(0, 2450, 0.09, 0.035, 'sine'), tone(0.05, 3150, 0.08, 0.03, 'sine'), tone(0.12, 2800, 0.1, 0.02, 'sine')]

/** The bell on the porter's trolley. */
export const bell: Sound = [tone(0, 1568, 0.5, 0.08, 'sine', 0, 0.003), tone(0, 3140, 0.3, 0.03, 'sine', 0, 0.003), tone(0, 2093, 0.4, 0.035, 'sine', 0, 0.003)]

/** The front door: its latch and a short creak. */
export const door: Sound = [hiss(0, 1400, 0.03, 0.1, 6), tone(0.05, 330, 0.24, 0.05, 'sawtooth', 250, 0.04)]

/** The paper margin, or anything on the page that is only paper: a soft rustle. */
export const paper: Sound = [hiss(0, 3200, 0.09, 0.03, 0.9, 2100, 0.02)]

// --- The hotel as each guest hears it ----------------------------------------

/** How the listener takes a sound: as the plain page has it, as something it loves, as something it minds, or as nothing to it. */
export type HeardAs = 'plain' | 'loved' | 'minded' | 'faint'

/** The troll's tune: eight steps of an oom-pah, in semitones above its low note; null is a rest. */
export const TUBA_TUNE: readonly (number | null)[] = [0, null, 7, null, 0, 7, 5, null]
export const TUBA_LOW = 65.4
/** Steps of the tune a second. */
export const TUBA_BEAT = 1.5

/**
 * One step of the tuba as it is heard from a place. From the troll's own
 * place, or a place that loves it, it is a round tune; from the place of
 * someone it keeps awake it is a flat, sour blare; from a place it is nothing
 * to, a dull thump through the wall. Null on a rest.
 */
export function tuba(step: number, heard: HeardAs): Sound | null {
  const semitones = TUBA_TUNE[((Math.floor(step) % TUBA_TUNE.length) + TUBA_TUNE.length) % TUBA_TUNE.length]
  if (semitones === null) return null
  const pitch = TUBA_LOW * 2 ** (semitones / 12)
  if (heard === 'loved') return [tone(0, pitch, 0.36, 0.11, 'triangle', 0, 0.03), tone(0, pitch * 2, 0.3, 0.035, 'sine', 0, 0.03)]
  // Flat by a third of a semitone, harsh and cut short.
  if (heard === 'minded') return [tone(0, pitch * 0.981, 0.24, 0.13, 'sawtooth', pitch * 0.94, 0.01), tone(0, pitch * 2.04, 0.2, 0.05, 'square', pitch * 1.96, 0.01)]
  if (heard === 'faint') return [tone(0, pitch, 0.18, 0.035, 'sine', 0, 0.03)]
  return [tone(0, pitch, 0.3, 0.07, 'triangle', 0, 0.03)]
}

/** Every fixed sound by name, for the test that holds them in range. */
export const FIXED: Readonly<Record<string, Sound>> = { sweepPlain, movesIn, shares, swaps, throughTheWall, toLobby, toBench, noBed, putBack, knock, lamp, bell, door, paper }

/** Every guest, for the tests. */
export const VOICED = GUEST_IDS
