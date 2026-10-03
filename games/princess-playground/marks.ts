import { PLANK, TRAY } from './world'

// The marks in the sand as a coarse grid: what is saved of a surface the
// child can draw on anywhere. 32 by 20 cells, one digit each: 0 is raked
// sand, 9 the deepest mark. Pure. The view draws its own fine strokes while
// the child plays and rebuilds soft ones from this grid on a load.

export const MARK_COLS = 32
export const MARK_ROWS = 20
export const MARK_CELLS = MARK_COLS * MARK_ROWS
export const DEEPEST = 9

export type Marks = Uint8Array

export function smoothSand(): Marks {
  return new Uint8Array(MARK_CELLS)
}

export function isSmooth(marks: Marks): boolean {
  return marks.every((cell) => cell === 0)
}

export function cellOf(x: number, z: number): { col: number; row: number } {
  const col = Math.floor(((x + TRAY.halfWidth) / (TRAY.halfWidth * 2)) * MARK_COLS)
  const row = Math.floor(((z + TRAY.halfDepth) / (TRAY.halfDepth * 2)) * MARK_ROWS)
  return { col: Math.max(0, Math.min(MARK_COLS - 1, col)), row: Math.max(0, Math.min(MARK_ROWS - 1, row)) }
}

/** The middle of a cell, in tray units. */
export function centreOf(col: number, row: number): { x: number; z: number } {
  return { x: ((col + 0.5) / MARK_COLS - 0.5) * TRAY.halfWidth * 2, z: ((row + 0.5) / MARK_ROWS - 0.5) * TRAY.halfDepth * 2 }
}

function deepen(marks: Marks, col: number, row: number, depth: number): void {
  if (col < 0 || col >= MARK_COLS || row < 0 || row >= MARK_ROWS) return
  const at = row * MARK_COLS + col
  marks[at] = Math.max(marks[at], Math.max(0, Math.min(DEEPEST, Math.round(depth))))
}

/** A round mark of `radius` tray units: a poke, or where a friend was set down. */
export function stamp(marks: Marks, x: number, z: number, radius: number, depth: number): void {
  const cell = (TRAY.halfWidth * 2) / MARK_COLS
  const reach = Math.max(0, Math.ceil(radius / cell) - 1)
  const { col, row } = cellOf(x, z)
  for (let dr = -reach; dr <= reach; dr++) {
    for (let dc = -reach; dc <= reach; dc++) {
      const centre = centreOf(col + dc, row + dr)
      if (dc === 0 && dr === 0) deepen(marks, col, row, depth)
      else if (Math.hypot(centre.x - x, centre.z - z) <= radius) deepen(marks, col + dc, row + dr, depth)
    }
  }
}

/** A finger drawn from one point to another: every cell the line crosses. */
export function furrow(marks: Marks, x0: number, z0: number, x1: number, z1: number, depth = 6): void {
  const cell = (TRAY.halfWidth * 2) / MARK_COLS
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (cell * 0.5)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const { col, row } = cellOf(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)
    deepen(marks, col, row, depth)
  }
}

/** Where an end of the plank came down, at `x` along the tray. */
export function bite(marks: Marks, x: number, depth = 7): void {
  stamp(marks, x, PLANK.z - 0.3, 0.1, depth)
  stamp(marks, x, PLANK.z + 0.3, 0.1, depth)
}

/** The rake drawn across the tray: the sand is smooth again. */
export function rake(marks: Marks): void {
  marks.fill(0)
}

/** The grid as one string of digits, row by row from the far rim. */
export function marksToText(marks: Marks): string {
  let text = ''
  for (let i = 0; i < MARK_CELLS; i++) text += String(Math.max(0, Math.min(DEEPEST, marks[i])))
  return text
}

/** Reads a saved grid. Anything that is not exactly a grid of digits gives smooth sand. */
export function marksFromText(text: unknown): Marks {
  const marks = smoothSand()
  if (typeof text !== 'string' || text.length !== MARK_CELLS || !/^[0-9]+$/.test(text)) return marks
  for (let i = 0; i < MARK_CELLS; i++) marks[i] = text.charCodeAt(i) - 48
  return marks
}
