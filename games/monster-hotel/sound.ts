import { noise, tone, type Voice } from './audio'
import type { Sound } from './voices'

// The bridge from numbers to sound: a list of notes (voices.ts) becomes one
// voice that `audio.ts` can play, with every note laid at its own time.

export function voiceOf(sound: Sound): Voice {
  return (context, out, at) => {
    for (const note of sound) {
      const when = at + note.at
      if (note.kind === 'tone') tone(context, out, when, note.pitch, note.wave, note.peak, note.attack, note.length, note.glide > 0 ? note.glide : undefined)
      else noise(context, out, when, note.pitch, note.q, note.peak, note.attack, note.length, note.glide > 0 ? note.glide : undefined)
    }
  }
}
