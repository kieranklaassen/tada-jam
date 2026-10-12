import type { Note } from './audio'
import { BLUE, GREEN, RED, WHITE, YELLOW, type Colour } from './board'

// Every sound of the toy, kept as plain numbers. Nobody on the machine that
// wrote them could hear them, so a test holds each pitch, peak and length in
// range, and the words they were written from are in the design sheet.
//
// Sight and sound run on one clock: no note here carries a delay. A sound
// that comes later than the touch (an echo's click, a peg landing in its
// well, the white peg's bell) is its own cue, and the toy gives it on the
// frame in which the thing is seen to happen.

export const CUE_NAMES = [
  'click', 'bell', 'knock', 'hop', 'pull', 'land',
  'well', 'button', 'grip', 'lever', 'beam', 'rattle', 'clunk', 'drop',
  'pat', 'squeak', 'tink', 'mothTaste', 'flutter', 'leaf',
  'boing', 'twang', 'drum', 'spiderTaste', 'baton',
  'chirp', 'slip', 'geckoTaste', 'catch', 'flick',
  'thump', 'pluck', 'trap',
] as const
export type CueName = (typeof CUE_NAMES)[number]

/**
 * One sound the game asks for. `colour` is the peg's, `steps` the steps of the scale it sounds, `n` a count
 * within the cue. Many pegs of one colour that click, ring or land in one frame are one cue with several steps:
 * one sound event a frame a colour, never a pile of the same sound. `scene` marks a sound that belongs to a
 * scene being watched: it goes through the scene's own gain, which a touch that ends the scene shuts.
 */
export type Cue = { name: CueName; colour?: Colour; steps?: number[]; n?: number; scene?: boolean }

/** No more voices than this sound for one cue, however many pegs it stands for: the lowest, the highest and the ones between. */
export const MOST_VOICES = 3

/** The steps a cue is heard at: at most `MOST_VOICES` of them, spread from its lowest to its highest. */
export function heardSteps(steps: readonly number[] | undefined): number[] {
  const all = [...new Set(steps ?? [0])].sort((a, b) => a - b)
  if (all.length <= MOST_VOICES) return all
  return Array.from({ length: MOST_VOICES }, (_, i) => all[Math.round((i * (all.length - 1)) / (MOST_VOICES - 1))])
}

/** A pentatonic scale from middle C: whatever is tapped, in whatever order, sits well together. */
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5] as const

export function pitchOf(step: number): number {
  return SCALE[Math.max(0, Math.min(SCALE.length - 1, Math.round(step)))]
}

const tone = (frequency: number, peak: number, attack: number, decay: number, wave: OscillatorType = 'sine', glideTo?: number): Note => ({ kind: 'tone', frequency, peak, attack, decay, wave, ...(glideTo ? { glideTo } : {}) })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })

/** The click of a peg going in, the same for every colour. */
const CLICK: readonly Note[] = [hiss(3200, 1.2, 0.09, 0.001, 0.03), tone(900, 0.07, 0.001, 0.035, 'triangle', 420)]

/** Each colour's own voice at a pitch: red a round thump, blue a long soft note, yellow two notes a hair apart, green a note that slides up, white a bell. */
function voice(colour: Colour, f: number, down = false): Note[] {
  switch (colour) {
    case RED: return [tone(f / 2, 0.24, 0.002, 0.16, 'triangle', down ? f / 4 : f / 2.6), tone(f, 0.08, 0.002, 0.1)]
    // Pulled out, blue is a soft hum that fades where it is: no slide, unlike its long falling note when knocked.
    case BLUE: return down ? [tone(f / 2, 0.1, 0.06, 0.55), tone(f / 2 * 1.01, 0.05, 0.06, 0.55)] : [tone(f, 0.15, 0.012, 0.9), tone(f * 2, 0.035, 0.012, 0.5)]
    case YELLOW: return [tone(f, 0.11, 0.003, 0.28, 'triangle', down ? f * 0.7 : undefined), tone(f * 1.03, 0.11, 0.003, 0.28, 'triangle', down ? f * 0.72 : undefined)]
    case GREEN: return [tone(down ? f * 1.26 : f, 0.16, 0.004, 0.24, 'sine', down ? f * 0.8 : f * 1.26)]
    case WHITE: return [tone(f * 2, 0.13, 0.002, 0.7, 'sine', down ? f * 1.4 : undefined), tone(f * 5.4, 0.03, 0.002, 0.3)]
  }
}

