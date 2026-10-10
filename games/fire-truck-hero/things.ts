// The seven kinds of thing the hose can meet, as data. No renderer and no DOM.
// The rules (world.ts), the grid of results (grid.ts) and the arrangements
// (yards.ts) all read this module (ART.md, "The object-by-action grid").
//
// Water is counted in gulps, as in ground.ts: one tap of the hose is one gulp.

/** The kinds, in the order of the grid's rows. A save stores these ids. */
export const KINDS = ['fire', 'pool', 'seed', 'patch', 'boat', 'wheel', 'cat'] as const
export type Kind = (typeof KINDS)[number]

/** The five ways water can reach a thing, in the order of the grid's columns. */
export const ACTIONS = ['gulp', 'fill', 'too-much', 'sweep', 'neighbour'] as const
export type Action = (typeof ACTIONS)[number]

/** Who belongs with a thing. The truck stands for the fire: it wants it out. */
export type Companion = 'truck' | 'duck' | 'bee' | 'snail'

export type ThingSpec = {
  /** Gulps until the thing has had enough. Never more than five. */
  readonly fill: number
  /** The most it holds: one step past its fill, which is "too much". */
  readonly most: number
  /** It can leave the spot the arrangement gave it. */
  readonly moves: boolean
  /** The one who wants this thing watered, where there is one. A thing with nobody holds no want. */
  readonly with: Companion | null
}

function thing(fill: number, moves: boolean, companion: Companion | null): ThingSpec {
  return { fill, most: fill + 1, moves, with: companion }
}

export const THINGS: Readonly<Record<Kind, ThingSpec>> = {
  /** The small fire. Its water stays: the flame does not grow back. */
  fire: thing(3, false, 'truck'),
  /** The paddling pool, the fullest thing in the game. The duck sits in it. */
  pool: thing(4, false, 'duck'),
  /** The seed in its pot. The bee comes to its flower. */
  seed: thing(3, false, 'bee'),
  /** A dry patch of ground with the snail on it. */
  patch: thing(3, false, 'snail'),
  /** The boat. It rides out of a pool that runs over. */
  boat: thing(3, true, null),
  /** The wheel. Its fill is a held stream, counted as three gulps in a row, and it keeps no water. */
  wheel: thing(3, false, null),
  /** The cat. She walks to the driest spot, and climbs onto the truck's roof. */
  cat: thing(3, true, null),
}

/** The kinds that can hold the want of a yard. */
export const WANTING: readonly Kind[] = KINDS.filter((kind) => THINGS[kind].with !== null)

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/** Which grid column a gulp aimed at a thing gives, from the gulps it held before and holds now. */
export function actionOf(kind: Kind, before: number, now: number): Action {
  const { fill } = THINGS[kind]
  if (before >= fill) return 'too-much'
  return now >= fill ? 'fill' : 'gulp'
}
