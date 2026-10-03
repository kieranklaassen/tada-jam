import { LADDER } from './config'
import { CLOSE, MODEL_MAX, MODEL_MIN, PLAIN, TUFTS, toLength } from './rules'
import type { Rng } from './rng'
import { CUSTOMERS, type CustomerId } from './tastes'
import type { Seat } from './world'

// How a customer is laid out as it comes in: where the friend sits, how long
// the model is and how the lock starts, from the position in the designed
// order as it stands at that moment. The next pair waits with its hair under
// rain hats, so only who they are is dealt ahead; the lengths are dealt here,
// on the way in.

export type Arrangement = {
  seat: Seat
  /** How the lock starts against its model. */
  way: 'longer' | 'shorter' | 'either'
  /** How big the difference is. */
  gap: { min: number; max: number }
}

const ARRANGEMENTS: Record<string, Arrangement> = {
  'beside-long': { seat: 'beside', way: 'longer', gap: PLAIN },
  'beside-short': { seat: 'beside', way: 'shorter', gap: PLAIN },
  'beside-either': { seat: 'beside', way: 'either', gap: PLAIN },
  'beside-close': { seat: 'beside', way: 'either', gap: CLOSE },
  across: { seat: 'across', way: 'either', gap: PLAIN },
  'across-close': { seat: 'across', way: 'either', gap: CLOSE },
}

/** What a position lays out. A position the game does not know is laid out as the first one. */
export function arrangementOf(position: string): Arrangement {
  return ARRANGEMENTS[position] ?? ARRANGEMENTS[LADDER[0]]
}

export type Layout = { seat: Seat; lock: number; model: number; mane: number[] }

export function layOut(position: string, rng: Rng): Layout {
  const { seat, way, gap } = arrangementOf(position)
  const model = rng.int(MODEL_MIN, MODEL_MAX)
  const longer = way === 'longer' || (way === 'either' && rng.next() < 0.5)
  const by = rng.int(gap.min, gap.max)
  // Wild hair: nine tufts of very different lengths, with one long and one short for certain.
  const mane = Array.from({ length: TUFTS }, () => rng.int(12, 96))
  const tall = rng.int(0, TUFTS - 1)
  mane[tall] = rng.int(78, 96)
  mane[(tall + rng.int(1, TUFTS - 1)) % TUFTS] = rng.int(12, 26)
  return { seat, model, lock: toLength(model + (longer ? by : -by)), mane }
}

/** The next pair: a customer who is not the one just in the chair, and a friend who is somebody else. */
export function dealPair(rng: Rng, notInChair: CustomerId): [CustomerId, CustomerId] {
  const customer = rng.pick(CUSTOMERS.filter((who) => who !== notInChair))
  const friend = rng.pick(CUSTOMERS.filter((who) => who !== customer))
  return [customer, friend]
}
