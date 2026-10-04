import { LADDER } from './config'
import { isAmount, type Amount } from './ratio'

// The model of the world: what a camp is made of, and the sites the designed
// order lays out. Pure data and small reads of it; no renderer, no DOM.
//
// The design sheet (ART.md) is the source: "The designed order" for the
// positions and the number ranges, "The characters" for the campers. The
// ranges are the game's own choice, since no record the game is designed from
// sets one: nights of 4 to 12 hours (16 unfolded), 2 to 5 campers, amounts of
// at most 6 pieces for at most 3 hours on a card, and every total below 100.

export type Supply = 'logs' | 'oil' | 'water'
export const SUPPLIES: readonly Supply[] = ['logs', 'oil', 'water']

/** What uses a supply up: the fire takes logs, the lanterns oil, the kettle water. */
export type User = 'fire' | 'lantern' | 'kettle'
export const USERS: readonly User[] = ['fire', 'lantern', 'kettle']
export const SUPPLY_OF: Record<User, Supply> = { fire: 'logs', lantern: 'oil', kettle: 'water' }

export type CamperId = 'reader' | 'sleeper' | 'cook' | 'scout' | 'small'
export const CAMPERS: readonly CamperId[] = ['reader', 'sleeper', 'cook', 'scout', 'small']

/** The most pieces a rod holds. */
export const ROD_LENGTH: Record<Supply, number> = { logs: 60, oil: 12, water: 10 }
/** Water is laid in by the can and poured by the cup. */
export const CUPS_IN_A_CAN = 6
/** The places one piece takes on the sled's bed. */
export const PLACES: Record<Supply, number> = { logs: 1, oil: 2, water: 3 }
/** The folding ruler: each extra section the child unfolds adds this many hours, up to this many sections. */
export const SECTION_HOURS = 2
export const MAX_UNFOLDED = 2

/** How far the fire's light and warmth reach, in rings of tents round it. */
export type Ring = 1 | 2 | 3

export type FireSetting = { readonly amount: Amount; readonly reach: Ring }
/** One wick position of a lantern: what it burns, and whether its light also reaches the far tents of its pin. */
export type Wick = { readonly amount: Amount; readonly far: boolean }
/**
 * A place a lantern can stand: by one camper (`near`), on the side toward another (`far`). Where exactly it stands,
 * and so whom its light reaches on each wick, is read off the ground plan (ground.ts): the low wick lights the
 * camper it stands by, and the high wick reaches the other.
 */
export type Pin = { readonly near: readonly CamperId[]; readonly far: readonly CamperId[] }
export type Tent = { readonly camper: CamperId; readonly ring: Ring }

export type Site = {
  /** The position this site belongs to: an id from the ladder. */
  readonly position: string
  /** The night's length in hours, before the child unfolds the ruler. */
  readonly hours: number
  /** The campers, in the order the cook pours down the line. */
  readonly tents: readonly Tent[]
  /** The fire's dial. A site with one setting has no choice to make. */
  readonly fire: readonly FireSetting[]
  /** How many lanterns the site holds; they share one stock of oil. */
  readonly lanterns: number
  /** The low wick, then the high one. */
  readonly wicks: readonly [Wick, Wick]
  readonly pins: readonly Pin[]
  /** A round is poured for every camper each time this many hours have passed, starting at dusk. */
  readonly kettle: { readonly cups: number; readonly everyHours: number } | null
  /** The places on the sled's bed, or no sled and so no limit. */
  readonly sled: number | null
  /** A stock that arrives strapped on the sled and cannot be changed, at the position that turns the question round. */
  readonly given: Readonly<Partial<Record<Supply, number>>> | null
}

/** The move the scout shows at each position, once, after the child's own try: the id of its first showing. Three positions bring no move of their own. */
export const IDEAS: Readonly<Record<string, string | null>> = {
  meadow: 'strip',
  birchwood: 'dial',
  ford: 'round',
  spring: null,
  quarry: 'span',
  ridge: null,
  tarn: 'double',
  saddle: 'halve',
  summit: null,
}

/** Where a position brings no move of its own, the earlier move a tap on the scout plays there, with that site's own card and ruler. */
export const FETCHED: Readonly<Record<string, string>> = { spring: 'round', ridge: 'span', summit: 'halve' }

