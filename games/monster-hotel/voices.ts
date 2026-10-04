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

/** A door in a room's back wall: two raps on wood and its latch rattling. */
export const roomDoor: Sound = [tone(0, 420, 0.04, 0.12, 'triangle', 300, 0.003), hiss(0, 900, 0.03, 0.08, 3), tone(0.11, 400, 0.04, 0.1, 'triangle', 290, 0.003), hiss(0.11, 880, 0.03, 0.07, 3), hiss(0.2, 2600, 0.05, 0.04, 8)]

/** A bed pressed with a finger: the mattress gives and its springs squeak down and up. */
export const bedSprings: Sound = [hiss(0, 140, 0.12, 0.12, 1), tone(0.03, 980, 0.09, 0.05, 'triangle', 690), tone(0.15, 720, 0.11, 0.045, 'triangle', 1040)]

/** The boiler: its iron side rung with a knuckle, and a spit of steam from its valve. */
export const boiler: Sound = [tone(0, 233, 0.5, 0.11, 'square', 228, 0.003), tone(0, 617, 0.32, 0.04, 'sine', 0, 0.003), tone(0, 1091, 0.2, 0.025, 'sine', 0, 0.003), hiss(0.16, 3600, 0.3, 0.05, 1.2, 2400, 0.03)]

/** The mountain of luggage: a hollow thump on a trunk, and a buckle. */
export const luggage: Sound = [hiss(0, 95, 0.2, 0.2, 0.9, 60), tone(0, 104, 0.18, 0.12, 'sine', 78, 0.004), hiss(0.09, 1900, 0.03, 0.04, 7)]

/** The empty bird cage on top of the luggage: its wires ring and its little door chatters. */
export const cage: Sound = [tone(0, 3320, 0.18, 0.035, 'sine', 0, 0.003), tone(0.02, 4180, 0.14, 0.025, 'sine', 0, 0.003), hiss(0.08, 4300, 0.03, 0.03, 9), hiss(0.13, 4100, 0.03, 0.025, 9), hiss(0.18, 4400, 0.03, 0.02, 9)]

/** The crows going up out of the tree: two hoarse caws and a clap of wings. */
export const caw: Sound = [tone(0, 520, 0.16, 0.07, 'sawtooth', 390, 0.01), hiss(0, 1500, 0.14, 0.03, 2.5), tone(0.24, 480, 0.2, 0.06, 'sawtooth', 350, 0.01), hiss(0.24, 1400, 0.18, 0.025, 2.5), hiss(0.5, 700, 0.06, 0.05, 1.5), hiss(0.6, 760, 0.06, 0.04, 1.5), hiss(0.7, 820, 0.06, 0.03, 1.5)]

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
export const feathers: Sound = [hiss(0, 420, 0.18, 0.13, 0.6, 240, 0.02), hiss(0.12, 3000, 0.25, 0.03, 0.8, 1800, 0.05)]

/** The sneeze of whoever is nearest the feathers, in its own voice: a breath drawn in, and then all of it out at once. */
export function sneeze(id: GuestId): Sound {
  const voice = GRUNT[id]
  const pitch = Math.max(60, Math.min(1800, voice.pitch * 1.5))
  return [
    hiss(0, Math.min(4200, pitch * 5), 0.16, 0.03, 1.2, Math.min(5000, pitch * 8), 0.12),
    hiss(0.3, 2400, 0.12, 0.09, 1.1, 900),
    tone(0.3, pitch, Math.min(0.3, voice.length * 1.2), Math.min(0.2, voice.peak * 1.1), voice.wave, Math.max(42, pitch * 0.6)),
  ]
}

/** The pipe: a hollow clang standing in a corner; a honk as a trumpet; the last bolt turned and a gurgle through a wall; a toot. */
/** A guest's own breath coming back up the standing pipe: a hollow puff, and its echo. */
export const breathBack: Sound = [hiss(0, 520, 0.16, 0.07, 2.2, 380, 0.04), hiss(0.2, 480, 0.14, 0.03, 2.2, 360, 0.04)]
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

/**
 * The stove or the ice box given to a guest: it goes into the guest's room,
 * and the guest takes to it in its own way and in its own voice. Hugging the
 * stove it purrs; sitting on it, it sags with a long wheeze; in the ice box as
 * an armchair, the lid squeals under it; stiff as a plank, it goes over with a
 * single knock.
 */
