// template: cartridge/config.ts v3
import { barkBoatsManifest } from './manifest'

// The one module a game tunes. The frozen files (quality.ts, attention.ts and
// saveCadence.ts) read their numbers from here, so they stay byte-equal to the
// template and a template fix can be copied over them.

/** The blank surface's colour, until the game draws its own backdrop. */
export const BACKDROP = '#eadfc6'

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
  /** How many rows of printed water lines slide over the brook: two at different speeds, or one. */
  waterLayers: 1 | 2
}

/** Tier 0 is full quality; each later tier is cheaper to draw. Whatever a tier change needs is compiled before it happens. */
export const TIERS: readonly Tier[] = [
  { dpr: 2, waterLayers: 2 },
  { dpr: 1.5, waterLayers: 2 },
  { dpr: 1.25, waterLayers: 1 },
  { dpr: 1, waterLayers: 1 },
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

const [YOUNGEST] = barkBoatsManifest.ageBand

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
 * The designed order. The game has no learning goal and no order of challenges, so it has one place and the
 * position never moves (the design sheet in ART.md, "The designed order, and what is stored"). The id is what a
 * save stores, and is never renamed.
 */
export const LADDER: readonly string[] = ['brook']

/**
 * Where a first visit starts in the designed order: the one place, at every age. What a first visit finds on
 * the stone does follow `ctx.childAge`, and that rule is `firstBuild` in save.ts.
 */
export const FIRST_VISIT: readonly { fromAge: number; position: string }[] = [{ fromAge: YOUNGEST, position: 'brook' }]

/** From this age a first visit finds a bare stone; younger, or with no age, a hull with its twig pressed in. */
export const BARE_STONE_FROM_AGE = 6
