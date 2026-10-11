// The salon's own numbers. Lengths are whole steps and a step is never shown
// to the child. No record the game is designed from gives a size, so every
// number here is the game's own choice (ART.md, "The designed order").

/** A stub: the shortest a strip can be cut. */
export const MIN_LEN = 4
/** Down to the floor: the longest a strip can be pulled. */
export const MAX_LEN = 100

/** A model is laid out between these, so a lock can start plainly longer or plainly shorter and stay in range. */
export const MODEL_MIN = 34
export const MODEL_MAX = 66

/** "Plainly" longer or shorter: a difference of this many steps. */
export const PLAIN = { min: 24, max: 30 } as const
/** "A little" longer or shorter. */
export const CLOSE = { min: 9, max: 14 } as const

/** Two free ends meet when they are within this many steps. */
export const MEET = 5
/** A lock within this many steps of its model is near it. */
export const NEAR = 12

/** The tufts of a mane. */
export const TUFTS = 9
/** A mane whose tufts average this long or longer is a long mane, and this short or shorter is a short one. */
export const MANE_LONG = 60
export const MANE_SHORT = 35

/** The most clippings the salon keeps. One more turns the oldest on the floor to fluff. */
export const MAX_CLIPPINGS = 12
/** A clipping shorter than twice this cannot be cut in two: it turns to fluff. */
export const MIN_CLIPPING = 3

/** How long the ribbon is when it is first shown: as long as a tail. */
export const TAIL_LEN = 44

/** Brings any number to a whole length a strip can have. */
export function toLength(value: number): number {
  if (!Number.isFinite(value)) return MIN_LEN
  return Math.max(MIN_LEN, Math.min(MAX_LEN, Math.round(value)))
}
