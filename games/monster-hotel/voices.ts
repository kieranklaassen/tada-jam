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

// --- The five things, cell by cell of the grid ----------------------------------

/** A finger landing on a thing, before anything else happens to it: each has its own small sound. */
export const touched = {
  quilt: [hiss(0, 900, 0.06, 0.05, 0.8, 600)],
  pipe: [tone(0, 392, 0.09, 0.05, 'triangle', 370)],
  stove: [hiss(0, 1500, 0.03, 0.06, 6), tone(0, 180, 0.06, 0.05, 'sine')],
  ice: [tone(0, 2900, 0.05, 0.03, 'sine'), hiss(0, 3600, 0.03, 0.03, 6)],
  clock: [hiss(0, 2600, 0.03, 0.04, 9), hiss(0.09, 2200, 0.03, 0.03, 9)],
} as const satisfies Record<string, Sound>

/** The quilt: a soft flump on a bed; a long rustle round a guest; four soft thumps as it is pressed onto a wall; a whumpf of feathers and a sneeze. */
export const quiltOnBed: Sound = [hiss(0, 260, 0.2, 0.14, 0.7, 150, 0.02)]
export const wraps: Sound = [hiss(0, 1900, 0.5, 0.06, 0.8, 900, 0.08), hiss(0.25, 1300, 0.4, 0.05, 0.9, 700, 0.08)]
export const quiltHangs: Sound = [0, 1, 2, 3].map((thump) => hiss(thump * 0.11, 170 - thump * 8, 0.06, 0.13, 2))
export const feathers: Sound = [hiss(0, 420, 0.18, 0.13, 0.6, 240, 0.02), hiss(0.12, 3000, 0.25, 0.03, 0.8, 1800, 0.05), tone(0.5, 880, 0.05, 0.06, 'triangle', 1500), hiss(0.52, 2400, 0.1, 0.07, 1.4)]

/** The pipe: a hollow clang standing in a corner; a honk as a trumpet; the last bolt turned and a gurgle through a wall; a toot. */
export const pipeStands: Sound = [tone(0, 311, 0.45, 0.09, 'triangle', 300), tone(0, 466, 0.3, 0.04, 'sine', 455), hiss(0, 800, 0.04, 0.08, 3)]
export const trumpet: Sound = [tone(0, 233, 0.3, 0.12, 'sawtooth', 247, 0.03), tone(0, 466, 0.25, 0.04, 'square', 494, 0.03)]
export const pipeJoins: Sound = [hiss(0, 1900, 0.04, 0.06, 7), hiss(0.08, 2100, 0.04, 0.06, 7), hiss(0.16, 2300, 0.04, 0.06, 7), tone(0.3, 150, 0.12, 0.08, 'sine', 95), tone(0.42, 130, 0.12, 0.07, 'sine', 180), tone(0.54, 160, 0.14, 0.06, 'sine', 90)]
export const toots: Sound = [tone(0, 349, 0.16, 0.1, 'square', 330, 0.02), hiss(0.02, 900, 0.12, 0.04, 1.2)]

/** The stove: an iron clunk and a ping as it heats; a sizzle on wallpaper; the dial's clack and the fire roaring to its step. */
export const stoveWarms: Sound = [hiss(0, 140, 0.12, 0.2, 1.4, 90), tone(0, 96, 0.14, 0.12, 'sine', 70), tone(0.3, 2200, 0.25, 0.03, 'sine'), tone(0.55, 2600, 0.2, 0.025, 'sine')]
export const stoveScorches: Sound = [hiss(0, 3800, 0.45, 0.07, 0.9, 2400, 0.03), hiss(0.5, 140, 0.1, 0.16, 1.4, 90)]
export function stoveDial(step: number): Sound {
  const dial = Math.max(1, Math.min(3, Math.round(step)))
  return [hiss(0, 1700, 0.03, 0.09, 8), hiss(0.06, 300 + 90 * dial, 0.3 + 0.12 * dial, 0.05 + 0.03 * dial, 0.6, 520 + 60 * dial, 0.08)]
}

/** The ice box: a slosh and a clatter of ice; a spreading crackle on a wall; the dial's glassy chink, once for each icicle. */
export const iceChills: Sound = [hiss(0, 700, 0.2, 0.1, 0.8, 380, 0.03), hiss(0.22, 2900, 0.04, 0.05, 6), hiss(0.29, 3400, 0.04, 0.05, 6), hiss(0.37, 2600, 0.04, 0.04, 6)]
export const iceFrosts: Sound = [0, 1, 2, 3, 4, 5].map((crack) => hiss(crack * 0.07, 3000 + ((crack * 577) % 1400), 0.035, 0.05, 8)).concat([hiss(0.5, 700, 0.15, 0.08, 0.8, 380, 0.03)])
export function iceDial(step: number): Sound {
  const dial = Math.max(1, Math.min(3, Math.round(step)))
  return Array.from({ length: dial }, (_, chink) => tone(chink * 0.09, 2637 + chink * 330, 0.14, 0.05, 'sine', 0, 0.003))
}

