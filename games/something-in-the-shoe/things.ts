// The seven things in the basket, and what two of them do together in a boot.

export const THINGS = ['mandarin', 'carrot', 'biscuit', 'frog', 'mouse', 'porridge', 'bell'] as const
export type ThingId = (typeof THINGS)[number]

export const TREATS: readonly ThingId[] = ['mandarin', 'carrot', 'biscuit']
export const isTreat = (id: ThingId): boolean => TREATS.includes(id)

/** What a foot can find: one thing, one of eleven kinds of pair, or nothing. */
export type ActName =
  | ThingId
  | 'empty'
  | 'frog-mouse' | 'frog-porridge' | 'frog-bell' | 'frog-treat'
  | 'mouse-porridge' | 'mouse-bell' | 'mouse-treat'
  | 'porridge-bell' | 'porridge-treat' | 'bell-treat' | 'treat-treat'

const RANK: readonly string[] = ['frog', 'mouse', 'porridge', 'bell', 'treat']
const kindOf = (id: ThingId): string => (isTreat(id) ? 'treat' : id)

/** The most things one boot holds. */
export const DEEP = 2

/** The things in the order an act speaks of them: the livelier one first. */
export function inOrder(found: readonly ThingId[]): ThingId[] {
  return [...found].sort((a, b) => RANK.indexOf(kindOf(a)) - RANK.indexOf(kindOf(b)) || THINGS.indexOf(a) - THINGS.indexOf(b))
}

export function actOf(found: readonly ThingId[]): ActName {
  if (found.length === 0) return 'empty'
  if (found.length === 1) return found[0]
  const [a, b] = inOrder(found)
  return `${kindOf(a)}-${kindOf(b)}` as ActName
}
