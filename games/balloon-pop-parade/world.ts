import type { Kind } from './kinds'

// The world the child acts on: a troop of friends who each want one balloon,
// and a bunch that is sent to them. One rule holds at every position, so what
// a child finds out stays true. Nothing here is changed in place: every
// function hands back a new troop, and the one it was given is as it was.

/** No set in the game is larger than three. */
export type Count = 1 | 2 | 3

/** One, two or three friends of one kind. `held[i]` says whether friend i, counted from the left, holds a balloon. */
export type Troop = { kind: Kind; size: Count; held: boolean[] }

/** One, two or three balloons of one colour in one knot. The colour is named by the kind that takes it. */
export type Bunch = { colour: Kind; count: Count }

/** What became of a bunch that was sent. Only `taken` changes the troop. */
export type Given =
  /** One balloon each for `takers`, the friends who were without one, from the left. `served` when nobody is without one now. */
  | { result: 'taken'; takers: number[]; served: boolean }
  /** Another colour than the troop's. */
  | { result: 'refused' }
  /** More balloons than friends without one. `grabber` held on and was lifted; `spare` balloons had nobody under them. */
  | { result: 'gotAway'; grabber: number; spare: number }

export function isCount(value: unknown): value is Count {
  return value === 1 || value === 2 || value === 3
}

/** A troop that has just come in: nobody holds a balloon. */
export function troopOf(kind: Kind, size: Count): Troop {
  return { kind, size, held: Array.from({ length: size }, () => false) }
}

/** The friends without a balloon, from the left. */
export function without(troop: Troop): number[] {
  return troop.held.flatMap((holds, friend) => (holds ? [] : [friend]))
}

/** Every friend holds a balloon. */
export function served(troop: Troop): boolean {
  return without(troop).length === 0
}

/**
 * The one rule. A bunch of another colour is refused. A bunch of the troop's
 * colour is taken, one each from the left, when it holds no more balloons than
 * there are friends without one; a smaller bunch is taken too, and the rest
 * keep reaching. When it holds more it gets away whole and the friends keep
 * what they had, which is also what happens to anything sent to a troop that
 * already has its balloons.
 */
export function give(troop: Troop, bunch: Bunch): { troop: Troop; given: Given } {
  if (bunch.colour !== troop.kind) return { troop, given: { result: 'refused' } }
  const free = without(troop)
  if (bunch.count > free.length) return { troop, given: { result: 'gotAway', grabber: free.length > 0 ? free[0] : 0, spare: bunch.count - free.length } }
  const takers = free.slice(0, bunch.count)
  const after: Troop = { ...troop, held: troop.held.map((holds, friend) => holds || takers.includes(friend)) }
  return { troop: after, given: { result: 'taken', takers, served: served(after) } }
}

/** A held balloon is popped, and that friend is without one again. Nothing pops when the friend holds none or is not there. */
export function pop(troop: Troop, friend: number): { troop: Troop; popped: boolean } {
  if (troop.held[friend] !== true) return { troop, popped: false }
  return { troop: { ...troop, held: troop.held.map((holds, index) => holds && index !== friend) }, popped: true }
}
