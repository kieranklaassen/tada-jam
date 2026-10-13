// What the wood holds: six places to look in, four seasons, and what is under
// each cover in each season. It is the same every time, so a find can be found
// again. Pure data: no drawing, no clock, no chance.

export const PLACES = ['grass', 'log', 'stone', 'puddle', 'branch', 'burrow'] as const
export type PlaceId = (typeof PLACES)[number]

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

/** The six things that can be carried. There is one of each in the world. */
export const THINGS = ['worm', 'snail', 'feather', 'acorn', 'button', 'apple'] as const
export type ThingId = (typeof THINGS)[number]

/** Those who are met and stay where they live. */
export const DWELLERS = ['ladybird', 'mushroom', 'sleeper', 'tadpole', 'skater', 'leafboat', 'bubble', 'caterpillar', 'beetle', 'moth'] as const
export type DwellerId = (typeof DWELLERS)[number]

export type FindId = ThingId | DwellerId

/** Six places by four seasons. */
export const UNDER: Readonly<Record<PlaceId, Readonly<Record<Season, FindId>>>> = {
  grass: { spring: 'ladybird', summer: 'snail', autumn: 'worm', winter: 'button' },
  log: { spring: 'snail', summer: 'worm', autumn: 'mushroom', winter: 'sleeper' },
  stone: { spring: 'worm', summer: 'button', autumn: 'snail', winter: 'acorn' },
  puddle: { spring: 'tadpole', summer: 'skater', autumn: 'leafboat', winter: 'bubble' },
  branch: { spring: 'caterpillar', summer: 'feather', autumn: 'apple', winter: 'feather' },
  burrow: { spring: 'beetle', summer: 'moth', autumn: 'acorn', winter: 'worm' },
}

export function isPlace(value: unknown): value is PlaceId {
  return typeof value === 'string' && (PLACES as readonly string[]).includes(value)
}

export function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS as readonly string[]).includes(value)
}

export function isThing(value: unknown): value is ThingId {
  return typeof value === 'string' && (THINGS as readonly string[]).includes(value)
}

/** The season the wheel turns to next. */
export function nextSeason(season: Season): Season {
  return SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length]
}

/** The place a find is under in a season, or null when it has none then. */
export function placeOf(find: FindId, season: Season): PlaceId | null {
  for (const place of PLACES) if (UNDER[place][season] === find) return place
  return null
}

/** What shines, and so what the jay's eye is on. */
export function shines(find: FindId): boolean {
  return find === 'button'
}

/** Whether a find is one of the six things that can be carried. */
export function isCarried(find: FindId): find is ThingId {
  return (THINGS as readonly string[]).includes(find)
}

/** Every pair of two different things, each once, the two in the order of `THINGS`: the name of what they do together. */
export const PAIRS = [
  'worm+snail', 'worm+feather', 'worm+acorn', 'worm+button', 'worm+apple', 'snail+feather', 'snail+acorn', 'snail+button', 'snail+apple',
  'feather+acorn', 'feather+button', 'feather+apple', 'acorn+button', 'acorn+apple', 'button+apple',
] as const
export type PairId = (typeof PAIRS)[number]

export function pairOf(a: ThingId, b: ThingId): PairId {
  return (THINGS.indexOf(a) < THINGS.indexOf(b) ? `${a}+${b}` : `${b}+${a}`) as PairId
}

/** The two things of a pair, in the order of its name. */
export function membersOf(pair: PairId): [ThingId, ThingId] {
  return pair.split('+') as [ThingId, ThingId]
}
