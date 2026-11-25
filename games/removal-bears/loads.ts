import type { Cell } from './cells'

// The six loads and the cells each one is (ART.md, the grid). Whatever rides
// on a load stays inside these cells, so the outline that is seen is the
// outline that fits.

export const KINDS = ['bath', 'sofa', 'granny', 'lamp', 'piano', 'giraffe'] as const
export type Kind = (typeof KINDS)[number]
export const isKind = (value: unknown): value is Kind => KINDS.includes(value as Kind)

export const CELLS: Record<Kind, readonly Cell[]> = {
  bath: [[0, 0], [1, 0], [2, 0]],
  sofa: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]],
  granny: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
  lamp: [[1, 0], [0, 1], [1, 1], [2, 1]],
  piano: [[0, 0], [1, 0], [2, 0], [0, 1]],
  giraffe: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
}
