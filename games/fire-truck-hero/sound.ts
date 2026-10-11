// Turns a voice written as numbers (voices.ts) into sound, through the two
// builders in audio.ts. This is the only place the toy's voices meet the audio
// API, so what a voice is can be tested without one.

import { noise, tone, type GameAudio, type Voice } from './audio'
import type { VoiceSpec } from './voices'

export function voiceOf(spec: VoiceSpec): Voice {
  return (context, out, at) => {
    for (const partial of spec) {
      if (partial.kind === 'tone') tone(context, out, at + partial.at, partial.frequency, partial.wave ?? 'sine', partial.peak, partial.attack, partial.decay, partial.glideTo)
      else noise(context, out, at + partial.at, partial.frequency, partial.q ?? 1, partial.peak, partial.attack, partial.decay, partial.glideTo)
    }
  }
}

/** Plays a voice now. While the game rests, or before the first touch has unlocked sound, audio.ts decides what is heard. */
export function sound(audio: GameAudio, spec: VoiceSpec): void {
  audio.play(voiceOf(spec))
}
