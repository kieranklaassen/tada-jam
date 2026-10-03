// The riders and their fixed tastes. A taste never changes, so a child can
// learn it and test it on purpose. A reaction is to the ride, never about the
// child, and a dislike is as good to watch as a like.

export const RIDERS = ['frog', 'chick', 'snail', 'cat'] as const
export type RiderKind = (typeof RIDERS)[number]
export const isRiderKind = (value: unknown): value is RiderKind => typeof value === 'string' && (RIDERS as readonly string[]).includes(value)

/** What a ride can do to a rider, read from the marks ridden. */
export const FEELS = ['fast', 'corner', 'loop', 'splash', 'bump', 'scribble'] as const
export type Feel = (typeof FEELS)[number]

export type Taste = 'like' | 'dislike' | 'plain'

type Character = {
  /** The one thing it visibly wants: its home. */
  home: string
  likes: readonly [Feel, Feel]
  dislikes: readonly [Feel, Feel]
  /** How it moves: its tempo in beats a second, its weight from 0 to 1, and the part of it that is funniest. */
  tempo: number
  weight: number
  funniest: string
}

export const CHARACTERS: Record<RiderKind, Character> = {
  frog: { home: 'pond', likes: ['corner', 'splash'], dislikes: ['fast', 'scribble'], tempo: 3.2, weight: 0.3, funniest: 'throat-pouch' },
  chick: { home: 'nest', likes: ['loop', 'fast'], dislikes: ['splash', 'bump'], tempo: 4.5, weight: 0.1, funniest: 'stub-wings' },
  snail: { home: 'lettuce', likes: ['bump', 'scribble'], dislikes: ['loop', 'fast'], tempo: 0.8, weight: 0.9, funniest: 'eye-stalks' },
  cat: { home: 'cushion', likes: ['fast', 'scribble'], dislikes: ['corner', 'splash'], tempo: 1.6, weight: 0.55, funniest: 'tail' },
}

/** What this rider makes of that part of a ride. Always the same answer. */
export function taste(kind: RiderKind, feel: Feel): Taste {
  const c = CHARACTERS[kind]
  return c.likes.includes(feel) ? 'like' : c.dislikes.includes(feel) ? 'dislike' : 'plain'
}

/** What a ride has done to a rider so far: a small capped tally of each feel. */
export type Felt = Record<Feel, number>
export const FELT_CAP = 9
export const noFeels = (): Felt => ({ fast: 0, corner: 0, loop: 0, splash: 0, bump: 0, scribble: 0 })

export function feel(felt: Felt, what: Feel): Felt {
  return { ...felt, [what]: Math.min(FELT_CAP, felt[what] + 1) }
}

/**
 * What the ride did to the rider most, which is how it gets out at home.
 * A tie goes to the feel the rider has a taste for, and then to the order of
 * `FEELS`. A ride that did nothing in particular gives `null`.
 */
export function mostFelt(kind: RiderKind, felt: Felt): Feel | null {
  let best: Feel | null = null
  for (const f of FEELS) {
    if (felt[f] <= 0) continue
    if (best === null || felt[f] > felt[best] || (felt[f] === felt[best] && taste(kind, best) === 'plain' && taste(kind, f) !== 'plain')) best = f
  }
  return best
}
