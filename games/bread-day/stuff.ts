// The material on the peel: what went into it, what was done to it, and what
// that makes it. Pure rules, no renderer and no clock: time arrives as attended
// seconds from the caller.
//
// The model is true wherever it shows a change (ART.md, "The representation"):
// - flour and water make dough only when both are there, and only pushing
//   turns it from streaky to shaggy to smooth
// - dough rises only with the bubbly worked in, quickly in the warm nook,
//   slowly on the board and not at all on the cold sill
// - the oven sets whatever it is given, and baking is never undone
// - nothing here reads a clock, so nothing changes while the game is parked

/** The most scoops of flour, and splashes of water, the peel holds. One more runs off the edge. */
export const MOST = 3
/** Pushes that take dough from streaky to shaggy, to smooth, and the most that are remembered. */
export const WORK_SHAGGY = 3, WORK_SMOOTH = 8, WORK_FULL = 12
/** Rise runs from 0 to this. Dough at or above `RISE_AIRY` bakes airy. Dough that is not yet smooth stops at the cap. */
export const RISE_FULL = 100, RISE_AIRY = 60, RISE_ROUGH_CAP = 50
/** Attended seconds for a full rise in the warm nook; on the board it takes this many times longer. */
export const RISE_SECONDS = 6, BOARD_SLOWER = 10
/** Attended seconds in the oven until raw stuff is baked. */
export const BAKE_SECONDS = 3.5
/** How much rise one push knocks out. */
export const PUNCH = 25

export type Place = 'board' | 'nook' | 'sill' | 'oven'
export const PLACES: readonly Place[] = ['board', 'nook', 'sill', 'oven']

export type Ingredient = 'flour' | 'water' | 'bubbly' | 'seeds'

/** Raw stuff: everything that has not been through the oven. */
export type Stuff = {
  raw: true
  flour: number
  water: number
  bubbly: boolean
  seeds: boolean
  /** Pushes so far, up to `WORK_FULL`. */
  work: number
  /** Pulled out long; gathered or added to, it is round again. */
  long: boolean
  /** 0 to `RISE_FULL`. */
  rise: number
  /** 0 to 100: how far the oven has got with it. At 100 it is a bread. */
  bake: number
}

export type Crumb = 'dust' | 'seeds' | 'pancake' | 'crumbly' | 'dense' | 'airy'
export type Shape = 'heap' | 'flat' | 'round' | 'long'
export type Crust = 'gold' | 'dark' | 'black'
export const CRUMBS: readonly Crumb[] = ['dust', 'seeds', 'pancake', 'crumbly', 'dense', 'airy']
export const SHAPES: readonly Shape[] = ['heap', 'flat', 'round', 'long']
export const CRUSTS: readonly Crust[] = ['gold', 'dark', 'black']

/** Anything that has been through the oven. Toasted dust and toasted seeds are held the same way, though no one would call them bread. */
export type Bread = { raw: false; crumb: Crumb; shape: Shape; crust: Crust; seeds: boolean }

/** What lies on the peel. */
export type Load = Stuff | Bread | null

export type Kind = 'nothing' | 'dust' | 'puddle' | 'seeds' | 'batter' | 'dough'
export type Texture = 'streaky' | 'shaggy' | 'smooth'

export const EMPTY: Stuff = { raw: true, flour: 0, water: 0, bubbly: false, seeds: false, work: 0, long: false, rise: 0, bake: 0 }

/** What the raw stuff is. More water than flour runs; the bubbly alone is a small batter of its own. */
export function kindOf(stuff: Stuff): Kind {
  if (stuff.flour > 0 && stuff.water > 0) return stuff.water > stuff.flour ? 'batter' : 'dough'
  if (stuff.flour > 0) return 'dust'
  if (stuff.bubbly) return 'batter'
  if (stuff.water > 0) return 'puddle'
  return stuff.seeds ? 'seeds' : 'nothing'
}

export function textureOf(stuff: Stuff): Texture {
  return stuff.work >= WORK_SMOOTH ? 'smooth' : stuff.work >= WORK_SHAGGY ? 'shaggy' : 'streaky'
}

/** Whether this stuff rises at all: dough with the bubbly worked into it, or batter with the bubbly in it, which froths. */
export function canRise(stuff: Stuff): boolean {
  if (!stuff.bubbly) return false
  const kind = kindOf(stuff)
  return kind === 'batter' || (kind === 'dough' && textureOf(stuff) !== 'streaky')
}

/** What an act did, for the view and the sound. Every act has one: nothing is refused and nothing lands in silence. */
export type Effect =
  // tipping an ingredient
  | 'heap' | 'pour' | 'plop' | 'scatter'
  // one too many: over the edge of the peel, or a second spoon from the jar
  | 'flour-over' | 'water-over' | 'burp'
  // an ingredient onto something already baked
  | 'slides-off'
  // pushing raw stuff
  | 'furrow' | 'splash' | 'skitter' | 'ripple' | 'smear' | 'squish' | 'sigh' | 'nothing-there'
  // pulling and gathering dough
  | 'rip' | 'stretch' | 'gather'
  // pushing something baked
  | 'puff' | 'flop' | 'crumbs' | 'knock' | 'wheeze'

export type Done<T extends Load = Load> = { load: T; effect: Effect }

/** Something new in the mix is not worked in yet, and a long lump is a lump again. */
function added(stuff: Stuff, change: Partial<Stuff>): Stuff {
  const mixed: Stuff = { ...stuff, ...change, work: Math.floor(stuff.work / 2), long: false }
  // What is neither dough nor batter holds no work and no air: froth tipped full of flour is dust again.
  const kind = kindOf(mixed)
  return kind === 'dough' || kind === 'batter' ? mixed : { ...mixed, work: 0, rise: 0 }
}

