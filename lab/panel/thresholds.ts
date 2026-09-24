// Every constant the persona panel uses lives here, so the instrument can be
// frozen and copied into lab/reports/INSTRUMENT.md by U8 without hunting.
//
// FROZEN VALUES (version below). These were chosen against the five fixtures
// in lab/panel/fixtures (constant, noise, ladder, emergent, scoreOnly) so that
// the depth gate passes ladder and emergent and fails the other three, and so
// that both positives outrank all three negatives on the mean of the three
// sub-signal ranks (lab/panel/instrument.test.ts). They are not tuned again
// for any real prototype. Changing one means bumping THRESHOLDS_VERSION,
// rerunning the instrument test, and re-recording the values here.
//
// THE MODEL IN ONE PARAGRAPH (KTD5). A persona has a store of interest ticks,
// full at the start of a session (its attention). It drains one tick per tick
// and refills three ways: a signature it has not reached this session
// (NOVELTY_GAIN, less for one it has met in earlier sessions), learning
// progress (fewer wrong predictions of what its own actions do, LP_GAIN), and
// a self-set aim that moved a declared feature the intended way (AIM_GAIN). A
// constant sim and pure noise refill nothing. When nothing refills it for
// BOREDOM_WINDOW ticks it may set itself an aim (its aimInvention), and an aim
// that never gets anywhere ends the session (drift). A session ends at spent
// interest, at the cap, or at drift. The persona then returns with probability
// returnPropensity scaled by what was left (the recent rate of refill, and for
// a session it chose to end, how recently it last refilled).
//
// PERSONA PARAMETER PROVENANCE (also stored per persona in
// lab/panel/personas.ts, `provenance`). Labels follow the age-band cue table in
// docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md:
//   research  the table's cited research supports the parameter
//   default   an agent or owner choice; nothing cited supports the number
//
//   parameter          label                            note
//   ---------          -----                            ----
//   age                default                          kaia (4) is a documented child; tess (5) is ASSUMED
//   touchJitter        default                          larger for younger children is the direction, the numbers are defaults
//   attention          default                          no attention spans are cited; shorter for younger
//   draw               default                          the engagement structure (interest follows learning
//                                                       progress plus novelty) is Kidd and Poli, but the split
//                                                       between the two per persona is a default
//   aimInvention       default
//   returnPropensity   default
//   gestureMix         default                          more taps and holds when young, more drags when older
//   tempo              default                          gap between touches
//   focus              research for age 4 and under     affordances weighed at once: "one or two clear
//                      default for 5 and up             functions" (Marsh et al. 2018) for the 3 to 4 row; the
//                                                       table calls the 5 to 6 count an owner or agent default
//
// Model-level choices the research does shape (not persona parameters):
//   hints are OFF in return and self-aim runs and ON in the first-10-seconds
//   run, because a demonstration narrows exploration (Bonawitz et al. 2011);
//   interest follows learning progress and novelty, so a constant sim and pure
//   noise both bore a persona (Kidd and Poli).
//
// FROZEN CONSTANTS (name = value; kept equal to the code below by instrument.test.ts)
//   THRESHOLDS_VERSION = u2-panel-1
//   DEFAULT_MASTER_SEED = 1
//   NOISE_SEEDS = 3
//   SESSIONS = 5
//   SESSION_CAP_TICKS = 5455
//   FIRST_TEN_TICKS = 304
//   SETTLE_TICKS = 6
//   FOLLOW_KIND = 0.85
//   HOLD_MIN_TICKS = 12
//   HOLD_MAX_TICKS = 40
//   DRAG_MOVES_MIN = 3
//   DRAG_MOVES_MAX = 6
//   DRAG_TO_OTHER = 0.6
//   DRAG_DISTANCE_MIN = 100
//   DRAG_DISTANCE_MAX = 320
//   KEY_CELL = 100
//   NOVELTY_PULL = 2
//   MASTERY_PULL = 2
//   AIM_EXPLORE = 0.35
//   FIELD_MARGIN = 8
//   DRAIN = 1
//   NOVELTY_GAIN = 300
//   NOVELTY_BASE = 0.5
//   REDISCOVERY = 0.7
//   LP_GAIN = 80
//   LP_BASE = 0.5
//   LP_WINDOW = 20
//   LP_Z = 2
//   MEANINGFUL_GAIN = 12
//   BOREDOM_WINDOW = 480
//   BOREDOM_REROLL = 180
//   PULL_WINDOW = 1200
//   PULL_FULL = 0.2
//   AIM_WINDOW_TICKS = 240
//   AIM_MAX_PER_SESSION = 4
//   AIM_MAX_WINDOWS = 5
//   AIM_PATIENCE = 2
//   AIM_GAIN = 700
//   AIM_MIN_TOUCHES = 4
//   AIM_ATTRIBUTION_LIFT = 1.5
//   AIM_SURPRISE_FULL = 0.3
//   AIM_OBJECTIVE_BIAS = 0.95
//   RETURN_FLOOR = 0.03
//   LEFT_FULL = 0.7
//   GATE_SHARE = 0.5
//   GATE_SESSION = 3
//   PANEL_MARGIN_YEARS = 1
//   PANEL_MIN_PERSONAS = 2
//   CLARITY_MIN_SHARE = 0.25
//   CLARITY_MAX_FIRST_TICK = 180
//   SELFPLAY_DECISION_TICKS = 15
//   GREEDY_CANDIDATES = 4
//   SELFPLAY_EPISODE_TICKS = 600
//   DOMINANT_MARGIN = 0.25
//   DOMINANT_COLLAPSE = 0.6
//   GREEDY_REPLAY_BUDGET = 98400
//   HOOK_NEEDED_DROP = 0.15
//   FINGERPRINT_STRIDE = 6
//   HOOK_ARM_SESSIONS = 2
//
// FROZEN PERSONAS (id, then each parameter; focus is the one research-labelled parameter)
//   kaia    age 4 jitter 34 attention 1500 novelty 0.6 mastery 0.4 aim 0.4 return 0.97 focus research
//   tess    age 5 jitter 30 attention 1800 novelty 0.5 mastery 0.5 aim 0.5 return 0.97 focus default
//   arch-3  age 3 jitter 46 attention 1000 novelty 0.7 mastery 0.3 aim 0.25 return 0.95 focus research
//   arch-6  age 6 jitter 22 attention 2600 novelty 0.3 mastery 0.7 aim 0.6 return 0.95 focus default
//   arch-7  age 7 jitter 30 attention 3600 novelty 0.8 mastery 0.2 aim 0.45 return 0.93 focus default
//   arch-8  age 8 jitter 16 attention 2200 novelty 0.4 mastery 0.6 aim 0.7 return 0.97 focus default
//   arch-9  age 9 jitter 26 attention 1600 novelty 0.75 mastery 0.25 aim 0.4 return 0.93 focus default
//   arch-11 age 11 jitter 14 attention 3200 novelty 0.25 mastery 0.75 aim 0.8 return 0.97 focus default

