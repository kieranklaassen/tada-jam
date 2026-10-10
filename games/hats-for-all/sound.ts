import { noise, tone, type Voice } from './audio'
import type { Partial } from './voices'

// Turns a voice written as plain numbers (voices.ts) into Web Audio, with the
// template's two building blocks. Nothing here chooses a pitch or a loudness.

export function sounding(partials: readonly Partial[], delay = 0): Voice {
  return (context, out, at) => {
    for (const partial of partials) {
      const start = at + delay + partial.at
      if (partial.kind === 'tone') tone(context, out, start, partial.frequency, partial.wave ?? 'sine', partial.peak, partial.attack, partial.decay, partial.glideTo)
      else noise(context, out, start, partial.frequency, partial.q ?? 1, partial.peak, partial.attack, partial.decay, partial.glideTo)
    }
  }
}
