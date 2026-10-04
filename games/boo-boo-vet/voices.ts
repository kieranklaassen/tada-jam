// The sound of the vet's room, as plain numbers (ART.md, "The toy": every thing
// has a peel, a flight and a landing voice, and each animal an invented voice
// with no words). A voice is a short list of notes and a pure function of its
// arguments: no clock, no chance, no audio node. sound.ts turns a list into
// sound; voices.test.ts holds every list inside stated ranges.
//
// Loudness: an ordinary touch tops out near 0.12, a landing or a glad call may
// reach 0.18, and nothing is louder. A bigger answer is more notes, never a
// louder one. There is no fanfare, no praise, no buzzer, and no voice that
// wails or sobs: the saddest sound here is a suspicious "hm?".

import { CAST, SPECIES, type Species } from './cast'
import { GIVEN, type Given } from './grid'
import { CARES, NEEDS, type Care, type Need } from './needs'

export type Note = {
  /** Seconds after the voice starts. */
  at: number
  kind: 'tone' | 'noise'
  /** Hz: the pitch of a tone, or the centre of a noise band. */
  pitch: number
  /** Hz the pitch glides to by the end of the note, if it moves. */
  to?: number
  /** Loudness at the top of the note, 0 to 1. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds to die away after the peak. */
  length: number
  /** For a tone: the wave. */
  wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** For a noise: how narrow the band is. */
  q?: number
}
export type Notes = readonly Note[]

export type Mood = 'glad' | 'wow' | 'bliss' | 'wary' | 'hum'

type Wave = NonNullable<Note['wave']>

const MOODS: readonly Mood[] = ['glad', 'wow', 'bliss', 'wary', 'hum']
const SQUEAKS = ['duck', 'tidy', 'peek'] as const
const STEPS = [0, 1, 2] as const
const SECRET_KINDS = ['den', 'foam', 'boat', 'crackle', 'patch'] as const
const CARRIER_KINDS = ['blink', 'open', 'slide'] as const
const LAMP_KINDS = ['dim', 'bright'] as const
const STEP_CAP = 8
const DROP_CAP = 6

// ── Small arithmetic ─────────────────────────────────────────────────────────

/** A pitch ratio from a count of semitones. */
const semis = (count: number): number => 2 ** (count / 12)
const hz = (value: number): number => Math.round(value * 10) / 10
const sec = (value: number): number => Math.round(value * 1000) / 1000
const loud = (value: number): number => Math.round(value * 1000) / 1000

/** Any number as one of the three variants. */
function pick(variant: number): 0 | 1 | 2 {
  const whole = Number.isFinite(variant) ? Math.floor(variant) : 0
  return (((whole % 3) + 3) % 3) as 0 | 1 | 2
}

/** A count as a whole number from nothing up to the cap. */
function upTo(count: number, cap: number): number {
  return Number.isNaN(count) ? 0 : Math.max(0, Math.min(cap, Math.floor(count)))
}

function toneNote(at: number, pitch: number, peak: number, attack: number, length: number, wave: Wave, to?: number): Note {
  const note: Note = { at: sec(at), kind: 'tone', pitch: hz(pitch), peak: loud(peak), attack: sec(attack), length: sec(length), wave }
  if (to !== undefined && hz(to) !== note.pitch) note.to = hz(to)
  return note
}

function noiseNote(at: number, pitch: number, peak: number, attack: number, length: number, q: number, to?: number): Note {
  const note: Note = { at: sec(at), kind: 'noise', pitch: hz(pitch), peak: loud(peak), attack: sec(attack), length: sec(length), q }
  if (to !== undefined && hz(to) !== note.pitch) note.to = hz(to)
  return note
}

// ── The care things ──────────────────────────────────────────────────────────

/**
 * Each thing's own pitch and how heavy it is in the hand. The five pitches are
 * every other step of one chord (D, F sharp, A, C sharp, E), so any two things
 * picked up one after the other sound like they belong together, and the
 * closest two are a minor third apart: far enough that the three variants of a
 * peel, which move it by less than half a semitone, never meet a neighbour.
 */
const THING: Readonly<Record<Care, { pitch: number; heft: number }>> = {
  blanket: { pitch: 294, heft: 0.5 },
  basket: { pitch: 370, heft: 0.9 },
  bowl: { pitch: 440, heft: 0.7 },
  brush: { pitch: 554, heft: 0.35 },
  plaster: { pitch: 659, heft: 0.1 },
}

const PEEL_TUNE = [1, 1.025, 0.978] as const

/**
 * The finger lands on a thing and it lifts off the cart like a sticker: the
 * tack lets go (a narrow hiss sliding up) and the corner pops free at the
 * thing's own pitch. The variants pull a little longer or shorter.
 */
export function peel(care: Care, variant: number): Notes {
  const v = pick(variant)
  const pitch = THING[care].pitch * PEEL_TUNE[v]
  return [
    noiseNote(0, pitch * 4, 0.05, 0.015, 0.07 + v * 0.012, 3, pitch * 6),
    toneNote(0.045 + v * 0.008, pitch, 0.11, 0.004, 0.09, 'triangle', pitch * semis(3 - v)),
  ]
}

/** The thing flies to the animal: a breath of air, shorter for the light things. */
export function whoosh(care: Care): Notes {
  const { pitch, heft } = THING[care]
  const length = 0.06 + 0.06 * heft
  return [
    noiseNote(0, pitch * 3, 0.045, 0.02, length, 1.5, pitch * 5),
    toneNote(0, pitch * 2, 0.02, 0.02, length, 'sine', pitch * 3),
  ]
}

