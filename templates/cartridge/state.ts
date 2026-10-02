// template: cartridge/state.ts v1
import { FIRST_VISIT, LADDER } from './config'

// What goes into ctx.storage: small plain JSON, versioned, and read
// defensively, so an old or damaged slot never stops the game from opening.
//
// It also holds the child's position in the designed order (config.ts), by
// these rules:
// - A visit starts at the stored position. A saved position wins over
//   `ctx.childAge`, which only chooses where a first visit starts.
// - The position moves between cycles only, never inside one, and one step at
//   a time: up after a cycle that goes well, down after one that goes badly.
// - It is stored as a stable id, never an index, so the order can grow.
// - No clock is read. After a long break the first cycle is played where the
//   child left off, and if it goes badly the same rule steps down.
// Nothing on screen shows the position or that it moved.

export const STATE_VERSION = 1

export type GameState = {
  v: typeof STATE_VERSION
  /** Where the next cycle starts in the designed order: an id from the ladder. */
  position: string
  /** The cycle on screen is finished. Its ending stays as it is, nothing replays on load, and the next cycle begins on the child's touch. */
  finished: boolean
}

/** How a finished cycle went, as the game judges it. Most cycles should go well. */
export type CycleOutcome = 'well' | 'mixed' | 'badly'

/** Where a first visit starts for this age. Younger than the first row, or no age, starts at the first row; older than the last starts at the last. */
export function firstPosition(childAge: number | null, firstVisit: readonly { fromAge: number; position: string }[] = FIRST_VISIT): string {
  let position = firstVisit[0].position
  if (childAge !== null) for (const row of firstVisit) if (childAge >= row.fromAge) position = row.position
  return position
}

export function freshState(childAge: number | null): GameState {
  return { v: STATE_VERSION, position: firstPosition(childAge), finished: false }
}

/**
 * Saved state is untrusted. Anything that is not this game's record gives a
 * fresh state, and so does a version above this one, which a newer build
 * wrote and this one cannot read. Inside a record each field is repaired by
 * itself: a damaged field takes its default and the rest is kept.
 */
export function deserialize(raw: unknown, childAge: number | null = null, ladder: readonly string[] = LADDER): GameState {
  const fresh = freshState(childAge)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fresh
  const record = raw as Record<string, unknown>
  // When the version is raised, read the older shapes here.
  if (record.v !== STATE_VERSION) return fresh
  return {
    v: STATE_VERSION,
    position: typeof record.position === 'string' && ladder.includes(record.position) ? record.position : fresh.position,
    finished: record.finished === true,
  }
}

export function serialize(state: GameState): GameState {
  return { v: STATE_VERSION, position: state.position, finished: state.finished }
}

/** The child began the next cycle. The position is read here and stays put until the cycle is finished. */
export function beginCycle(state: GameState): GameState {
  return { ...state, finished: false }
}

/**
 * A cycle ended. The position moves one step for the next cycle: up after one
 * that went well, down after one that went badly, and not at all at either
 * end of the ladder or after a mixed one. Finishing the same cycle twice moves
 * it once. Call this when the ending starts and save at once, so a put-away
 * during the ending loses nothing.
 */
export function finishCycle(state: GameState, outcome: CycleOutcome, ladder: readonly string[] = LADDER): GameState {
  if (state.finished) return state
  const at = ladder.indexOf(state.position)
  const step = outcome === 'well' ? 1 : outcome === 'badly' ? -1 : 0
  const next = at < 0 ? state.position : ladder[Math.max(0, Math.min(ladder.length - 1, at + step))]
  return { ...state, position: next, finished: true }
}
