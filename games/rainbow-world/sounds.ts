import type { Note } from './audio'
import { PIECES, type PieceId } from './pieces'

// Every sound of the game as plain numbers. Nobody has listened to them: they are written from the design
// sheet's words, kept short, and held in range by a test.
//
// One clock: a sound is one moment. No note here starts later than its voice does (no `delay`), so nothing is
// timed on the audio clock. A horse's second hoof, the knocks of a rocking arch and the pats of the silk are
// each a sound of their own that the world asks for at its own moment, the moment the picture shows it.

export type SoundName =
  | 'pick' // a thing lifts: its own note, short and an octave up
  | 'knock' // a thing knocks down on the mat: its own note with a wooden knock under it
  | 'tok' // a thing is set back down or comes back to its place: its note, soft and dry
  | 'clop' // one pair of the horse's hooves
  | 'snort' // the horse blows after it has landed
  | 'sigh' // the silk lets go and sinks
  | 'bell' // the silk has landed
  | 'touch' // a finger on a thing that is already in hand, or a thing sent off
  | 'rock' // one knock of an arch rocking on its back
  | 'chirp' // a doll hops round
  | 'whinny' // the horse rears
  | 'pat' // one pat of the silk gathering or opening
  | 'thump' // the bare mat as a paper drum
  | 'tink' // a finger on the window pane
  | 'creak' // the basket, and a horse rocking in a cradle
  | 'mew' // the cat
  // The pairs.
  | 'clack' // two arches nest: both bars at once
  | 'tick' // a lid teeters: one arch's note, dry
  | 'bonk' // an arch drops over a doll
  | 'squeak' // a doll's small squeak: under a collar, ducking, in the basket
  | 'rattle' // one dry knock of an arch shaken round the horse's neck
  | 'hum' // the silk over a standing arch: one low held tone
  | 'humfall' // the silk in a cradle: a hum that slides down and stops
  | 'whistle' // a doll slides down an arch: a tone that falls all the way
  | 'bump' // and lands at the bottom
  | 'step' // one small step of a doll, on its own note
  | 'lull' // one of the two slow notes of a cradle swaying
  | 'breath' // a sleeping doll breathes out
  | 'chord' // a doll lands on a doll: both notes
  | 'trill' // one note of the tower's trill
  | 'hic' // a rider's hiccup at a bounce
  | 'hollow' // a hoof inside the tunnel
  | 'skid' // the horse slides on its bottom
  | 'blow' // its long snort at the tunnel's mouth
  | 'neigh' // the rocking horse neighs upward
  | 'nicker' // the horse, pleased
  | 'puff' // a doll under the horse, at each staggering step
  | 'hoot' // one waver of the ghost's soft tone
  | 'giggle' // one note of a doll's giggle, when it has scampered off
  | 'thud' // a muffled hoof of the ghost horse
  | 'soft' // it bumps softly into the edge of the mat
  | 'wicker' // a thing drops into the basket; the basket tips
  | 'pop' // a thing hops out of the basket
  | 'call' // a doll calls into the basket
  | 'echo' // and the note comes back
  | 'glee' // the small doll, inside something
  | 'grumble' // the round doll, lifted while asleep

export type Sound = {
  name: SoundName
  /** Whose sound it is, where the sound is a thing's own. */
  piece?: PieceId
  /** The other thing of a pair, where two notes sound together. */
  other?: PieceId
  /** Which one of a run this is (a trill, a hoot, a lullaby): even and odd differ in pitch. */
  step?: number
  /** 0 to 1: how hard it landed, how far it fell, how wide the rock still is. */
  gain: number
  /** A beat of a scene asked for it: it plays through the scene's own gain, which a touch shuts (sceneSound.ts). */
  scene?: boolean
}

const wood = (peak: number, frequency = 1900): Note => ({ kind: 'noise', frequency, q: 2.4, peak, attack: 0.002, decay: 0.035 })

