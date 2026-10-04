import { noise, tone, type Voice } from './audio'
import type { Part } from './voices'

// The bridge from numbers to sound: a voice kept as plain parts (voices.ts)
// becomes one call of the template's `tone` or `noise` a part. Nothing else
// in the game makes a sound.

export function voiceOf(parts: readonly Part[]): Voice {
  return (context, out, at) => {
    for (const part of parts) {
      const start = at + (part.after ?? 0)
      if (part.source === 'tone') tone(context, out, start, part.pitch, part.wave ?? 'sine', part.peak, part.attack, part.length, part.glideTo)
      else noise(context, out, start, part.pitch, part.q ?? 1, part.peak, part.attack, part.length, part.glideTo)
    }
  }
}