/** A peg knocked out by another: red a drum bonk, blue a long falling note, yellow a double pop, green a boing, white a ting. */
function knock(colour: Colour): Note[] {
  switch (colour) {
    case RED: return [tone(180, 0.28, 0.002, 0.14, 'sine', 90), hiss(400, 1, 0.1, 0.001, 0.05)]
    case BLUE: return [tone(520, 0.13, 0.02, 1.1, 'sine', 196)]
    case YELLOW: return [tone(700, 0.12, 0.001, 0.06, 'triangle', 1000), tone(1050, 0.1, 0.001, 0.07, 'triangle', 1400)]
    case GREEN: return [tone(300, 0.18, 0.003, 0.16, 'sine', 600)]
    case WHITE: return [tone(2093, 0.11, 0.002, 0.5)]
  }
}

/** What a peg sounds when the beam meets it: red a tom, blue a long note that rings on, yellow two notes a fifth apart, green a springy note that slides up, white a bell. */
function beam(colour: Colour, f: number): Note[] {
  switch (colour) {
    case RED: return [tone(f / 2.4, 0.26, 0.002, 0.2, 'sine', f / 3.6), hiss(f, 2.5, 0.07, 0.001, 0.04)]
    case BLUE: return [tone(f, 0.13, 0.02, 1.25), tone(f * 1.5, 0.03, 0.02, 0.9)]
    case YELLOW: return [tone(f, 0.1, 0.003, 0.3, 'triangle'), tone(f * 1.5, 0.1, 0.003, 0.3, 'triangle')]
    case GREEN: return [tone(f * 0.75, 0.16, 0.004, 0.2, 'sine', f * 1.5), tone(f * 1.5, 0.05, 0.05, 0.12)]
    case WHITE: return [tone(f * 2, 0.12, 0.002, 0.6), tone(f * 4.02, 0.035, 0.002, 0.35)]
  }
}

/** A peg the tray handle dropped, landing: red a thud, blue a sigh, yellow a tick, green a small clack after its boing, white a ting. */
function drop(colour: Colour): Note[] {
  switch (colour) {
    case RED: return [tone(95, 0.26, 0.002, 0.16, 'sine', 60), hiss(300, 1, 0.08, 0.001, 0.05)]
    case BLUE: return [hiss(700, 0.6, 0.06, 0.06, 0.4, 350)]
    case YELLOW: return [tone(1900, 0.08, 0.001, 0.03, 'triangle'), hiss(4000, 3, 0.05, 0.001, 0.02)]
    case GREEN: return [hiss(1600, 2, 0.06, 0.001, 0.04), tone(350, 0.08, 0.002, 0.06)]
    case WHITE: return [tone(2349, 0.1, 0.002, 0.45), tone(3520, 0.03, 0.002, 0.2)]
  }
}

/** A peg landing in its well, each colour with its own knock. */
function land(colour: Colour): Note[] {
  switch (colour) {
    case RED: return [hiss(1400, 2, 0.09, 0.001, 0.05), tone(150, 0.18, 0.002, 0.09)]
    case BLUE: return [hiss(900, 0.8, 0.05, 0.004, 0.09)]
    case YELLOW: return [hiss(1800, 2, 0.07, 0.001, 0.04), tone(420, 0.09, 0.002, 0.06)]
    case GREEN: return [hiss(1800, 2, 0.07, 0.001, 0.04), tone(330, 0.1, 0.002, 0.07, 'sine', 400)]
    case WHITE: return [hiss(2600, 3, 0.08, 0.001, 0.04), tone(1200, 0.08, 0.002, 0.08)]
  }
}

