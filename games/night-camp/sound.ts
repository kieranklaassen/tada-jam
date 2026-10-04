import { noise, tone, type Voice } from './audio'
import type { Note } from './voices'

// The bridge from numbers to sound: a list of notes (voices.ts) becomes one
// voice that audio.ts can play. Nothing else in the game builds audio nodes.

export function voiceOf(notes: readonly Note[]): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      if (note.kind === 'tone') tone(context, out, at + note.delay, note.hz, note.wave ?? 'sine', note.peak, note.attack, note.decay, note.to)
      else noise(context, out, at + note.delay, note.hz, note.q ?? 1, note.peak, note.attack, note.decay, note.to)
    }
  }
}