/** The notes of one sound. */
export function notesFor(sound: Sound): Note[] {
  const g = Math.max(0.15, Math.min(1, sound.gain))
  const note = sound.piece ? PIECES[sound.piece].note : 440
  const other = sound.other ? PIECES[sound.other].note : note * 1.5, odd = (sound.step ?? 0) % 2 === 1
  switch (sound.name) {
    case 'pick':
      return [{ kind: 'tone', frequency: note * 2, wave: 'triangle', peak: 0.12 * g, attack: 0.004, decay: 0.14 }]
    case 'knock':
      return [
        { kind: 'tone', frequency: note, wave: 'sine', peak: 0.3 * g, attack: 0.003, decay: 0.55 },
        { kind: 'tone', frequency: note * 4, wave: 'sine', peak: 0.07 * g, attack: 0.002, decay: 0.12 },
        wood(0.16 * g),
      ]
    case 'tok':
      return [{ kind: 'tone', frequency: note, wave: 'sine', peak: 0.11 * g, attack: 0.003, decay: 0.12 }, wood(0.06 * g, 1400)]
    case 'clop':
      return [{ kind: 'tone', frequency: note, wave: 'triangle', peak: 0.16 * g, attack: 0.002, decay: 0.07, glideTo: note * 0.72 }, wood(0.2 * g, 1100)]
    case 'snort':
      return [{ kind: 'noise', frequency: 520, q: 1.4, peak: 0.1 * g, attack: 0.02, decay: 0.16, glideTo: 260 }]
    case 'sigh':
      return [{ kind: 'noise', frequency: 2400, q: 0.8, peak: 0.07 * g, attack: 0.12, decay: 0.7, glideTo: 500 }]
    case 'bell':
      return [
        { kind: 'tone', frequency: note, wave: 'sine', peak: 0.08 * g, attack: 0.01, decay: 0.9 },
        { kind: 'tone', frequency: note * 1.5, wave: 'sine', peak: 0.025 * g, attack: 0.01, decay: 0.5 },
      ]
    case 'touch':
      return [wood(0.09 * g, 2600)]
    case 'rock':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'sine', peak: 0.2 * g, attack: 0.004, decay: 0.16 }, wood(0.12 * g, 800)]
    case 'chirp':
      return [{ kind: 'tone', frequency: note, wave: 'triangle', peak: 0.13 * g, attack: 0.01, decay: 0.16, glideTo: note * 1.5 }]
    case 'whinny':
      return [{ kind: 'tone', frequency: 1240, wave: 'sawtooth', peak: 0.07 * g, attack: 0.03, decay: 0.42, glideTo: 520 }]
    case 'pat':
      return [{ kind: 'noise', frequency: 3200, q: 1.2, peak: 0.07 * g, attack: 0.004, decay: 0.06 }]
    case 'thump':
      return [
        { kind: 'tone', frequency: 132, wave: 'sine', peak: 0.3 * g, attack: 0.004, decay: 0.22, glideTo: 88 },
        { kind: 'noise', frequency: 4200, q: 0.7, peak: 0.05 * g, attack: 0.002, decay: 0.09 },
      ]
    case 'tink':
      return [{ kind: 'tone', frequency: 2093, wave: 'sine', peak: 0.07 * g, attack: 0.002, decay: 0.18 }]
    case 'creak':
      return [{ kind: 'noise', frequency: 320, q: 9, peak: 0.16 * g, attack: 0.03, decay: 0.2, glideTo: 560 }]
    case 'mew':
      return [{ kind: 'tone', frequency: 640, wave: 'triangle', peak: 0.1 * g, attack: 0.05, decay: 0.3, glideTo: 980 }]
    case 'clack':
      return [
        { kind: 'tone', frequency: note, wave: 'sine', peak: 0.2 * g, attack: 0.003, decay: 0.3 },
        { kind: 'tone', frequency: other, wave: 'sine', peak: 0.2 * g, attack: 0.003, decay: 0.3 },
        wood(0.18 * g, 2300),
      ]
    case 'tick':
      return [{ kind: 'tone', frequency: note * 2, wave: 'sine', peak: 0.14 * g, attack: 0.002, decay: 0.07 }, wood(0.08 * g, 3000)]
    case 'bonk':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'triangle', peak: 0.26 * g, attack: 0.004, decay: 0.2, glideTo: note * 0.4 }, wood(0.1 * g, 500)]
    case 'squeak':
      return [{ kind: 'tone', frequency: note * 2, wave: 'sine', peak: 0.07 * g, attack: 0.015, decay: 0.11, glideTo: note * 2.6 }]
    case 'rattle':
      return [wood(0.17 * g, 2800), { kind: 'tone', frequency: note * 3, wave: 'sine', peak: 0.04 * g, attack: 0.002, decay: 0.03 }]
    case 'hum':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'sine', peak: 0.16 * g, attack: 0.16, decay: 0.8 }]
    case 'humfall':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'sine', peak: 0.16 * g, attack: 0.08, decay: 0.6, glideTo: Math.max(80, note * 0.26) }]
    case 'whistle':
      return [{ kind: 'tone', frequency: note * 3, wave: 'sine', peak: 0.09 * g, attack: 0.04, decay: 0.8, glideTo: note * 0.75 }]
    case 'bump':
      return [{ kind: 'tone', frequency: 150, wave: 'sine', peak: 0.26 * g, attack: 0.003, decay: 0.14, glideTo: 96 }, wood(0.1 * g, 900)]
    case 'step':
      return [{ kind: 'tone', frequency: note * (odd ? 1.12 : 1), wave: 'sine', peak: 0.07 * g, attack: 0.002, decay: 0.05 }, wood(0.05 * g, 2200)]
    case 'lull':
      return [{ kind: 'tone', frequency: note * (odd ? 0.75 : 1), wave: 'sine', peak: 0.13 * g, attack: 0.06, decay: 0.6 }]
    case 'breath':
      return [{ kind: 'noise', frequency: 1500, q: 0.7, peak: 0.045 * g, attack: 0.2, decay: 0.5, glideTo: 700 }]
    case 'chord':
      return [
        { kind: 'tone', frequency: note, wave: 'sine', peak: 0.2 * g, attack: 0.003, decay: 0.5 },
        { kind: 'tone', frequency: other, wave: 'sine', peak: 0.2 * g, attack: 0.003, decay: 0.5 },
        wood(0.12 * g),
      ]
    case 'trill':
      return [{ kind: 'tone', frequency: odd ? other : note, wave: 'triangle', peak: 0.1 * g, attack: 0.004, decay: 0.09 }]
    case 'hic':
      return [{ kind: 'tone', frequency: note, wave: 'triangle', peak: 0.1 * g, attack: 0.004, decay: 0.06, glideTo: note * 1.3 }]
    case 'hollow':
      return [{ kind: 'tone', frequency: 196, wave: 'sine', peak: 0.22 * g, attack: 0.003, decay: 0.22, glideTo: 170 }, wood(0.12 * g, 600)]
    case 'skid':
      return [{ kind: 'noise', frequency: 1300, q: 3, peak: 0.12 * g, attack: 0.02, decay: 0.34, glideTo: 500 }]
    case 'blow':
      return [{ kind: 'noise', frequency: 600, q: 1.2, peak: 0.12 * g, attack: 0.05, decay: 0.6, glideTo: 220 }]
    case 'neigh':
      return [{ kind: 'tone', frequency: 520, wave: 'sawtooth', peak: 0.07 * g, attack: 0.04, decay: 0.4, glideTo: 1320 }]
    case 'nicker':
      return [{ kind: 'tone', frequency: 700, wave: 'sawtooth', peak: 0.05 * g, attack: 0.02, decay: 0.16, glideTo: 880 }]
    case 'puff':
      return [{ kind: 'tone', frequency: Math.max(80, note * 0.25), wave: 'triangle', peak: 0.16 * g, attack: 0.02, decay: 0.16 }, { kind: 'noise', frequency: 900, q: 0.8, peak: 0.04 * g, attack: 0.03, decay: 0.12 }]
    case 'hoot':
      // Soft and round, like breath across a bottle: low, slow to come and quiet, with one small waver.
      return [{ kind: 'tone', frequency: odd ? 415 : 392, wave: 'sine', peak: 0.055 * g, attack: 0.14, decay: 0.34, glideTo: odd ? 392 : 415 }]
    case 'giggle':
      return [{ kind: 'tone', frequency: note * 2 * [1, 1.19, 1.5][(sound.step ?? 0) % 3], wave: 'triangle', peak: 0.06 * g, attack: 0.005, decay: 0.07, glideTo: note * 2.2 * [1, 1.19, 1.5][(sound.step ?? 0) % 3] }]
    case 'thud':
      return [{ kind: 'tone', frequency: 110, wave: 'sine', peak: 0.2 * g, attack: 0.006, decay: 0.1, glideTo: 84 }]
    case 'soft':
      return [{ kind: 'tone', frequency: 180, wave: 'sine', peak: 0.12 * g, attack: 0.01, decay: 0.16, glideTo: 130 }]
    case 'wicker':
      return [{ kind: 'noise', frequency: 420, q: 4, peak: 0.2 * g, attack: 0.004, decay: 0.12 }, { kind: 'tone', frequency: 120, wave: 'sine', peak: 0.2 * g, attack: 0.004, decay: 0.14, glideTo: 92 }]
    case 'pop':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'sine', peak: 0.18 * g, attack: 0.002, decay: 0.07, glideTo: note * 1.5 }]
    case 'call':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'triangle', peak: 0.16 * g, attack: 0.03, decay: 0.36 }, { kind: 'noise', frequency: 380, q: 6, peak: 0.05 * g, attack: 0.03, decay: 0.3 }]
    case 'echo':
      return [{ kind: 'tone', frequency: note * 0.5, wave: 'sine', peak: 0.06 * g, attack: 0.08, decay: 0.5 }]
    case 'glee':
      return [{ kind: 'tone', frequency: note * 2, wave: 'triangle', peak: 0.09 * g, attack: 0.01, decay: 0.18, glideTo: note * 3.2 }]
    case 'grumble':
      return [{ kind: 'tone', frequency: 130, wave: 'sawtooth', peak: 0.08 * g, attack: 0.03, decay: 0.24, glideTo: 96 }, { kind: 'noise', frequency: 500, q: 1.4, peak: 0.06 * g, attack: 0.02, decay: 0.14 }]
  }
}

export const SOUND_NAMES: readonly SoundName[] = [
  'pick', 'knock', 'tok', 'clop', 'snort', 'sigh', 'bell', 'touch', 'rock', 'chirp', 'whinny', 'pat', 'thump', 'tink', 'creak', 'mew',
  'clack', 'tick', 'bonk', 'squeak', 'rattle', 'hum', 'humfall', 'whistle', 'bump', 'step', 'lull', 'breath', 'chord', 'trill', 'hic', 'hollow',
  'skid', 'blow', 'neigh', 'nicker', 'puff', 'hoot', 'giggle', 'thud', 'soft', 'wicker', 'pop', 'call', 'echo', 'glee', 'grumble',
]

/** Everything one moment sets off, as the notes of one voice: a touch is one voice, so the unlock holds all of it (audio.ts). */
export function notesOf(sounds: readonly Sound[]): Note[] {
  return sounds.flatMap(notesFor)
}
