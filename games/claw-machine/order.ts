import { LADDER, type PositionId } from './config'
import { crewFor, type GobblerId } from './gobblers'
import { pick, rng, shuffled, type Rng } from './rng'
import { COLOURS, KINDS, type Attribute, type Colour, type Kind, type Size, type Toy } from './toys'

// The designed order (ART.md, "The designed order, and what is stored"): what
// each position lays out. A cycle is one load of toys and the crews that sort
// it in turn. The same position and the same seed always lay out the same
// cycle; another seed gives the same step in a slightly different form.

export type CycleLayout = {
  /** The load, in the order the toys are set on the tray. */
  toys: Toy[]
  /** The crews that sort it, in turn. Each goes by one attribute. */
  crews: GobblerId[][]
}

/** The most toys one group may hold and the most groups one sort may have: the bounds the records give (ART.md, "The records"). */
export const MOST_IN_A_GROUP = 10
export const MOST_GROUPS = 3

const some = <T>(random: Rng, from: readonly T[], n: number): T[] => shuffled(random, from).slice(0, n)
const toy = (colour: Colour, kind: Kind, size: Size = 'small'): Toy => ({ colour, kind, size })

type Recipe = (random: Rng) => { toys: Toy[]; sorts: Attribute[]; shuffleSorts?: boolean }

const RECIPE: { readonly [P in PositionId]: Recipe } = {
  // Sorting, by colour: two groups, and nothing else about the toys varies.
  'two-colours': (random) => {
    const colours = some(random, COLOURS, 2), kind = KINDS[pick(random, KINDS.length)]
    return { toys: colours.flatMap((colour) => [toy(colour, kind), toy(colour, kind)]), sorts: ['colour'] }
  },
  // A third group.
  'three-colours': (random) => {
    const kind = KINDS[pick(random, KINDS.length)]
    return { toys: COLOURS.flatMap((colour) => [toy(colour, kind), toy(colour, kind)]), sorts: ['colour'] }
  },
  // An attribute to leave aside: the kinds now differ and the crew still goes by colour.
  'colours-among-kinds': (random) => {
    const kinds = some(random, KINDS, 2)
    return { toys: COLOURS.flatMap((colour) => kinds.map((kind) => toy(colour, kind))), sorts: ['colour'] }
  },
  // Sorting by kind, with one colour so that only the kind varies.
  'two-kinds': (random) => {
    const kinds = some(random, KINDS, 2), colour = COLOURS[pick(random, COLOURS.length)]
    return { toys: kinds.flatMap((kind) => [toy(colour, kind), toy(colour, kind), toy(colour, kind)]), sorts: ['kind'] }
  },
  // The same toys a second way.
  'colours-then-kinds': (random) => {
    const kinds = some(random, KINDS, 2)
    return { toys: COLOURS.flatMap((colour) => kinds.map((kind) => toy(colour, kind))), sorts: ['colour', 'kind'] }
  },
  // Sorting by size, with one colour and one kind so that only the size varies.
  'two-sizes': (random) => {
    const colour = COLOURS[pick(random, COLOURS.length)], kind = KINDS[pick(random, KINDS.length)]
    return { toys: (['big', 'small', 'big', 'small', 'big', 'small'] as const).map((size) => toy(colour, kind, size)), sorts: ['size'] }
  },
  // A second way with size; the colours are mixed and are left aside in both sorts.
  'kinds-then-sizes': (random) => {
    const kinds = some(random, KINDS, 2)
    const toys = kinds.flatMap((kind) => (['big', 'small', 'big', 'small'] as const).map((size) => toy(COLOURS[pick(random, COLOURS.length)], kind, size)))
    return { toys, sorts: ['kind', 'size'] }
  },
  // Three ways, in an order that changes from load to load, so the child reads which way this crew goes by.
  'three-ways': (random) => {
    const colours = some(random, COLOURS, 2), kinds = some(random, KINDS, 2)
    const toys = colours.flatMap((colour) => kinds.flatMap((kind) => [toy(colour, kind, 'small'), toy(colour, kind, 'big')]))
    return { toys, sorts: ['colour', 'kind', 'size'], shuffleSorts: true }
  },
  // The widest load: one of each colour in each kind, four or five of them big. Each kind comes in both sizes,
  // one or two of its three toys big, so that big and small can be told by looking at two of the same kind: a
  // small rocket stands taller than a big duck.
  'three-ways-wide': (random) => {
    const twoBig = new Set(some(random, [0, 1, 2], 1 + pick(random, 2)))
    const big = new Set(KINDS.flatMap((_, k) => some(random, [0, 1, 2], twoBig.has(k) ? 2 : 1).map((c) => c * 3 + k)))
    const toys = COLOURS.flatMap((colour, c) => KINDS.map((kind, k) => toy(colour, kind, big.has(c * 3 + k) ? 'big' : 'small')))
    return { toys, sorts: ['colour', 'kind', 'size'], shuffleSorts: true }
  },
}

/** What a position lays out for a seed. */
export function layCycle(position: PositionId, seed: number): CycleLayout {
  const random = rng(seed * 2654435761 + LADDER.indexOf(position) * 97)
  const recipe = RECIPE[position](random)
  const sorts = recipe.shuffleSorts ? shuffled(random, recipe.sorts) : recipe.sorts
  const toys = shuffled(random, recipe.toys)
  // A crew has a gobbler for each value of its attribute that the load holds, and for no other.
  const crews = sorts.map((by) => crewFor(by, toys.map((one) => one[by])))
  return { toys, crews }
}

/** The position one step up, or null at the top of the order. */
export function nextUp(position: PositionId): PositionId | null {
  return LADDER[LADDER.indexOf(position) + 1] ?? null
}

export function isPosition(value: unknown): value is PositionId {
  return typeof value === 'string' && (LADDER as readonly string[]).includes(value)
}