/** Tip an ingredient onto the peel. Onto a bread it slides or rolls off and the bread stays as it is. A pour too many runs off the edge. */
export function tip(load: Load, what: Ingredient): Done {
  if (load && !load.raw) return { load, effect: 'slides-off' }
  const stuff = load ?? EMPTY
  if (what === 'flour') return stuff.flour >= MOST ? { load, effect: 'flour-over' } : { load: added(stuff, { flour: stuff.flour + 1 }), effect: 'heap' }
  if (what === 'water') {
    if (stuff.water < MOST) return { load: added(stuff, { water: stuff.water + 1 }), effect: 'pour' }
    // Over the edge. From a full peel the water takes a scoop of flour with it, so what is left is wetter: batter can always be reached.
    return stuff.flour >= MOST ? { load: added(stuff, { flour: stuff.flour - 1 }), effect: 'water-over' } : { load, effect: 'water-over' }
  }
  if (what === 'bubbly') return stuff.bubbly ? { load, effect: 'burp' } : { load: added(stuff, { bubbly: true }), effect: 'plop' }
  return { load: { ...stuff, seeds: true }, effect: 'scatter' }
}

const PUSHED_BREAD: Record<Crumb, Effect> = { dust: 'puff', seeds: 'skitter', pancake: 'flop', crumbly: 'crumbs', dense: 'knock', airy: 'wheeze' }

/**
 * One push of the finger: a stroke of a drag, or a pat. It works dough and
 * batter, and knocks the air out of anything risen. Everything else answers
 * and stays what it is.
 */
export function push(load: Load): Done {
  if (!load) return { load, effect: 'nothing-there' }
  if (!load.raw) return { load, effect: PUSHED_BREAD[load.crumb] }
  const kind = kindOf(load)
  if (kind === 'nothing') return { load, effect: 'nothing-there' }
  if (kind === 'dust') return { load, effect: 'furrow' }
  if (kind === 'puddle') return { load, effect: 'splash' }
  if (kind === 'seeds') return { load, effect: 'skitter' }
  const worked: Stuff = { ...load, work: Math.min(WORK_FULL, load.work + 1), rise: Math.max(0, load.rise - PUNCH) }
  if (load.rise > 0) return { load: worked, effect: 'sigh' }
  if (kind === 'batter') return { load: worked, effect: 'ripple' }
  return { load: worked, effect: textureOf(load) === 'streaky' ? 'smear' : 'squish' }
}

/** A drag out past the edge. Smooth dough stretches and stays long; rougher dough rips short and plops back. Anything else is only pushed. */
export function pull(load: Load): Done {
  if (!load || !load.raw || kindOf(load) !== 'dough') return push(load)
  if (textureOf(load) !== 'smooth') return { load, effect: 'rip' }
  return { load: { ...load, long: true, rise: Math.max(0, load.rise - PUNCH) }, effect: 'stretch' }
}

/** A push from outside inwards rounds a long lump up again. */
export function gather(load: Load): Done {
  if (!load || !load.raw || kindOf(load) !== 'dough' || !load.long) return push(load)
  return { load: { ...load, long: false }, effect: 'gather' }
}

/** What the oven makes of raw stuff. Water alone leaves nothing but steam. */
export function bakedFrom(stuff: Stuff): Bread | null {
  const kind = kindOf(stuff), seeds = stuff.seeds
  if (kind === 'nothing') return null
  if (kind === 'puddle') return seeds ? { raw: false, crumb: 'seeds', shape: 'heap', crust: 'gold', seeds: true } : null
  if (kind === 'seeds') return { raw: false, crumb: 'seeds', shape: 'heap', crust: 'gold', seeds: true }
  if (kind === 'dust') return { raw: false, crumb: 'dust', shape: 'heap', crust: 'gold', seeds }
  if (kind === 'batter') return { raw: false, crumb: 'pancake', shape: 'flat', crust: 'gold', seeds }
  const crumb: Crumb = textureOf(stuff) !== 'smooth' ? 'crumbly' : stuff.rise >= RISE_AIRY ? 'airy' : 'dense'
  return { raw: false, crumb, shape: stuff.long ? 'long' : 'round', crust: 'gold', seeds }
}

/** A bread that goes back into the oven comes out one step darker. Black stays black. */
export function darker(bread: Bread): Bread {
  return { ...bread, crust: bread.crust === 'gold' ? 'dark' : 'black' }
}

/**
 * Attended time passing for whatever lies on the peel, in the place where the
 * peel is. Rising and baking both stop when they are full and stay there:
 * nothing over-proves and nothing burns by waiting. A bread does not change
 * with time at all.
 */
export function rest(load: Load, place: Place, seconds: number): Load {
  if (!load || !load.raw || !(seconds > 0)) return load
  if (place === 'oven') {
    if (kindOf(load) === 'nothing') return load
    const bake = Math.min(100, load.bake + (100 * seconds) / BAKE_SECONDS)
    return bake >= 100 ? bakedFrom(load) : { ...load, bake }
  }
  if (place === 'sill' || !canRise(load)) return load
  const cap = textureOf(load) === 'smooth' ? RISE_FULL : RISE_ROUGH_CAP
  if (load.rise >= cap) return load
  const pace = RISE_FULL / RISE_SECONDS / (place === 'nook' ? 1 : BOARD_SLOWER)
  return { ...load, rise: Math.min(cap, load.rise + pace * seconds) }
}
