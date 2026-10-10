// template: cartridge/state.ts v3
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
//
// For the game that builds on it:
// - `deserialize` returns these fields and no others. A game that saves more
//   keeps this file as it is and wraps it in a module of its own, which calls
//   `deserialize` for these fields and then reads the same raw record again
//   for its own, each repaired by itself. That second read is the intended
//   way; its `serialize` spreads this one's result and adds its fields.
//   `isReadable` tells the wrapper whether the record was read or a fresh
//   state came back, which look the same from outside.
// - `beginCycle` and `finishCycle` hand back the record they were given with
//   the position and the ending changed, so a wrapper passes its own larger
//   state through them and keeps its type.
// - Where the wrapper can tell from its own fields whether the cycle on
//   screen is over, those fields win over the stored `finished`, so the two
//   never disagree. A wrapper that cannot restore its own fields keeps the
//   position and starts a fresh cycle (`finished: false`), or the game opens
//   on a judged cycle with nothing in it.
// - Where the touch that ends a cycle also begins the next, `finishCycle` is
//   followed at once by `beginCycle`, and `finished` is false in every save.
//   That is as meant. The guard against finishing one cycle twice never comes
//   into play there, so such a game makes the pair of calls in one place.

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

/** A plain record, which is the only shape a save has: not null, not a list. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether `raw` is a record this build can read: a plain record at this version. Anything else makes `deserialize` hand back a fresh state. */
export function isReadable(raw: unknown): raw is Record<string, unknown> {
  // When the version is raised, the older shapes that are still read count here too.
  return isRecord(raw) && raw.v === STATE_VERSION
}

/**
 * Saved state is untrusted. Anything that is not this game's record gives a
 * fresh state, and so does a version above this one, which a newer build
 * wrote and this one cannot read. Inside a record each field is repaired by
 * itself: a damaged field takes its default and the rest is kept.
 */
export function deserialize(raw: unknown, childAge: number | null = null, ladder: readonly string[] = LADDER): GameState {
  const fresh = freshState(childAge)
  // When the version is raised, read the older shapes here.
  if (!isReadable(raw)) return fresh
  return {
    v: STATE_VERSION,
    position: typeof raw.position === 'string' && ladder.includes(raw.position) ? raw.position : fresh.position,
    finished: raw.finished === true,
  }
}

export function serialize(state: GameState): GameState {
  return { v: STATE_VERSION, position: state.position, finished: state.finished }
}

/** The child began the next cycle. The position is read here and stays put until the cycle is finished. */
export function beginCycle<S extends GameState>(state: S): S {
  return { ...state, finished: false }
}

/**
 * A cycle ended. The position moves one step for the next cycle: up after one
 * that went well, down after one that went badly, and not at all at either
 * end of the ladder or after a mixed one. Finishing the same cycle twice moves
 * it once. Call this when the ending starts and save at once, so a put-away
 * during the ending loses nothing.
 */
export function finishCycle<S extends GameState>(state: S, outcome: CycleOutcome, ladder: readonly string[] = LADDER): S {
  if (state.finished) return state
  const at = ladder.indexOf(state.position)
  const step = outcome === 'well' ? 1 : outcome === 'badly' ? -1 : 0
  const next = at < 0 ? state.position : ladder[Math.max(0, Math.min(ladder.length - 1, at + step))]
  return { ...state, position: next, finished: true }
}
