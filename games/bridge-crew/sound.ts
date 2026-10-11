import { noise, tone, type Voice } from './audio'
import { play, type VoiceSpec } from './voices'

// The bridge from voices held as plain numbers (voices.ts) to Web Audio: one
// voice becomes a few calls on the two builders of audio.ts. Nobody on the
// machine that wrote these voices could hear them.

export const voiceOf = (spec: VoiceSpec): Voice => (context, out, at) =>
  play(
    spec, at,
    (when, pitch, wave, peak, attack, long, slideTo) => tone(context, out, when, pitch, wave, peak, attack, long, slideTo),
    (when, pitch, q, peak, attack, long, slideTo) => noise(context, out, when, pitch, q, peak, attack, long, slideTo),
  )

/** The seed for the visit's random stream: `seed=<n>` in the address gives the same visit every time, for stills; otherwise each visit has its own. */
export function seedFrom(search: string, fresh: () => number): number {
  const given = new URLSearchParams(search).get('seed')
  const seed = given === null ? Number.NaN : Number(given)
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : fresh() >>> 0
}
