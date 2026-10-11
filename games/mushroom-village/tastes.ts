import { GNOMES, SEATS, type GnomeId, type Kind } from './ground'

// The four gnomes' fixed tastes, as plain rules: which house fits whom, who
// goes when a house can be reached, and how each gnome carries himself in the
// house he has. Nothing here is a verdict on the child: a gnome's manner is
// about his house and his path.

/** What a gnome needs to know about a house. */
export type HouseFacts = {
  kind: Kind
  size: number
  /** A pebble lies at its doorstep. */
  pathLeads: boolean
  /** A puffball stands near it, or it is one. */
  puffNear: boolean
}

/** The tall gnome stands upright from this size; below it he stoops, and at `LOW` and under he bumps his hat and crawls in. */
export const TALL_FROM = 9
export const LOW = 4

/** Whether a house is to a gnome's taste. */
export function fits(who: GnomeId, house: HouseFacts): boolean {
  switch (who) {
    case 'tall': return house.size >= TALL_FROM
    case 'baker': return house.kind === 'bell'
    case 'sleepy': return !house.pathLeads
    case 'sneezy': return house.kind === 'red' && !house.puffNear
  }
}

/**
 * Who moves into a house that has a door and nobody in it. `startX` is where the pebbles from the log to its door
 * begin, or null when no pebbles lead there from the log. By pebbles anyone who waits can come; over the moss only
 * the sleepy one, and only where no pebble lies at the door. Of those who can come, the one the house fits goes,
 * and where it fits several or nobody, the one who sits nearest the path's start.
 */
export function whoMovesIn(waiting: readonly GnomeId[], house: HouseFacts, startX: number | null): GnomeId | null {
  const can = waiting.filter((who) => startX !== null || (who === 'sleepy' && !house.pathLeads))
  if (can.length === 0) return null
  const fitting = can.filter((who) => fits(who, house))
  const from = fitting.length > 0 ? fitting : can
  const near = (who: GnomeId) => (startX === null ? 0 : Math.abs(SEATS[who].x - startX))
  return [...from].sort((a, b) => near(a) - near(b) || GNOMES.indexOf(a) - GNOMES.indexOf(b))[0]
}

/**
 * How a gnome carries himself in his house, as his window shows it.
 * upright, kneading, asleep and sunning are the four fits; the others are what goes against a taste.
 */
export type Manner = 'upright' | 'stooped' | 'crawled' | 'kneading' | 'thirsty' | 'asleep' | 'woken' | 'sunning' | 'sniffing' | 'sneezing'

export function mannerOf(who: GnomeId, house: HouseFacts): Manner {
  switch (who) {
    case 'tall': return house.size >= TALL_FROM ? 'upright' : house.size > LOW ? 'stooped' : 'crawled'
    case 'baker': return house.kind === 'bell' ? 'kneading' : 'thirsty'
    case 'sleepy': return house.pathLeads ? 'woken' : 'asleep'
    case 'sneezy': return house.kind === 'puff' ? 'sneezing' : house.puffNear ? 'sniffing' : house.kind === 'red' ? 'sunning' : 'sniffing'
  }
}

/** Whether the tall gnome's hat lies on the doorstep of a house of this size. */
export function hatStaysOut(size: number): boolean {
  return size <= LOW
}
