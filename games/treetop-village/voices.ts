import type { Note } from './audio'
import type { Bus } from './bus'
import { WOOD, bell, chirp, creak, each, hiss, hoot, hum, knock, later, paper, squeak, thump, tick, tone } from './notes'
import { LANDINGS, PLACES, type Folk } from './tree'
import type { Cue } from './village'
import type { Kind } from './ways'

// What is heard. Everything a walker does on a piece, in a bucket or on the
// spot brings its own notes with it from scripts.ts, each on a cue when the
// script's own time reaches it, so this file only names the sounds of the
// child's own touches and of the scenes: one cue, one short list of notes.
// Everything one moment sets off is played as one voice. Nobody has heard
// any of it.

/** A place's own pitch: low in the tree is low. */
export function placePitch(place: number): number {
  const { pa, pb } = PLACES[place]
  const height = (LANDINGS[0].y - (pa.y + pb.y) / 2) / (LANDINGS[0].y - 290)
  return 170 + 260 * Math.max(0, Math.min(1, height))
}

/** A piece tapped where it hangs: each answers as itself, for as long as it is seen to move. */
function pieceTap(kind: Kind): Note[] {
  switch (kind) {
    // A plank twangs.
    case 'plank': return [tone(196, 0.2, 0.004, 0.42, 0, 186), tone(392, 0.08, 0.004, 0.3, 0, 380, 'sine')]
    // A ladder rattles down its rungs.
    case 'ladder': return each(5, 0.35, (rung) => knock(523 / 1.122 ** rung, 0.13))
    // A rope bridge ripples from one end to the other.
    case 'bridge': return each(6, 0.3, (slat) => tone(260 + slat * 28, 0.1, 0.003, 0.07))
    case 'bucket': return []
    // A swing swings: two slow creaks.
    case 'swing': return [creak(210, 176, 0.22, 0.07), creak(176, 208, 0.22, 0.06, 0.3)]
    // The lanterns chime.
    case 'lanterns': return [...bell(1319, 0.1, 0, 0.5), ...bell(1568, 0.1, 0.09, 0.5), ...bell(1976, 0.1, 0.18, 0.5)]
    // An acorn rattles down the slide.
    case 'slide': return [0, 1, 2, 3, 4, 5].map((bump) => hiss(1500 - bump * 150, 5, 0.12, 0.002, 0.04, bump * 0.06 + bump * bump * 0.006))
  }
}

/** A piece coming off its pegs in the shake: each kind its own knock. */
function comeOff(kind: Kind): Note[] {
  switch (kind) {
    case 'plank': return [...knock(WOOD.plank, 0.18), paper(0.03)]
    case 'ladder': return [...knock(WOOD.ladder, 0.14), ...knock(WOOD.ladder * 0.89, 0.12, 0.06)]
    case 'bridge': return each(3, 0.12, (slat) => tick(900 + slat * 160, 0.09))
    case 'bucket': return [...thump(180, 0.16), tone(880, 0.06, 0.02, 0.07, 0.03, 1040, 'sine')]
    case 'swing': return [creak(220, 150, 0.16, 0.08), ...knock(WOOD.swing, 0.12, 0.08)]
    case 'lanterns': return [...bell(1568, 0.08, 0, 0.2), ...bell(1319, 0.08, 0.07, 0.2)]
    case 'slide': return [hiss(700, 1.2, 0.12, 0.004, 0.16, 0, 420), ...thump(150, 0.1, 0.05)]
  }
}

/** A walker looking out of its door again after the shake. */
function peek(folk: Folk): Note[] {
  switch (folk) {
    case 'squirrel': return [chirp(1500, 0, 1900)]
    case 'owl': return hoot(294, 0.25, 0, 330, 0.1)
    case 'mice': return [squeak(false, 0, 1.3), squeak(true, 0.09, 1.3)]
    case 'beetle': return hum(139, 0.25, 0, 165, 0.12)
  }
}

