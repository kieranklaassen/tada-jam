import type { CellKey } from './grid'
import type { Colour, Joints } from './plant'

// Every voice of the game as plain numbers, so that a machine that cannot
// hear can still hold each one inside a stated range (voices.test.ts). The
// view turns a part into one call of the template's `tone` or `noise`.
//
// Sound here says what happened, never how well: there is no cheer, no
// fanfare and no wrong sound. A wrong use sounds as funny as it looks.

export type Part = {
  source: 'tone' | 'noise'
  /** Hertz: the tone's pitch, or the centre of the noise band. */
  pitch: number
  /** Where the pitch glides to over the length, if it moves. */
  glideTo?: number
  /** For a tone, its wave; a noise has none. */
  wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** For a noise, how narrow its band is; a tone has none. */
  q?: number
  /** Loudest point, as a gain from 0 to 1. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds from the peak to silence. */
  length: number
  /** Seconds after the voice starts that this part starts. */
  after?: number
}

/** The ranges every part is held to. The template's own tick peaks at 0.12; nothing here is louder than 0.16. */
export const RANGE = {
  pitch: [90, 3600],
  peak: [0.02, 0.16],
  attack: [0.002, 0.09],
  length: [0.03, 0.7],
  after: [0, 0.6],
  /** A whole voice, from its start to the end of its last part. */
  whole: [0.04, 1.2],
} as const

const tone = (pitch: number, wave: Part['wave'], peak: number, attack: number, length: number, glideTo?: number, after?: number): Part => ({ source: 'tone', pitch, wave, peak, attack, length, ...(glideTo === undefined ? {} : { glideTo }), ...(after === undefined ? {} : { after }) })
const noise = (pitch: number, q: number, peak: number, attack: number, length: number, glideTo?: number, after?: number): Part => ({ source: 'noise', pitch, q, peak, attack, length, ...(glideTo === undefined ? {} : { glideTo }), ...(after === undefined ? {} : { after }) })

/**
 * One voice a cell of the grid, none shared, each built to the sound the design sheet names for that cell (a rising
 * creak, a raspberry, a hum like a top, a clink of clay). A plant's own note is added to `plant-poke` by `noteOf`,
 * a visitor's answer follows `plant-offer` in that visitor's own voice, and each seed of a burst adds `seedTick`.
 */