export function takesTo(id: GuestId, how: 'hugs' | 'sits-and-sags' | 'armchair' | 'plank'): Sound {
  const voice = GRUNT[id]
  const pitch = Math.max(46, voice.pitch)
  const first = how === 'hugs' || how === 'sits-and-sags' ? stoveWarms.slice(0, 2) : iceChills.slice(0, 1)
  // A purr: four short swells of its own note, each a little higher.
  if (how === 'hugs') return [...first, ...[0, 1, 2, 3].map((n) => tone(0.34 + n * 0.14, pitch * (1 + n * 0.03), 0.12, voice.peak * 0.6, voice.wave, 0, 0.04))]
  // A long wheeze, sliding down as it sags.
  if (how === 'sits-and-sags') return [...first, tone(0.36, pitch * 1.1, 0.9, voice.peak * 0.6, voice.wave, Math.max(42, pitch * 0.6), 0.08), hiss(0.36, Math.min(4200, pitch * 5), 0.9, 0.04, 0.9, Math.min(2000, pitch * 2.5), 0.08)]
  // The lid squeals, and a settled sound from whoever sat on it.
  if (how === 'armchair') return [...first, hiss(0.34, 2600, 0.22, 0.06, 9, 3900, 0.03), tone(0.62, pitch, Math.min(0.5, voice.length * 1.6), voice.peak * 0.6, voice.wave, Math.max(42, pitch * 0.88), 0.05)]
  // One small sound of surprise, and one knock as it lands flat.
  return [...first, tone(0.12, pitch * 1.3, 0.08, voice.peak * 0.5, voice.wave), hiss(0.5, 240, 0.09, 0.2, 1.4, 130), tone(0.5, 98, 0.1, 0.12, 'sine', 70)]
}

/** The alarm clock: ticking by a bed, a whirr as a guest who will change its hours winds it, a muffled clonk from one who will not, a slow loud tock on a wall, and its full bell. */
/** The alarm clock by a bed at dawn and at dusk: a short trill, far shorter than its full bell. */
export const clockTrill: Sound = [0, 1, 2, 3].map((ring) => tone(ring * 0.045, ring % 2 ? 2349 : 2093, 0.04, 0.05, 'triangle', 0, 0.003))
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
/** Through a pairing, on its beat: a puff of steam off the yeti on the stove and a rattle of the stove's lid; the tuba's low note and the singer's high one landing together on the wall between them. */
export const saunaPuff: Sound = [hiss(0, 3400, 0.22, 0.05, 0.9, 1900, 0.02), hiss(0.03, 1200, 0.05, 0.06, 7)]
export function duetBeat(step: number): Sound {
  const up = Math.floor(step) % 2 === 1
  return [tone(0, up ? 147 : 98, 0.3, 0.09, 'triangle', 0, 0.03), tone(0, up ? 880 : 587, 0.28, 0.05, 'sine', up ? 890 : 594, 0.05), hiss(0, 180, 0.05, 0.08, 2)]
}
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

/**
 * The cook humming along to a noise it loves: on the steps of the tuba's
 * tune, two octaves up and a moment behind it, through its nose. From the
 * cook's own place it is plain to hear; from anyone else's it is not heard.
 */
export function hum(step: number, heard: HeardAs): Sound | null {
  const semitones = TUBA_TUNE[((Math.floor(step) % TUBA_TUNE.length) + TUBA_TUNE.length) % TUBA_TUNE.length]
  if (semitones === null) return null
  const pitch = TUBA_LOW * 4 * 2 ** (semitones / 12)
  return [tone(0.12, pitch, 0.26, heard === 'loved' ? 0.05 : 0.028, 'sine', pitch * 1.015, 0.06), hiss(0.12, pitch * 3, 0.2, 0.012, 6, 0, 0.06)]
}

/** The sigh of a guest wrapped in the quilt who loves it: its own note, let all the way down. */
export function sigh(id: GuestId): Sound {
  const voice = GRUNT[id]
  const pitch = Math.max(60, voice.pitch * 1.2)
  return [tone(0, pitch, 0.7, Math.min(0.12, voice.peak * 0.7), 'sine', Math.max(46, pitch * 0.62), 0.12), hiss(0, Math.min(3600, pitch * 6), 0.6, 0.03, 0.9, Math.min(1800, pitch * 3), 0.12)]
}

/**
 * How often an awake guest, content and at its one thing, makes the small
 * sound of it, in times a second: no two alike. The troll, the singer and
 * the fly are not here, because their one thing is a noise already (the
 * tuba, the aria, the buzz).
 */
export const AT_ITS_THING: Readonly<Partial<Record<GuestId, number>>> = { bat: 0.13, blob: 0.11, yeti: 0.09, lizard: 0.16, cook: 0.21 }

/**
 * The small sound of an awake guest at its one thing: the cook's stew
 * plopping under the spoon, the bat shaking out its wings, the blob plumping
 * its pillow, the yeti's long cold breath under its cloud, the lizard's
 * teeth chattering over its hot-water bottle. Quiet, and quieter from
 * another guest's place. Null for a guest whose one thing is a noise.
 */
