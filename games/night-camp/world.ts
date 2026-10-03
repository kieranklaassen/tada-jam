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
/** A place a lantern can stand, and whose tent it lights from there. */
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

/** The new thing each position brings, as the id of its first showing. The last position brings nothing new. */
export const IDEAS: Readonly<Record<string, string | null>> = {
  meadow: 'strip',
  birchwood: 'dial',
  ford: 'round',
  quarry: 'span',
  ridge: 'sled',
  tarn: 'double',
  saddle: 'halve',
  summit: null,
}

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
 * variant is chosen so that its night, with both extra sections unfolded and
 * every dial at its highest, can still be supplied from the rods; a test holds
 * that. So a night of five campers pouring hourly, or one with two lanterns,
 * is a short one, and a long night burns low.
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
  // The kettle: a second multiplier. In the first variant the cups come out as whole cans; from the second a part can means one more.
  ford: [
    site('ford', { hours: 6, tents: [tent('cook', 1), tent('reader', 2), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
    site('ford', { hours: 7, tents: [tent('cook', 1), tent('small', 1), tent('scout', 2), tent('reader', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
    site('ford', { hours: 8, tents: [tent('cook', 1), tent('reader', 2), tent('small', 1), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), kettle: { cups: 1, everyHours: 1 } }),
  ],
  // The lantern: one flask for a span longer than one hour.
  quarry: [
    site('quarry', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['reader'])] }),
    site('quarry', { hours: 7, tents: [tent('cook', 1), tent('reader', 3), tent('small', 3), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['small']), pin(['small'], ['scout'])] }),
    site('quarry', { hours: 9, tents: [tent('cook', 1), tent('reader', 2), tent('sleeper', 3), tent('scout', 1)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['sleeper'], ['reader'])] }),
  ],
  // The sled: a bed with only so many places, and all three supplies on it.
  ridge: [
    site('ridge', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['reader'])], kettle: { cups: 1, everyHours: 2 }, sled: 42 }),
    site('ridge', { hours: 6, tents: [tent('cook', 1), tent('reader', 2), tent('small', 3), tent('scout', 2), tent('sleeper', 1)], fire: fire([per(3, 1), 1], [per(4, 1), 2], [per(6, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['small'], ['reader']), pin(['reader'], ['sleeper'])], kettle: { cups: 1, everyHours: 1 }, sled: 44 }),
    site('ridge', { hours: 10, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('small', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['small']), pin(['small'], ['scout'])], kettle: { cups: 1, everyHours: 2 }, sled: 52 }),
  ],
  // Several pieces for several hours: neither number on a card is one.
  tarn: [
    site('tarn', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(3, 2), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 1, wicks: wicks(per(1, 2), per(2, 3)), pins: [pin(['reader'], ['sleeper']), pin(['scout'], ['reader'])], kettle: { cups: 2, everyHours: 3 }, sled: 44 }),
    site('tarn', { hours: 9, tents: [tent('cook', 1), tent('reader', 2), tent('small', 3), tent('scout', 2), tent('sleeper', 1)], fire: fire([per(4, 3), 1], [per(5, 3), 2], [per(6, 3), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(2, 3)), pins: [pin(['small'], ['reader']), pin(['reader'], ['sleeper'])], kettle: { cups: 2, everyHours: 3 }, sled: 42 }),
    site('tarn', { hours: 10, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2)], fire: fire([per(4, 3), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(2, 3)), pins: [pin(['reader'], ['scout']), pin(['scout'], ['reader'])], kettle: { cups: 2, everyHours: 2 }, sled: 54 }),
  ],
  // The question turned round: the stock is given, and the dials are set so that it lasts.
  saddle: [
    site('saddle', { hours: 10, tents: [tent('cook', 1), tent('reader', 3), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 1, wicks: wicks(per(1, 2), per(2, 3)), pins: [pin(['reader'], ['scout']), pin(['scout'], ['reader'])], given: { logs: 30, oil: 5, water: 0 } }),
    site('saddle', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('sleeper', 2)], fire: fire([per(3, 2), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 1, wicks: wicks(per(1, 2), per(2, 3)), pins: [pin(['reader'], ['sleeper']), pin(['sleeper'], ['reader'])], kettle: { cups: 2, everyHours: 2 }, given: { logs: 20, oil: 4, water: 4 } }),
    site('saddle', { hours: 12, tents: [tent('cook', 1), tent('reader', 2), tent('small', 3), tent('scout', 2)], fire: fire([per(3, 2), 1], [per(2, 1), 2], [per(3, 1), 3]), lanterns: 1, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['small'], ['reader']), pin(['reader'], ['small'])], given: { logs: 24, oil: 6, water: 0 } }),
  ],
  // Nothing new: everything together. Two lanterns on one rod of oil keep these nights to eight hours.
  summit: [
    site('summit', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('small', 3), tent('scout', 2), tent('sleeper', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(5, 1), 3]), lanterns: 2, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['small'], ['scout']), pin(['scout'], ['reader'])], kettle: { cups: 1, everyHours: 1 }, sled: 58 }),
    site('summit', { hours: 8, tents: [tent('cook', 1), tent('reader', 3), tent('small', 2), tent('scout', 2), tent('sleeper', 3)], fire: fire([per(3, 2), 1], [per(5, 2), 2], [per(6, 2), 3]), lanterns: 2, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['sleeper']), pin(['sleeper'], ['small']), pin(['small'], ['reader'])], kettle: { cups: 2, everyHours: 3 }, sled: 48 }),
    site('summit', { hours: 7, tents: [tent('cook', 1), tent('reader', 3), tent('small', 3), tent('scout', 2)], fire: fire([per(2, 1), 1], [per(3, 1), 2], [per(4, 1), 3]), lanterns: 2, wicks: wicks(per(1, 3), per(1, 2)), pins: [pin(['reader'], ['scout']), pin(['small'], ['reader']), pin(['scout'], ['small'])], kettle: { cups: 1, everyHours: 1 }, sled: 47 }),
  ],
}

/** The site a position lays out for a variant count. An id the game does not know, or a damaged count, gives the first site of the first position. */
export function siteFor(position: string, variant: number): Site {
  const sites = SITES[position] ?? SITES[LADDER[0]]
  const n = Number.isInteger(variant) && variant >= 0 ? variant : 0
  return sites[n % sites.length]
}

/** The night's length with the sections the child unfolded. */
export function nightHours(site: Site, unfolded: number): number {
  return site.hours + SECTION_HOURS * Math.max(0, Math.min(MAX_UNFOLDED, Math.trunc(unfolded) || 0))
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
  return [...site.fire.map((setting) => setting.amount), ...(site.lanterns > 0 ? site.wicks.map((wick) => wick.amount) : [])].filter(isAmount)
}
