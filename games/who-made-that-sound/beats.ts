import { ENTRANCE_SECONDS } from './motion'
import { type Form } from './places'
import { type Reaction, reactionOf } from './tastes'
import { type Kind, VOICES, callSeconds } from './voices'

// The short scenes, as lists of timed cues filled in from the state of play
// (ART.md, "The scenes"). Each is the consequence of what the child just did,
// a secret, or the ending; its outcome is in the world before it starts; and
// any touch ends it. The cues are plain data: the view turns each into a beat
// of the template's scene.ts, and the sound layer plays the calls.
//
// A scene is as long as the voices in it, so it is different for every kind,
// and every scene lasts between 4 and 10 seconds.

export type Cue =
  /** Someone comes out of a hide with its own entrance, or steps in. */
  | { at: number; lasts: number; cue: 'enters'; who: Kind }
  /** Someone walks across: to the stone to knock, back to its spot, or up to the one who waited. */
  | { at: number; lasts: number; cue: 'crosses'; who: Kind; back: boolean }
  /** Someone calls: in the open, or softer from inside a hide. */
  | { at: number; lasts: number; cue: 'calls'; who: Kind; inside: boolean }
  /** Two or more call at once, their bodies in the same shape. */
  | { at: number; lasts: number; cue: 'together'; who: Kind[] }
  /** Someone reacts to the voice just heard, by its fixed taste. */
  | { at: number; lasts: number; cue: 'reacts'; who: Kind; to: Kind; how: Reaction }
  /** A character taps a hide, as the child will: the showing. A grown one does it, or in `alike` a little one that has just come out. */
  | { at: number; lasts: number; cue: 'taps'; who: Kind; by: 'grown' | 'little' }
  /** The little one climbs on, or the two take each other's wings. */
  | { at: number; lasts: number; cue: 'joins'; who: Kind }
  /** Up the hill to stand there. */
  | { at: number; lasts: number; cue: 'goesUp'; who: Kind }
  /** Everyone on the hill who came out of this clutch turns to the front. */
  | { at: number; lasts: number; cue: 'gathers'; who: Kind[] }
  /** The first comer of the next clutch appears at the edge and waits. */
  | { at: number; lasts: number; cue: 'nextAppears' }

/** Seconds between one call and the next, so that two calls are heard one after the other and never as one. */
export const BREATH = 0.25

export const SCENE_SECONDS = [4, 10] as const

const voiceOf = (kind: Kind) => callSeconds(VOICES[kind])

/** Builds a scene cue by cue, each after the one before unless it is told to start with it. */
function scene() {
  const cues: Cue[] = []
  let now = 0
  return {
    cues,
    then<T extends Cue['cue']>(cue: T, lasts: number, rest: Omit<Extract<Cue, { cue: T }>, 'at' | 'lasts' | 'cue'>, pause = 0) {
      cues.push({ at: now, lasts, cue, ...rest } as unknown as Cue)
      now += lasts + pause
    },
  }
}

export function sceneSeconds(cues: readonly Cue[]): number {
  return cues.reduce((end, cue) => Math.max(end, cue.at + cue.lasts), 0)
}

/** The reunion: the child opened the hide of the kind that asks. Its way out of the egg takes each kind its own time. */
export function reunion(kind: Kind): Cue[] {
  const s = scene(), call = voiceOf(kind)
  s.then('enters', ENTRANCE_SECONDS[kind], { who: kind })
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('together', call, { who: [kind, kind] }, 0.4)
  s.then('joins', 0.8, { who: kind })
  s.then('goesUp', 1.6, { who: kind })
  return s.cues
}

/** The meeting that does not match: the child opened another hide. */
export function meeting(asker: Kind, other: Kind): Cue[] {
  const s = scene()
  s.then('enters', ENTRANCE_SECONDS[other], { who: other })
  s.then('calls', voiceOf(other), { who: other, inside: false }, BREATH)
  s.then('calls', voiceOf(asker), { who: asker, inside: false }, BREATH)
  // Both react at once, each to the other's voice.
  s.cues.push({ at: sceneSeconds(s.cues) + BREATH, lasts: 1.2, cue: 'reacts', who: asker, to: other, how: reactionOf(asker, other) })
  s.then('reacts', 1.2, { who: other, to: asker, how: reactionOf(other, asker) })
  s.then('goesUp', 1.4, { who: other })
  return s.cues
}

