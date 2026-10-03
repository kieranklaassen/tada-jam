import { noise, tone, type Voice } from './audio'
import type { VoiceSpec } from './voices'

// Turns a voice written as numbers (voices.ts) into a sound the template's
// audio can play. Nothing is decided here: every pitch, peak and length is in
// voices.ts, where a test holds it in range.

export function voiceOf(spec: VoiceSpec): Voice {
  return (context, out, at) => {
    for (const part of spec) {
      if (part.kind === 'tone') tone(context, out, at + part.at, part.pitch, part.wave ?? 'sine', part.peak, part.attack, part.decay, part.to)
      else noise(context, out, at + part.at, part.pitch, part.q ?? 1, part.peak, part.attack, part.decay, part.to)
    }
  }
}
