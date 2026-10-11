// template: cartridge/config.ts v2
import { hatsForAllManifest } from './manifest'

// The one module a game tunes. The frozen files (quality.ts, attention.ts and
// saveCadence.ts) read their numbers from here, so they stay byte-equal to the
// template and a template fix can be copied over them.

/** The colour of the room's wall, shown before the first frame is drawn. */
export const BACKDROP = '#f6efe2'

// --- Adaptive quality (quality.ts) -----------------------------------------

/**
 * What one quality tier sets. A tier changes drawing only: the pixel ratio,
 * how much detail is drawn, whether the post pass runs. It never changes the
 * rules, the physics or the pace, so a slower device plays the same game.
 * Add the game's own fields here and a row per tier below.
 */
export type Tier = {
  /** Canvas pixel ratio cap; the jam's bar caps it at 2. */
  dpr: number
  /** Whether the foam shows its fine stipple. Without it the foam is the same flat matte colour, so the lowest tier still looks like the game. */
  stipple: boolean
}

/** Tier 0 is full quality; each later tier is cheaper to draw. Whatever a tier change needs is compiled before it happens. */
export const TIERS: readonly Tier[] = [{ dpr: 2, stipple: true }, { dpr: 1.5, stipple: true }, { dpr: 1.25, stipple: false }, { dpr: 1, stipple: false }]

/** The governor's thresholds. The rules they feed are at the top of quality.ts. */
export const GOVERNOR = {
  /** A frame interval over this is a dropped frame (a 60 Hz frame is 16.7 ms). */
  droppedFrameMs: 20,
  /** Frames in one window. */
  windowFrames: 40,
  /** A window also closes after this long once it holds a few frames, so a very slow device is judged in seconds. */
  windowMs: 2000,
  minWindowFrames: 4,
  /** After a tier change (and at start) this much is skipped unjudged: it pays for resized buffers. */
  settleFrames: 20,
  settleMs: 500,
  /** A window with more than this share of dropped frames is a bad window. */
  badDropRatio: 0.1,
  /** One bad window averaging over this steps down at once. */
  terribleAverageMs: 26,
  /** A window averaging over this is far off the pace and drops two tiers. */
  farOffAverageMs: 34,
  /** The game's own work per frame that nine frames in ten of a clean window must stay under to count towards a step up. */
  workBudgetMs: 8,
  goodWindowsToRaise: 6,
  /** A raised tier that fails later doubles the clean stretch the next climb needs, up to this. */
  maxGoodWindowsToRaise: 48,
  /** A step down within this many windows after probation still means the upgrade failed. */
  failedRaiseWindows: 8,
  /** A fresh upgrade is judged on windows this short, this many times; one bad window takes it back. */
  probationWindowFrames: 12,
  probationWindowMs: 300,
  probationWindows: 8,
  /** A fresh upgrade settles only briefly, since every tier's programs are compiled ahead. */
  probationSettleFrames: 4,
  probationSettleMs: 100,
  /** A gap this long is a stall (a hidden tab, a paused debugger), not a slow device. */
  stallMs: 1000,
} as const

// --- Time (attention.ts, saveCadence.ts) -----------------------------------

/** The longest frame the game plays, in seconds: a longer one slows game time instead of jumping it. */
export const LONGEST_FRAME_S = 0.1

/** A change that keeps coming (a drag, a stroke) is handed to storage at most this often, in ms. */
export const SAVE_THROTTLE_MS = 400

const [YOUNGEST, OLDEST] = hatsForAllManifest.ageBand

// --- Guidance (guidance.ts) -------------------------------------------------

/**
 * How many times the ghost hand presses to show a tap. Two presses read as a
 * tap and not as a hold, but a child under 4 copies what the hand does and
 * taps twice, so a band that starts below 4 is shown one. It follows the
 * manifest band, never the child's age while playing.
 */
export const TAP_PRESSES: 1 | 2 = YOUNGEST < 4 ? 1 : 2

// --- The designed order (state.ts) -----------------------------------------

/**
 * The game's challenges in their designed order, easiest first, one new thing
 * at a time (pack: game-design, ordered-challenges-high-success.md). The ids
 * are what a save stores: add steps anywhere, and never rename one that has
 * shipped. Nothing on screen shows where the child is.
 */
export const LADDER: readonly string[] = [
  // As many hats as heads: it cannot come out uneven.
  'two-heads', 'three-heads',
  // One fewer: a creature walks out and its hat is left with no head.
  'one-leaves',
  // A hat too many in the tile: stopping when every head has one.
  'spare-hat',
  // One more: a creature walks in and the spare hat has a head.
  'one-comes',
  // A hat too few: one head waits bare until a hat comes free.
  'one-short',
  // Known things together.
  'spares-and-one-leaves', 'comes-and-goes',
]

/**
 * Where a first visit starts, by `ctx.childAge`: the last row whose age the
 * child has reached, and the first row for a younger child or no age. Age is a
 * hint: a saved position always wins, and every step stays reachable by play.
 * Rows ascend by age and no two share one, or the earlier row is never reached:
 * a band of a single age has a single row.
 */
export const FIRST_VISIT: readonly { fromAge: number; position: string }[] = [
  { fromAge: YOUNGEST, position: 'two-heads' },
  { fromAge: YOUNGEST + 1, position: 'three-heads' },
  { fromAge: OLDEST, position: 'spare-hat' },
]