export const CELL_VOICES: Record<CellKey, Part[]> = {
  // A plant in bloom.
  'plant-poke': [noise(2400, 1.2, 0.05, 0.004, 0.09)],
  'plant-dust': [tone(180, 'sawtooth', 0.05, 0.06, 0.34, 420), noise(900, 2, 0.04, 0.03, 0.2, 1800)],
  'plant-wet': [noise(1500, 0.8, 0.07, 0.01, 0.12), noise(3000, 3, 0.05, 0.004, 0.05, undefined, 0.16), noise(2600, 3, 0.05, 0.004, 0.05, undefined, 0.24), noise(3300, 3, 0.04, 0.004, 0.05, undefined, 0.31)],
  // The root ball's soft thud. The scrape of clay, when the pot was taken and its plant is shouldered out, is `GAME_VOICES.scrape`.
  'plant-carry': [tone(150, 'triangle', 0.12, 0.006, 0.14, 110)],
  'plant-offer': [tone(520, 'sine', 0.08, 0.02, 0.18, 660)],
  // A pod.
  'pod-poke': [noise(700, 0.9, 0.14, 0.003, 0.11), tone(240, 'triangle', 0.1, 0.003, 0.12, 120)],
  'pod-dust': [tone(118, 'sawtooth', 0.07, 0.02, 0.5, 92), noise(260, 1.2, 0.06, 0.02, 0.45)],
  'pod-wet': [tone(200, 'sine', 0.08, 0.08, 0.3, 600), noise(1200, 0.7, 0.12, 0.004, 0.25, 2800, 0.34)],
  'pod-carry': [noise(240, 0.9, 0.11, 0.006, 0.12), noise(900, 1.5, 0.04, 0.004, 0.05, undefined, 0.16), noise(1100, 1.5, 0.04, 0.004, 0.05, undefined, 0.24), noise(800, 1.5, 0.04, 0.004, 0.05, undefined, 0.33)],
  'pod-offer': [noise(3200, 4, 0.06, 0.003, 0.04), noise(2900, 4, 0.06, 0.003, 0.04, undefined, 0.09), noise(3400, 4, 0.06, 0.003, 0.04, undefined, 0.17), noise(700, 0.9, 0.13, 0.003, 0.11, undefined, 0.27)],
  // A packet seed.
  'seed-poke': [tone(1400, 'triangle', 0.08, 0.002, 0.04, 1000), tone(700, 'sine', 0.06, 0.004, 0.1, 900, 0.07)],
  'seed-dust': [tone(233, 'sine', 0.07, 0.05, 0.6, 196), tone(466, 'sine', 0.03, 0.05, 0.5, 392)],
  'seed-wet': [tone(260, 'sawtooth', 0.04, 0.05, 0.22, 180), tone(620, 'triangle', 0.06, 0.004, 0.05, undefined, 0.26), tone(660, 'triangle', 0.06, 0.004, 0.05, undefined, 0.36)],
  'seed-carry': [noise(2800, 3, 0.04, 0.01, 0.2, 3400), tone(500, 'sine', 0.07, 0.01, 0.16, 760, 0.12)],
  'seed-offer': [tone(990, 'sine', 0.05, 0.01, 0.2, 940), tone(620, 'square', 0.05, 0.002, 0.04, 500, 0.3), noise(450, 1.2, 0.06, 0.004, 0.07, undefined, 0.42)],
  // A runner bud.
  'bud-poke': [tone(300, 'triangle', 0.1, 0.003, 0.35, 340), tone(604, 'sine', 0.04, 0.003, 0.3, 680)],
  'bud-dust': [noise(3300, 5, 0.1, 0.002, 0.03), tone(420, 'sine', 0.05, 0.03, 0.12, 360, 0.08)],
  'bud-wet': [tone(220, 'sine', 0.07, 0.09, 0.5, 330), noise(800, 1.5, 0.03, 0.05, 0.4)],
  'bud-carry': [noise(340, 2.5, 0.08, 0.03, 0.14, 200), tone(392, 'sine', 0.07, 0.01, 0.22, undefined, 0.12)],
  'bud-offer': [tone(250, 'sawtooth', 0.04, 0.03, 0.12, 300), tone(196, 'triangle', 0.1, 0.003, 0.3, 185, 0.16)],
  // A pot of soil.
  'soil-poke': [noise(300, 0.8, 0.09, 0.004, 0.1), tone(760, 'sine', 0.04, 0.03, 0.12, 900, 0.2)],
  'soil-dust': [noise(3500, 1.5, 0.03, 0.03, 0.4)],
  'soil-wet': [tone(140, 'sine', 0.12, 0.01, 0.16, 100), tone(190, 'sine', 0.08, 0.01, 0.12, 130, 0.12)],
  'soil-carry': [tone(1240, 'triangle', 0.08, 0.002, 0.07), tone(1660, 'triangle', 0.06, 0.002, 0.06, undefined, 0.05)],
  // The peering in. The hollow knock of the pot handed back is `GAME_VOICES.knock`, played when it is.
  'soil-offer': [tone(480, 'sine', 0.05, 0.04, 0.2, 430)],
  // The beetle.
  // Going over. The click as it rights itself is `GAME_VOICES.click`, played when it does.
  'beetle-poke': [noise(1000, 2, 0.08, 0.003, 0.05)],
  // Turning gold. Its sneeze is the toy's `sneeze`, played when it lets go.
  'beetle-dust': [tone(1320, 'sine', 0.05, 0.03, 0.25, 1760)],
  'beetle-wet': [tone(900, 'square', 0.03, 0.002, 0.03), noise(1700, 3, 0.05, 0.003, 0.04, undefined, 0.08), noise(1500, 3, 0.05, 0.003, 0.04, undefined, 0.17), noise(1900, 3, 0.05, 0.003, 0.04, undefined, 0.24), noise(1600, 3, 0.04, 0.003, 0.04, undefined, 0.33)],
  // The scrabble. The huff as it climbs out is `GAME_VOICES.huff`, played when it does.
  'beetle-carry': [noise(350, 1.5, 0.07, 0.01, 0.2), noise(350, 1.5, 0.06, 0.01, 0.15, undefined, 0.25)],
  'beetle-offer': [tone(165, 'sawtooth', 0.05, 0.02, 0.1, 140), tone(123, 'sawtooth', 0.05, 0.02, 0.1, 104, 0.24)],
}

// --- A plant's own note ---------------------------------------------------------