import { TICK_MS } from '../kit/sim.ts'

// Bump on any change to a value below.
export const THRESHOLDS_VERSION = 'u2-panel-1'

// ---------------------------------------------------------------- run shape
export const DEFAULT_MASTER_SEED = 1
// Noise seeds per persona per prototype.
export const NOISE_SEEDS = 3
// Sessions per run, and the cap of one session (about 3 sim-minutes).
export const SESSIONS = 5
export const SESSION_CAP_TICKS = 5455
// First ten seconds, in whole ticks.
export const FIRST_TEN_TICKS = Math.ceil(10_000 / TICK_MS)
// Ticks an outcome is given to settle after a touch ends.
export const SETTLE_TICKS = 6

// -------------------------------------------------------------- the driver
// Chance an aimed touch follows the affordance's own gesture kind.
export const FOLLOW_KIND = 0.85
// Gesture timing, in ticks.
export const HOLD_MIN_TICKS = 12
export const HOLD_MAX_TICKS = 40
export const DRAG_MOVES_MIN = 3
export const DRAG_MOVES_MAX = 6
// Chance a drag heads for another affordance instead of a random direction.
export const DRAG_TO_OTHER = 0.6
export const DRAG_DISTANCE_MIN = 100
export const DRAG_DISTANCE_MAX = 320
// Grid cell used to key an affordance for memory of what worked.
export const KEY_CELL = 100
// How strongly novelty and mastery pull the choice among affordances.
export const NOVELTY_PULL = 2
export const MASTERY_PULL = 2
// While pursuing an aim, chance to explore instead of using the best action.
export const AIM_EXPLORE = 0.35
// Screen margin kept when spreading free touches over the field.
export const FIELD_MARGIN = 8

