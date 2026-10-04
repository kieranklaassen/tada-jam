import { noise, tone, type Voice } from './audio'
import type { Part } from './voices'

// Turns a voice written as numbers (voices.ts) into Web Audio nodes, with the
// template's two building blocks.

export function voiceOf(parts: readonly Part[]): Voice {
  return (context, out, at) => {
    for (const part of parts) {
      const when = at + part.delay
      if (part.kind === 'tone') tone(context, out, when, part.frequency, part.wave, part.peak, part.attack, part.decay, part.glideTo || undefined)
      else noise(context, out, when, part.frequency, part.q, part.peak, part.attack, part.decay, part.glideTo || undefined)
    }
  }
}