/** The stove or the ice box given to a guest: it goes into the guest's room, and the guest takes to it in its own voice. */
export function takesTo(id: GuestId, thing: 'stove' | 'ice'): Sound {
  const voice = GRUNT[id]
  const first = thing === 'stove' ? stoveWarms.slice(0, 2) : iceChills.slice(0, 1)
  // A long contented or bewildered sound in the guest's own voice: a purr going up, or a wheeze going down.
  const pitch = Math.max(46, voice.pitch * (thing === 'stove' ? 1 : 0.9))
  const glide = Math.max(42, pitch * (thing === 'stove' ? 1.18 : 0.72))
  return [...first, tone(0.32, pitch, Math.min(0.6, voice.length * 2), voice.peak * 0.7, voice.wave, glide, 0.05)]
}

/** The alarm clock: ticking by a bed, a whirr as a guest who will change its hours winds it, a muffled clonk from one who will not, a slow loud tock on a wall, and its full bell. */
export const clockByBed: Sound = [0, 1, 2, 3].map((tick) => hiss(tick * 0.16, tick % 2 ? 2300 : 2700, 0.03, 0.05, 9))
export const clockKept: Sound = Array.from({ length: 7 }, (_, turn) => hiss(turn * 0.055, 1500 + turn * 130, 0.035, 0.05, 6)).concat([tone(0.45, 1760, 0.12, 0.05, 'sine')])
export const clockShruggedOff: Sound = [tone(0, 1568, 0.05, 0.04, 'sine'), hiss(0.06, 260, 0.1, 0.16, 1.5, 150), tone(0.06, 110, 0.1, 0.1, 'sine', 80)]
export const clockOnWall: Sound = [hiss(0, 900, 0.06, 0.1, 5), hiss(0.5, 700, 0.07, 0.1, 5)]
export const clockRings: Sound = Array.from({ length: 10 }, (_, ring) => tone(ring * 0.05, ring % 2 ? 2093 : 1865, 0.06, 0.07, 'square', 0, 0.003))

/** Back to the cupboard: a shelf takes it. Handed back by a guest with no room: the same, after a pause. */
export const toCupboard: Sound = [hiss(0, 520, 0.06, 0.1, 2.2), hiss(0.09, 380, 0.05, 0.06, 2.2)]
export const handedBack: Sound = [hiss(0.18, 520, 0.06, 0.1, 2.2), hiss(0.27, 380, 0.05, 0.06, 2.2)]

/** What a placed thing sounds like as the hour turns over it: the stove's low rumble, the ice box's hum and drip, the quilt's dull patter, the pipe's whoosh, the clock's tock or its keeper's yawn. */
export const throughTheHour = {
  stove: [hiss(0, 110, 0.5, 0.06, 0.7, 90, 0.1)],
  ice: [tone(0, 123, 0.4, 0.035, 'sine', 0, 0.08), tone(0.4, 1900, 0.05, 0.03, 'sine', 1300, 0.003)],
  quilt: [0, 1, 2, 3, 4].map((pat) => hiss(pat * 0.06, 240 + ((pat * 97) % 80), 0.04, 0.05, 2)),
  pipe: [hiss(0, 500, 0.4, 0.05, 1.2, 1100, 0.12)],
  clock: [hiss(0, 800, 0.06, 0.07, 5)],
} as const satisfies Record<string, Sound>

/** The keeper of the alarm clock yawns as its hours come round: a long slide down in its own voice. */
export function yawn(id: GuestId): Sound {
  const voice = GRUNT[id]
  const pitch = Math.max(60, voice.pitch * 1.3)
  return [tone(0, pitch, 0.55, voice.peak * 0.6, 'sine', Math.max(42, pitch * 0.6), 0.12), hiss(0, Math.min(4200, pitch * 5), 0.5, 0.03, 0.8, Math.min(2600, pitch * 2.5), 0.1)]
}

// --- The coach, the porter and the scenes ----------------------------------------

