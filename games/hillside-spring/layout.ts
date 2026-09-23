// The hillside as a coarse grid. Rows are terraces: row 0 is the highest,
// just under the spring, and each row below is one terrace wall lower.
// Columns run left to right across the slope. Everything here is logical
// grid space; the view turns cells into world positions.

export const COLS = 7
export const ROWS = 5
export const SPRING_COL = 3

export type Side = 0 | 1 | 2 | 3
export const N: Side = 0
export const E: Side = 1
export const S: Side = 2
export const W: Side = 3

export type Cell = { c: number; r: number }

export type CropKind = 'sunflower' | 'rice' | 'pumpkin' | 'cosmos'

export type Plot = { id: number; kind: CropKind; c: number; r: number }

/**
 * Thirsty plots. Two sit one column beside the spring's stream (one bend
 * reaches them), two sit further out (they need a run of pipe), so a split
 * is how a child waters several at once.
 */
export const PLOTS: readonly Plot[] = [
  { id: 0, kind: 'sunflower', c: 4, r: 2 },
  { id: 1, kind: 'rice', c: 1, r: 3 },
  { id: 2, kind: 'pumpkin', c: 5, r: 4 },
  { id: 3, kind: 'cosmos', c: 2, r: 4 },
]

export function inGrid(c: number, r: number): boolean {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS
}

export function cellIndex(c: number, r: number): number {
  return r * COLS + c
}

export function plotAt(c: number, r: number): Plot | null {
  for (const plot of PLOTS) if (plot.c === c && plot.r === r) return plot
  return null
}

export function buildable(c: number, r: number): boolean {
  return inGrid(c, r) && plotAt(c, r) === null
}

export function neighbour(c: number, r: number, side: Side): Cell {
  if (side === N) return { c, r: r - 1 }
  if (side === E) return { c: c + 1, r }
  if (side === S) return { c, r: r + 1 }
  return { c: c - 1, r }
}

export function opposite(side: Side): Side {
  return ((side + 2) % 4) as Side
}