/** The choir, the ending: everyone who came out of this clutch, in the order they came to stand on the hill. */
export function choir(found: readonly Kind[]): Cue[] {
  const s = scene()
  s.then('gathers', 0.8, { who: [...found] })
  for (const kind of found) s.then('calls', Math.max(voiceOf(kind), 0.5), { who: kind, inside: false }, 0.3)
  s.then('together', Math.max(0, ...found.map(voiceOf)), { who: [...found] }, 0.6)
  s.then('nextAppears', 1.2, {})
  return s.cues
}

/** The showing: once for each way of asking, a pair of this kind does what the child will do. */
export function showing(form: Form, kind: Kind): Cue[] {
  const s = scene(), call = voiceOf(kind), by = form === 'alike' ? 'little' : 'grown'
  // The one who shows comes in with its egg; in `who` it walks over to the stone, where the egg is set down.
  if (form === 'who') s.then('crosses', 0.5, { who: kind, back: false })
  else s.then('enters', 0.5, { who: kind })
  // In every way of asking the same order: the one who shows calls and the egg answers; a tap wakes the egg and
  // it calls, and the one who shows calls again; a second tap opens it.
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('calls', call, { who: kind, inside: true }, BREATH)
  s.then('taps', 0.3, { who: kind, by })
  s.then('calls', call, { who: kind, inside: true }, BREATH)
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('taps', 0.3, { who: kind, by })
  // The one inside is out in half a second here, whatever its kind: the showing is about the two taps.
  s.then('enters', 0.5, { who: kind })
  s.then('together', call, { who: [kind, kind] }, 0.4)
  s.then('goesUp', 1.3, { who: kind })
  return s.cues
}

/** The finding on the hill: one comes to ask, or is let out, whose own waits alone on the hill. */
export function finding(kind: Kind): Cue[] {
  const s = scene(), call = voiceOf(kind)
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('together', call, { who: [kind, kind] }, 0.4)
  s.then('goesUp', 2, { who: kind })
  s.then('joins', 0.8, { who: kind })
  return s.cues
}

/** In `who`, the grown one whose voice it is walks over and knocks: the egg bursts, and the reunion follows. */
export function knockRight(kind: Kind): Cue[] {
  const s = scene(), call = voiceOf(kind)
  s.then('crosses', 0.7, { who: kind, back: false })
  s.then('taps', 0.3, { who: kind, by: 'grown' })
  s.then('enters', ENTRANCE_SECONDS[kind], { who: kind })
  // As in every reunion: the one who came out, then the other, then the two as one.
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('calls', call, { who: kind, inside: false }, BREATH)
  s.then('together', call, { who: [kind, kind] }, 0.4)
  s.then('joins', 0.8, { who: kind })
  s.then('goesUp', 1.4, { who: kind })
  return s.cues
}

/** In `who`, a grown one whose voice it is not walks over and knocks: the egg answers and stays shut, and the grown one goes back. */
export function knockWrong(egg: Kind, grown: Kind): Cue[] {
  const s = scene()
  s.then('crosses', 0.7, { who: grown, back: false })
  s.then('taps', 0.3, { who: grown, by: 'grown' })
  s.then('calls', voiceOf(egg), { who: egg, inside: true }, BREATH)
  s.then('calls', voiceOf(grown), { who: grown, inside: false }, BREATH)
  s.then('reacts', 1.2, { who: grown, to: egg, how: reactionOf(grown, egg) }, 0.1)
  s.then('crosses', 0.8, { who: grown, back: true })
  return s.cues
}

/** The round, a secret: both kinds of one family on the hill, tapped one straight after the other. */
export function round(first: Kind, second: Kind): Cue[] {
  const s = scene()
  const once = voiceOf(first) + voiceOf(second) + Math.max(voiceOf(first), voiceOf(second)) + 3 * 0.3
  // Short voices go round more often, so that the round is a scene and not a blip.
  const times = Math.max(2, Math.ceil((SCENE_SECONDS[0] + 0.3) / once))
  for (let i = 0; i < times; i++) {
    s.then('calls', voiceOf(first), { who: first, inside: false }, 0.3)
    s.then('calls', voiceOf(second), { who: second, inside: false }, 0.3)
    s.then('together', Math.max(voiceOf(first), voiceOf(second)), { who: [first, second] }, 0.3)
  }
  return s.cues
}