/** The coach's horn when it is touched and nothing is ready to leave: two notes, a little flat. */
export const horn: Sound = [tone(0, 311, 0.16, 0.09, 'square', 305, 0.01), tone(0.2, 247, 0.26, 0.09, 'square', 240, 0.01)]
export const doorOpens: Sound = [hiss(0, 1300, 0.03, 0.09, 6), tone(0.04, 240, 0.3, 0.05, 'sawtooth', 330, 0.05)]
export const doorShuts: Sound = [tone(0, 300, 0.12, 0.04, 'sawtooth', 220, 0.02), hiss(0.14, 190, 0.07, 0.2, 2), tone(0.14, 95, 0.08, 0.1, 'sine', 70)]
export const coachLeaves: Sound = [tone(0, 62, 0.9, 0.1, 'sawtooth', 110, 0.15), hiss(0, 180, 0.9, 0.07, 0.7, 420, 0.15)]
export const coachArrives: Sound = [tone(0, 108, 0.9, 0.09, 'sawtooth', 58, 0.1), hiss(0, 400, 0.8, 0.06, 0.7, 170, 0.1), hiss(0.95, 2600, 0.15, 0.05, 2, 1200, 0.02)]
/** The porter's trolley: a squeaky wheel, three turns. */
export const porterTrundles: Sound = [0, 1, 2].flatMap((turn) => [tone(turn * 0.34, 1240, 0.09, 0.035, 'sine', 1500), hiss(turn * 0.34 + 0.12, 300, 0.08, 0.06, 1.5)])
export const porterShows: Sound = [hiss(0, 320, 0.07, 0.1, 2), hiss(0.14, 260, 0.07, 0.1, 2), hiss(0.3, 150, 0.1, 0.14, 1.4, 100)]
export const porterGoes: Sound = [hiss(0, 260, 0.07, 0.08, 2), hiss(0.14, 320, 0.07, 0.08, 2)]
/** A line of guests filing out: one soft step. */
export const step: Sound = [hiss(0, 250, 0.045, 0.07, 3)]
/** The pairings: the yeti in its sauna, a long sigh and a hiss of steam; the troll and the singer through one wall, a tuba note with her note a fifth above it. */
export const sauna: Sound = [hiss(0, 3200, 0.9, 0.06, 0.8, 1500, 0.1), tone(0.1, 61, 0.9, 0.12, 'triangle', 46, 0.2)]
export const duet: Sound = [tone(0, 98, 0.9, 0.1, 'triangle', 0, 0.05), tone(0.05, 587, 0.9, 0.08, 'sine', 622, 0.1), tone(0.5, 147, 0.5, 0.07, 'triangle', 0, 0.05)]

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

/** The singer's line: eight steps, in semitones above her note; null is a rest. She holds where the tuba rests. */
export const ARIA: readonly (number | null)[] = [null, 7, null, 12, null, null, 9, 7]
export const ARIA_NOTE = 440

/** One step of the singer as it is heard from a place: a long clear note where it is loved or her own, a shriek where it is minded, a thread of sound where it is nothing. Null on a rest. */
export function aria(step: number, heard: HeardAs): Sound | null {
  const semitones = ARIA[((Math.floor(step) % ARIA.length) + ARIA.length) % ARIA.length]
  if (semitones === null) return null
  const pitch = ARIA_NOTE * 2 ** (semitones / 12)
  if (heard === 'loved') return [tone(0, pitch, 0.5, 0.07, 'sine', pitch * 1.01, 0.08), tone(0, pitch * 2, 0.4, 0.015, 'sine', 0, 0.08)]
  if (heard === 'minded') return [tone(0, pitch * 1.03, 0.4, 0.09, 'sawtooth', pitch * 1.12, 0.02)]
  if (heard === 'faint') return [tone(0, pitch, 0.25, 0.02, 'sine', 0, 0.06)]
  return [tone(0, pitch, 0.42, 0.045, 'sine', pitch * 1.01, 0.08)]
}

/** How many snores a second each sleeper gives: one at the top of every third breath or so, no two alike. */
export const SNORES: Readonly<Record<GuestId, number>> = { troll: 0.11, bat: 0.075, blob: 0.1, yeti: 0.055, lizard: 0.08, cook: 0.065, fly: 0.14, singer: 0.09 }

/** A sleeper's snore, in its own voice: its grunt, lower, longer and far quieter. Fainter still from another guest's place. */
export function snore(id: GuestId, nth: number, heard: HeardAs): Sound {
  const quiet = heard === 'plain' ? 0.4 : 0.2
  return grunt(id, nth, 0.2, 0, false).map((note) => ({ ...note, peak: Math.max(RANGE.peak[0], note.peak * quiet) }))
}

/** Every fixed sound by name, for the test that holds them in range. */
export const FIXED: Readonly<Record<string, Sound>> = {
  sweepPlain, movesIn, shares, swaps, throughTheWall, toLobby, toBench, noBed, putBack, knock, lamp, bell, door, paper,
  quiltOnBed, wraps, quiltHangs, feathers, pipeStands, trumpet, pipeJoins, toots, stoveWarms, stoveScorches, iceChills, iceFrosts,
  clockByBed, clockKept, clockShruggedOff, clockOnWall, clockRings, toCupboard, handedBack,
  horn, doorOpens, doorShuts, coachLeaves, coachArrives, porterTrundles, porterShows, porterGoes, step, sauna, duet,
  ...Object.fromEntries(Object.entries(touched).map(([kind, sound]) => [`touched ${kind}`, sound])),
  ...Object.fromEntries(Object.entries(throughTheHour).map(([kind, sound]) => [`hour ${kind}`, sound])),
}

/** Every guest, for the tests. */
export const VOICED = GUEST_IDS
