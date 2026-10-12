import type { Note } from './audio'
import { beatOf, onBeat, pitchOf } from './beat'
import { TEMPO } from './config'
import type { Who } from './layout'
import type { Kind } from './pieces'
import { ofScene, type After, type Met, type ToyEvent } from './toy'

// Every sound of the loop as plain numbers. Nobody has heard them on the
// machine they were written on, so a test holds every pitch, peak and length
// in range, and they are written from the sheet's words: a hiss, a boing, a
// doom, a tak, a gulp.
//
// One clock with the picture. A sound starts in the frame its motion starts,
// so no note here has a `delay`: a sound that should come later belongs to a
// later event of the loop, which the loop raises when the thing moves.

const tone = (frequency: number, peak: number, attack: number, decay: number, wave: OscillatorType = 'sine', glideTo?: number): Note => ({ kind: 'tone', frequency, peak, attack, decay, wave, ...(glideTo ? { glideTo } : {}) })
const noise = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })

/** The gain audio.ts gives its master, which every voice goes through. */
export const MASTER = 0.6
/** The most the peaks of everything one frame sets off may add up to, after the master: under full scale. */
export const FULL_SCALE = 0.95
/** The quietest voice is at most this far under the loudest, in decibels, so nothing is drowned and nothing startles. */
export const WITHIN_DB = 20
/** A twin's sound is the blob's a third higher. */
export const THIRD = 5 / 4

/** A burst from a spray can under the finger. */
const hiss = (peak: number): Note[] => [noise(5200, 0.7, peak, 0.004, 0.07)]

/** A spring's boing in the note of its place: full and round from a beat, an octave up and clipped from a half. */
function boing(place: number, accent: boolean): Note[] {
  const note = pitchOf(beatOf(place))
  const notes = onBeat(place)
    ? [tone(note, accent ? 0.26 : 0.2, 0.005, 0.26, 'triangle'), tone(note / 2, 0.14, 0.004, 0.09, 'sine', note)]
    : [tone(note * 2, accent ? 0.2 : 0.15, 0.004, 0.1, 'triangle'), tone(note, 0.1, 0.003, 0.05, 'sine', note * 2)]
  if (accent) notes.push(...ring(place))
  return notes
}

/** What an accent adds to a boing: the note's twelfth, ringing on. */
const ring = (place: number): Note[] => [tone(pitchOf(beatOf(place)) * 3, 0.09, 0.004, 0.28), tone(pitchOf(beatOf(place)) * 2, 0.05, 0.004, 0.2)]

const gulp = (): Note[] => [tone(300, 0.2, 0.01, 0.12, 'sine', 110), tone(150, 0.08, 0.01, 0.1, 'sine', 90)]

/**
 * The grid of the sheet: what each piece sounds like in each way it is met. Thirty cells and the splat, no two the
 * same. `note` is the note of the beat the piece stands on, and `beat` how long a beat lasts, in seconds.
 */
