// template: cartridge/state.ts v3
import { FIRST_VISIT } from './config'

// What goes into ctx.storage: small plain JSON, versioned, and read
// defensively, so an old or damaged slot never stops the game from opening.
//
// The game has no designed order, so it keeps no position. Two things are
// saved, and the whole yard is rebuilt from them: whether the henhouse door
// is open, and which animals have had their right thing this morning.
// Nothing else is: a thing in the hand is found lying in its place, an answer
// that was playing is over, and whatever a wrong use left on an animal is
// gone. No clock is read.

export const STATE_VERSION = 1

/** The four animals, in yard order from left to right and then the front. The ids are what a save stores. */
export const ANIMALS = ['hens', 'pony', 'goat', 'pig'] as const
export type AnimalId = (typeof ANIMALS)[number]

export type Door = 'open' | 'shut'

export type GameState = {
  v: typeof STATE_VERSION
  door: Door
  /** The animals that have had their right thing this morning, in yard order, each once. */
  content: AnimalId[]
}

/** How the first morning opens for this age. Younger than the first row, or no age, opens as the first row; older than the last opens as the last. */
export function firstDoor(childAge: number | null, firstVisit: readonly { fromAge: number; door: Door }[] = FIRST_VISIT): Door {
  let door = firstVisit[0].door
  if (childAge !== null) for (const row of firstVisit) if (childAge >= row.fromAge) door = row.door
  return door
}

export function freshState(childAge: number | null): GameState {
  return { v: STATE_VERSION, door: firstDoor(childAge), content: [] }
}

/** A plain record, which is the only shape a save has: not null, not a list. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether `raw` is a record this build can read: a plain record at this version. Anything else makes `deserialize` hand back a fresh state. */
export function isReadable(raw: unknown): raw is Record<string, unknown> {
  return isRecord(raw) && raw.v === STATE_VERSION
}

/**
 * Saved state is untrusted. Anything that is not this game's record gives a
 * fresh state, and so does a version above this one. Inside a record each
 * field is repaired by itself: a damaged door takes the default for the
 * child's age, and a damaged list of content animals keeps the ids it knows.
 */
export function deserialize(raw: unknown, childAge: number | null = null): GameState {
  const fresh = freshState(childAge)
  if (!isReadable(raw)) return fresh
  const listed = Array.isArray(raw.content) ? raw.content : []
  return {
    v: STATE_VERSION,
    door: raw.door === 'open' || raw.door === 'shut' ? raw.door : fresh.door,
    content: ANIMALS.filter((animal) => listed.includes(animal)),
  }
}

export function serialize(state: GameState): GameState {
  return { v: STATE_VERSION, door: state.door, content: ANIMALS.filter((animal) => state.content.includes(animal)) }
}
