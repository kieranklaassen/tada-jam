// The characters and their fixed tastes, as a table. No renderer and no DOM.
// Four animals and the truck: each has one want, and likes and dislikes that
// never change, so a child can learn them and test them on purpose (ART.md,
// "The characters and their fixed tastes").
//
// A taste is about what happens to a character or near it. No character has a
// feeling about the child. The seven things of the grid have no tastes.

export const CHARACTERS = ['truck', 'cat', 'duck', 'snail', 'bee'] as const
export type Character = (typeof CHARACTERS)[number]

/** What can happen to a character or near it. */
export const HAPPENINGS = [
  'something-to-aim-at',
  'water-on-me',
  'wet-ground-under-me',
  'dry-sand',
  'puddle',
  'fire-lit',
  'fire-out',
  'heat',
  'on-roof',
  'afloat',
  'ride-over-rim',
  'dry-pool-floor',
  'flower-open',
  'drops-on-wings',
] as const
export type Happening = (typeof HAPPENINGS)[number]

export type Feeling = 'likes' | 'dislikes' | 'indifferent'

/** What a character does about a happening: a cue for the view. */
type Cues = Readonly<Partial<Record<Happening, string>>>

export type Taste = {
  /** The one thing it wants. */
  readonly want: string
  readonly likes: Cues
  readonly dislikes: Cues
  /** What it does about anything it has no taste for. */
  readonly unmoved: string
}

export const TASTES: Readonly<Record<Character, Taste>> = {
  /** It leans toward what it can squirt, with its roof light turning. It has no dislikes. */
  truck: {
    want: 'to-squirt',
    likes: { 'something-to-aim-at': 'truck-leans-in' },
    dislikes: {},
    unmoved: 'truck-settles',
  },
  /** The joke is on her every time. She is put out and never hurt. */
  cat: {
    want: 'a-warm-dry-place',
    likes: { 'fire-lit': 'cat-eyes-shut', 'dry-sand': 'cat-curls-up', 'on-roof': 'cat-washes-paw' },
    dislikes: { 'water-on-me': 'cat-glares', 'wet-ground-under-me': 'cat-lifts-paws', 'fire-out': 'cat-tail-up' },
    unmoved: 'cat-blinks',
  },
  /** Sprayed, it wriggles and quacks. A dry pool floor it taps with its beak. */
  duck: {
    want: 'to-float',
    likes: { afloat: 'duck-paddles', 'water-on-me': 'duck-wriggles', puddle: 'duck-waddles-through', 'ride-over-rim': 'duck-rides-out' },
    dislikes: { 'dry-pool-floor': 'duck-taps-floor' },
    unmoved: 'duck-preens',
  },
  /** It glides along dark sand. On dry sand it stops and pulls in. */
  snail: {
    want: 'wet-ground',
    likes: { 'wet-ground-under-me': 'snail-glides', puddle: 'snail-eyes-unroll' },
    dislikes: { 'dry-sand': 'snail-pulls-in', heat: 'snail-turns-away' },
    unmoved: 'snail-waits',
  },
  /** She lands on an open flower. Drops send her zigzagging up until the water stops. */
  bee: {
    want: 'a-flower',
    likes: { 'flower-open': 'bee-lands' },
    dislikes: { 'drops-on-wings': 'bee-zigzags-up' },
    unmoved: 'bee-circles',
  },
}

export type Reaction = { readonly feeling: Feeling; readonly cue: string }

/** What a character thinks of a happening, and what the view shows for it. The same question always has the same answer. */
export function reactionOf(character: Character, happening: Happening): Reaction {
  const taste = TASTES[character]
  const liked = taste.likes[happening]
  if (liked !== undefined) return { feeling: 'likes', cue: liked }
  const disliked = taste.dislikes[happening]
  if (disliked !== undefined) return { feeling: 'dislikes', cue: disliked }
  return { feeling: 'indifferent', cue: taste.unmoved }
}

/**
 * What a gulp of water that lands on or beside an animal is to that animal.
 * It is the same water: the duck is sprayed, the snail's sand turns dark, the
 * cat is wet, and the bee has drops on her wings.
 */
export const WATER_IS: Readonly<Record<Exclude<Character, 'truck'>, Happening>> = {
  cat: 'water-on-me',
  duck: 'water-on-me',
  snail: 'wet-ground-under-me',
  bee: 'drops-on-wings',
}