/**
 * A body being landed on or putting a foot down. The pitch follows the size
 * (96 Hz on the bear up to a 640 Hz tick on the hedgehog) and the length the
 * weight. A triangle, so that the low ones still carry on a small speaker.
 */
const thumpPitch = (species: Species): number => 96 * CAST[species].size ** -1.58

function thump(at: number, species: Species, peak: number, tune: number, ring: number): Note {
  const { weight } = CAST[species]
  const pitch = thumpPitch(species) * tune
  return toneNote(at, pitch, peak, 0.003 + 0.005 * weight, 0.03 + ring * weight, 'triangle', pitch * 0.67)
}

/** What each thing is made of, heard as it lands. */
const MATERIAL: Readonly<Record<Care, Notes>> = {
  // A papery pat.
  plaster: [noiseNote(0, 2600, 0.09, 0.002, 0.05, 1.5, 1800)],
  // A soft whump: wide, low, slow to arrive.
  blanket: [noiseNote(0, 320, 0.1, 0.03, 0.26, 0.8, 140)],
  // Dry bristles: three quick scratches.
  brush: [
    noiseNote(0, 3400, 0.06, 0.002, 0.028, 4),
    noiseNote(0.035, 3900, 0.06, 0.002, 0.028, 4),
    noiseNote(0.07, 3100, 0.05, 0.002, 0.028, 4),
  ],
  // A wet plop: a pitch that jumps up, and a little splash after it.
  bowl: [
    toneNote(0, 320, 0.1, 0.004, 0.09, 'sine', 760),
    noiseNote(0.03, 1800, 0.04, 0.005, 0.08, 2, 2600),
  ],
  // A wicker creak: a narrow band that bends up, then back.
  basket: [
    noiseNote(0, 700, 0.07, 0.03, 0.16, 9, 950),
    noiseNote(0.14, 880, 0.05, 0.02, 0.14, 9, 640),
  ],
}

/** The thing lands on the animal. The first note is the body's thump; the rest is the thing. */
export function land(care: Care, species: Species): Notes {
  // The material's notes are copied, so a caller that changes its list changes nobody else's.
  return [thump(0, species, 0.12 + 0.06 * CAST[species].weight, 1, 0.19), ...MATERIAL[care].map((note) => ({ ...note }))]
}

/** A thing let go elsewhere slides to rest on the table or the floor. */
export function rest(care: Care): Notes {
  const { pitch, heft } = THING[care]
  return [
    noiseNote(0, 700 + pitch, 0.04, 0.02, 0.1 + 0.05 * heft, 1, 400 + pitch * 0.5),
    toneNote(0.09 + 0.04 * heft, pitch * 0.5, 0.06, 0.004, 0.05 + 0.04 * heft, 'triangle', pitch * 0.42),
  ]
}

// ── The animals' voices ──────────────────────────────────────────────────────

/** The pitch an animal speaks at: 147 Hz for the bear up to 832 Hz for the hedgehog, two and a half octaves. */
const basePitch = (species: Species): number => Math.round(147 * CAST[species].size ** -1.44)

type Layer = { kind: 'tone'; wave: Wave; ratio: number; gain: number } | { kind: 'noise'; q: number; ratio: number; gain: number }

type Timbre = {
  wave: Wave
  /** A share of the mood's loudness: the buzzy waves and the high voices are held back. */
  gain: number
  /** How this animal says a note it has no reason to bend, in semitones over the note. */
  bend: number
  /** The share of each beat that sounds: near 1 runs the notes together, lower leaves gaps. */
  hold: number
  /** A second, quieter note under each note. */
  layer?: Layer
}

const TIMBRE: Readonly<Record<Species, Timbre>> = {
  // A round low voice with a growl in it; each note sinks a little.
  bear: { wave: 'triangle', gain: 0.9, bend: -1, hold: 0.9, layer: { kind: 'tone', wave: 'sawtooth', ratio: 1, gain: 0.2 } },
  // Clean short pips with gaps between: it starts and stops.
  rabbit: { wave: 'triangle', gain: 0.95, bend: 1, hold: 0.6 },
  // A smooth note that slides up as it is said, with a nasal edge an octave and a fifth above.
  cat: { wave: 'sine', gain: 0.95, bend: 3, hold: 0.95, layer: { kind: 'tone', wave: 'triangle', ratio: 3, gain: 0.18 } },
  // Short eager yaps.
  dog: { wave: 'square', gain: 0.5, bend: -2, hold: 0.55 },
  // A tiny squeak with a snuffle of air on it.
  hedgehog: { wave: 'sine', gain: 0.75, bend: 2, hold: 0.75, layer: { kind: 'noise', q: 8, ratio: 2, gain: 0.3 } },
  // A reedy note that drops as it is said.
  duck: { wave: 'sawtooth', gain: 0.5, bend: -3, hold: 0.8 },
}

/** One note of a melody: semitones above the animal's pitch, its own slide in semitones if it has one, and how many beats it lasts. */
type Beat = readonly [semi: number, slide?: number, beats?: number]

/** How a melody is said. */
type Manner = {
  /** Loudness at the top, before the animal's own share. */
  peak: number
  /** Beats are this many times the animal's own. */
  pace: number
  /** Soft moods swell in slowly and run their notes together. */
  soft: boolean
  /** Seconds a beat lasts before the pace, where it is not the animal's quick one. */
  beat?: number
}

type Tune = Manner & { variants: readonly [readonly Beat[], readonly Beat[], readonly Beat[]] }