/** The lower the note, the taller the plant: pitch follows size. */
const HEIGHT_HZ: Record<Joints, number> = { 1: 784, 2: 587.3, 4: 392 }
/** Colour moves the note within one five-note scale, so any brood plays a phrase that sits together. */
const COLOUR_STEP: Record<Colour, number> = { white: 1, pink: 9 / 8, red: 5 / 4 }

/** The pitch of a plant's own pluck, in hertz. */
export function pitchOf(joints: Joints, colour: Colour): number {
  return HEIGHT_HZ[joints] * COLOUR_STEP[colour]
}

/** A plant's pluck: when it is poked, and when it opens in a brood. `variant` picks one of three plucks so that a brood does not repeat a sound. */
export function noteOf(joints: Joints, colour: Colour, variant = 0): Part[] {
  const pitch = pitchOf(joints, colour)
  const length = [0.32, 0.26, 0.38][((variant % 3) + 3) % 3]
  const wave = (['triangle', 'sine', 'triangle'] as const)[((variant % 3) + 3) % 3]
  return [tone(pitch, wave, 0.1, 0.004, length), tone(pitch * 2, 'sine', 0.03, 0.004, length * 0.6)]
}

/** The tick of one seed landing, a little higher for each seed of the pod, so six seeds run up a short scale. */
export function seedTick(index: number): Part[] {
  return [tone(880 * 2 ** (Math.max(0, Math.min(5, index)) / 12), 'triangle', 0.06, 0.002, 0.05)]
}

/** How long a voice lasts, from its start to the end of its last part. */
export function wholeLength(parts: readonly Part[]): number {
  return Math.max(...parts.map((part) => (part.after ?? 0) + part.attack + part.length))
}

// --- The toy's other sounds ------------------------------------------------------

/** Sounds of the toy that are not a cell of the grid: what the page itself does in answer. */
export const TOY_VOICES = {
  /** A finger on bare paper: a dry tap. */
  paper: [noise(1900, 1.4, 0.04, 0.003, 0.05)],
  /** Dust let go over bare paper: the beetle sneezes it off the page. */
  sneeze: [noise(1300, 1.1, 0.05, 0.08, 0.2, 2100), noise(2500, 0.8, 0.12, 0.004, 0.14, 800, 0.3)],
  /** A plant takes off for the border. */
  hop: [tone(280, 'sine', 0.07, 0.01, 0.16, 520)],
  /** It lands there. */
  land: [noise(380, 1.1, 0.06, 0.004, 0.07)],
  /** A plant or a pot is lifted in the hand. */
  lift: [tone(340, 'triangle', 0.06, 0.006, 0.09, 460)],
  /** A thing let go where it cannot stay springs back to where it came from. */
  back: [tone(430, 'triangle', 0.06, 0.006, 0.12, 300)],
  /** The oldest border plant leaves the page. */
  leave: [noise(900, 1.8, 0.04, 0.05, 0.3, 500)],
} as const satisfies Record<string, Part[]>

export type ToyVoiceId = keyof typeof TOY_VOICES

// --- The game's other sounds -----------------------------------------------------

