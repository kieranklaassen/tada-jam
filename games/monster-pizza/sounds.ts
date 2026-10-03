import { noise, tone, type Voice } from './audio'
import type { VoiceSpec } from './voices'

// Turns a voice written as numbers (voices.ts) into Web Audio nodes, with the
// two building blocks the template's audio.ts gives.

export function voiceOf(spec: VoiceSpec): Voice {
  return (context, out, at) => {
    for (const part of spec) {
      const start = at + (part.delay ?? 0)
      if (part.wave === 'noise') noise(context, out, start, part.freq, part.q ?? 1, part.peak, part.attack, part.decay, part.glideTo)
      else tone(context, out, start, part.freq, part.wave, part.peak, part.attack, part.decay, part.glideTo)
    }
  }
}
