import { noise, tone, type Voice } from './audio'
import { VOICES, type VoiceKey } from './voices'

// The bridge from numbers to sound: one voice of voices.ts, played through
// the two building blocks of audio.ts. `pitch` shifts every note together
// (a faster finger, a smaller thing) and `level` scales its loudness.

export function voiceOf(key: VoiceKey, pitch = 1, level = 1): Voice {
  return (context, out, at) => {
    for (const note of VOICES[key]) {
      const f = note.f * pitch, to = note.to === undefined ? undefined : note.to * pitch
      if (note.kind === 'tone') tone(context, out, at + note.at, f, note.wave, note.peak * level, note.attack, note.decay, to)
      else noise(context, out, at + note.at, f, note.q, note.peak * level, note.attack, note.decay, to)
    }
  }
}

/** A sound the game has asked for, waiting to be played inside the gesture handler or after the step. */
export type Asked = { key: VoiceKey; pitch: number; level: number }