const TUNE: Readonly<Record<Mood, Tune>> = {
  // Delight: the melody climbs.
  glad: {
    peak: 0.16, pace: 1, soft: false,
    variants: [
      [[0], [4], [7, 2]],
      [[0], [2], [5], [9]],
      [[-3], [0], [7, undefined, 1.4]],
    ],
  },
  // Surprise: a jump up, then a wobble at the top.
  wow: {
    peak: 0.15, pace: 0.85, soft: false,
    variants: [
      [[0], [12], [10], [12]],
      [[0], [9], [11], [9]],
      [[-2], [10], [12], [10]],
    ],
  },
  // A long warm sigh: down, further down, and settled back on the animal's own note.
  bliss: {
    peak: 0.11, pace: 1.6, soft: true,
    variants: [
      [[5, -3], [2, -4], [-2, 2]],
      [[7, -4], [3, -3], [0, 0]],
      [[3, -3], [0, -2], [-2, 2]],
    ],
  },
  // "Hm?": up, then down past where it began, with a small lift that stops short of home.
  wary: {
    peak: 0.11, pace: 0.8, soft: false,
    variants: [
      [[0], [3], [-2, 1]],
      [[0], [4], [4], [-3, 1]],
      [[-2], [1], [-4, 1]],
    ],
  },
  // Under a stroking hand: two soft level notes.
  hum: {
    peak: 0.08, pace: 1.2, soft: true,
    variants: [
      [[0, 0], [0, 0]],
      [[0, 0], [2, 0]],
      [[2, 0], [0, 0]],
    ],
  },
}

/** The animal's quick beat, in seconds: a third of a second for the bear, a tenth for the hedgehog. */
const quickBeat = (species: Species): number => 0.3 / CAST[species].tempo

/** A beat for a sigh, a yawn or a hum, which no animal hurries: it follows the tempo, but only a little. */
const slowBeat = (species: Species): number => 0.2 + 0.12 / CAST[species].tempo

/** A melody in one animal's voice, from `start`: its own pitch, wave, second note and way of bending. */
function say(species: Species, start: number, melody: readonly Beat[], manner: Manner): Note[] {
  const timbre = TIMBRE[species]
  const base = basePitch(species)
  const beat = (manner.beat ?? quickBeat(species)) * manner.pace
  const hold = manner.soft ? Math.max(timbre.hold, 0.92) : timbre.hold
  const peak = manner.peak * timbre.gain
  const notes: Note[] = []
  let at = start
  for (const [semi, slide, beats] of melody) {
    const step = beat * (beats ?? 1)
    const sounding = step * hold
    const attack = Math.min(0.06, Math.max(0.004, sounding * (manner.soft ? 0.3 : 0.12)))
    const length = sounding - attack
    const pitch = base * semis(semi)
    const to = pitch * semis(slide ?? timbre.bend)
    notes.push(toneNote(at, pitch, peak, attack, length, timbre.wave, to))
    const layer = timbre.layer
    if (layer?.kind === 'tone') notes.push(toneNote(at, pitch * layer.ratio, peak * layer.gain, attack, length, layer.wave, to * layer.ratio))
    if (layer?.kind === 'noise') notes.push(noiseNote(at, pitch * layer.ratio, peak * layer.gain, attack, length, layer.q, to * layer.ratio))
    at += step
  }
  return notes
}

/** The animal's invented voice: no words, two to four notes, in its own pitch, timbre and tempo. */
export function call(species: Species, mood: Mood, variant: number): Notes {
  const tune = TUNE[mood]
  return say(species, 0, tune.variants[pick(variant)], tune)
}

// ── The room ─────────────────────────────────────────────────────────────────

/** The mouse on the cart: it ducks as something flies past, tidies what came back, and peeks. */
export function squeak(kind: 'duck' | 'tidy' | 'peek'): Notes {
  if (kind === 'duck') return [toneNote(0, 2400, 0.06, 0.003, 0.05, 'sine', 1700)]
  if (kind === 'tidy') {
    return [
      toneNote(0, 2100, 0.05, 0.003, 0.03, 'sine'),
      toneNote(0.06, 2350, 0.05, 0.003, 0.03, 'sine'),
      toneNote(0.12, 2100, 0.045, 0.003, 0.04, 'sine', 2000),
    ]
  }
  return [
    toneNote(0, 1900, 0.05, 0.004, 0.045, 'sine', 2300),
    toneNote(0.08, 2500, 0.06, 0.004, 0.06, 'sine', 2700),
  ]
}

/** Seconds from one footfall to the next. */
const stepGap = (species: Species): number => 0.19 * (0.9 / CAST[species].tempo) ** 0.6

/**
 * An animal walking in. The gap between footfalls follows the tempo, squeezed
 * so that eight of the bear's still fit in a second and a half: 0.19 s for the
 * bear down to 0.09 s for the hedgehog. Left and right feet differ a little.
 * `steps(species, 1)` is one footfall, for a walk that is timed elsewhere.
 */
export function steps(species: Species, count: number): Notes {
  const { weight } = CAST[species]
  const gap = stepGap(species)
  const notes: Note[] = []
  for (let i = 0; i < upTo(count, STEP_CAP); i++) {
    const left = i % 2 === 0
    const peak = (0.06 + 0.06 * weight) * (left ? 1 : 0.85)
    const tune = left ? 1 : 0.94
    // The duck's feet are flat: a slap of noise in place of a thump.
    if (species === 'duck') notes.push(noiseNote(i * gap, 950 * tune, peak, 0.002, 0.045, 1.4, 600 * tune))
    else notes.push(thump(i * gap, species, peak, tune, 0.14))
  }
  return notes
}