const CELLS: Record<Kind, Record<Met, (note: number, beat: number) => Note[]>> = {
  drum: {
    // A low doom.
    run: () => [tone(110, 0.3, 0.004, 0.22, 'sine', 70), noise(300, 0.8, 0.08, 0.003, 0.06)],
    // A cracking tak.
    landed: () => [noise(2400, 1.5, 0.24, 0.001, 0.05), tone(330, 0.14, 0.002, 0.05, 'triangle', 220)],
    // A hollow tock, like a knock on a door.
    ceiling: () => [tone(480, 0.2, 0.002, 0.08, 'sine', 400), tone(960, 0.06, 0.002, 0.04)],
    // One stroke of a flam: the twin's is the other.
    twins: () => [tone(147, 0.2, 0.003, 0.09, 'triangle', 110), noise(500, 1, 0.06, 0.002, 0.04)],
    // A thud felt more than heard.
    hushed: () => [noise(160, 1.2, 0.14, 0.02, 0.1), tone(80, 0.1, 0.02, 0.1, 'sine', 65)],
    splat: () => [],
  },
  chime: {
    run: (note) => [tone(note * 2, 0.16, 0.002, 0.22), tone(note * 4, 0.05, 0.002, 0.1)],
    // An octave up, and it hums until the next beat.
    landed: (note, beat) => [tone(note * 4, 0.14, 0.002, Math.min(0.9, beat)), tone(note * 2, 0.05, 0.01, Math.min(0.9, beat))],
    // An octave down, like one key of a glockenspiel.
    ceiling: (note) => [tone(note, 0.18, 0.004, 0.3, 'triangle'), tone(note * 2.76, 0.03, 0.003, 0.12)],
    // One of two notes a third apart.
    twins: (note) => [tone(note * 2, 0.15, 0.002, 0.14, 'triangle')],
    // A spoon on a mug held in the hand.
    hushed: (note) => [noise(1800, 4, 0.1, 0.001, 0.02), tone(note * 2, 0.05, 0.001, 0.025, 'square')],
    splat: () => [],
  },
  flip: {
    // A rising whoop.
    run: () => [tone(260, 0.16, 0.01, 0.24, 'sine', 780)],
    // A harder throw: the whee. Its bap is the hit on the far side, half a beat on, and is a sound of its own.
    landed: () => [tone(520, 0.15, 0.005, 0.13, 'sawtooth', 1560)],
    // A falling woop.
    ceiling: () => [tone(700, 0.16, 0.01, 0.24, 'sine', 230)],
    twins: () => [tone(330, 0.13, 0.01, 0.2, 'triangle', 880)],
    // A breath.
    hushed: () => [noise(1200, 0.7, 0.07, 0.03, 0.14, 2400)],
    splat: () => [],
  },
  splitter: {
    // A zip.
    run: () => [noise(1500, 5, 0.14, 0.005, 0.13, 5000), tone(400, 0.05, 0.005, 0.12, 'sawtooth', 1200)],
    // A dropped egg.
    landed: () => [noise(500, 0.9, 0.2, 0.003, 0.09, 200), tone(140, 0.14, 0.003, 0.08, 'sine', 90)],
    // The zip runs downward.
    ceiling: () => [noise(5000, 5, 0.14, 0.005, 0.13, 1400), tone(1200, 0.05, 0.005, 0.12, 'sawtooth', 400)],
    // Two zipped into one: the shlup follows when the twin is drawn in.
    twins: () => [noise(3000, 6, 0.1, 0.004, 0.09, 1800)],
    // A zip with its teeth out.
    hushed: () => [noise(3600, 2, 0.06, 0.004, 0.05)],
    splat: () => [],
  },
  tunnel: {
    run: gulp,
    // A coin into a slot: the gulp follows.
    landed: () => [tone(2300, 0.12, 0.001, 0.1), tone(3450, 0.05, 0.001, 0.06)],
    // It swallows upward with a slurp.
    ceiling: () => [noise(700, 3, 0.12, 0.02, 0.16, 2200), tone(160, 0.1, 0.02, 0.14, 'sine', 420)],
    twins: () => [tone(340, 0.17, 0.01, 0.1, 'triangle', 130)],
    // The way out: a pop and a puff, loud again.
    hushed: () => [tone(240, 0.22, 0.002, 0.06, 'sine', 720), noise(2000, 0.8, 0.1, 0.004, 0.12)],
    splat: () => [],
  },
  wall: {
    // A wet slap.
    run: () => [noise(1200, 0.7, 0.28, 0.001, 0.07), noise(300, 1, 0.14, 0.002, 0.1), tone(170, 0.1, 0.002, 0.06, 'sine', 110)],
    // A flump, like a towel.
    landed: () => [noise(350, 0.8, 0.18, 0.012, 0.16, 180), tone(100, 0.1, 0.01, 0.12, 'sine', 75)],
    ceiling: () => [noise(1900, 0.9, 0.24, 0.001, 0.06), tone(260, 0.1, 0.002, 0.05, 'sine', 340)],
    twins: () => [noise(1500, 0.8, 0.22, 0.001, 0.06), tone(200, 0.08, 0.002, 0.05, 'triangle', 140)],
    // A soft bump.
    hushed: () => [tone(120, 0.12, 0.012, 0.07, 'sine', 95), noise(240, 1.5, 0.06, 0.01, 0.05)],
    // Hit from the air: a bigger splat.
    splat: () => [noise(1000, 0.6, 0.32, 0.001, 0.1), noise(260, 1, 0.2, 0.002, 0.14), tone(140, 0.14, 0.002, 0.09, 'sine', 80)],
  },
}

const AFTER: Record<After, () => Note[]> = {
  // It peels off the wall.
  squelch: () => [noise(600, 3, 0.12, 0.02, 0.14, 1800), tone(200, 0.05, 0.02, 0.1, 'sine', 320)],
  // One drip, the wrong way.
  plink: () => [tone(2100, 0.1, 0.001, 0.09, 'sine', 2500)],
  gulp,
  // The string of paint lets go.
  plip: () => [tone(1300, 0.08, 0.001, 0.05, 'sine', 1700)],
  // A thrown blob hits the far side flat.
  bap: () => [noise(3000, 2, 0.09, 0.002, 0.1, 6000), tone(210, 0.2, 0.002, 0.08, 'sine', 90)],
  // Spat out where it is, when a mouth of its pipe is lifted: the pop of the way out, a little smaller.
  spit: () => [tone(240, 0.18, 0.002, 0.06, 'sine', 720), noise(2000, 0.8, 0.08, 0.004, 0.1)],
  // Two are one again.
  shlup: () => [noise(1800, 3, 0.12, 0.02, 0.12, 500), tone(380, 0.08, 0.02, 0.1, 'sine', 170)],
  // The same inside a pipe, heard through its wall: low, soft and short.
  mlp: () => [noise(420, 1.2, 0.05, 0.02, 0.09, 200), tone(190, 0.035, 0.02, 0.08, 'sine', 95)],
}

