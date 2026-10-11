// template: cartridge/config.ts v3
import { mushroomVillageManifest } from './manifest'

// The one module a game tunes. The frozen files (quality.ts, attention.ts and
// saveCadence.ts) read their numbers from here, so they stay byte-equal to the
// template and a template fix can be copied over them.

/** The sugar paper's colour: what shows before the painting is made, and between the paints after. */
export const BACKDROP = '#8f7f93'

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
  /** How many glints run down the stream at once. */
  glints: number
  /** The most spores, spots and drops in the air at once; the oldest go first. */
  specks: number
}

/** Tier 0 is full quality; each later tier is cheaper to draw. Whatever a tier change needs is compiled before it happens. */
export const TIERS: readonly Tier[] = [
  { dpr: 2, glints: 9, specks: 60 },
  { dpr: 1.5, glints: 6, specks: 40 },
  { dpr: 1.25, glints: 4, specks: 24 },
  { dpr: 1, glints: 3, specks: 14 },
]

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

const [YOUNGEST] = mushroomVillageManifest.ageBand

// --- Guidance (guidance.ts) -------------------------------------------------

/**
 * How many times the ghost hand presses to show a tap. Two presses read as a
 * tap and not as a hold, but a child under 4 copies what the hand does and
 * taps twice, so a band that starts below 4 is shown one. It follows the
 * manifest band, never the child's age while playing.
 * Before keeping two, list what a second tap does to each thing the hand may
 * show. Where a tap counts something, turns something over or starts a
 * scene, the second tap does harm, and the game sets this to 1 whatever its
 * band.
 */
export const TAP_PRESSES: 1 | 2 = YOUNGEST < 4 ? 1 : 2

// --- The designed order (state.ts) -----------------------------------------

/**
 * The game is open pretend play with no learning goal, so its designed order
 * has one place and the position never moves (the design sheet, "The designed
 * order, and what is stored"). The id is what a save stores.
 */
export const LADDER: readonly string[] = ['glade']

/** One place, so one row: every first visit starts there. What a first visit opens on by age is `FIRST_MUSHROOM_TO_AGE`. */
export const FIRST_VISIT: readonly { fromAge: number; position: string }[] = [{ fromAge: YOUNGEST, position: 'glade' }]

// --- The toy (village.ts) ---------------------------------------------------

/**
 * A first visit by a child of this age or younger, or of no known age, opens
 * with one squat red mushroom already standing in the sun. An older child
 * finds bare moss. Age is a hint: it sets what a first visit opens on and
 * nothing else, and a saved village wins over it.
 */
export const FIRST_MUSHROOM_TO_AGE = 3

/**
 * The longest a press that does not move may last and still be a tap, in seconds. A three-year-old's tap is slow:
 * up to here a finger on a mushroom that stands is a poke, on a gnome his poke, on the sun the night; after it the
 * finger is holding.
 */
export const TAP_S = 0.45

/** Seconds a finger holds for each step a mushroom swells: twelve steps in under two seconds. */
export const STEP_S = 0.16
/** The steps from a button to a full mushroom. */
export const FULL = 12
/** The most mushrooms the glade holds. */
export const MOST = 10
