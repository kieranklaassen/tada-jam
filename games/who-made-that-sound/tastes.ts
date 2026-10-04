import { type Family, type Kind, familyOf } from './voices'

// The characters' fixed tastes (ART.md, "The characters and their fixed
// tastes"). What a kind does on hearing a voice never changes, so a child can
// learn it and bring it about on purpose. These reactions are the game's only
// feedback: a reaction is to the voice just heard and never to the child.

/** In step with its own voice, puzzled by its near voice, and one family it loves and one it shies from. */
export type Reaction = 'in-step' | 'puzzled' | 'delighted' | 'startled'

export type Taste = {
  loves: Family
  shies: Family
  /** What the body does when it hears the family it loves: its own move, shared with no other kind. */
  delight: string
  /** What the body does when it hears the family it shies from. Surprise, never hurt, and over within the scene. */
  startle: string
}

/** The two kinds of one family have opposite tastes, which is one more way to tell them apart. */
export const TASTES: Readonly<Record<Kind, Taste>> = {
  pip: { loves: 'low', shies: 'glide', delight: 'bounces-on-the-note', startle: 'stiff-as-a-brush' },
  tok: { loves: 'glide', shies: 'low', delight: 'pecks-along', startle: 'falls-over-backwards' },
  hoom: { loves: 'high', shies: 'glide', delight: 'belly-giggles', startle: 'eyes-swing-after-the-glide' },
  brrl: { loves: 'glide', shies: 'high', delight: 'neck-sways', startle: 'shrinks-down' },
  wheep: { loves: 'low', shies: 'high', delight: 'stretches-tall', startle: 'ducks' },
  dooo: { loves: 'high', shies: 'low', delight: 'stands-straight-and-its-ears-flick', startle: 'melts-flat' },
}

/** What `listener` does on hearing the voice of `heard`. */
export function reactionOf(listener: Kind, heard: Kind): Reaction {
  if (listener === heard) return 'in-step'
  if (familyOf(listener) === familyOf(heard)) return 'puzzled'
  return TASTES[listener].loves === familyOf(heard) ? 'delighted' : 'startled'
}

/** The move the view plays for that reaction: one of the listener's own, never another kind's. */
export function moveOf(listener: Kind, heard: Kind): string {
  const reaction = reactionOf(listener, heard)
  if (reaction === 'delighted') return TASTES[listener].delight
  if (reaction === 'startled') return TASTES[listener].startle
  return `${listener}-${reaction}`
}

/** A meeting of two who have just heard each other: each reacts by its own taste. */
export type Meeting = { asker: Kind; other: Kind; askerDoes: Reaction; otherDoes: Reaction; match: boolean }

export function meetingOf(asker: Kind, other: Kind): Meeting {
  return { asker, other, askerDoes: reactionOf(asker, other), otherDoes: reactionOf(other, asker), match: asker === other }
}