/** A touch on the bare wall or floor: one soft knock, so that no touch lands in silence. */
export function tap(): Notes {
  return [
    toneNote(0, 220, 0.1, 0.003, 0.07, 'triangle', 160),
    noiseNote(0, 520, 0.03, 0.002, 0.03, 1),
  ]
}

/** When and how high each drop is, by its place in the spray: uneven on purpose, and the same every time. */
const DROPS: readonly (readonly [at: number, pitch: number])[] = [
  [0, 1560],
  [0.07, 2090],
  [0.11, 1320],
  [0.2, 2480],
  [0.26, 1760],
  [0.37, 2210],
]

/** Water drops flying off: tiny plips, each a little quieter than the last. */
export function drops(count: number): Notes {
  return DROPS.slice(0, upTo(count, DROP_CAP)).map(([at, pitch], i) => toneNote(at, pitch, 0.05 - i * 0.004, 0.003, 0.05, 'sine', pitch * 1.35))
}

// ── The game: thirty cells, the signs, and the room's other voices ───────────
//
// What the game needs on top of the toy. A care that does not fit is a small
// comedy and one that fits is a consequence (ART.md, "The error as a
// consequence"), so nothing here judges: no cheer, no buzzer, and nothing
// that wails. Where an animal speaks it is bewildered, tickled or content.

/** The things again, as pieces that can be placed, shrunk and repeated. */
const pat = (at: number, peak = 0.09, tune = 1): Note => noiseNote(at, 2600 * tune, peak, 0.002, 0.05, 1.5, 1800 * tune)
const whump = (at: number, peak = 0.1): Note => noiseNote(at, 320, peak, 0.03, 0.26, 0.8, 140)
const plop = (at: number, peak = 0.1): Note => toneNote(at, 320, peak, 0.004, 0.09, 'sine', 760)
const plip = (at: number, pitch: number, peak: number): Note => toneNote(at, pitch, peak, 0.003, 0.05, 'sine', pitch * 1.35)
const creak = (at: number, from: number, to: number, length: number, peak: number): Note => noiseNote(at, from, peak, Math.min(0.06, length * 0.2), length, 9, to)
const rustle = (at: number, peak: number, tune = 1): Note => noiseNote(at, 900 * tune, peak, 0.02, 0.1, 0.9, 600 * tune)

/** Where an animal's breath sits: a low huff from the bear (700 Hz), a thin one from the hedgehog (2600 Hz). */
const breathPitch = (species: Species): number => 700 * CAST[species].size ** -1.09

/** One breath, in or out: air only, no voice in it. A sniff is a short one in; a pant is one out. */
function breath(species: Species, at: number, peak: number, lasts: number, way: 'in' | 'out', tune = 1): Note {
  const pitch = breathPitch(species) * tune
  const attack = Math.min(0.08, lasts * 0.35)
  return noiseNote(at, pitch, peak, attack, lasts - attack, 1.6, pitch * (way === 'in' ? 1.35 : 0.7))
}

/** Teeth chattering with cold: tiny clicks, upper and lower, as high as the animal is small. */
function chatter(species: Species, times: readonly number[], peaks: readonly number[]): Note[] {
  const pitch = thumpPitch(species) * 5
  return times.map((at, i) => toneNote(at, pitch * (i % 2 === 0 ? 1 : 1.12), peaks[Math.min(i, peaks.length - 1)], 0.002, 0.022, 'triangle'))
}

/** One lap of a tongue at water. */
const lap = (species: Species, at: number, peak: number): Note =>
  toneNote(at, breathPitch(species) * 0.6, peak, 0.004, 0.05, 'sine', breathPitch(species) * 0.96)

type CellVoice = (species: Species) => Note[]

/**
 * The thirty cells, each written from the words that end its cell in the
 * sheet (ART.md, "The object-by-action grid"); the name in the comment is the
 * cell's `voice` in grid.ts. A thing sounds of what it is made of, shaped by
 * what happens to it, at moments that are the same for every animal. Whatever
 * the animal does itself is its own: a voice in its pitch and timbre, a
 * breath, its teeth, its tongue, its feet.
 */
