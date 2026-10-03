import { LADDER } from './config'
import { KINDS, type Kind } from './kinds'
import { pickFrom, shuffled, weighted } from './rng'
import type { Bunch, Count } from './world'

// The designed order: which troop and which sky each position lays out. One
// new thing at a time, then combinations. The rule of the world is the same at
// every position (world.ts); only what comes by and what hangs in the sky
// changes.
//
// A single balloon of the troop's colour is in every sky, so a cycle can always
// be finished one balloon at a time and nothing dead-ends. The troop that waits
// at the edge was planned before the cycle on screen was judged, so every sky
// here works for a troop of any size.

/** A troop as it is planned: the troop that waits at the edge is one of these. */
export type TroopPlan = { kind: Kind; size: Count }

/** The most bunches a sky ever holds: as many places as the view has in the sky. */
export const MOST_BUNCHES = 5

type SkyPlan = 'singlesTwoColours' | 'singlesThreeColours' | 'bunchesOwnColour' | 'bunchesMixed'

type Layout = { sizes: readonly { item: Count; weight: number }[]; sky: SkyPlan }

const ONE: Layout['sizes'] = [{ item: 1, weight: 1 }]
const TWO: Layout['sizes'] = [{ item: 2, weight: 1 }]
// Where the size changes, a bigger troop comes by more often than a friend alone, which earlier positions already gave.
const GROWING: Layout['sizes'] = [{ item: 1, weight: 1 }, { item: 2, weight: 2 }, { item: 3, weight: 3 }]
// With bunches the pair and the trio are as likely as each other, so the two-bunch and the three-bunch both get their turn.
const EVEN: Layout['sizes'] = [{ item: 1, weight: 1 }, { item: 2, weight: 2 }, { item: 3, weight: 2 }]

const LAYOUTS: Record<string, Layout> = {
  'solo-two-colours': { sizes: ONE, sky: 'singlesTwoColours' },
  'solo-three-colours': { sizes: ONE, sky: 'singlesThreeColours' },
  'pair-singles': { sizes: TWO, sky: 'singlesThreeColours' },
  'trio-singles': { sizes: GROWING, sky: 'singlesThreeColours' },
  'bunches-own-colour': { sizes: EVEN, sky: 'bunchesOwnColour' },
  'bunches-mixed': { sizes: EVEN, sky: 'bunchesMixed' },
}

/** The positions this module lays out. A test holds them equal to the ladder, so a step added there is laid out here. */
export const LAID_POSITIONS: readonly string[] = Object.keys(LAYOUTS)

/** An id this module does not know is laid out as the first position. */
function layoutOf(position: string): Layout {
  return Object.hasOwn(LAYOUTS, position) ? LAYOUTS[position] : LAYOUTS[LADDER[0]]
}

/** The next troop to come by: any kind but `avoid`, so two troops in a row never look alike, and a size the position asks for. */
export function layTroop(position: string, avoid: Kind | null, rng: number): { troop: TroopPlan; rng: number } {
  const kind = pickFrom(KINDS.filter((candidate) => candidate !== avoid), rng)
  const size = weighted(layoutOf(position).sizes, kind.rng)
  return { troop: { kind: kind.value, size: size.value }, rng: size.rng }
}

/** The bunches on offer for this troop, each in its place in the sky. The place is the index. */
export function laySky(position: string, troop: TroopPlan, rng: number): { sky: Bunch[]; rng: number } {
  const own = troop.kind
  const others = shuffled(KINDS.filter((kind) => kind !== own), rng)
  const [second, third] = others.items
  let state = others.rng
  let bunches: Bunch[]
  const plan = layoutOf(position).sky
  if (plan === 'singlesTwoColours') {
    bunches = [{ colour: own, count: 1 }, { colour: own, count: 1 }, { colour: second, count: 1 }, { colour: second, count: 1 }]
  } else if (plan === 'singlesThreeColours') {
    bunches = [{ colour: own, count: 1 }, { colour: own, count: 1 }, { colour: second, count: 1 }, { colour: second, count: 1 }, { colour: third, count: 1 }]
  } else if (plan === 'bunchesOwnColour') {
    // One colour only: the number alone decides.
    bunches = [{ colour: own, count: 1 }, { colour: own, count: 2 }, { colour: own, count: 3 }]
  } else {
    // The larger bunch of the troop's colour serves the whole troop in one touch when there is more than one friend.
    let larger: Count = troop.size
    if (troop.size === 1) {
      const drawn = pickFrom<Count>([2, 3], state)
      larger = drawn.value
      state = drawn.rng
    }
    // One bunch is the right number in another colour, and one is neither the right number nor the right colour.
    const differs = pickFrom(([1, 2, 3] as const).filter((count) => count !== troop.size), state)
    state = differs.rng
    bunches = [{ colour: own, count: 1 }, { colour: own, count: larger }, { colour: second, count: troop.size }, { colour: third, count: differs.value }]
  }
  const placed = shuffled(bunches, state)
  return { sky: placed.items, rng: placed.rng }
}

/** A sky a troop of this kind can always be served from: it holds a single of that colour, and no more bunches or balloons than the view has room for. */
export function skyFits(sky: readonly Bunch[], kind: Kind): boolean {
  if (sky.length > MOST_BUNCHES) return false
  if (!sky.every((bunch) => bunch.count === 1 || bunch.count === 2 || bunch.count === 3)) return false
  return sky.some((bunch) => bunch.colour === kind && bunch.count === 1)
}
