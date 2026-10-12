import type { Who } from './hall'
import type { Taste } from './natures'
import { MARK, colourOf, copyThing, sizeOf, type Craft, type Thing } from './things'

// The five fixed tastes, and what each fair-goer's reaction leaves of a thing
// it is given. A taste never changes and is about the thing, never about the
// child: a like and a dislike are equally worth causing.

/** She likes fat and large and dislikes thin and small; the bundle is the other way round. The baker likes red and dislikes green, the goat likes green and sneezes at gold, the tuba player likes gold and red sours his tune. */
export function tasteOf(who: Who, thing: Thing): Taste {
  const size = sizeOf(thing), colour = colourOf(thing)
  switch (who) {
    case 'maker':
      return size === 2 ? 'like' : size === 0 ? 'dislike' : 'plain'
    case 'bundle':
      return size === 0 ? 'like' : size === 2 ? 'dislike' : 'plain'
    case 'baker':
      return colour === 1 ? 'like' : colour === 2 ? 'dislike' : 'plain'
    case 'goat':
      return colour === 2 ? 'like' : colour === 0 ? 'dislike' : 'plain'
    case 'tuba':
      return colour === 0 ? 'like' : colour === 1 ? 'dislike' : 'plain'
  }
}

/** The mark each one's reaction leaves on each craft: he blows a candle out, the goat chews, her fist crumples paper and she bites, the bundle nibbles. */
const MARKS: Record<Who, Partial<Record<Craft, number>>> = {
  maker: { star: MARK.crumpled, biscuit: MARK.bitten },
  baker: { candle: MARK.blown },
  goat: { candle: MARK.chewed, star: MARK.chewed, wreath: MARK.chewed },
  tuba: {},
  bundle: { biscuit: MARK.bitten },
}

export function markFor(who: Who, craft: Craft): number {
  return MARKS[who][craft] ?? MARK.none
}

/** A biscuit the goat swallows or the tuba fires out is gone. */
export function eats(who: Who, craft: Craft): boolean {
  return craft === 'biscuit' && (who === 'goat' || who === 'tuba')
}

/** What is eaten off the thing it sits on: a biscuit as above, and a paper star by the goat, which eats it off first. */
export function eatsOff(who: Who, craft: Craft): boolean {
  return eats(who, craft) || (who === 'goat' && craft === 'star')
}

/**
 * What a fair-goer is left holding once its reaction to a thing is over, as a save keeps it from the moment the
 * thing is given: the thing with the mark the reaction leaves, or nothing where it was eaten. A thing that
 * carries another is answered pair-wise: the one on top first, then the one under it.
 */
export function leftWith(who: Who, given: Thing): Thing | null {
  if (eats(who, given.craft)) return null
  const thing = copyThing(given)
  if (thing.on) {
    if (eatsOff(who, thing.on.craft)) thing.on = null
    else thing.on.mark = markFor(who, thing.on.craft) || thing.on.mark
  }
  thing.mark = markFor(who, thing.craft) || thing.mark
  return thing
}