const per = (pieces: number, hours: number): Amount => ({ pieces, hours })
const fire = (...amounts: [Amount, Ring][]): FireSetting[] => amounts.map(([amount, reach]) => ({ amount, reach }))
const wicks = (low: Amount, high: Amount): [Wick, Wick] => [{ amount: low, far: false }, { amount: high, far: true }]
const NO_WICKS = wicks(per(1, 3), per(1, 2))
const tent = (camper: CamperId, ring: Ring): Tent => ({ camper, ring })
const pin = (near: CamperId[], far: CamperId[] = []): Pin => ({ near, far })
type Draft = Omit<Site, 'position' | 'lanterns' | 'wicks' | 'pins' | 'kettle' | 'sled' | 'given'> & Partial<Site>
const site = (position: string, draft: Draft): Site => ({ lanterns: 0, wicks: NO_WICKS, pins: [], kettle: null, sled: null, given: null, ...draft, position })

/**
 * The variants of each position. They differ only in their numbers. Every
 * variant but those of the position with a given load is chosen so that its
 * night, with both extra sections unfolded and every dial at its highest, can
 * still be supplied from the rods, and, where there is a sled, so that the
 * supplies for that unfolded night fit on its bed at some setting of the
 * dials; tests hold both. So a night of five campers pouring hourly, or one
 * with two lanterns, is a short one, and a long night burns low.
 */
export const SITES: Readonly<Record<string, readonly Site[]>> = {
  // A stock, an amount for one hour, and a night.
  meadow: [
    site('meadow', { hours: 6, tents: [tent('scout', 1), tent('small', 2)], fire: fire([per(3, 1), 2]) }),
    site('meadow', { hours: 5, tents: [tent('scout', 2), tent('small', 1)], fire: fire([per(4, 1), 2]) }),
    site('meadow', { hours: 8, tents: [tent('scout', 1), tent('small', 1)], fire: fire([per(2, 1), 2]) }),
  ],
  // Choosing the amount: three settings, and tents at different distances.
  birchwood: [
    site('birchwood', { hours: 8, tents: [tent('cook', 1), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]) }),
    site('birchwood', { hours: 6, tents: [tent('cook', 1), tent('sleeper', 2), tent('scout', 2)], fire: fire([per(3, 1), 1], [per(4, 1), 2], [per(6, 1), 3]) }),
    site('birchwood', { hours: 10, tents: [tent('cook', 1), tent('scout', 3), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]) }),
  ],
  // The kettle: a second multiplier. In every variant the cups of the night as laid out come out as whole cans.
  ford: [
    site('ford', { hours: 6, tents: [tent('cook', 1), tent('reader', 2), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
    site('ford', { hours: 8, tents: [tent('cook', 1), tent('small', 1), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
    site('ford', { hours: 9, tents: [tent('cook', 1), tent('reader', 2), tent('small', 1), tent('scout', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
  ],
  // A remainder that means one more: the kettle again, and in no variant do the cups come out as whole cans.
  spring: [
    site('spring', { hours: 7, tents: [tent('cook', 1), tent('small', 1), tent('scout', 2), tent('reader', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
    site('spring', { hours: 8, tents: [tent('cook', 1), tent('reader', 2), tent('small', 1), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
    site('spring', { hours: 7, tents: [tent('cook', 1), tent('reader', 3), tent('small', 2), tent('scout', 2), tent('sleeper', 1)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
  ],
  // The lantern: one flask for a span longer than one hour.
  quarry: [
    site('quarry', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['cook'])] }),
    site('quarry', { hours: 7, tents: [tent('cook', 1), tent('reader', 3), tent('small', 3), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['cook']), pin(['small'], ['scout'])] }),
    site('quarry', { hours: 9, tents: [tent('cook', 1), tent('reader', 2), tent('sleeper', 3), tent('scout', 1)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['cook'])] }),
  ],
  // The sled: a bed with only so many places, and all three supplies on it.
  ridge: [
    site('ridge', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['cook'])], kettle: { cups: 1, everyHours: 1 }, sled: 56 }),
    site('ridge', { hours: 6, tents: [tent('cook', 1), tent('reader', 2), tent('small', 3), tent('scout', 2), tent('sleeper', 1)], fire: fire([per(2, 1), 1], [per(4, 1), 2], [per(6, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['small'], ['scout']), pin(['reader'], ['sleeper'])], kettle: { cups: 1, everyHours: 1 }, sled: 56 }),
    site('ridge', { hours: 9, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('small', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['cook']), pin(['small'], ['scout'])], kettle: { cups: 1, everyHours: 1 }, sled: 63 }),
  ],
  // Several pieces for several hours: neither number on a card is one.
  tarn: [
    site('tarn', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(3, 2), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(2, 3)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['cook'])], kettle: { cups: 1, everyHours: 3 }, sled: 40 }),
    site('tarn', { hours: 9, tents: [tent('cook', 1), tent('reader', 2), tent('small', 3), tent('scout', 2), tent('sleeper', 1)], fire: fire([per(2, 3), 1], [per(4, 3), 2], [per(6, 3), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(2, 3)), pins: [pin(['small'], ['scout']), pin(['reader'], ['sleeper'])], kettle: { cups: 1, everyHours: 3 }, sled: 36 }),
    site('tarn', { hours: 10, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2)], fire: fire([per(4, 3), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(2, 3)), pins: [pin(['reader'], ['cook']), pin(['scout'], ['cook'])], kettle: { cups: 2, everyHours: 2 }, sled: 54 }),
  ],
  // The question turned round: the stock is given, and the dials are set so that it lasts.
  saddle: [
    site('saddle', { hours: 10, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 2), per(2, 3)), pins: [pin(['reader'], ['cook']), pin(['scout'], ['cook'])], given: { logs: 30, oil: 5, water: 0 } }),
    site('saddle', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('sleeper', 2)], fire: fire([per(3, 2), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 1, wicks: wicks(per(1, 2), per(2, 3)), pins: [pin(['reader'], ['sleeper']), pin(['reader'], ['cook'])], kettle: { cups: 2, everyHours: 2 }, given: { logs: 20, oil: 4, water: 4 } }),
    site('saddle', { hours: 12, tents: [tent('cook', 1), tent('reader', 2), tent('small', 3), tent('scout', 2)], fire: fire([per(3, 2), 1], [per(2, 1), 2], [per(3, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['small'], ['scout']), pin(['reader'], ['cook'])], given: { logs: 24, oil: 6, water: 0 } }),
  ],
  // Nothing new: everything together. Two lanterns on one rod of oil keep these nights to eight hours.
  summit: [
    site('summit', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('small', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), lanterns: 2, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['small'], ['scout']), pin(['scout'], ['cook'])], kettle: { cups: 1, everyHours: 2 }, sled: 56 }),
    site('summit', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('small', 2), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(3, 2), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 2, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['cook']), pin(['small'], ['scout'])], kettle: { cups: 1, everyHours: 3 }, sled: 46 }),
    site('summit', { hours: 7, tents: [tent('cook', 1), tent('reader', 3), tent('small', 3), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 2, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['cook']), pin(['small'], ['scout']), pin(['scout'], ['cook'])], kettle: { cups: 1, everyHours: 2 }, sled: 50 }),
  ],
}

