// The bridge from a list of notes (voices.ts) to a sound the game can play (audio.ts).

import { noise, tone, type Voice } from './audio'
import type { Notes } from './voices'

/** A list of notes as one Voice: each note is a tone or a band of noise, started at its own moment after `at`. */
export function voiceOf(notes: Notes): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      if (note.kind === 'tone') tone(context, out, at + note.at, note.pitch, note.wave ?? 'sine', note.peak, note.attack, note.length, note.to)
      else noise(context, out, at + note.at, note.pitch, note.q ?? 1.2, note.peak, note.attack, note.length, note.to)
    }
  }
}