const CELL: Readonly<Record<Given, Readonly<Record<Need, CellVoice>>>> = {
  plaster: {
    // pat-two-stamps: it goes on, and the paw is tried out twice.
    sore: (s) => {
      const peak = 0.11 + 0.04 * CAST[s].weight
      return [pat(0), thump(0.16, s, peak, 1, 0.12), thump(0.16 + stepGap(s), s, peak * 0.9, 1.06, 0.12)]
    },
    // papery-flutter: the shiver flaps it like a flag, and it flutters off.
    cold: () => [
      ...[0, 1, 2, 3, 4, 5].map((i) => noiseNote(i * 0.045, i % 2 === 0 ? 2500 : 3100, 0.07 - i * 0.008, 0.002, 0.03, 2)),
      noiseNote(0.29, 2800, 0.03, 0.03, 0.16, 1.5, 4200),
    ],
    // stretchy-creak-pop: the leg pulls at it, and it lets go.
    itchy: () => [
      noiseNote(0, 520, 0.07, 0.06, 0.3, 10, 1300),
      toneNote(0, 170, 0.035, 0.06, 0.3, 'sawtooth', 330),
      toneNote(0.38, 620, 0.11, 0.003, 0.06, 'sine', 1240),
    ],
    // wet-slap-bleh: it lands on the tongue, and the animal says what it thinks of the taste.
    thirsty: (s) => [
      noiseNote(0, 1500, 0.09, 0.002, 0.06, 1.2, 700),
      toneNote(0, 300, 0.06, 0.003, 0.05, 'sine', 190),
      ...say(s, 0.2, [[4, -1, 0.5], [1, -5, 1.3]], { peak: 0.1, pace: 1, soft: false }),
    ],
    // tick-sniff: it lands beside the nose, and the nose sniffs it twice.
    scared: (s) => [noiseNote(0, 3200, 0.05, 0.002, 0.02, 2), breath(s, 0.14, 0.04, 0.07, 'in', 1.2), breath(s, 0.26, 0.035, 0.06, 'in', 1.3)],
  },
  blanket: {
    // whump-questioning-hum: tucked in, with a small "hm?" going up.
    sore: (s) => [whump(0), ...say(s, 0.32, [[0, 0, 0.7], [2, 3, 1.2]], { peak: 0.09, pace: 1, soft: true, beat: slowBeat(s) })],
    // whump-chatter-to-hum: the chatter thins out and a warm hum takes its place.
    cold: (s) => [
      whump(0),
      ...chatter(s, [0.3, 0.35, 0.42], [0.05, 0.04, 0.03]),
      ...say(s, 0.52, [[2, -2, 1.6]], { peak: 0.09, pace: 1, soft: true, beat: slowBeat(s) }),
    ],
    // muffled-thumps: the lump goes on scratching under it, and kicks it off.
    itchy: (s) => {
      const gap = stepGap(s) * 0.6
      return [
        noiseNote(0, 420, 0.05, 0.03, 0.3, 0.8, 260),
        ...[0, 1, 2, 3].map((i) => thump(i * gap, s, 0.07, i % 2 === 0 ? 1 : 0.94, 0.06)),
        whump(0.56, 0.07),
      ]
    },
    // panting-speeds-up: too warm under there.
    thirsty: (s) => [
      whump(0, 0.08),
      ...[0.3, 0.5, 0.67, 0.81, 0.925, 1.02].map((at, i) => breath(s, at, 0.05 + i * 0.003, [0.14, 0.12, 0.1, 0.085, 0.07, 0.07][i], 'out', 0.8)),
    ],
    // whump-endless-rustle: it settles over the hiding place, and the cloth goes on moving, no more and no less.
    // The cell goes on with `clothRustle` at its later beats, for as long as the blanket moves.
    scared: () => [whump(0), ...[0, 1, 2, 3, 4].map((i) => rustle(0.34 + i * 0.2, 0.04, i % 2 === 0 ? 1 : 1.1))],
  },
  brush: {
    // dry-strokes-eep: the fur is fluffed, and one stroke comes too near the paw.
    sore: (s) => [
      ...[3400, 3700, 3300].map((pitch, i) => noiseNote(i * 0.13, pitch, 0.06, 0.01, 0.09, 4, pitch * 0.8)),
      ...say(s, 0.42, [[12, 2, 0.6]], { peak: 0.11, pace: 1, soft: false }),
    ],
    // crackle-chatter: the fur stands up crackling, and the puff shivers.
    cold: (s) => [
      noiseNote(0, 5200, 0.05, 0.001, 0.02, 6),
      noiseNote(0.04, 4400, 0.035, 0.001, 0.02, 6),
      noiseNote(0.11, 5600, 0.045, 0.001, 0.02, 6),
      noiseNote(0.15, 4800, 0.03, 0.001, 0.02, 6),
      ...chatter(s, [0.24, 0.29, 0.34, 0.39], [0.05]),
    ],
    // three-pops-thumping-purr: the burrs fly out, and a happy hind foot thumps under a purr.
    itchy: (s) => {
      const gap = stepGap(s) * 0.7
      return [
        ...[700, 880, 1050].map((pitch, i) => toneNote([0, 0.11, 0.2][i], pitch, 0.09, 0.003, 0.045, 'sine', pitch * 1.5)),
        ...[0, 1, 2].map((i) => thump(0.36 + i * gap, s, 0.08 + 0.03 * CAST[s].weight, 1, 0.08)),
        ...say(s, 0.36, [[-5, 0, 2]], { peak: 0.07, pace: 1, soft: true, beat: slowBeat(s) }),
      ]
    },
    // strokes-sinking: brushed flat like a rug, each stroke slower and lower.
    thirsty: () => [3200, 2600, 2100, 1700].map((pitch, i) => noiseNote(i * 0.3, pitch, 0.07 - i * 0.008, 0.03, 0.2, 3, pitch * 0.75)),
    // one-stroke-then-quiet: the brush stops short and lies down.
    scared: () => [noiseNote(0, 3400, 0.05, 0.02, 0.15, 4, 2700), noiseNote(0.3, 2900, 0.025, 0.002, 0.025, 4)],
  },
  bowl: {
    // plop-drips: the paw goes in, and is shaken dry.
    sore: () => [plop(0), noiseNote(0.03, 1800, 0.04, 0.005, 0.08, 2, 2600), plip(0.3, 1900, 0.05), plip(0.47, 1500, 0.04), plip(0.72, 1700, 0.03)],
    // lap-rattle: one lap, and the shiver rattles the bowl on the table.
    cold: (s) => [
      lap(s, 0, 0.07),
      ...[0, 0.06, 0.115, 0.165, 0.21].map((at, i) => toneNote(0.18 + at, i % 2 === 0 ? 1320 : 1480, 0.06 - i * 0.006, 0.002, 0.03, 'triangle')),
    ],
    // splash-spraying-shake: the leg kicks the bowl, and the shake sprays the room.
    itchy: () => [
      noiseNote(0, 1500, 0.12, 0.004, 0.14, 0.7, 3500),
      toneNote(0, 260, 0.08, 0.004, 0.08, 'sine', 140),
      ...[0, 1, 2, 3].map((i) => noiseNote(0.24 + i * 0.07, i % 2 === 0 ? 2800 : 3600, 0.06 - i * 0.01, 0.004, 0.04, 1.5)),
    ],
    // gulps-rising-hiccup: a long drink, each gulp a step higher, and a hiccup.
    thirsty: (s) => {
      const gap = 0.1 + 0.07 / CAST[s].tempo
      const low = basePitch(s) * semis(-5)
      return [
        ...[0, 1, 2, 3].map((i) => toneNote(i * gap, low * semis(2 * i), 0.09, 0.006, 0.06, 'triangle', low * semis(2 * i) * 0.75)),
        ...say(s, 4 * gap + 0.1, [[10, 4, 0.45]], { peak: 0.11, pace: 1, soft: false }),
      ]
    },
    // one-lap-ripple: a tongue comes out of the dark for one lap, and the water trembles.
    scared: (s) => [lap(s, 0, 0.045), toneNote(0.14, 1250, 0.025, 0.02, 0.1, 'sine', 1320), toneNote(0.3, 1320, 0.018, 0.02, 0.1, 'sine', 1250)],
  },
  basket: {
    // wicker-three-steps: it climbs in on three legs, the third step late.
    sore: (s) => {
      const peak = 0.07 + 0.04 * CAST[s].weight
      const gap = stepGap(s)
      return [
        creak(0, 700, 950, 0.14, 0.07),
        creak(0.2, 880, 640, 0.12, 0.05),
        thump(0.4, s, peak, 1, 0.1),
        thump(0.4 + gap, s, peak * 0.9, 0.94, 0.1),
        thump(0.4 + gap * 2.4, s, peak, 1, 0.1),
      ]
    },
    // rattling-wicker-walk: the shivering walks the basket across the table.
    cold: () => [
      ...[0, 1, 2, 3, 4, 5].map((i) => noiseNote(i * 0.085, i % 2 === 0 ? 820 : 1050, 0.06, 0.003, 0.035, 9)),
      creak(0.05, 620, 760, 0.2, 0.04),
      creak(0.32, 760, 600, 0.2, 0.04),
    ],
    // creak-creak-whirr: it scratches inside until the basket spins like a top.
    itchy: () => [
      creak(0, 700, 950, 0.12, 0.07),
      creak(0.17, 880, 640, 0.12, 0.06),
      noiseNote(0.34, 600, 0.07, 0.08, 0.4, 5, 2400),
      toneNote(0.34, 130, 0.035, 0.08, 0.4, 'sawtooth', 390),
      noiseNote(0.86, 1400, 0.04, 0.003, 0.03, 9),
      noiseNote(0.98, 1100, 0.03, 0.003, 0.03, 9),
    ],
    // long-creak-sigh: it hangs over the rim like a wet towel and lets its breath go.
    thirsty: (s) => [
      noiseNote(0, 760, 0.07, 0.06, 0.42, 9, 480),
      breath(s, 0.5, 0.05, 0.36, 'out'),
      ...say(s, 0.5, [[3, -4, 1.3]], { peak: 0.07, pace: 1, soft: true, beat: slowBeat(s) }),
    ],
    // hush-slow-breaths-yawn: the room goes quiet, each breath is longer than the last, and then a yawn.
    scared: (s) => [
      noiseNote(0, 400, 0.05, 0.08, 0.34, 0.6, 240),
      breath(s, 0.22, 0.04, 0.16, 'out'),
      breath(s, 0.47, 0.045, 0.22, 'out'),
      breath(s, 0.76, 0.05, 0.28, 'out', 0.9),
      ...say(s, 1.05, [[0, 5, 1], [5, -7, 1.5]], { peak: 0.09, pace: 1, soft: true, beat: slowBeat(s) }),
    ],
  },
  hand: {
    // soft-hum: it leans in and lays the paw in the hand.
    sore: (s) => say(s, 0, [[-2, 0, 1], [0, 0, 1.6]], { peak: 0.08, pace: 1, soft: true, beat: slowBeat(s) }),
    // chatter-thins: the shaking eases under the warm hand.
    cold: (s) => chatter(s, [0, 0.05, 0.11, 0.19, 0.3, 0.46], [0.06, 0.055, 0.048, 0.04, 0.03, 0.02]),
    // quick-thumps: the hind leg thumps while the itchy place is stroked.
    itchy: (s) => [0, 1, 2, 3, 4].map((i) => thump(i * stepGap(s) * 0.55, s, 0.08 + 0.03 * CAST[s].weight, i % 2 === 0 ? 1 : 1.05, 0.06)),
    // raspy-lick: a dry tongue on the finger.
    thirsty: (s) => [0, 1, 2].map((i) => noiseNote(i * 0.05, breathPitch(s) * (1.3 + i * 0.12), 0.06, 0.004, 0.04, 5, breathPitch(s) * (1.3 + i * 0.12) * 1.1)),
    // sniff-soft-steps: it sniffs the still finger and creeps one step out.
    scared: (s) => {
      const peak = 0.04 + 0.02 * CAST[s].weight
      return [
        breath(s, 0, 0.04, 0.07, 'in', 1.2),
        breath(s, 0.12, 0.035, 0.06, 'in', 1.3),
        thump(0.34, s, peak, 1, 0.08),
        thump(0.34 + stepGap(s) * 1.3, s, peak, 0.94, 0.08),
      ]
    },
  },
}

