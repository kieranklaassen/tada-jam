import { isBlanket, type Build, type Kind } from './build'

// What a place on the brook answers, and what the gnome thinks: both follow
// from the boat as built and are never stored.

/** The rows of the brook grid, in the order a place answers them. */
export type Trait = 'broad' | 'nosail' | 'twomasts' | 'pebble' | 'walnut' | 'berry'
export const TRAITS: readonly Trait[] = ['broad', 'nosail', 'twomasts', 'pebble', 'walnut', 'berry']

/** The five makings that change a row of the brook grid in a way that follows from the thing. */
export type Twist = 'pod' | 'stalk' | 'stem' | 'feather' | 'cap'

/** Whether a broad sail stands where it takes the wind: a maple leaf on a mast that is not the bendy stem, which spills it. */
export function hasBroadSail(build: Build): boolean {
  return ([0, 1] as const).some((index) => build.sails[index] === 'maple' && build.masts[index] !== 'stem')
}

export function hasSail(build: Build): boolean {
  return build.sails[0] !== null || build.sails[1] !== null
}

/** The traits of a boat, in the order of the grid's rows. A boat can have several, or none. */
export function traitsOf(build: Build): Trait[] {
  const traits: Trait[] = []
  if (hasBroadSail(build)) traits.push('broad')
  if (!hasSail(build)) traits.push('nosail')
  if (build.masts[0] !== null && build.masts[1] !== null) traits.push('twomasts')
  if (build.deck.includes('pebble')) traits.push('pebble')
  if (build.hull === 'walnut') traits.push('walnut')
  if (build.deck.includes('berry')) traits.push('berry')
  return traits
}

export function twistsOf(build: Build): Twist[] {
  const twists: Twist[] = []
  if (build.hull === 'pod') twists.push('pod')
  if (build.masts.includes('stalk')) twists.push('stalk')
  if (([0, 1] as const).some((index) => build.sails[index] === 'maple' && build.masts[index] === 'stem')) twists.push('stem')
  if (build.sails.includes('feather')) twists.push('feather')
  if (build.deck.includes('cap')) twists.push('cap')
  return twists
}

/** How fast the brook carries the boat between places, in stage units a second: a broad sail runs, a bare boat crawls. */
export function paceOf(build: Build): number {
  if (hasBroadSail(build)) return 230
  return hasSail(build) ? 150 : 96
}

/**
 * The gnome's fixed opinion of the boat as it stands. A blanket hides him whatever else is aboard; then the
 * pebble, which he cannot stand; then the feather, which makes his nose itch; then a broad sail, which he
 * loves; then the berry; and a boat with none of these he finds plain.
 */
export type Mood = 'under' | 'glum' | 'itchy' | 'glee' | 'yum' | 'plain'

export function moodOf(build: Build): Mood {
  if (build.deck.some((_, index) => isBlanket(build, index))) return 'under'
  if (build.deck.includes('pebble')) return 'glum'
  if (build.sails.includes('feather')) return 'itchy'
  if (hasBroadSail(build)) return 'glee'
  if (build.deck.includes('berry')) return 'yum'
  return 'plain'
}

/** What the gnome does on the frame a thing lands on his boat: one answer for each thing, the same every time. */
export type Opinion = 'ha' | 'whoop' | 'hm' | 'sneeze' | 'mmm' | 'giggle' | 'grumble' | 'tuck'

export function opinionOf(kind: Kind, on: 'mast' | 'sail' | 'deck'): Opinion {
  if (on === 'mast') return 'ha'
  if (on === 'sail') return kind === 'maple' ? 'whoop' : kind === 'feather' ? 'sneeze' : 'hm'
  if (kind === 'berry') return 'mmm'
  if (kind === 'pebble') return 'grumble'
  if (kind === 'cap') return 'giggle'
  // A leaf or a feather on the deck is a blanket, every time.
  return 'tuck'
}