export function atItsThing(id: GuestId, nth: number, heard: HeardAs): Sound | null {
  const quiet = heard === 'faint' ? 0.5 : 1, odd = Math.floor(nth) % 2 === 1
  const soft = (sound: Note[]): Sound => sound.map((note) => ({ ...note, peak: Math.max(RANGE.peak[0], note.peak * quiet) }))
  if (id === 'cook') return soft([tone(0, odd ? 165 : 147, 0.07, 0.04, 'sine', 92), tone(0.19, odd ? 139 : 175, 0.07, 0.035, 'sine', 98), tone(0.34, 156, 0.08, 0.04, 'sine', 88), hiss(0.5, 900, 0.14, 0.02, 3, 700)])
  if (id === 'bat') return soft([0, 1, 2].map((flap) => hiss(flap * 0.07, 2600 - flap * 300, 0.04, 0.03, 3)).concat([tone(0.26, odd ? 2349 : 2093, 0.05, 0.015, 'triangle')]))
  if (id === 'blob') return soft([hiss(0, 220, 0.09, 0.05, 1.2), hiss(odd ? 0.24 : 0.2, 200, 0.09, 0.045, 1.2)])
  if (id === 'yeti') return soft([hiss(0, 700, 0.5, 0.035, 1.5, 400, 0.15), tone(0.42, odd ? 2637 : 2349, 0.08, 0.012, 'sine')])
  if (id === 'lizard') return soft(Array.from({ length: odd ? 5 : 6 }, (_, click) => hiss(click * 0.05, 3200, 0.03, 0.03, 8)))
  return null
}

/**
 * What a placed thing keeps sounding for as long as it stands there, and how
 * often it comes round, in times a second: the stove's steady low rumble,
 * the ice box's steady hum with a slow drip, the alarm clock ticking by a bed
 * or in a guest's hand, its slow loud tock on a wall, the pipe's low whoosh
 * while something passes through it, and the dull patter of what the quilt
 * is stopping.
 */
export const STEADY_BEAT = { rumble: 0.55, hum: 0.4, tick: 1, tock: 0.5, whoosh: 0.33, patter: 0.45 } as const

/** One round of a steady sound. Quiet, and quieter from the place of a guest in another room. The ice box drips on every third round. */
export function steady(kind: keyof typeof STEADY_BEAT, nth: number, heard: HeardAs): Sound {
  const quiet = heard === 'faint' ? 0.5 : 1
  const soft = (sound: Note[]): Sound => sound.map((note) => ({ ...note, peak: Math.max(RANGE.peak[0], note.peak * quiet) }))
  if (kind === 'rumble') return soft([tone(0, 55, 1.1, 0.04, 'triangle', 51, 0.25), hiss(0, 130, 1, 0.025, 0.7, 110, 0.25)])
  if (kind === 'hum') return soft([tone(0, 117, 1.1, 0.02, 'sine', 0, 0.25), tone(0, 234, 1, 0.01, 'sine', 0, 0.25), ...(Math.floor(nth) % 3 === 0 ? [tone(0.6, 1568, 0.05, 0.03, 'sine', 980, 0.003)] : [])])
  if (kind === 'tick') return soft([hiss(0, Math.floor(nth) % 2 ? 2300 : 2700, 0.03, 0.03, 9)])
  // The pipe's low whoosh while something passes through it, and the dull patter of what is pressed against the quilt.
  if (kind === 'whoosh') return soft([hiss(0, 300, 0.9, 0.03, 0.6, 220, 0.25)])
  if (kind === 'patter') return soft([0, 1, 2, 3].map((tap) => hiss(tap * 0.11 + (Math.floor(nth) % 2 ? 0.03 : 0), 170 - tap * 6, 0.05, 0.035, 2)))
  return soft([hiss(0, Math.floor(nth) % 2 ? 700 : 900, 0.07, 0.07, 5)])
}

/** How often the fly's buzz comes round, in buzzes a second. */
export const BUZZ_BEAT = 0.4

/** The fly's small buzz, which stays in its own room: a thin whine, a pleasure to the fly, a drill to a room-mate who minds it, and next to nothing to anyone else. */
export function buzz(heard: HeardAs): Sound {
  if (heard === 'loved') return [tone(0, 233, 0.5, 0.03, 'sawtooth', 247, 0.05), tone(0.06, 466, 0.4, 0.012, 'sine', 0, 0.05)]
  if (heard === 'minded') return [tone(0, 239, 0.62, 0.06, 'sawtooth', 221, 0.02), tone(0.02, 478, 0.55, 0.03, 'square', 442, 0.02)]
  if (heard === 'faint') return [tone(0, 233, 0.3, 0.012, 'sawtooth', 240, 0.05)]
  return [tone(0, 233, 0.42, 0.022, 'sawtooth', 244, 0.05)]
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
  sweepPlain, movesIn, shares, swaps, throughTheWall, toLobby, toBench, putBack, knock, lamp, bell, door, roomDoor, bedSprings, boiler, luggage, cage, caw, paper,
  quiltOnBed, wraps, quiltHangs, feathers, breathBack, pipeStands, trumpet, pipeJoins, toots, stoveWarms, stoveScorches, iceChills, iceFrosts,
  clockByBed, clockTrill, clockKept, clockShruggedOff, clockOnWall, clockRings, toCupboard, handedBack,
  horn, doorOpens, doorShuts, coachLeaves, coachArrives, porterTrundles, porterShows, porterGoes, step, sauna, saunaPuff, duet,
  ...Object.fromEntries(Object.entries(touched).map(([kind, sound]) => [`touched ${kind}`, sound])),
  ...Object.fromEntries(Object.entries(throughTheHour).map(([kind, sound]) => [`hour ${kind}`, sound])),
}

/** Every guest, for the tests. */
export const VOICED = GUEST_IDS