/** What is heard when this is given to an animal with this need: the cell of the grid, in this animal's manner. */
export function cellVoice(given: Given, need: Need, species: Species): Notes {
  return CELL[given][need](species)
}

/** A sign is quiet at the first step and a little clearer at each one after. */
const CLEAR = [0.65, 0.82, 1] as const

/**
 * The small sound a sign makes by itself, now and then, while the animal
 * waits. It says what the body is doing and nothing more: nothing calls,
 * and the one that hides is all but silent at every step.
 */
export function signVoice(need: Need, species: Species, step: 0 | 1 | 2): Notes {
  const clear = CLEAR[step]
  const { tempo } = CAST[species]
  const more = [...Array(step).keys()]
  switch (need) {
    case 'thirsty': {
      // Slow panting: out and in, out and in.
      const gap = 0.16 + 0.06 / tempo
      return [0, 1, ...more.map((i) => i + 2)].map((i) => breath(species, i * gap, 0.08 * clear * (i % 2 === 0 ? 1 : 0.8), gap * 0.6, i % 2 === 0 ? 'out' : 'in'))
    }
    case 'cold':
      // A teeth chatter.
      return chatter(species, [0, 1, 2, ...more.map((i) => i + 3)].map((i) => i * 0.055), [0.07 * clear])
    case 'sore':
      // One small "hm?": level, then a little up. It asks; it does not whimper.
      return say(species, 0, [[0, 0, 0.7], [2, 2, 1]], { peak: 0.09 * clear, pace: 1, soft: true })
    case 'itchy': {
      // A quick dry scratching.
      const gap = 0.045 + 0.03 / tempo
      return [0, 1, 2, ...more.map((i) => i + 3)].map((i) => noiseNote(i * gap, i % 2 === 0 ? 3100 : 2500, 0.075 * clear, 0.003, 0.03, 3, (i % 2 === 0 ? 3100 : 2500) * 0.85))
    }
    case 'scared':
      // Almost nothing: one tiny breath that comes in pieces, no louder and no longer at a plainer step. Only its
      // pitch tells the steps apart, a shade higher as the animal shows more of itself.
      return [0, 1, 2].map((i) => breath(species, i * 0.07, 0.035 * CLEAR[0] * (1 - i * 0.15), 0.05, 'in', 1.1 + i * 0.08 + step * 0.03))
  }
}