const POKES: Record<Who, Note[]> = {
  // A flap and a startled trill.
  pigeon: [noise(700, 1.5, 0.12, 0.01, 0.16, 1400), tone(520, 0.06, 0.01, 0.1, 'sine', 700)],
  // A squeak, and the foam of the headphones.
  rat: [tone(1800, 0.08, 0.01, 0.09, 'sine', 2600), noise(6000, 3, 0.04, 0.01, 0.12)],
  // Mrrp.
  cat: [tone(300, 0.06, 0.03, 0.16, 'sawtooth', 520), tone(600, 0.04, 0.03, 0.14, 'sine', 900)],
  // A small motor.
  camera: [tone(120, 0.05, 0.04, 0.22, 'sawtooth', 180), noise(2400, 8, 0.04, 0.03, 0.2)],
  // A knuckle on the pane, and the curtain.
  neighbour: [tone(1500, 0.06, 0.002, 0.05), noise(2600, 1.5, 0.04, 0.01, 0.14, 1600)],
}

type PieceAct = Extract<ToyEvent, { type: 'piece' }>['act']
const HAND: Record<PieceAct, Note[]> = {
  lift: [tone(700, 0.06, 0.003, 0.05, 'triangle', 900)],
  set: [tone(180, 0.14, 0.003, 0.07, 'triangle', 140), noise(1500, 1, 0.06, 0.002, 0.03)],
  tap: [tone(420, 0.07, 0.003, 0.06, 'triangle', 380)],
  pok: [tone(520, 0.12, 0.002, 0.05, 'sine', 900)],
  stick: [noise(800, 1, 0.1, 0.004, 0.07), tone(150, 0.06, 0.004, 0.06, 'sine', 120)],
  clonk: [tone(260, 0.14, 0.003, 0.09, 'square', 200), noise(700, 1, 0.06, 0.002, 0.05)],
  hat: [tone(880, 0.07, 0.004, 0.1, 'triangle', 1100)],
  sniff: [noise(3200, 3, 0.05, 0.02, 0.07), noise(4200, 3, 0.04, 0.03, 0.09)],
  flick: [noise(1800, 2, 0.1, 0.004, 0.08, 5000)],
  bat: [noise(900, 1.2, 0.12, 0.003, 0.06), tone(240, 0.06, 0.003, 0.05, 'sine', 180)],
  // Put back on the rack: wood on wood, small.
  rest: [tone(330, 0.09, 0.003, 0.05, 'triangle', 250), noise(1100, 1, 0.04, 0.002, 0.03)],
}

type LapAct = Extract<ToyEvent, { type: 'lap' }>['act']
const LAP_NOTES: Record<LapAct, Note[]> = {
  // It stops and stares: half a coo, turned up at the end.
  stare: [tone(380, 0.07, 0.03, 0.18, 'sine', 520)],
  // A clatter of wings.
  takeoff: [noise(900, 1.2, 0.16, 0.005, 0.07), noise(1600, 1.5, 0.1, 0.01, 0.12, 700), tone(460, 0.05, 0.01, 0.1, 'sine', 620)],
  flap: [noise(800, 1.4, 0.09, 0.01, 0.09, 500)],
  // Out of breath.
  perch: [noise(1400, 0.8, 0.07, 0.04, 0.2, 700), tone(300, 0.05, 0.03, 0.15, 'sine', 240)],
}

/** A twin's breath, hiss or thud is a little softer and shorter than the blob's, as well as higher, so two are heard as two. */
export const TWIN_NOISE = { peak: 0.8, decay: 0.7 } as const

/** A twin's notes: the same, a third higher, and what is noise in them softer and shorter too. */
const higher = (notes: Note[]): Note[] => notes.map((note) => ({
  ...note,
  frequency: note.frequency * THIRD,
  ...(note.glideTo ? { glideTo: note.glideTo * THIRD } : {}),
  ...(note.kind === 'noise' ? { peak: note.peak * TWIN_NOISE.peak, decay: note.decay * TWIN_NOISE.decay } : {}),
}))

