import type { GobblerShape } from './gobblerBuild'
import { TOY_COLOUR, WHITE } from './palette'
import { VALUES, type Attribute, type Colour, type Kind, type Size, type Toy } from './toys'

// The gobblers and their fixed tastes (ART.md, "The characters and their
// fixed tastes"). Each takes one sort of toy, has its own way with a toy that
// is not its sort, and has one more taste that never changes. A child can
// learn every line of this table by playing, because none of it ever varies.

export const GOBBLERS = ['red', 'blue', 'yellow', 'duck', 'car', 'rocket', 'big', 'little'] as const
export type GobblerId = (typeof GOBBLERS)[number]

/** How a gobbler gives back a toy that is not its sort. No two do it the same way. */
export type WrongWay = 'cannon' | 'slow-slide' | 'hiccups' | 'head-shake' | 'reverse' | 'straight-up' | 'falls-through' | 'hat'
/** What a gobbler does when the claw lifts it by the stud on its head. No two do it the same way. */
export type LiftWay = 'kicks-and-squeals' | 'goes-rigid' | 'hiccups' | 'flaps' | 'wheels-spin' | 'stretches-tall' | 'thuds-back' | 'spins'

export type Gobbler = {
  id: GobblerId
  /** The attribute it goes by and the one value of it that it takes. */
  by: Attribute
  takes: Colour | Kind | Size
  wrong: WrongWay
  lifted: LiftWay
  /** Its build: how wide it is and how tall its belly, in studs and plates. */
  width: number
  belly: number
}

const row = (id: GobblerId, by: Attribute, wrong: WrongWay, lifted: LiftWay, width = 10, belly = 12): Gobbler => ({ id, by, takes: id === 'little' ? 'small' : id, wrong, lifted, width, belly })

export const GOBBLER: { readonly [G in GobblerId]: Gobbler } = {
  red: row('red', 'colour', 'cannon', 'kicks-and-squeals'),
  blue: row('blue', 'colour', 'slow-slide', 'goes-rigid'),
  yellow: row('yellow', 'colour', 'hiccups', 'hiccups'),
  duck: row('duck', 'kind', 'head-shake', 'flaps'),
  car: row('car', 'kind', 'reverse', 'wheels-spin'),
  rocket: row('rocket', 'kind', 'straight-up', 'stretches-tall'),
  big: row('big', 'size', 'falls-through', 'thuds-back', 13, 14),
  little: row('little', 'size', 'hat', 'spins', 9, 9),
}

/** Whether this gobbler takes this toy. The whole of a gobbler's first taste is this one comparison. */
export function takes(id: GobblerId, toy: Toy): boolean {
  const gobbler = GOBBLER[id]
  return toy[gobbler.by] === gobbler.takes
}

/** The gobbler that takes a value of an attribute. */
export function gobblerFor(by: Attribute, value: Colour | Kind | Size): GobblerId {
  const found = GOBBLERS.find((id) => GOBBLER[id].by === by && GOBBLER[id].takes === value)
  if (!found) throw new Error(`no gobbler takes ${String(value)}`)
  return found
}

/** The crew that sorts by one attribute into the given values, in the fixed order of the values. */
export function crewFor<A extends Attribute>(by: A, values: readonly Toy[A][]): GobblerId[] {
  return VALUES[by].filter((value) => values.includes(value)).map((value) => gobblerFor(by, value))
}

/** The attribute a crew goes by: a crew never mixes two. */
export function crewGoesBy(crew: readonly GobblerId[]): Attribute {
  return GOBBLER[crew[0]].by
}

/**
 * The toy a gobbler arrives with in its belly: one of its own sort. It takes
 * its other two properties from the first toy of the load, so the snacks of
 * one crew differ only in the attribute the crew goes by, and a snack is
 * rebuilt from the saved load and is no field of the save.
 */
export function snackOf(id: GobblerId, first: Toy): Toy {
  const gobbler = GOBBLER[id]
  return { ...first, [gobbler.by]: gobbler.takes } as Toy
}

/** How a gobbler is built. */
export function shapeOf(id: GobblerId): GobblerShape {
  const gobbler = GOBBLER[id]
  return {
    width: gobbler.width, belly: gobbler.belly,
    colour: gobbler.by === 'colour' ? TOY_COLOUR[gobbler.takes as Colour] : WHITE,
    model: gobbler.by === 'kind' ? (gobbler.takes as Kind) : undefined,
  }
}
