import { noise, tone, type Voice } from './audio'
import { varied, type VoiceId } from './voices'

// Turns a voice's numbers into Web Audio, on the template's two building
// blocks. Nothing is decided here: every pitch, loudness and length is in
// voices.ts, where the tests can read it.

export function voiceOf(id: VoiceId, pitch = 1, gain = 1): Voice {
  const partials = varied(id, pitch, gain)
  return (context, out, at) => {
    for (const p of partials) {
      const glide = p.to !== p.from ? p.to : undefined
      if (p.wave === 'noise') noise(context, out, at + p.at, p.from, p.q ?? 1, p.peak, p.attack, p.decay, glide)
      else tone(context, out, at + p.at, p.from, p.wave, p.peak, p.attack, p.decay, glide)
    }
  }
}
