// The flower, as numbers: which of its colours an arrangement's flower opens
// in, how far each petal is open as the ending plays, and the drop that hangs
// from a leaf and falls (ART.md, "The scenes"). No renderer.

import { LADDER } from './config'

/** How many colours a flower can open in. look.ts holds the colours themselves. */
export const FLOWER_COLOURS = 3
/** Petals round the heart. They open one after another. */
export const PETAL_COUNT = 5
/** How big a petal is while it is still shut, as a share of its open size. */
export const PETAL_SHUT = 0.3

/** Which colour the flower of a yard opens in. It belongs to the arrangement: the same yard always has the same flower. */
export function flowerOf(place: string, arrangement: number): number {
  const rung = Math.max(0, LADDER.indexOf(place))
  const turn = Number.isInteger(arrangement) && arrangement >= 0 ? arrangement : 0
  return (rung + 2 * turn) % FLOWER_COLOURS
}

/**
 * How far petal `index` is open, from PETAL_SHUT to 1, when the whole flower
 * is `open` (0 to 1) of the way through opening. Each petal has its own fifth
 * of the opening, in turn, and eases through it.
 */
export function petalOpen(open: number, index: number): number {
  const through = Math.min(1, Math.max(0, (Number.isFinite(open) ? open : 0) * PETAL_COUNT - index))
  return PETAL_SHUT + (1 - PETAL_SHUT) * through * through * (3 - 2 * through)
}

/**
 * The drop on the leaf, for how far its beat has played (0 to 1): how big it
 * is and how far it has fallen, each 0 to 1. It swells on the tip of the
 * leaf, lets go, and falls faster as it goes. Before its beat and after it
 * there is no drop.
 */
export function leafDrop(through: number): { size: number; fallen: number } {
  if (!(through > 0) || through >= 1) return { size: 0, fallen: 0 }
  const HANGS = 0.6
  if (through < HANGS) return { size: Math.sin((through / HANGS) * (Math.PI / 2)), fallen: 0 }
  const falling = (through - HANGS) / (1 - HANGS)
  return { size: 1, fallen: falling * falling }
}
