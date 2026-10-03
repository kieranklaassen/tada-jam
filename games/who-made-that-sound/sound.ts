import { type Voice, noise, tone } from './audio'
import { type Puff } from './sounds'
import { type Note } from './voices'

// The bridge from numbers to sound. The voices (voices.ts) and the other
// sounds (sounds.ts) are plain numbers; this turns a list of them into one
// `Voice` for the template's audio.ts to play. Everything a single tap sets
// off is made into ONE voice, because audio.ts keeps only the newest sound of
// a touch that cannot sound yet: the first tap of a visit is then heard whole.

/** One warbling note: an oscillator whose pitch a slow second oscillator swings either side. The template's `tone` cannot warble. */
function warble(context: AudioContext, out: AudioNode, at: number, note: Note): void {
  const seconds = note.attack + note.decay
  const osc = context.createOscillator()
  osc.type = note.wave
  osc.frequency.setValueAtTime(note.pitch, at)
  if (note.glideTo !== note.pitch) osc.frequency.exponentialRampToValueAtTime(note.glideTo, at + seconds)
  const swing = context.createOscillator()
  swing.type = 'sine'
  swing.frequency.setValueAtTime(note.warbleRate, at)
  const depth = context.createGain()
  // Semitones either side, as Hz at this pitch.
  depth.gain.setValueAtTime(note.pitch * (2 ** (note.warbleDepth / 12) - 1), at)
  swing.connect(depth).connect(osc.frequency)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, note.peak), at + note.attack)
  // A long note holds near its peak and falls away at the end, so the warble is heard for the whole of it.
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, note.peak * 0.7), at + seconds * 0.75)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
  osc.connect(gain).connect(out)
  osc.start(at)
  swing.start(at)
  osc.stop(at + seconds + 0.05)
  swing.stop(at + seconds + 0.05)
  osc.onended = () => {
    osc.disconnect()
    swing.disconnect()
    depth.disconnect()
    gain.disconnect()
  }
}

/** A call, from its notes. */
export function voiceOf(notes: readonly Note[]): Voice {
  return (context, out, at) => {
    for (const note of notes) {
      if (note.warbleRate > 0) warble(context, out, at + note.at, note)
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
