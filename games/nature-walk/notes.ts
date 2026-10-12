import type { Note } from './audio'

// How a sound is written down: a few tones and bands of noise, each with the
// moment of the motion it belongs to (`at`, in seconds from the motion's
// start). That moment is a place on the model's clock and never a delay
// inside a voice: the model plays each part of a sound when its clock gets
// there, so a sound can be cut between two parts and nothing is heard late.

/** One tone or band of noise of a sound, with the moment of the motion it is heard at. */
export type Mark = Omit<Note, 'delay'> & { at?: number }

export type Sound = {
  marks: readonly Mark[]
  /** Seconds of the visible motion this sound rides on. No mark comes later than this. */
  rides: number
}

export const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Mark> = {}): Mark => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
export const n = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Mark> = {}): Mark => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

/** The same mark `count` times, `gap` seconds apart from `from`, each changed by `each`. */
export function run(count: number, from: number, gap: number, each: (index: number, at: number) => Mark): Mark[] {
  return Array.from({ length: count }, (_unused, index) => each(index, from + index * gap))
}
