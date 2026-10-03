import { noise, tone, type Voice } from './audio'
import { notesOf, type Note, type VoiceId } from './voices'

// The bridge from numbers to sound. voices.ts keeps every sound as plain
// notes; audio.ts makes a sound from an oscillator or a band of noise. This
// turns the one into the other and adds nothing of its own.

/** How narrow the band of a noise note is: a wide hiss, which is what juice, cloth and breath are. */
export const NOISE_Q = 1.1

type Makers = { tone: typeof tone; noise: typeof noise }

/** A list of notes as one voice audio.ts can play. Each note starts its own delay after the touch. */
export function voiceOf(notes: readonly Note[], make: Makers = { tone, noise }): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      const start = at + (note.after ?? 0)
      if (note.kind === 'tone') make.tone(context, out, start, note.hz, note.wave ?? 'triangle', note.peak, note.attack, note.length, note.to)
      else make.noise(context, out, start, note.hz, NOISE_Q, note.peak, note.attack, note.length, note.to)
    }
  }
}

/** The voice of a thing that happened: its id, the length it is about, a count where it counts something, and seconds to wait before it starts. */
export function voiceFor(id: VoiceId, length?: number, count?: number, delay = 0, make?: Makers): Voice {
  const notes = notesOf(id, length, count)
  return voiceOf(delay > 0 ? notes.map((note) => ({ ...note, after: (note.after ?? 0) + delay })) : notes, make)
}
