import type { Fish } from './flight'
import { deserialize as readBase, freshState, isReadable, serialize as writeBase, type GameState } from './state'
import { CATAPULT, PARTS, type Friend, type Part } from './world'

// What this game saves besides the template's fields (state.ts): which parts
// are bolted on, where the pouch was last let go (which places the pencil
// ring behind the fork), who is eating a fish, and how the fish on the rod
// is. The record is read a second time here for those fields, each repaired
// by itself.
// Nothing is saved in the air: a pull, a flight, a landing and the way back
// are views of this, and the game is found with the penguin in the pouch.

/** Where the pouch was last let go, as its offset from rest in whole stage units. */
export type Last = { x: number; y: number }

/** A friend who is eating, and the fish it got. */
export type Eating = { who: Friend; fish: Fish }

export type Save = GameState & {
  /** The parts bolted on, none, one or two, in the order they were bolted. */
  bolted: Part[]
  /** Null before the first flight. */
  last: Last | null
  eating: Eating | null
  /** The fish on the rod as it is: fresh from the kit, wet, or frozen. Fresh whenever the rod is not bolted on. */
  rod: Fish
}

/** The most parts that are bolted on at once. */
export const MOST_PARTS = 2

/** No offset from rest is longer than this: the bands' reach, the way from the fork down to the pouch at rest, and one unit for the rounding. */
const FURTHEST = CATAPULT.reach + Math.hypot(CATAPULT.rest.x - CATAPULT.fork.x, CATAPULT.rest.y - CATAPULT.fork.y) + 1

const FRIENDS: readonly Friend[] = ['chick', 'walrus', 'puffin']
const FISH: readonly Fish[] = ['fresh', 'wet', 'frozen']

function readBolted(raw: unknown): Part[] {
  if (!Array.isArray(raw)) return []
  const bolted: Part[] = []
  for (const id of raw) {
    const part = PARTS.find((known) => known === id)
    if (part && !bolted.includes(part) && bolted.length < MOST_PARTS) bolted.push(part)
  }
  return bolted
}

function readLast(raw: unknown): Last | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { x, y } = raw as { x?: unknown; y?: unknown }
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null
  if (Math.hypot(x, y) > FURTHEST) return null
  return { x: Math.round(x), y: Math.round(y) }
}

function readEating(raw: unknown): Eating | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { who, fish } = raw as { who?: unknown; fish?: unknown }
  const friend = FRIENDS.find((known) => known === who), state = FISH.find((known) => known === fish)
  return friend && state ? { who: friend, fish: state } : null
}

/** The fish on the rod: one of the three it can be, and fresh when it is anything else or the rod is not on. */
function readRod(raw: unknown, bolted: readonly Part[]): Fish {
  return (bolted.includes('fish') ? FISH.find((known) => known === raw) : undefined) ?? 'fresh'
}

export function freshSave(childAge: number | null): Save {
  return { ...freshState(childAge), bolted: [], last: null, eating: null, rod: 'fresh' }
}

/** Saved state is untrusted: anything that is not this game's record gives a fresh save, and a damaged field takes its default. */
export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const base = readBase(raw, childAge)
  const read = isReadable(raw)
  // This game judges no cycle, so a stored mark for a finished one is not kept.
  const bolted = read ? readBolted(raw.bolted) : []
  return { ...base, finished: false, bolted, last: read ? readLast(raw.last) : null, eating: read ? readEating(raw.eating) : null, rod: read ? readRod(raw.rod, bolted) : 'fresh' }
}

export function serialize(save: Save): Save {
  return {
    ...writeBase(save),
    finished: false,
    bolted: readBolted(save.bolted),
    last: save.last ? { x: Math.round(save.last.x), y: Math.round(save.last.y) } : null,
    eating: save.eating ? { who: save.eating.who, fish: save.eating.fish } : null,
    rod: readRod(save.rod, readBolted(save.bolted)),
  }
}
