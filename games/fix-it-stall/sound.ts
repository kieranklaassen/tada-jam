import { noise, tone, type Voice } from './audio'
import { VOICES, type Note, type VoiceId } from './voices'

// The bridge from numbers to sound. A voice in voices.ts is a list of notes;
// this turns one into something audio.ts can play, with `tone` and `noise`
// and nothing else. `pitch` moves every note of the voice up or down together:
// 1 is as written.

/** The highest and lowest a note may be moved to. */
const HZ = [40, 6000] as const
const within = (hz: number) => Math.max(HZ[0], Math.min(HZ[1], hz))

export function voiceOf(notes: readonly Note[], pitch = 1): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      const start = at + (note.after ?? 0), hz = within(note.pitch * pitch), glide = note.glideTo === undefined ? undefined : within(note.glideTo * pitch)
      if (note.kind === 'tone') tone(context, out, start, hz, note.wave ?? 'sine', note.peak, note.attack, note.length, glide)
      else noise(context, out, start, hz, note.q ?? 1, note.peak, note.attack, note.length, glide)
    }
  }
}

/** A voice by its name. */
export function voice(id: VoiceId, pitch = 1): Voice {
  return voiceOf(VOICES[id], pitch)
}