/** The notes of one event of the loop, at a tempo (which only the length of a hum depends on). */
export function notesFor(event: ToyEvent, tempo: number = TEMPO.slowest): Note[] {
  const twin = (notes: Note[], second: boolean) => (second ? higher(notes) : notes)
  switch (event.type) {
    case 'touch':
      // A kick in the air adds a whip of air to the hiss; a tap that changes nothing is a shorter breath of the can.
      if (event.answer === 'kick') return [...hiss(0.08), noise(900, 3, 0.1, 0.01, 0.12, 3600)]
      return hiss(event.answer === 'again' ? 0.05 : 0.09)
    case 'launch':
      // In a pipe: the boing with a hand over it.
      if (event.muffled) return twin([tone(pitchOf(beatOf(event.place)) / 2, 0.1, 0.01, 0.1), noise(300, 1, 0.05, 0.01, 0.06)], event.second)
      return twin(boing(event.place, event.accent), event.second)
    case 'accent':
      return ring(event.place)
    case 'lay':
      // The coil set on the line.
      return [tone(onBeat(event.place) ? 2400 : 3000, 0.04, 0.002, 0.05, 'sine', onBeat(event.place) ? 3200 : 3800)]
    case 'land':
      // On a beat the thump and the footfall fall together as one fat sound; on a half it is a light scuff.
      return twin(onBeat(event.place)
        ? [tone(150, 0.32, 0.004, 0.12, 'sine', 60), noise(400, 0.8, 0.1, 0.003, 0.08), noise(2600, 1.2, 0.07, 0.002, 0.04)]
        : [noise(1700, 0.9, 0.1, 0.006, 0.12, 900), tone(180, 0.12, 0.004, 0.07, 'sine', 110)], event.second)
    case 'step':
      return twin([noise(2600, 1.2, 0.035, 0.002, 0.035), tone(190, 0.035, 0.003, 0.04, 'sine', 150)], event.second)
    case 'meet':
      return twin(CELLS[event.kind][event.way](pitchOf(event.beat), 60 / tempo), event.second)
    case 'after':
      return twin(AFTER[event.what](), event.second)
    case 'release':
      if (event.act === 'grab') return [tone(520, 0.04, 0.003, 0.04, 'square'), noise(3000, 2, 0.035, 0.003, 0.04)]
      if (event.act === 'clink') return [tone(1900, 0.1, 0.002, 0.18), tone(2850, 0.05, 0.002, 0.12)]
      if (event.act === 'tock') return [tone(320, 0.14, 0.003, 0.07, 'triangle', 240), noise(900, 1, 0.06, 0.002, 0.03)]
      return [noise(1400, 2, 0.2, 0.002, 0.05), tone(210, 0.12, 0.003, 0.08, 'square', 140)]
    case 'pop': {
      // Its own boing a last time, falling away.
      const note = pitchOf(beatOf(event.place)) * (onBeat(event.place) ? 1 : 2)
      return [tone(note, 0.16, 0.004, 0.12, 'triangle', note * 0.7)]
    }
    case 'dial':
      if (event.act === 'knock') return [tone(240, 0.09, 0.003, 0.06, 'triangle', 200)]
      // A ratchet whose click climbs with the tempo.
      return [tone(300 + (event.tempo - TEMPO.slowest) * 5, 0.05, 0.001, 0.03, 'square'), noise(4000, 2, 0.04, 0.001, 0.015)]
    case 'cast':
      if (event.act === 'poke') return POKES[event.who]
      // The pigeon's coo, the pea in the rat's can, the cat's fur going up.
      if (event.act === 'coo') return [tone(420, 0.08, 0.03, 0.2, 'sine', 330), tone(210, 0.05, 0.03, 0.2, 'triangle', 170)]
      if (event.act === 'rattle') return [noise(3000, 6, 0.08, 0.005, 0.14), tone(1500, 0.035, 0.002, 0.03, 'square')]
      return [noise(2200, 0.8, 0.1, 0.02, 0.2, 5000)]
    case 'piece':
      return HAND[event.act]
    case 'lap':
      return LAP_NOTES[event.act]
    default:
      event satisfies never
      return []
  }
}

/** What one frame or one touch set off, as two lists of notes: the loop's own, and those of a scene, which a touch can cut. */
export type Mix = { main: Note[]; scene: Note[] }

/**
 * Everything one frame set off, mixed: the notes of each event one after the other, and, where their peaks would add
 * up past full scale, all of them turned down together by the same share, so nothing clips and nothing is dropped.
 */
export function mixOf(events: readonly ToyEvent[], tempo: number = TEMPO.slowest): Mix {
  const mix: Mix = { main: [], scene: [] }
  let sum = 0
  for (const event of events) {
    const notes = notesFor(event, tempo)
    for (const note of notes) sum += note.peak
    ;(ofScene(event) ? mix.scene : mix.main).push(...notes)
  }
  const over = (sum * MASTER) / FULL_SCALE
  if (over <= 1) return mix
  const down = (notes: Note[]) => notes.map((note) => ({ ...note, peak: note.peak / over }))
  return { main: down(mix.main), scene: down(mix.scene) }
}