// --------------------------------------------------------- the engagement
// Interest ticks drained per tick.
export const DRAIN = 1
// Interest ticks gained for a signature reached for the first time in a
// session (not the one the session starts in), weighted by
// (NOVELTY_BASE + draw.novelty).
export const NOVELTY_GAIN = 300
export const NOVELTY_BASE = 0.5
// A signature seen in earlier sessions is worth this share of a brand new one
// for each earlier session it was reached in (habituation).
export const REDISCOVERY = 0.7
// Learning progress: the persona predicts what each action leads to. When
// fewer of its last LP_WINDOW predictions were wrong than of the LP_WINDOW
// before (a drop a two-proportion z test puts at LP_Z or more), it gains
// LP_GAIN interest ticks per unit of drop, weighted by (LP_BASE + draw.mastery).
export const LP_GAIN = 80
export const LP_BASE = 0.5
export const LP_WINDOW = 20
export const LP_Z = 2
// A tick counts as a gain tick above this many interest ticks.
export const MEANINGFUL_GAIN = 12
// Progress and novelty flat for this many ticks is boredom.
export const BOREDOM_WINDOW = 480
// A bored persona who did not set itself an aim tries again this many ticks
// later, if still bored.
export const BOREDOM_REROLL = 180
// The pull is the interest gained per tick over the last PULL_WINDOW ticks
// (1 exactly offsets the drain); PULL_FULL counts as fully pulled. What is left
// at the end of a session is the pull share, times (for a session the persona
// chose to end) how recently it last gained anything.
export const PULL_WINDOW = 1200
export const PULL_FULL = 0.2

// ----------------------------------------------------------- self-set aims
export const AIM_WINDOW_TICKS = 240
export const AIM_MAX_PER_SESSION = 4
export const AIM_MAX_WINDOWS = 5
// Windows in a row without progress before an aim is given up: the persona
// drifts off and the session ends if the aim never made any progress, and
// otherwise takes it as reached.
export const AIM_PATIENCE = 2
// Interest ticks per window that made progress, weighted by (0.5 + mastery).
export const AIM_GAIN = 700
// In a window the feature must end higher (or lower) than it began, as
// intended, and at least AIM_MIN_TOUCHES touches must have been made.
export const AIM_MIN_TOUCHES = 4
// The window's feature changes must fall within the persona's own touches (a
// touch plus SETTLE_TICKS) at least this many times as often as chance would
// put them there, capped at all of them.
export const AIM_ATTRIBUTION_LIFT = 1.5
// A window of progress refills interest in proportion to the share of the
// persona's touches in it that led somewhere it did not expect, up to this
// share: a feature pushed by a move the persona already knows refills nothing.
export const AIM_SURPRISE_FULL = 0.3
// Chance an aim on a feature with an objective goes the objective's way.
export const AIM_OBJECTIVE_BIAS = 0.95

// --------------------------------------------------------------- returning
// Return probability = returnPropensity * (FLOOR + (1 - FLOOR) * left), where
// left is how much learning progress and novelty were left, 0 to 1.
export const RETURN_FLOOR = 0.03
// The share of `left` that counts as fully mid-discovery.
export const LEFT_FULL = 0.7

// The fixed return function (KTD5). `left` is how much learning progress and
// novelty were left when the session ended, 0 (bored) to 1 (mid-discovery). The
// probability is the persona's return propensity scaled by it, and never quite
// zero. The draw against it comes from the persona's own seeded stream.
export function returnProbability(propensity: number, left: number): number {
  const share = Math.min(1, Math.max(0, left / LEFT_FULL))
  return Math.min(1, Math.max(0, propensity * (RETURN_FLOOR + (1 - RETURN_FLOOR) * share)))
}

// ---------------------------------------------------------------- the gate
// Share of target-panel runs that must start session 3.
export const GATE_SHARE = 0.5
export const GATE_SESSION = 3
// Target panel: personas within this many years of the age band.
export const PANEL_MARGIN_YEARS = 1
export const PANEL_MIN_PERSONAS = 2

// ---------------------------------------------------------------- clarity
// Cue-blind first ten seconds: a share of touches that changed state under
// this, or a first change later than the tick below, reads as low.
export const CLARITY_MIN_SHARE = 0.25
export const CLARITY_MAX_FIRST_TICK = 180

// -------------------------------------------------------------- self-play
export const SELFPLAY_DECISION_TICKS = 15
export const GREEDY_CANDIDATES = 4
export const SELFPLAY_EPISODE_TICKS = 600
// Objective advantage over random, as a share of the objective's spread, that
// makes a policy a contender for dominant.
export const DOMINANT_MARGIN = 0.25
// A contender is dominant when its variety is at most this share of random's.
export const DOMINANT_COLLAPSE = 0.6
// Upper bound on ticks replayed by one greedy episode: one replay of the log
// so far per candidate per decision.
export const GREEDY_REPLAY_BUDGET =
  Math.ceil(SELFPLAY_EPISODE_TICKS / SELFPLAY_DECISION_TICKS) *
  GREEDY_CANDIDATES *
  (SELFPLAY_EPISODE_TICKS + SELFPLAY_DECISION_TICKS)

// ------------------------------------------------------------ hook ablation
// Removing a hook lowers the session-3 return share by more than this share
// (0 to 1) and it reads `needed`.
export const HOOK_NEEDED_DROP = 0.15
// Ticks between affordance samples in the change fingerprint.
export const FINGERPRINT_STRIDE = 6
export const HOOK_ARM_SESSIONS = 2