/** What each watcher is heard to do at a new peg of each colour (the design sheet, "The characters"). */
const MOTH_TASTE: Record<Colour, readonly Note[]> = {
  [RED]: [hiss(800, 1, 0.04, 0.02, 0.2)],
  [BLUE]: [tone(600, 0.04, 0.01, 0.3, 'sine', 400)],
  [YELLOW]: [hiss(1200, 2, 0.05, 0.01, 0.25, 2400)],
  [GREEN]: [tone(1000, 0.06, 0.001, 0.04)],
  [WHITE]: [hiss(1600, 3, 0.05, 0.01, 0.4, 3200)],
}
const SPIDER_TASTE: Record<Colour, readonly Note[]> = {
  [RED]: [tone(98, 0.1, 0.004, 0.1)],
  [BLUE]: [tone(196, 0.07, 0.1, 0.9)],
  [YELLOW]: [tone(400, 0.06, 0.01, 0.3), tone(470, 0.06, 0.01, 0.3)],
  [GREEN]: [tone(300, 0.1, 0.003, 0.15, 'sine', 500)],
  [WHITE]: [tone(1200, 0.07, 0.004, 0.1, 'sine', 1500)],
}
const GECKO_TASTE: Record<Colour, readonly Note[]> = {
  [RED]: [tone(90, 0.12, 0.05, 0.5)],
  [BLUE]: [hiss(600, 4, 0.05, 0.01, 0.25)],
  [YELLOW]: [hiss(1500, 2, 0.06, 0.005, 0.12, 3000)],
  [GREEN]: [hiss(2000, 1.5, 0.05, 0.004, 0.08)],
  [WHITE]: [tone(1700, 0.08, 0.002, 0.07, 'triangle', 2300)],
}

/** The voices of a cue with several steps: one a step heard, each quieter the more there are, so the cue is as loud as one. */
function spread(steps: readonly number[] | undefined, raise: number, each: (frequency: number) => Note[]): Note[] {
  const heard = heardSteps(steps)
  // A little less than an equal share of the power, since notes that start together can peak together.
  const share = heard.length ** -0.75
  return heard.flatMap((step) => each(pitchOf(step + raise)).map((note) => ({ ...note, peak: note.peak * share })))
}

