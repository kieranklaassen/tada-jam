import { noise, tone, type Voice } from './audio'
import type { Happening } from './hand'
import type { Cue } from './scenes'
import { TASTES, type CustomerId } from './tastes'
import { CELL_VOICES, OTHER_VOICES, RUB_VOICES, SAID_VOICES, inVoice, pitchForLength, type Said, type VoiceSpec } from './voices'
import type { Salon } from './world'

// What each thing that happens sounds like: a short list of notes, in plain
// numbers, from the voices of voices.ts. A note is a voice and how long after
// the touch it starts. Nobody could hear on the machine this was written on;
// the notes are chosen from the sheet's words and held in range by tests.

export type Note = VoiceSpec & { after?: number }

/** A giggle is different on the nose, an ear and the chin: the same voice, higher or lower. */
const PART_PITCH = { nose: 1.25, ear: 1.5, chin: 0.75, cheek: 1 } as const

/** The most notes one frame may start, so a stroke through the whole mane is a flurry and not a wall. The rest start on the frames after. */
export const MOST_NOTES = 4

/** What a customer says, with the cape off, about its lock, its mane, a bow or what is on its face: its own noise for it. */
export function notesForSaying(who: CustomerId, said: Said): Note[] {
  return SAID_VOICES[who][said].map((note) => ({ ...note }))
}

/** A voice moved onto a customer's own pitch. */
const voiced = (spec: VoiceSpec, who: CustomerId | null): VoiceSpec => (who ? inVoice(spec, TASTES[who].voiceHz) : spec)

/**
 * The notes for one thing that happened. `before` and `after` are the salon
 * on either side of it, for the sounds that depend on what it did.
 */
export function notesFor(happening: Happening, before: Salon, after: Salon): Note[] {
  const owner = (who: 'chair' | 'friend'): CustomerId | null => (who === 'chair' ? after.chair : after.friend)
  switch (happening.kind) {
    case 'scissors': return [OTHER_VOICES.scissors]
    case 'airSnip': return [OTHER_VOICES.airSnip]
    case 'away': return []
    // Nothing to work on yet: a small knock of the finger, and the pair at the door look round.
    case 'looked': return [OTHER_VOICES.caught]
    // A thing that moves the game on gives under the finger with a small sound of its own; what it sets off has its own.
    case 'pressed': return [happening.button === 'door' ? OTHER_VOICES.door : happening.button === 'knot' ? OTHER_VOICES.caught : OTHER_VOICES.hop]
    case 'button': return []
    case 'caught': {
      const { held } = happening
      if (held.object === 'clipping') return [CELL_VOICES['clipping/pull']]
      if (held.object === 'ribbonClip') return [CELL_VOICES['lock/ribbon']]
      // A face that is caught answers in its own voice; hair gives a squeak.
      return [held.object === 'face' ? voiced(OTHER_VOICES.caught, owner(held.who)) : OTHER_VOICES.caught]
    }
    // The friend's lock, let go, snaps back to its own length with its rubbery boing, in the friend's voice.
    case 'letGo': return happening.held.object === 'model' ? [voiced(CELL_VOICES['model/pull'], after.friend)] : happening.held.object === 'lock' || happening.held.object === 'tuft' || happening.held.object === 'ribbon' ? [OTHER_VOICES.letGo] : []
    case 'cell': {
      const base: VoiceSpec = CELL_VOICES[happening.cell.voice]
      const length = happening.rings
      const face = happening.held?.object === 'face' ? happening.held : null
      switch (happening.cell.voice) {
        // The creak of a pull falls as the lock gets longer.
        case 'lock/pull': return [length === null ? base : { ...base, pitch: pitchForLength(length) * 0.7, glideTo: pitchForLength(length) * 0.55 }]
        // A plucked lock is a string: lower the longer it is.
        case 'lock/poke': return [length === null ? base : { ...base, pitch: pitchForLength(length) }]
        // The snip, then the stump twanging up at its new length, and the customer's giggle at it, in its own voice.
        case 'lock/snip': return [base, { kind: 'tone', wave: 'triangle', pitch: pitchForLength(length ?? 50), glideTo: pitchForLength(length ?? 50) * 1.2, peak: 0.1, attack: 0.002, length: 0.22, after: 0.07 }, { ...voiced(CELL_VOICES['face/poke'], after.chair), peak: 0.07, after: 0.22 }]
        // The friend's lock stretches with a quiet creak in the friend's voice; its boing comes when it is let go and snaps back.
        case 'model/pull': return [voiced({ ...CELL_VOICES['lock/pull'], peak: 0.05 }, after.friend)]
        // A piece pops off the friend's lock, in that friend's voice.
        case 'model/snip': return [voiced(base, after.friend)]
        // A snipped tuft goes with its soft poff, and the stub that stands up twangs, quietly, at the length it has now.
        case 'tuft/snip': return [base, { kind: 'tone', wave: 'triangle', pitch: pitchForLength(length ?? 50), glideTo: pitchForLength(length ?? 50) * 1.2, peak: 0.06, attack: 0.002, length: 0.16, after: 0.06 }]
        // Every tuft is a string too: its sproing is lower the longer it is.
        case 'tuft/poke': { const by = length === null ? 1 : pitchForLength(length) / pitchForLength(50); return [{ ...base, pitch: base.pitch * by, ...(base.glideTo === undefined ? {} : { glideTo: base.glideTo * by }) }] }
        // A bow is tied with a rustle and then a ting.
        case 'tuft/ribbon': return [{ kind: 'noise', q: 1, pitch: 1800, peak: 0.06, attack: 0.02, length: 0.18 }, { ...base, after: 0.16 }]
        // The friend's lock hums, and its owner laughs and holds its breath, in the friend's own voice.
        case 'model/poke':
        case 'model/ruffle':
        case 'model/ribbon': return [voiced(base, after.friend)]
        // A cheek snaps back with a blub and then a squeak, both in its owner's voice.
        case 'face/pull': {
          const whose = face ? owner(face.who) : after.chair
          return [voiced(base, whose), { ...voiced(OTHER_VOICES.caught, whose), peak: 0.1, length: 0.09, after: 0.2 }]
        }
        case 'face/poke': {
          const mine = voiced(base, face ? owner(face.who) : after.chair), by = PART_PITCH[face?.part ?? 'cheek']
          return [{ ...mine, pitch: mine.pitch * by, ...(mine.glideTo === undefined ? {} : { glideTo: mine.glideTo * by }) }]
        }
        case 'face/ruffle': { const who = face ? owner(face.who) : after.chair; return [who ? RUB_VOICES[who] : base] }
        // The ribbon wraps round with a swish, and its wearer lifts it to peek with an "ooh" of its own.
        case 'face/ribbon': return [base, { ...voiced(OTHER_VOICES.ooh, face ? owner(face.who) : after.chair), after: 0.3 }]
        // Let go on a face, a carried piece sticks with a soft smack.
        case 'clipping/pull': return happening.place?.on === 'face' ? [OTHER_VOICES.smack] : [base]
        // A piece too small to cut turns to fluff and blows away with a sigh.
        case 'clipping/snip': return after.clippings.length < before.clippings.length ? [base, { ...OTHER_VOICES.sigh, after: 0.05 }] : [base]
        default: return [base]
      }
    }
  }
}