/** The site a position lays out for a variant count. An id the game does not know, or a damaged count, gives the first site of the first position. */
export function siteFor(position: string, variant: number): Site {
  const sites = SITES[position] ?? SITES[LADDER[0]]
  const n = Number.isInteger(variant) && variant >= 0 ? variant : 0
  return sites[n % sites.length]
}

/** How many extra sections the ruler has at a site. Where the load is given for the night as laid out, there is none to unfold. */
export function sectionsAt(site: Site): number {
  return site.given ? 0 : MAX_UNFOLDED
}

/** The night's length with the sections the child unfolded. */
export function nightHours(site: Site, unfolded: number): number {
  return site.hours + SECTION_HOURS * Math.max(0, Math.min(sectionsAt(site), Math.trunc(unfolded) || 0))
}

/** The sides an amount card can lie on. Halved comes with the position that brings several pieces for several hours. */
export type Side = 'halved' | 'single' | 'doubled'
export const SIDES: readonly Side[] = ['halved', 'single', 'doubled']
export function sidesAt(site: Site): Side[] {
  return LADDER.indexOf(site.position) >= LADDER.indexOf('tarn') ? ['single', 'doubled', 'halved'] : ['single', 'doubled']
}

/** Which users a site holds. The fire is at every site. */
export function usersAt(site: Site): User[] {
  return USERS.filter((user) => user === 'fire' || (user === 'lantern' ? site.lanterns > 0 : site.kettle !== null))
}

/** Every amount on a card at this site, for the checks that hold the number ranges. */
export function amountsAt(site: Site): Amount[] {
  // The kettle's card is a round for the whole line: a cup for each camper, under the hours between two rounds.
  return [...site.fire.map((setting) => setting.amount), ...(site.lanterns > 0 ? site.wicks.map((wick) => wick.amount) : []), ...(site.kettle ? [{ pieces: site.kettle.cups * site.tents.length, hours: site.kettle.everyHours }] : [])].filter(isAmount)
}
