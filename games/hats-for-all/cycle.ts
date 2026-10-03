import { LADDER } from './config'
import { layCrew } from './layout'
import { judge, ready, type World } from './rules'
import { worldOf, type Saved } from './save'
import { beginCycle, finishCycle } from './state'

// How a cycle ends and the next begins, as changes to the save (ART.md, "The
// scenes": how a cycle ends, how the next one starts). No renderer and no
// DOM. The position moves here and nowhere else: once, when the crew is ready
// and the parade starts, by the template's rule in state.ts.

/** A move or a change happened: the save holds the new world. */
export function withWorld(saved: Saved, world: World): Saved {
  return { ...saved, ...world }
}

/**
 * The crew is ready: the cycle is judged and finished, and the position moves
 * one step for the next crew. Called when the parade starts, and saved at
 * once, so a put-away during the parade loses nothing and nothing replays.
 * A crew that is not ready, or a cycle already finished, is left as it is.
 */
export function finishIfReady(saved: Saved, ladder: readonly string[] = LADDER): Saved {
  if (saved.finished || !ready(worldOf(saved))) return saved
  return { ...saved, ...finishCycle(saved, judge(saved.slips), ladder) }
}

/**
 * The crew that waits in the arch after the parade: laid out from the
 * position as it stands now and the saved seed, so it is the same crew after
 * a put-away. A new position shows on this very crew, since nobody of it was
 * on screen before the cycle was judged.
 */
export function waitingCrew(saved: Saved): World {
  return layCrew(saved.position, saved.seed).world
}

/** The child lets the waiting crew in: the finished crew is gone and the new one stands bare on the mat. Only a finished cycle can be followed. */
export function beginNext(saved: Saved): Saved {
  if (!saved.finished) return saved
  const laid = layCrew(saved.position, saved.seed)
  return { ...saved, ...beginCycle(saved), ...laid.world, seed: laid.seed }
}

/** The first showing has started: it never plays again. */
export function markShown(saved: Saved): Saved {
  return saved.shown ? saved : { ...saved, shown: true }
}
