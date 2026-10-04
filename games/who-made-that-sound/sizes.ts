import { GROWN, WIDE } from './figures'
import { HILL_SPOTS } from './stage'
import type { Kind } from './voices'

// How tall everyone stands, wherever they stand. The kinds keep their order
// of size wherever a spot has room for it; where a spot is only so wide, the
// one wide kind (`hoom`) stands shorter than narrower kinds beside it, and is
// still the widest. Heights are in design pixels, from the feet.

const least = (...sizes: number[]) => Math.min(...sizes)

/**
 * A grown one who asks, on the stone. It is the one the scene is about, so the two small kinds stand a good
 * deal taller here than their size among the others, and no kind is so tall that it reaches into the hill's
 * first place.
 */
export function askerSize(kind: Kind): number {
  return least(GROWN[kind] * (GROWN[kind] < 140 ? 1.27 : 1), 205)
}

/** A grown one who waits at the edge, half in the page. */
export function edgeSize(kind: Kind): number {
  return least(GROWN[kind], 190)
}

/** A grown one who brings a clutch and waits where there is room for it, well into the page: bigger than at the edge, and no wider than its target. */
export function bringerSize(kind: Kind): number {
  return least(GROWN[kind] * 1.25, 236, 300 / WIDE[kind])
}

/** A grown one standing in the row (in `who`), with `row` of them side by side: as wide as its spot allows. */
export function rowSize(kind: Kind, row: number): number {
  return least(GROWN[kind] * 0.8, (row >= 4 ? 126 : 150) / WIDE[kind])
}

/** A little one on the ground or alone on the hill: never so small that it is not a target of its own. */
export function littleSize(kind: Kind): number {
  return Math.max(96, least(132, GROWN[kind] * 0.62))
}

/** A grown one on the hill with its little one: the two together fit one place. */
export function hillSize(kind: Kind): number {
  return least(GROWN[kind], (HILL_SPOTS[0].w - 6) / WIDE[kind], 138)
}

/** The little one of a family, riding on the grown one. */
export const RIDER = { size: 0.54, up: 0.88 } as const

/** Each of two little ones that stand side by side in one place, and how far each stands from the middle of it. */
export function twinSize(kind: Kind): number {
  return least(littleSize(kind) * 0.82, 100 / WIDE[kind])
}
export function twinApart(kind: Kind): number {
  // Clear of each other, with a little page between the two, wherever the place has room for that beside its
  // neighbours: a spring, a beak or a wing of the one then never lies across the other. The two widest kinds have
  // no such room and overlap a little, as two round bodies may. And far enough apart that nothing that swings out
  // from the one reaches what hangs from the other.
  const wide = twinSize(kind) * WIDE[kind], close = least(46, wide * 0.42), clear = least(wide * 0.54, (TWINS_SPAN - wide) / 2)
  return Math.max(close, clear, SWINGS[kind] * twinSize(kind))
}
/** How wide two twins may be together, so that the widest neighbours on the hill still stand well apart. */
const TWINS_SPAN = 178
/**
 * How far from its middle a kind's longest hanging piece reaches when it hangs on one twin and swings out on the
 * other, as half of the two together, in body heights: only `dooo`, whose long ears would lie across each other.
 */
const SWINGS: Readonly<Record<Kind, number>> = { pip: 0, tok: 0, hoom: 0, brrl: 0, wheep: 0, dooo: 0.49 }
