import { TRAITS, type Joints, type Look, type Trait } from './plant'

// The characters' fixed tastes, and how a visitor answers a plant.
//
// A visitor's likes never change, so a child can learn them and test them on
// purpose. Its wish is those likes, cut down to the traits it asks about. It
// answers the exact plant it is offered, trait by trait, likes first; a miss
// names the trait that missed and what was seen there, so the view can play
// the same small joke for the same miss every time. Nothing here rates the
// child: an answer is about the plant.

export const VISITORS = ['snail', 'bee', 'moth', 'ladybird', 'ant'] as const
export type VisitorId = (typeof VISITORS)[number]

/** What each visitor likes, for good. A height is liked as it is seen, in joints, however the plant came by it. */
export const LIKES: Record<VisitorId, Look> = {
  snail: { colour: 'red', joints: 2, leaf: 'round', petals: 'plain' },
  bee: { colour: 'white', joints: 4, leaf: 'round', petals: 'spotted' },
  moth: { colour: 'white', joints: 4, leaf: 'jagged', petals: 'plain' },
  ladybird: { colour: 'red', joints: 2, leaf: 'jagged', petals: 'spotted' },
  ant: { colour: 'pink', joints: 1, leaf: 'round', petals: 'plain' },
}

export function isVisitorId(value: unknown): value is VisitorId {
  return typeof value === 'string' && (VISITORS as readonly string[]).includes(value)
}

/** The part of a plant one trait shows. */
export type Seen = Look[keyof Look]

function seen(look: Look, trait: Trait): Seen {
  return trait === 'height' ? look.joints : look[trait]
}

/** What a visitor wants where it asks about these traits: the plant its sketch shows. */
export function wanted(who: VisitorId, asks: readonly Trait[]): Partial<Look> {
  const likes = LIKES[who]
  const sketch: Partial<Look> = {}
  for (const trait of TRAITS) {
    if (!asks.includes(trait)) continue
    if (trait === 'height') sketch.joints = likes.joints
    else if (trait === 'colour') sketch.colour = likes.colour
    else if (trait === 'leaf') sketch.leaf = likes.leaf
    else sketch.petals = likes.petals
  }
  return sketch
}

/** One trait of an answer: whether the plant fits the visitor there, and what the visitor saw. */
export type TraitAnswer = { trait: Trait; fits: boolean; seen: Seen; liked: Seen }

/**
 * How a visitor answers a plant, over the traits its open sketch shows. The
 * traits it likes come first and the misses after them, each group in the
 * order of the plant from the flower down, so one offer tells the child which
 * traits fit and which one does not.
 */
export function answer(who: VisitorId, asks: readonly Trait[], look: Look): TraitAnswer[] {
  const likes = LIKES[who]
  const answers = TRAITS.filter((trait) => asks.includes(trait)).map((trait) => {
    const saw = seen(look, trait), liked = seen(likes, trait)
    return { trait, fits: saw === liked, seen: saw, liked }
  })
  return [...answers.filter((one) => one.fits), ...answers.filter((one) => !one.fits)]
}

export function fits(who: VisitorId, asks: readonly Trait[], look: Look): boolean {
  return answer(who, asks, look).every((one) => one.fits)
}

/** For a miss in height: whether the plant stood higher or lower than the visitor likes. The two play differently. */
export function heightMiss(who: VisitorId, joints: Joints): 'higher' | 'lower' | null {
  const liked = LIKES[who].joints
  return joints > liked ? 'higher' : joints < liked ? 'lower' : null
}

// --- The secrets -------------------------------------------------------------

/**
 * Fixed combinations that always give the same short scene. They are never
 * hinted at, nothing counts them and nothing marks one as found; a save keeps
 * no trace of them. Each works every time, so it can be shown to someone.
 */
export const SECRETS = ['hat', 'vanish'] as const
export type SecretId = (typeof SECRETS)[number]

export function secretOf(who: VisitorId, look: Look): SecretId | null {
  // A one-joint plant offered to the snail is worn as a hat.
  if (who === 'snail' && look.joints === 1) return 'hat'
  // A red spotted flower hides the ladybird so well that the beetle walks into it.
  if (who === 'ladybird' && look.colour === 'red' && look.petals === 'spotted') return 'vanish'
  return null
}