/** The notes of one cue, all starting together. */
export function notesOf(cue: Cue): Note[] {
  const colour = cue.colour ?? RED, n = cue.n ?? 0
  switch (cue.name) {
    // Pegs going in: one click, and the colour's voice at each row's pitch. White's light comes a breath later, with `bell`.
    case 'click': return colour === WHITE ? [...CLICK] : [...CLICK, ...spread(cue.steps, 0, (f) => voice(colour, f))]
    case 'bell': return spread(cue.steps, 0, (f) => voice(WHITE, f))
    case 'knock': return knock(colour)
    case 'hop': return [tone(300 + n * 60, 0.14, 0.003, 0.12, 'sine', 560 + n * 60)]
    case 'pull': return [tone(380, 0.06, 0.001, 0.05, 'triangle', 760), ...spread(cue.steps, 0, (f) => voice(colour, f, true))]
    case 'land': return land(colour)
    case 'well': return [hiss(2400, 0.8, 0.07, 0.002, 0.09), tone(pitchOf(4 + colour), 0.1, 0.002, 0.12, 'triangle')]
    // The three keys, each one sound of its own kind and none a step up from the last: a wooden knock for no
    // mirror, a glass chime of two notes an octave apart for two ways, a soft rush of air for four ways.
    case 'button':
      if (n === 1) return [tone(880, 0.11, 0.002, 0.4), tone(1760, 0.05, 0.002, 0.25)]
      if (n === 2) return [hiss(700, 0.9, 0.11, 0.03, 0.3, 2600), hiss(1500, 2.5, 0.05, 0.05, 0.22, 3400)]
      return [tone(210, 0.2, 0.002, 0.08, 'triangle', 110), hiss(900, 0.7, 0.09, 0.001, 0.04)]
    // A finger takes hold of the lever's knob: a small dry creak, nothing like its clunk.
    case 'grip': return [hiss(2100, 3, 0.05, 0.004, 0.05), tone(340, 0.04, 0.004, 0.05, 'triangle')]
    // The lever: a heavy clunk going down and a lighter one coming up.
    case 'lever': return n === 1 ? [tone(130, 0.24, 0.002, 0.14, 'triangle', 70), hiss(500, 1, 0.1, 0.001, 0.06)] : [tone(160, 0.14, 0.002, 0.08, 'triangle', 240), hiss(1200, 1, 0.06, 0.001, 0.04)]
    // The beam meets pegs of one colour. A half beam (`n` of 1) sounds them at half the strength.
    case 'beam': return spread(cue.steps, 0, (f) => beam(colour, f)).map((note) => (n === 1 ? { ...note, peak: note.peak * 0.5 } : note))
    case 'rattle': return [hiss(1700, 1.5, 0.08, 0.002, 0.07), hiss(2600, 2, 0.06, 0.03, 0.08), tone(260, 0.07, 0.002, 0.05)]
    case 'clunk': return [tone(70, 0.28, 0.003, 0.25, 'sine', 45), hiss(600, 0.8, 0.12, 0.001, 0.09)]
    case 'drop': return drop(colour)
    case 'pat': return [tone(1400, 0.05, 0.001, 0.03)]
    case 'squeak': return [tone(900, 0.09, 0.004, 0.14, 'sine', 1700)]
    case 'tink': return [tone(2637, 0.08, 0.001, 0.22), tone(3951, 0.03, 0.001, 0.1)]
    case 'mothTaste': return [...MOTH_TASTE[colour]]
    // The moth catching a flash: a dry flutter. Spun down by the falling pegs: a long one.
    case 'flutter': return [hiss(2200, 5, 0.05, 0.004, 0.06), hiss(2900, 5, 0.03, 0.03, 0.05)]
    case 'leaf': return [hiss(1900, 4, 0.05, 0.05, 0.9, 900), hiss(2600, 6, 0.025, 0.08, 0.7)]
    case 'boing': return [tone(240, 0.2, 0.004, 0.32, 'sine', 110)]
    case 'twang': return [tone(147, 0.16, 0.002, 0.4, 'triangle'), tone(294, 0.06, 0.002, 0.25, 'triangle')]
    case 'drum': return [hiss(220 + n * 40, 3, 0.14, 0.001, 0.07), tone(110 + n * 30, 0.13, 0.002, 0.09)]
    case 'spiderTaste': return [...SPIDER_TASTE[colour]]
    // The spider conducting: a small dry tap of a foot, the second of a pair a little higher.
    case 'baton': return [tone(520 + n * 90, 0.05, 0.001, 0.035, 'triangle')]
    case 'chirp': return [tone(1500 + n * 200, 0.1, 0.002, 0.06, 'triangle', 2100 + n * 100)]
    case 'slip': return [tone(700, 0.1, 0.01, 0.3, 'sine', 300)]
    case 'geckoTaste': return [...GECKO_TASTE[colour]]
    // The gecko catching a peg on its nose, and flicking it off.
    case 'catch': return [tone(480, 0.12, 0.002, 0.07, 'sine', 360), hiss(1300, 2, 0.05, 0.001, 0.03)]
    case 'flick': return [tone(620, 0.12, 0.002, 0.09, 'sine', 1240), hiss(2400, 2, 0.05, 0.001, 0.03)]
    case 'thump': return [tone(80, 0.3, 0.003, 0.2, 'sine', 50)]
    // A touch on nothing plucks the nearest cable, lower on the left and higher on the right.
    case 'pluck': return [tone(110 + n * 22, 0.12, 0.002, 0.5, 'triangle'), hiss(3000, 2, 0.04, 0.001, 0.02)]
    // The beam is trapped: the cabinet hums up a fifth and holds it.
    case 'trap': return [tone(196, 0.1, 0.08, 0.9, 'sine', 294), tone(392, 0.04, 0.08, 0.7, 'sine', 588)]
  }
}