/** Sounds of the game that are not a cell of the grid: the tools, the sketches, the loupe. */
export const GAME_VOICES = {
  /** A sketch unrolls or rolls up: paper. */
  unroll: [noise(2600, 0.9, 0.05, 0.02, 0.18, 1500)],
  /** The can or the blotter is picked up or tapped: tin. */
  clink: [tone(1480, 'triangle', 0.06, 0.002, 0.09), tone(2210, 'sine', 0.03, 0.002, 0.07)],
  /** The blotter on soil: a dry squeak. */
  blot: [tone(1900, 'sine', 0.05, 0.02, 0.1, 2500), noise(3000, 2.5, 0.03, 0.01, 0.08)],
  /** Water on bare paper: a few drips. */
  drip: [tone(880, 'sine', 0.05, 0.003, 0.05, 1320), tone(1040, 'sine', 0.04, 0.003, 0.05, 1500, 0.11), tone(780, 'sine', 0.04, 0.003, 0.05, 1200, 0.2)],
  /** A pot filled twice runs over. */
  spill: [noise(700, 0.7, 0.08, 0.02, 0.3, 300), tone(170, 'sine', 0.06, 0.02, 0.16, 120, 0.1)],
  /** The beetle's pencil on the paper. */
  pencil: [noise(3400, 2, 0.04, 0.01, 0.07), noise(3100, 2, 0.04, 0.01, 0.09, undefined, 0.12), noise(3600, 2, 0.04, 0.01, 0.06, undefined, 0.27)],
  /** The tray's plants shuffle into their groups. */
  shuffle: [noise(420, 1.1, 0.06, 0.006, 0.07), noise(520, 1.1, 0.05, 0.006, 0.07, undefined, 0.09), noise(460, 1.1, 0.05, 0.006, 0.07, undefined, 0.18)],
  /** The loupe is lifted, or its note moves to another plant: glass on brass. */
  glass: [tone(2640, 'sine', 0.04, 0.002, 0.12, 2480)],
  /** A plant set down in a pot that was taken shoulders the other out: a scrape of clay. */
  scrape: [noise(520, 1, 0.05, 0.02, 0.16, 380)],
  /** The snail puts a plant on its head: a soft settling. */
  hat: [tone(392, 'sine', 0.06, 0.02, 0.18, 330), tone(262, 'triangle', 0.05, 0.004, 0.1, undefined, 0.2)],
  /** A strip of tape goes up in the beetle's fence, or is pressed flat by a finger. */
  tape: [noise(1700, 2.2, 0.05, 0.004, 0.09, 950)],
  /** A pressed leaf or frond touched: it rustles under its tape, dry. */
  rustle: [noise(3400, 1.1, 0.045, 0.006, 0.12, 2100), noise(2600, 1.4, 0.03, 0.004, 0.07, undefined, 0.09)],
  /** The worm touched on the head: a small squeak as it ducks. */
  squeak: [tone(980, 'sine', 0.045, 0.004, 0.09, 1420)],
  /** The beetle rights itself after going over: a click. */
  click: [tone(1800, 'square', 0.03, 0.002, 0.04)],
  /** The beetle climbs out of the pot it dug itself into, affronted: a huff. */
  huff: [tone(110, 'sawtooth', 0.04, 0.03, 0.14, 95)],
  /** A pot is handed back by a visitor that peered into it: a hollow knock. */
  knock: [tone(210, 'sine', 0.1, 0.003, 0.09, 170)],
  /** A pod shaken in a visitor's grip, once: seeds against the shell. */
  rattle: [noise(3050, 4, 0.05, 0.003, 0.04), noise(3300, 4, 0.04, 0.003, 0.035, undefined, 0.07)],
  /** A packet or a tool a visitor brought is set down on the page. */
  setDown: [noise(600, 1.2, 0.07, 0.004, 0.08), tone(260, 'triangle', 0.05, 0.004, 0.1, 210)],
} as const satisfies Record<string, Part[]>

// --- The visitors' own voices -------------------------------------------------------

type VisitorVoice = {
  /** It comes in. */
  arrive: Part[]
  /** It likes a trait. Each trait is the same voice a little higher than the last (`liking`). */
  like: Part[]
  /** A trait misses: baffled, never cross and never a buzzer. */
  miss: Part[]
  /** It is tapped. */
  poked: Part[]
  /** It leaves with nothing: a small sound of its own, dry. */
  shrug: Part[]
  /** It has its plant: what it does with it. */
  use: Part[]
}

