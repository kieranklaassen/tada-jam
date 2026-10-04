import { type Voice, noise, tone } from './audio'
import { type Puff } from './sounds'
import { type Note } from './voices'

// The bridge from numbers to sound. The voices (voices.ts) and the other
// sounds (sounds.ts) are plain numbers; this turns a list of them into one
// `Voice` for the template's audio.ts to play. Everything a single tap sets
// off is made into ONE voice, because audio.ts keeps only the newest sound of
// a touch that cannot sound yet: the first tap of a visit is then heard whole.

/** A note this long or longer is a long note: it is held, where a short one only rings out. */
export const LONG_NOTE = 0.5

/**
 * One note that is held near its peak and let go at the end: a long one, steady or warbling, or a glide. A warble is a slow second oscillator
 * that swings the pitch either side; a steady note has none. Both low voices are sounded here, so that the one
 * differs from the other in the warble and in nothing else: the template's `tone` falls away from its peak at
 * once, which would make a steady long note a short one, and it cannot warble.
 */
function held(context: AudioContext, out: AudioNode, at: number, note: Note): void {
  const seconds = note.attack + note.decay
  const osc = context.createOscillator()
  osc.type = note.wave
  osc.frequency.setValueAtTime(note.pitch, at)
  if (note.glideTo !== note.pitch) osc.frequency.exponentialRampToValueAtTime(note.glideTo, at + seconds)
  const swing = note.warbleRate > 0 ? context.createOscillator() : null, depth = swing ? context.createGain() : null
  if (swing && depth) {
    swing.type = 'sine'
    swing.frequency.setValueAtTime(note.warbleRate, at)
    // Semitones either side, as Hz at this pitch.
    depth.gain.setValueAtTime(note.pitch * (2 ** (note.warbleDepth / 12) - 1), at)
    swing.connect(depth).connect(osc.frequency)
  }
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, note.peak), at + note.attack)
  // A long note holds near its peak and falls away at the end, so it is heard, and its warble with it, for the whole of it.
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, note.peak * 0.7), at + seconds * 0.75)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
  osc.connect(gain).connect(out)
  osc.start(at)
  swing?.start(at)
  osc.stop(at + seconds + 0.05)
  swing?.stop(at + seconds + 0.05)
  osc.onended = () => {
    osc.disconnect()
    swing?.disconnect()
    depth?.disconnect()
    gain.disconnect()
  }
}

/** A call, from its notes. */
export function voiceOf(notes: readonly Note[]): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      // A long note, a warble and a glide are held: a glide that fell away at once would be heard only where it
      // starts, low for the one that goes up and high for the one that comes down, and not as the same glide turned round.
      if (note.warbleRate > 0 || note.glideTo !== note.pitch || note.attack + note.decay >= LONG_NOTE) held(context, out, at + note.at, note)
      else tone(context, out, at + note.at, note.pitch, note.wave, note.peak, note.attack, note.decay, note.glideTo === note.pitch ? undefined : note.glideTo)
    }
  }
}

/** A sound that is not a voice, from its bands of noise. */
export function puffsOf(puffs: readonly Puff[]): Voice {
  return (context, out, at) => {
    for (const one of puffs) noise(context, out, at + one.at, one.pitch, one.q, one.peak, one.attack, one.decay, one.glideTo === one.pitch ? undefined : one.glideTo)
  }
}

/** One sound of a tap, and how long after the tap it starts. */
export type Cue = { after: number; voice: Voice }

/** Everything one tap sets off, as a single voice. */
export function together(cues: readonly Cue[]): Voice {
  return (context, out, at) => {
    for (const cue of cues) cue.voice(context, out, at + cue.after)
  }
}