/**
 * The cloth going on rustling: three small rustles, no louder than the ones before them. A blanket over a hiding
 * place does not stop while the lump under it trembles, so its cell plays this again at each of its later beats.
 */
export function clothRustle(): Notes {
  return [0, 1, 2].map((i) => rustle(i * 0.2, 0.04, i % 2 === 0 ? 1.1 : 1))
}

/** The mouse's pleased squeak: two tiny notes, the second higher. */
const pleased = (at: number): Note[] => [toneNote(at, 2300, 0.045, 0.004, 0.04, 'sine', 2600), toneNote(at + 0.07, 2900, 0.055, 0.004, 0.06, 'sine', 3300)]

/** The mouse uses a thing on itself, once, to show what it is for: the thing in miniature, and a pleased squeak. */
export function showing(care: Care): Notes {
  switch (care) {
    case 'bowl':
      // Two sips.
      return [plip(0, 1800, 0.045), plip(0.09, 2000, 0.04), ...pleased(0.24)]
    case 'blanket':
      // A corner wrapped round itself.
      return [noiseNote(0, 900, 0.05, 0.02, 0.08, 0.9, 500), ...pleased(0.2)]
    case 'plaster':
      // Stuck on its tail.
      return [noiseNote(0, 4200, 0.05, 0.002, 0.025, 2, 3200), ...pleased(0.14)]
    case 'brush':
      // Its whiskers, one side and the other.
      return [noiseNote(0, 4800, 0.04, 0.002, 0.022, 5), noiseNote(0.04, 5300, 0.04, 0.002, 0.022, 5), noiseNote(0.1, 4600, 0.035, 0.002, 0.022, 5), ...pleased(0.22)]
    case 'basket':
      // Curled up in it, and a long breath out.
      return [creak(0, 1800, 2300, 0.07, 0.04), ...pleased(0.15), noiseNote(0.36, 2600, 0.03, 0.05, 0.18, 1.6, 1800)]
  }
}

/** What two things make together. */
export function secret(kind: 'den' | 'foam' | 'boat' | 'crackle' | 'patch'): Notes {
  switch (kind) {
    case 'den':
      // A soft flap, a smaller one, and the cloth settling.
      return [noiseNote(0, 420, 0.09, 0.02, 0.12, 0.9, 220), noiseNote(0.17, 380, 0.06, 0.02, 0.1, 0.9, 200), noiseNote(0.3, 260, 0.05, 0.06, 0.3, 0.7, 150)]
    case 'foam':
      // A fizz, and bubbles rising through it.
      return [
        noiseNote(0, 4200, 0.04, 0.05, 0.42, 1.5, 5200),
        ...[700, 880, 1100, 1320, 1650].map((pitch, i) => toneNote([0.04, 0.13, 0.19, 0.3, 0.36][i], pitch, 0.06 - i * 0.006, 0.004, 0.04, 'sine', pitch * 1.3)),
      ]
    case 'boat':
      // A plop, and a little bob down and up.
      return [plop(0, 0.09), noiseNote(0.03, 2000, 0.03, 0.005, 0.06, 2, 2800), toneNote(0.2, 520, 0.05, 0.03, 0.12, 'sine', 470), toneNote(0.38, 470, 0.04, 0.03, 0.14, 'sine', 520)]
    case 'crackle':
      // A dry crackle, uneven.
      return [0, 0.03, 0.085, 0.12, 0.19, 0.23, 0.31].map((at, i) => noiseNote(at, [5200, 4500, 5600, 4800, 5400, 4600, 5000][i], [0.06, 0.04, 0.055, 0.035, 0.05, 0.03, 0.025][i], 0.001, 0.02, 6))
    case 'patch':
      // A pat, on cloth.
      return [pat(0, 0.08, 0.9), noiseNote(0.005, 500, 0.05, 0.01, 0.08, 0.9, 350)]
  }
}