/** The notes for a sound a scene asks for. `who` is whose voice or weight it has, where that matters. */
export function notesForCue(cue: Cue, who: CustomerId | null, salon: Salon): Note[] {
  switch (cue) {
    case 'door': return [OTHER_VOICES.door]
    case 'doorShut': return [{ ...OTHER_VOICES.door, pitch: 523, glideTo: 392, length: 0.3 }]
    case 'step': return [OTHER_VOICES.hop]
    case 'landed': return [voiced({ ...OTHER_VOICES.hop, pitch: 330, glideTo: 200 }, who)]
    case 'hatOff': return [CELL_VOICES['model/snip']]
    case 'hairOut': return [{ ...CELL_VOICES['tuft/poke'], after: 0.05 }]
    case 'capeOn': return [OTHER_VOICES.capeOn]
    case 'capeOff': return [OTHER_VOICES.capeOff]
    // The showing: the two ends sound as they are. No fanfare for a match and no buzzer for a miss: a pluck at each length.
    case 'tooLong': return [{ ...CELL_VOICES['lock/poke'], pitch: pitchForLength(salon.model) }, { ...CELL_VOICES['lock/poke'], pitch: pitchForLength(salon.lock), after: 0.18 }]
    case 'tooShort': return [{ ...CELL_VOICES['lock/poke'], pitch: pitchForLength(salon.lock) }, { ...CELL_VOICES['lock/poke'], pitch: pitchForLength(salon.model), after: 0.18 }]
    case 'asLong': return [{ ...CELL_VOICES['lock/poke'], pitch: pitchForLength(salon.model) }, { ...CELL_VOICES['lock/poke'], pitch: pitchForLength(salon.lock), after: 0.03 }]
    // The piece that is too much flaps like paper; a paw that feels for hair and finds none makes a small puff of air.
    case 'flap': return [{ ...CELL_VOICES['lock/ruffle'], peak: 0.07 }]
    case 'ping': return [CELL_VOICES['model/pull']]
    case 'air': return [{ ...OTHER_VOICES.sigh, length: 0.16, attack: 0.02 }]
    case 'nip': return [CELL_VOICES['tuft/snip']]
    case 'tug': return [CELL_VOICES['tuft/pull']]
    case 'ribbonTaken': return [CELL_VOICES['lock/ribbon']]
    case 'ribbonTick': return [CELL_VOICES['ribbon/pull']]
    case 'ribbonHome': return [CELL_VOICES['ribbon/ribbon']]
  }
}

/** Turns notes into one sound for audio.ts to play: the bridge from numbers to Web Audio. */
export function voiceOf(notes: readonly Note[]): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      const start = at + (note.after ?? 0)
      if (note.kind === 'tone') tone(context, out, start, note.pitch, note.wave ?? 'sine', note.peak, note.attack, note.length, note.glideTo)
      else noise(context, out, start, note.pitch, note.q ?? 1, note.peak, note.attack, note.length, note.glideTo)
    }
  }
}
