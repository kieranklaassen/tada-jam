// The two scenes as one timeline, in seconds from the scene's start. The
// model's beats, what the figures do and the notes all read these, so a note
// never sounds apart from the move that makes it.

/** The folk come: the sun has reached the bottom. */
export const FOLK_COME = {
  /** The light deepens and the last of the sea comes up, with a fizz of foam. */
  rise: { at: 0, lasts: 1.6 },
  /** Water runs along the grooves in the order they were dug: from here, for as long as the grooves need, within these bounds. */
  flow: { at: 1.0, least: 1.2, most: 3.2 },
  /** Raised sand under the water sinks to its mound. */
  sink: { at: 1.2, lasts: 1.2 },
  /** Driftwood in the water's way lifts and drifts to the end of its groove. */
  drift: { at: 2.0, lasts: 2.5 },
  /** The folk come one by one, the crab first. */
  crab: 4.5,
  star: 5.3,
  eel: 6.1,
  gulls: 6.9,
  small: 7.5,
  end: 8.6,
} as const

/** The tide goes out: the sun has arrived at the top. */
export const TIDE_OUT = {
  /** The light turns gold. */
  gold: { at: 0, lasts: 0.9 },
  /** One long low wave runs up over the whole beach, with a rising hush. */
  wave: { at: 0.4, lasts: 3.0 },
  /** It slides back to its day line and leaves the sand smooth and wet. */
  back: { at: 3.4, lasts: 1.7 },
  /** Where the wave starts, out at sea, and how far up the beach it runs. */
  fromZ: -6,
  toZ: 9.5,
} as const