/** The carrier: shut, it answers a touch; its door opens; it slides in. */
export function carrier(kind: 'blink' | 'open' | 'slide'): Notes {
  switch (kind) {
    case 'blink':
      // Two tiny clicks, like blinks.
      return [toneNote(0, 1400, 0.07, 0.002, 0.02, 'triangle'), toneNote(0.11, 1500, 0.06, 0.002, 0.02, 'triangle')]
    case 'open':
      // A latch, and the door's creak.
      return [toneNote(0, 900, 0.08, 0.002, 0.03, 'triangle', 700), noiseNote(0, 2500, 0.04, 0.002, 0.02, 3), creak(0.09, 500, 900, 0.3, 0.06)]
    case 'slide':
      // A scrape along the floor, and a stop.
      return [noiseNote(0, 300, 0.08, 0.05, 0.36, 0.8, 220), toneNote(0.42, 140, 0.1, 0.004, 0.08, 'triangle', 100), noiseNote(0.44, 1800, 0.03, 0.002, 0.03, 4)]
  }
}

/** The lamp dims a little for a rest (a soft hum that sinks), and comes back (one that rises). */
export function lamp(kind: 'dim' | 'bright'): Notes {
  const [from, to] = kind === 'dim' ? [392, 330] : [330, 392]
  return [toneNote(0, from, 0.06, 0.06, 0.5, 'sine', to), toneNote(0, from * 1.5, 0.025, 0.06, 0.5, 'sine', to * 1.5)]
}

/**
 * Once it is well, the animal does the thing it could not do before, and this
 * is how that sounds in its own voice: it is the animal, not the game, so
 * there is no chord and no flourish. Every one ends higher than it began.
 */
const WELL: Readonly<Record<Need, Manner & { melody: readonly Beat[] }>> = {
  // The one that limped leaps: a short push-off and an octave up.
  sore: { melody: [[0, undefined, 0.5], [12, 2, 1.2]], peak: 0.15, pace: 1, soft: false },
  // The one that shook has a long loose stretch: two slow slides upward.
  cold: { melody: [[-2, 4, 1.4], [2, 5, 1.6]], peak: 0.12, pace: 1.2, soft: true },
  // The one that scratched is still: up, and a held note that lets go a little.
  itchy: { melody: [[0, 4, 1], [7, -3, 1.7]], peak: 0.1, pace: 1.1, soft: true },
  // The one that drooped stands tall: one long bright level call.
  thirsty: { melody: [[2], [9, 0, 1.7]], peak: 0.15, pace: 1, soft: false },
  // The one that hid walks out: four bold level notes, each a step above the last.
  scared: { melody: [[0, 0], [2, 0], [4, 0], [5, 0]], peak: 0.13, pace: 1, soft: false },
}

export function well(species: Species, need: Need): Notes {
  const { melody, ...manner } = WELL[need]
  return say(species, 0, melody, manner)
}

// ── Everything, for the test and for listening through ───────────────────────

/** Every voice for every argument: the three variants, each count from one to its cap, every cell for every animal. */
export function ALL_VOICES(): { name: string; notes: Notes }[] {
  const all: { name: string; notes: Notes }[] = []
  const variants = [0, 1, 2]
  for (const care of CARES) for (const v of variants) all.push({ name: `peel ${care} ${v}`, notes: peel(care, v) })
  for (const care of CARES) all.push({ name: `whoosh ${care}`, notes: whoosh(care) })
  for (const care of CARES) for (const species of SPECIES) all.push({ name: `land ${care} ${species}`, notes: land(care, species) })
  for (const care of CARES) all.push({ name: `rest ${care}`, notes: rest(care) })
  for (const species of SPECIES) for (const mood of MOODS) for (const v of variants) all.push({ name: `call ${species} ${mood} ${v}`, notes: call(species, mood, v) })
  for (const kind of SQUEAKS) all.push({ name: `squeak ${kind}`, notes: squeak(kind) })
  for (const species of SPECIES) for (let count = 1; count <= STEP_CAP; count++) all.push({ name: `steps ${species} ${count}`, notes: steps(species, count) })
  all.push({ name: 'tap', notes: tap() })
  for (let count = 1; count <= DROP_CAP; count++) all.push({ name: `drops ${count}`, notes: drops(count) })
  for (const given of GIVEN) for (const need of NEEDS) for (const species of SPECIES) all.push({ name: `cell ${given} ${need} ${species}`, notes: cellVoice(given, need, species) })
  for (const need of NEEDS) for (const species of SPECIES) for (const step of STEPS) all.push({ name: `sign ${need} ${species} ${step}`, notes: signVoice(need, species, step) })
  for (const care of CARES) all.push({ name: `showing ${care}`, notes: showing(care) })
  for (const kind of SECRET_KINDS) all.push({ name: `secret ${kind}`, notes: secret(kind) })
  for (const kind of CARRIER_KINDS) all.push({ name: `carrier ${kind}`, notes: carrier(kind) })
  for (const kind of LAMP_KINDS) all.push({ name: `lamp ${kind}`, notes: lamp(kind) })
  all.push({ name: 'cloth rustle', notes: clothRustle() })
  for (const species of SPECIES) for (const need of NEEDS) all.push({ name: `well ${species} ${need}`, notes: well(species, need) })
  return all
}