/** Invented, synthesized and wordless: each visitor has a voice of its own, by its size and its tempo. No one has heard them. */
export const VISITOR_VOICES = {
  // The snail: low, slow, a glide that takes its time.
  snail: {
    arrive: [tone(150, 'sine', 0.08, 0.08, 0.5, 190)],
    like: [tone(196, 'sine', 0.08, 0.06, 0.3, 262)],
    miss: [tone(233, 'sine', 0.07, 0.05, 0.25, 175), tone(165, 'sine', 0.06, 0.05, 0.3, 147, 0.3)],
    poked: [tone(175, 'triangle', 0.07, 0.01, 0.14, 220)],
    shrug: [tone(185, 'sine', 0.05, 0.06, 0.3, 165)],
    // One bite. The house plays it once for each of the snail's four bites, as the bite out of the leaf grows.
    use: [noise(900, 2, 0.05, 0.02, 0.08)],
  },
  // The bee: a buzz, fast and thin.
  bee: {
    arrive: [tone(220, 'sawtooth', 0.04, 0.05, 0.45, 247)],
    like: [tone(294, 'sawtooth', 0.04, 0.02, 0.16, 392), tone(392, 'sawtooth', 0.03, 0.02, 0.12, 440, 0.16)],
    miss: [tone(277, 'sawtooth', 0.04, 0.02, 0.3, 196), noise(1500, 3, 0.03, 0.01, 0.15, 600, 0.25)],
    poked: [tone(330, 'sawtooth', 0.04, 0.005, 0.1, 494)],
    shrug: [tone(247, 'sawtooth', 0.03, 0.03, 0.22, 208)],
    use: [tone(262, 'sawtooth', 0.04, 0.03, 0.14, 330), tone(330, 'sawtooth', 0.04, 0.03, 0.14, 262, 0.18), tone(262, 'sawtooth', 0.04, 0.03, 0.14, 330, 0.36)],
  },
  // The moth: breath and flutter, hardly a pitch.
  moth: {
    arrive: [noise(1100, 1.6, 0.05, 0.06, 0.4, 1700)],
    like: [noise(1800, 3.5, 0.05, 0.03, 0.2, 2600), tone(1175, 'sine', 0.03, 0.03, 0.18)],
    miss: [noise(1500, 2.5, 0.05, 0.02, 0.12), noise(1300, 2.5, 0.05, 0.02, 0.12, undefined, 0.17), noise(1100, 2.5, 0.04, 0.02, 0.2, 700, 0.34)],
    poked: [noise(2300, 3, 0.05, 0.004, 0.09)],
    shrug: [noise(1200, 2, 0.04, 0.04, 0.25, 800)],
    use: [tone(988, 'sine', 0.04, 0.09, 0.6, 1047)],
  },
  // The ladybird: brisk and tidy, two clean notes.
  ladybird: {
    arrive: [tone(523, 'triangle', 0.06, 0.004, 0.07), tone(523, 'triangle', 0.06, 0.004, 0.07, undefined, 0.12), tone(659, 'triangle', 0.06, 0.004, 0.09, undefined, 0.24)],
    like: [tone(659, 'triangle', 0.07, 0.004, 0.08), tone(784, 'triangle', 0.07, 0.004, 0.12, undefined, 0.1)],
    miss: [tone(622, 'triangle', 0.06, 0.004, 0.08), tone(466, 'triangle', 0.06, 0.004, 0.16, undefined, 0.14)],
    poked: [tone(880, 'triangle', 0.06, 0.003, 0.05), noise(2800, 4, 0.04, 0.003, 0.04, undefined, 0.04)],
    shrug: [tone(554, 'triangle', 0.05, 0.004, 0.1, 494)],
    use: [tone(698, 'triangle', 0.04, 0.02, 0.5)],
  },
  // The ant: tiny, quick, in a straight line.
  ant: {
    arrive: [tone(1319, 'square', 0.025, 0.003, 0.04), tone(1319, 'square', 0.025, 0.003, 0.04, undefined, 0.09), tone(1319, 'square', 0.025, 0.003, 0.04, undefined, 0.18), tone(1319, 'square', 0.025, 0.003, 0.04, undefined, 0.27)],
    like: [tone(1568, 'square', 0.03, 0.003, 0.06), tone(1976, 'square', 0.03, 0.003, 0.08, undefined, 0.08)],
    miss: [tone(1480, 'square', 0.03, 0.003, 0.2, 1109), noise(500, 1, 0.03, 0.01, 0.1, undefined, 0.3)],
    poked: [tone(1760, 'square', 0.03, 0.003, 0.05, 2093)],
    shrug: [tone(1397, 'square', 0.025, 0.003, 0.1, 1245)],
    use: [tone(1175, 'square', 0.03, 0.003, 0.05), tone(1175, 'square', 0.03, 0.003, 0.05, undefined, 0.2), tone(1175, 'square', 0.03, 0.003, 0.05, undefined, 0.4), tone(1175, 'square', 0.03, 0.003, 0.05, undefined, 0.6)],
  },
} as const satisfies Record<string, VisitorVoice>

/** A voice raised by some semitones: the same sound, higher. Pitches stay inside the stated range. */
export function higher(parts: readonly Part[], semitones: number): Part[] {
  const by = 2 ** (semitones / 12), top = RANGE.pitch[1]
  return parts.map((part) => ({ ...part, pitch: Math.min(top, part.pitch * by), ...(part.glideTo === undefined ? {} : { glideTo: Math.min(top, part.glideTo * by) }) }))
}

/** A visitor's liking of one trait: its `like`, a little higher for each trait down the plant, so four likes run up. */
export function liking(who: keyof typeof VISITOR_VOICES, traitIndex: number): Part[] {
  return higher(VISITOR_VOICES[who].like, 2 * Math.max(0, Math.min(3, traitIndex)))
}
