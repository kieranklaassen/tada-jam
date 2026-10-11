import { noise, tone, type Voice } from './audio'
import type { Part } from './voices'

/** Turns a voice written as numbers into one the audio can play. */
export function voice(parts: readonly Part[]): Voice {
  return (context, out, at) => {
    for (const part of parts) {
      const start = at + (part.delay ?? 0)
      if (part.kind === 'tone') tone(context, out, start, part.freq, part.wave ?? 'sine', part.peak, part.attack, part.decay, part.to)
      else noise(context, out, start, part.freq, part.q ?? 1, part.peak, part.attack, part.decay, part.to)
    }
  }
}
