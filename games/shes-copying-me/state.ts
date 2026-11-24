import { BEATS, COATS, GUESTS, HAIRS, THINGS, type BeatId, type Coat, type Guest, type Hair, type Thing } from './rules'

// What goes into ctx.storage: who holds what, who sits where, and what has
// been done to them. Small plain JSON, versioned, and read defensively: each
// group is repaired by itself, and the rest is kept. A hand, a thing in the
// air and a movement being copied are not saved.

export const STATE_VERSION = 1

export type Pair<T> = [T, T]

export type GameState = {
  v: typeof STATE_VERSION
  /** The thing each aunt holds, left then right. With `table`, the six things once each. */
  held: Pair<Thing>
  table: [Thing, Thing, Thing, Thing]
  /** The guest in front of each aunt. With `waiting`, the four guests once each. */
  seated: Pair<Guest>
  waiting: Pair<Guest>
  coats: Record<Guest, Coat>
  hair: Pair<Hair>
  lips: Pair<boolean>
  beat: BeatId
}

/** How long the copy waits on a first visit. Age is a hint: no age takes the youngest, and both ends are open. */
export function firstBeat(childAge: number | null): BeatId {
  if (childAge === null || childAge < 4) return 'quick'
  return childAge < 6 ? 'steady' : 'slow'
}

export function freshState(childAge: number | null): GameState {
  return {
    v: STATE_VERSION,
    held: ['teapot', 'glue'],
    table: ['fan', 'duster', 'horn', 'fish'],
    seated: ['walrus', 'dog'],
    waiting: ['goose', 'pig'],
    coats: { walrus: 'clean', dog: 'clean', goose: 'clean', pig: 'clean' },
    hair: ['plain', 'plain'],
    lips: [false, false],
    beat: firstBeat(childAge),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A list of exactly these, once each and in any order, or null. */
function permutation<T extends string>(raw: unknown[], of: readonly T[]): T[] | null {
  if (raw.length !== of.length) return null
  return of.every((item) => raw.includes(item)) ? (raw as T[]) : null
}

function one<T>(raw: unknown, of: readonly T[], or: T): T {
  return of.includes(raw as T) ? (raw as T) : or
}

export function deserialize(raw: unknown, childAge: number | null = null): GameState {
  const state = freshState(childAge)
  if (!isRecord(raw) || raw.v !== STATE_VERSION) return state
  if (Array.isArray(raw.held) && raw.held.length === 2 && Array.isArray(raw.table)) {
    const things = permutation([...raw.held, ...raw.table], THINGS)
    if (things) {
      state.held = [things[0], things[1]]
      state.table = [things[2], things[3], things[4], things[5]]
    }
  }
  if (Array.isArray(raw.seated) && raw.seated.length === 2 && Array.isArray(raw.waiting)) {
    const guests = permutation([...raw.seated, ...raw.waiting], GUESTS)
    if (guests) {
      state.seated = [guests[0], guests[1]]
      state.waiting = [guests[2], guests[3]]
    }
  }
  if (isRecord(raw.coats)) for (const guest of GUESTS) state.coats[guest] = one(raw.coats[guest], COATS, 'clean')
  for (const side of [0, 1] as const) {
    if (Array.isArray(raw.hair)) state.hair[side] = one(raw.hair[side], HAIRS, 'plain')
    if (Array.isArray(raw.lips)) state.lips[side] = raw.lips[side] === true
  }
  state.beat = one(raw.beat, BEATS, state.beat)
  return state
}

export function serialize(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState
}