/** The notes of one cue. A cue that brings its notes with it plays those, and a cue the toy does not know is silent. */
export function notesOf(cue: Cue): readonly Note[] {
  if (cue.notes) return cue.notes
  const [what, a] = cue.id.split(':')
  const place = cue.n ?? 0
  switch (what) {
    // A papery flick and a knock of wood, as the piece jumps to the finger.
    case 'lift': return [paper(), ...knock(WOOD[a as Kind] * 1.2, 0.14, 0.02)]
    // The snap: a wooden knock at the place's own pitch, the unfolding, and the leaf cards shaking.
    case 'snap': return [...knock(placePitch(place), 0.26), tone(placePitch(place) * 1.5, 0.1, 0.003, 0.16, 0.07), paper(0.04, 0.09), hiss(5200, 0.7, 0.05, 0.03, 0.4, 0.1)]
    case 'flutter': return [0, 1, 2].map((flap) => hiss(2600 - flap * 300, 0.9, 0.06, 0.03, 0.1, flap * 0.24, 1500))
    case 'pat': return [tone(150, 0.16, 0.004, 0.14, 0, 96, 'sine'), paper(0.01, 0.05)]
    case 'pop': return [tone(480, 0.14, 0.003, 0.08, 0, 900, 'sine'), paper(0.02)]
    case 'held': return [0, 1, 2].map((rattle) => hiss(1800, 3, 0.09, 0.002, 0.04, rattle * 0.07))
    // A finger on a piece in the tree: one knock of its own wood. A tap then gets the piece's own answer.
    case 'touch': return knock(WOOD[a as Kind], 0.12)
    case 'tap': return pieceTap(a as Kind)
    case 'arrive': return [...thump(160, 0.16), ...knock(262, 0.08, 0.03)]
    case 'knock': return [...knock(placePitch(place) * 1.6, 0.16), ...knock(placePitch(place) * 1.6, 0.1, 0.09)]
    case 'grab': return [hiss(4200, 0.6, 0.05, 0.01, 0.12)]
    case 'rustle': return [hiss(4600, 0.6, 0.08, 0.02, 0.4), hiss(3000, 0.8, 0.05, 0.05, 0.3, 0.1)]
    case 'acorn': return [tone(700, 0.1, 0.002, 0.05, 0, 520)]
    // The sun and the moon on their tab hum when they are touched, the moon lower, and the tab snaps back like card.
    case 'sun': return [tone(300, 0.12, 0.01, 0.3, 0, 430, 'sine'), tone(600, 0.04, 0.01, 0.2, 0.05, 860, 'sine')]
    case 'moon': return [tone(220, 0.12, 0.01, 0.35, 0, 262, 'sine'), tone(440, 0.04, 0.01, 0.25, 0.05, 523, 'sine')]
    case 'spring': return [paper(0, 0.08), tone(240, 0.08, 0.004, 0.12, 0.02, 320, 'sine')]
    case 'page': return [hiss(1200, 2, 0.07, 0.002, 0.05), tone(200, 0.06, 0.003, 0.06, 0, 170, 'sine')]
    // Evening: the sheet slides up with a long soft breath of paper and the day's note falls.
    case 'dusk': return [hiss(1800, 0.5, 0.07, 0.3, 1.2, 0, 700), tone(392, 0.08, 0.2, 1.2, 0, 262, 'sine')]
    // Each string of lanterns lights with its own small bell, the lowest string the lowest.
    case 'light': return bell([784, 880, 988, 1175, 1319, 1480, 1760][place % 7], 0.1, 0, 0.3)
    // Morning: the sheet slides down and the note rises.
    case 'morning': return [hiss(900, 0.5, 0.07, 0.3, 1.0, 0, 2200), tone(262, 0.08, 0.2, 1.0, 0, 392, 'sine')]
    // A window lighting: a soft click of a latch and a warm low note.
    case 'window': return [tone(1200, 0.05, 0.002, 0.03), tone(330, 0.06, 0.03, 0.3, 0.03, undefined, 'sine')]
    // The shake: the whole crown rustling as the tree rocks.
    case 'shake': return [hiss(4400, 0.5, 0.1, 0.05, 0.9), hiss(2600, 0.7, 0.07, 0.1, 0.8, 0.15), creak(110, 86, 0.8, 0.07, 0.1)]
    case 'off': return comeOff(a as Kind)
    case 'peek': return later(peek(a as Folk), 0.05)
    // Tapped again in the middle of its flourish: its own voice once more, at once.
    case 'again': return peek(a as Folk)
    default: return []
  }
}

/** Everything one moment set off, as one list for one voice: all of it, or what goes out on one bus (`null` is what goes straight out). */
export function notesFor(cues: readonly Cue[], bus?: Bus | null): Note[] {
  const mine = bus === undefined ? cues : cues.filter((cue) => (cue.bus ?? null) === bus)
  return mine.flatMap(notesOf).slice(0, 64)
}
