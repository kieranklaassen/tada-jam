import { MAX_LEN, MEET, MIN_LEN, NEAR } from './rules'
import type { CycleOutcome } from './state'
import { TASTES, maneFeeling, type ManeFeeling } from './tastes'
import type { Salon } from './world'

// What the salon shows when the cape comes off: the comparison the child made,
// acted out. An error is a consequence that says where and why: the piece of
// the lock that reaches below the model, or the gap where it stops short.
// Nothing here is a verdict, and every reaction is about the hair.

export type Comparison = {
  kind: 'as-long' | 'too-long' | 'too-short'
  /** How many steps the two free ends are apart. */
  by: number
  /** Where the difference lies, in steps from the collar: the piece that sticks out, or the gap. Both the same when the ends meet. */
  from: number
  to: number
  /** How big the muddle is, from 0 (the ends meet) to 1 (as far off as a lock can be). It sizes the reaction. */
  muddle: number
}

/** Two lengths side by side with their top ends level. */
export function compare(lock: number, model: number): Comparison {
  const by = Math.abs(lock - model)
  if (by <= MEET) return { kind: 'as-long', by, from: Math.min(lock, model), to: Math.max(lock, model), muddle: 0 }
  const muddle = Math.min(1, (by - MEET) / (MAX_LEN - MIN_LEN - MEET))
  return { kind: lock > model ? 'too-long' : 'too-short', by, from: Math.min(lock, model), to: Math.max(lock, model), muddle }
}

/** How a cycle went, for where the next customer is laid out. It is judged once, when the cape first comes off, and is never shown. */
export function outcomeOf(lock: number, model: number): CycleOutcome {
  const by = Math.abs(lock - model)
  return by <= MEET ? 'well' : by <= NEAR ? 'mixed' : 'badly'
}

export type Showing = {
  comparison: Comparison
  /** What the customer does about its lock, in its own way. */
  lock: string
  mane: ManeFeeling
  /** What it does about its mane, or nothing when the mane is neither long nor short. */
  maneReaction: string | null
  /** What it does about a bow, when the ribbon is tied in its mane. */
  bow: string | null
  /** Who wears the ribbon as a blindfold. */
  blindfold: 'chair' | 'friend' | null
  /** How many clippings each of the two wears on its face. */
  worn: { chair: number; friend: number }
}

/** Everything the scene is filled in from: the exact haircut the child gave, and who it was given to. */
export function showingOf(salon: Salon): Showing {
  const taste = TASTES[salon.chair], comparison = compare(salon.lock, salon.model), mane = maneFeeling(salon.chair, salon.mane)
  const at = salon.ribbon?.at
  return {
    comparison,
    lock: comparison.kind === 'as-long' ? taste.reactions.lockAsLong : comparison.kind === 'too-long' ? taste.reactions.lockTooLong : taste.reactions.lockTooShort,
    mane,
    maneReaction: mane === 'liked' ? taste.reactions.maneLiked : mane === 'hated' ? taste.reactions.maneHated : null,
    bow: at === 'mane' ? taste.reactions.bow : null,
    blindfold: at === 'face-chair' ? 'chair' : at === 'face-friend' ? 'friend' : null,
    worn: { chair: salon.clippings.filter((c) => c.on === 'chair').length, friend: salon.clippings.filter((c) => c.on === 'friend').length },
  }
}
