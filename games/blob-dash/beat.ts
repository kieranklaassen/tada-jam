// The grid of the loop. Everything the toy times is counted in beats, so a
// jump lasts one beat at every tempo and the whole ring speeds up or slows
// down with the dial. Pure: no clock, no chance, no drawing.
//
// A lap is sixteen beats. A jump can start from thirty-two places on each
// surface: the sixteen beats and the sixteen halves between them. A place is
// counted in halves, so place 0 is the first beat, 1 the half after it, 2 the
// second beat, and so on round the ring.

export const BEATS = 16
/** Places a jump can start from, on one surface. */
export const PLACES = BEATS * 2
/** A tap this many beats before a place is held, and the blob launches as it crosses the place. */
export const EARLY = 0.3
/** A tap this many beats after a place launches at once, as if from the place. Together the two windows cover every moment. */
export const LATE = 0.2
/** How long a jump lasts, in beats. This is the feel of the whole toy: a tap in time lands in time. */
export const JUMP_BEATS = 1
/** How far behind the blob its twin runs, in beats. */
export const TWIN_LAG = 1 / 3

export type Aim = {
  /** The place the tap is taken for, counted in halves from the start of play (it keeps counting past a lap). */
  half: number
  /** Where that place is, in beats from the start of play. */
  at: number
  /** The blob has already passed it: the launch is now. Otherwise the launch waits for the crossing. */
  late: boolean
}

/** The place a tap is taken for, given where the blob is in beats from the start of play. */
export function aim(pos: number): Aim {
  // In halves, a place covers from 0.6 before it to 0.4 after it.
  const half = Math.floor(pos * 2 + EARLY * 2)
  const at = half / 2
  return { half, at, late: pos >= at }
}

/** The place on the ring (0 to 31) of a count of halves from the start of play. */
export function placeOf(half: number): number {
  return ((half % PLACES) + PLACES) % PLACES
}

/** Whether a place is a beat. The other places are the halves between two beats. */
export function onBeat(place: number): boolean {
  return place % 2 === 0
}

/** The beat (0 to 15) a place belongs to: itself for a beat, the beat before it for a half. */
export function beatOf(place: number): number {
  return Math.floor(placeOf(place) / 2)
}

/** The share of its flight in which the pigeon comes out of its niche, and how long it takes to drop home when a touch ends its lap, in seconds. */
export const LAP_OUT = 0.12
export const HOME_SECONDS = 0.32

// One five-note scale, so any springs at all are in tune with each other. The
// sixteen beats walk it up and down in a shape that has no wrong neighbours.
const C4 = 261.63
const SCALE = [0, 2, 4, 7, 9]
const WALK = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 3, 4, 5, 4, 3, 2]

/** The note of a beat, in hertz. */
export function pitchOf(beat: number): number {
  const step = WALK[((beat % BEATS) + BEATS) % BEATS]
  const semitones = SCALE[step % SCALE.length] + 12 * Math.floor(step / SCALE.length)
  return C4 * 2 ** (semitones / 12)
}
