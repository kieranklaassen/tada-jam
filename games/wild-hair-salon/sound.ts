import { noise, tone, type Voice } from './audio'
import type { Happening } from './hand'
import { TASTES, type CustomerId } from './tastes'
import { CELL_VOICES, OTHER_VOICES, RUB_VOICES, inVoice, pitchForLength, type VoiceSpec } from './voices'
import type { Salon } from './world'

// What each thing that happens sounds like: a short list of notes, in plain
// numbers, from the voices of voices.ts. A note is a voice and how long after
// the touch it starts. Nobody could hear on the machine this was written on;
// the notes are chosen from the sheet's words and held in range by tests.

export type Note = VoiceSpec & { after?: number }

/** A giggle is different on the nose, an ear and the chin: the same voice, higher or lower. */
const PART_PITCH = { nose: 1.25, ear: 1.5, chin: 0.75, cheek: 1 } as const

/** The most notes one frame may start, so a stroke through the whole mane is a flurry and not a wall. */
export const MOST_NOTES = 4

/**
 * The notes for one thing that happened. `before` and `after` are the salon
 * on either side of it, for the sounds that depend on what it did.
 */
export function notesFor(happening: Happening, before: Salon, after: Salon): Note[] {
  const who: CustomerId | null = after.chair
  const mine = (spec: VoiceSpec): VoiceSpec => (who ? inVoice(spec, TASTES[who].voiceHz) : spec)
  switch (happening.kind) {
    case 'scissors': return [OTHER_VOICES.scissors]
    case 'airSnip': return [OTHER_VOICES.airSnip]
    case 'away': return []
    case 'caught': {
      const { held } = happening
      if (held.object === 'clipping') return [CELL_VOICES['clipping/pull']]
      // A face that is caught answers in its own voice; hair gives a squeak.
      return [held.object === 'face' ? mine(OTHER_VOICES.caught) : OTHER_VOICES.caught]
    }
    case 'letGo': return happening.held.object === 'lock' || happening.held.object === 'tuft' ? [OTHER_VOICES.letGo] : []
    case 'cell': {
      const base: VoiceSpec = CELL_VOICES[happening.cell.voice]
      const length = happening.rings
      switch (happening.cell.voice) {
        // The creak of a pull falls as the lock gets longer.
        case 'lock/pull': return [length === null ? base : { ...base, pitch: pitchForLength(length) * 0.7, glideTo: pitchForLength(length) * 0.55 }]
        // A plucked lock is a string: lower the longer it is.
        case 'lock/poke': return [length === null ? base : { ...base, pitch: pitchForLength(length) }]
        // The snip, and then the stump twanging up at its new length.
        case 'lock/snip': return [base, { kind: 'tone', wave: 'triangle', pitch: pitchForLength(length ?? 50), glideTo: pitchForLength(length ?? 50) * 1.2, peak: 0.1, attack: 0.002, length: 0.22, after: 0.07 }]
        case 'face/pull': return [mine(base)]
        case 'face/poke': {
          const part = happening.held?.object === 'face' ? happening.held.part : 'cheek'
          const voiced = mine(base), by = PART_PITCH[part]
          return [{ ...voiced, pitch: voiced.pitch * by, ...(voiced.glideTo === undefined ? {} : { glideTo: voiced.glideTo * by }) }]
        }
        case 'face/ruffle': return [who ? RUB_VOICES[who] : base]
        // Let go on a face, a carried piece sticks with a soft smack.
        case 'clipping/pull': return happening.place?.on === 'face' ? [OTHER_VOICES.smack] : [base]
        // A piece too small to cut turns to fluff and blows away with a sigh.
        case 'clipping/snip': return after.clippings.length < before.clippings.length ? [base, { ...OTHER_VOICES.sigh, after: 0.05 }] : [base]
        default: return [base]
      }
    }
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
