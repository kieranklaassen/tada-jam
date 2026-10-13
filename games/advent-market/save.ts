import { COLOURS } from './candle'
import { CLOTHS_OFF_FROM } from './config'
import { BASKET, WHO, type Who } from './hall'
import { PLACES, STALLS, type Place, type Stall } from './places'
import { deserialize as readBase, freshState, isReadable, isRecord, serialize as writeBase, type GameState } from './state'
import { copyThing, fresh, isMade, readThing, type Biscuit, type CandleThing, type Star, type Thing, type Wreath } from './things'

// What the fair keeps, on top of the template's fields (state.ts). Every
// field is named in the sheet's table; `pot` is the one this file adds to it
// (the colour of the wax in the big pot, which nothing else would remember
// while the wick is bare). Nothing is saved in the air: a thing in the hand
// is saved where it came from.

export type Save = GameState & {
  /** Where in the hall the child stands. */
  at: Place
  /** For each stall, whether its cloth is off. */
  uncovered: Record<Stall, boolean>
  /** The piece in work on each bench. */
  candle: CandleThing
  star: Star
  wreath: Wreath
  biscuit: Biscuit
  /** The colour of the wax in the big pot. */
  pot: number
  /** Up to six things, in the order they were laid in. */
  basket: Thing[]
  /** For each of the five fair-goers, the thing it holds or nothing, with the mark its reaction left. */
  held: Record<Who, Thing | null>
  /** Where the stream of chance stands. */
  chance: number
}

const emptyHands = (): Record<Who, Thing | null> => ({ tuba: null, maker: null, baker: null, bundle: null, goat: null })

/** A first visit: the candle stall, every bench with its fresh piece in gold, and the cloths laid out by the age hint. A cloth lifts at any age. */
export function freshSave(childAge: number | null, chance: number): Save {
  const off = childAge !== null && childAge >= CLOTHS_OFF_FROM
  return {
    ...freshState(childAge),
    at: 'candle',
    uncovered: { candle: off, star: off, wreath: off, biscuit: off },
    candle: fresh('candle') as CandleThing,
    star: fresh('star') as Star,
    wreath: fresh('wreath') as Wreath,
    biscuit: fresh('biscuit') as Biscuit,
    pot: 0,
    basket: [],
    held: emptyHands(),
    chance: chance >>> 0,
  }
}

/** Saved state is untrusted: the template's fields are read by state.ts, and each of the fair's own is repaired by itself. */
export function deserialize(raw: unknown, childAge: number | null, chance: number): Save {
  const base = readBase(raw, childAge), start = freshSave(childAge, chance)
  if (!isReadable(raw)) return start
  const basket: Thing[] = []
  if (Array.isArray(raw.basket)) {
    for (const item of raw.basket) {
      if (basket.length >= BASKET.slots) break
      const thing = readThing(item)
      // A bench's untouched piece is no made thing and never lies in the basket.
      if (thing && isMade(thing)) basket.push(thing)
    }
  }
  const held = emptyHands()
  if (isRecord(raw.held)) for (const who of WHO) {
    const thing = readThing(raw.held[who])
    if (thing && isMade(thing)) held[who] = thing
  }
  const uncovered = { ...start.uncovered }
  if (isRecord(raw.uncovered)) for (const stall of STALLS) if (typeof raw.uncovered[stall] === 'boolean') uncovered[stall] = raw.uncovered[stall] as boolean
  const stored = raw.chance
  return {
    ...base,
    at: PLACES.find((place) => place === raw.at) ?? start.at,
    uncovered,
    candle: (readThing(raw.candle, 'candle') as CandleThing | null) ?? start.candle,
    star: (readThing(raw.star, 'star') as Star | null) ?? start.star,
    wreath: (readThing(raw.wreath, 'wreath') as Wreath | null) ?? start.wreath,
    biscuit: (readThing(raw.biscuit, 'biscuit') as Biscuit | null) ?? start.biscuit,
    pot: typeof raw.pot === 'number' && Number.isInteger(raw.pot) && raw.pot >= 0 && raw.pot < COLOURS.length ? raw.pot : 0,
    basket,
    held,
    chance: typeof stored === 'number' && Number.isInteger(stored) && stored >= 0 && stored <= 0xffffffff ? stored : chance >>> 0,
  }
}

export function serialize(save: Save): Save {
  const held = emptyHands()
  for (const who of WHO) held[who] = save.held[who] ? copyThing(save.held[who]) : null
  return {
    ...writeBase(save),
    at: save.at,
    uncovered: { ...save.uncovered },
    candle: copyThing(save.candle),
    star: copyThing(save.star),
    wreath: copyThing(save.wreath),
    biscuit: copyThing(save.biscuit),
    pot: save.pot,
    basket: save.basket.slice(0, BASKET.slots).map(copyThing),
    held,
    chance: save.chance >>> 0,
  }
}
