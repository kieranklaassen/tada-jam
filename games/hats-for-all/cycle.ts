import { LADDER } from './config'
import type { CreatureKind } from './kinds'
import { layCrew } from './layout'
import { changeDue, judge, ready, type World } from './rules'
import { worldOf, type Saved } from './save'
import { beginCycle, finishCycle } from './state'

// How a cycle ends and the next begins, as changes to the save (ART.md, "The
// scenes": how a cycle ends, how the next one starts). No renderer and no
// DOM. The position moves here and nowhere else: once, when the crew is ready
// and its first parade starts, by the template's rule in state.ts.
//
// Nothing comes the instant the pairs are right. The cycle's change and the
// parade wait until the crew has been left alone: no touch on a hat or a
// creature for two seconds of attended game time, while the last reactions
// play out. It is the game waiting for the child; it shows nothing and
// hurries nobody. So a child who taps every hat has the spare one out before
// the crew could set off, and only a child who stops sees the parade.

/** How long the crew must be left alone before a change comes or the parade starts, in seconds of attended game time. */
export const LEFT_ALONE_S = 2

/**
 * What the game keeps while it runs and never saves: how long the crew has
 * been left alone, whether it has paraded for the pairs as they stand, and
 * whether the child has touched a hat or a creature since the game was opened.
 */
export type Pace = { quiet: number; paraded: boolean; touched: boolean }

/**
 * The pace on load: nothing replays, so a finished crew that is still ready has had its parade. And nothing comes
 * by itself: a change or a parade that was held when the game was put away waits for the child's next touch on a
 * hat or a creature, and comes when the crew has been left alone after that.
 */
export function freshPace(saved: Saved): Pace {
  return { quiet: 0, paraded: saved.finished && ready(worldOf(saved)), touched: false }
}

/** The child touched a hat or a creature: the wait starts again, and a crew whose pairs are no longer right may parade again once they are. */
export function touched(pace: Pace, saved: Saved): Pace {
  return { quiet: 0, paraded: pace.paraded && ready(worldOf(saved)), touched: true }
}

/** `dt` seconds of attended game time went by with no touch on a hat or a creature. */
export function waited(pace: Pace, dt: number): Pace {
  return { ...pace, quiet: pace.quiet + dt }
}

/**
 * What is due now: the cycle's next change, the parade, or nothing. Both wait
 * for the crew to be left alone. A finished crew that the child unsettles and
 * sets right again parades again, every time.
 */
export function due(saved: Saved, pace: Pace): 'change' | 'parade' | null {
  if (!pace.touched || pace.quiet < LEFT_ALONE_S) return null
  const world = worldOf(saved)
  if (changeDue(world)) return 'change'
  return ready(world) && !pace.paraded ? 'parade' : null
}

/**
 * The parade starts. The first parade of a cycle judges and finishes it; a
 * later one, after the child unsettled the finished crew and set it right
 * again, plays and moves nothing.
 */
export function startParade(saved: Saved, pace: Pace, ladder: readonly string[] = LADDER): { saved: Saved; pace: Pace } {
  if (!ready(worldOf(saved))) return { saved, pace }
  return { saved: finishIfReady(saved, ladder), pace: { ...pace, paraded: true } }
}

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

/**
 * Which creature of the waiting crew stands in the arch: one whose kind is not on the mat with the finished crew,
 * where there is one, so the child never sees the same creature twice at rest; otherwise the first of its row.
 */
export function waitingLead(saved: Saved): CreatureKind {
  const next = waitingCrew(saved).crew, here = saved.crew.map((creature) => creature.kind)
  return (next.find((creature) => !here.includes(creature.kind)) ?? next[0]).kind
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
