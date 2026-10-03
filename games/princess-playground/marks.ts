import { PLANK, TRAY } from './world'

// The marks in the sand as a coarse grid: what is saved of a surface the
// child can draw on anywhere. 32 by 20 cells, one digit each: 0 is smooth
// sand, 1 is raked sand, and 2 to 9 say how deep a mark is. Dimples, grooves,
// bite marks, craters, hollows and Dot's ring are all kept this way. Pure.
// The view draws its own fine strokes while the child plays; on a load each
// cell is drawn from its digit alone, and anything finer is not kept.

export const MARK_COLS = 32
export const MARK_ROWS = 20
export const MARK_CELLS = MARK_COLS * MARK_ROWS
/** Sand with no lines and no mark in it. */
export const SMOOTH = 0
/** Sand as the rake leaves it: how the tray starts. */
export const RAKED = 1
/** The shallowest mark a finger, a friend or the plank leaves. */
export const SHALLOWEST = 2
export const DEEPEST = 9

export type Marks = Uint8Array

/** The tray as it starts, and as the rake leaves it: even raked lines everywhere. */
export function rakedSand(): Marks {
  return new Uint8Array(MARK_CELLS).fill(RAKED)
}

/** The rake lies out while any cell holds a mark deeper than raked. */
export function rakeIsOut(marks: Marks): boolean {
  return marks.some((cell) => cell > RAKED)
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
  marks[at] = Math.max(marks[at], Math.max(SHALLOWEST, Math.min(DEEPEST, Math.round(depth))))
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

/** Dot's ring: the cells a circle of `radius` round (x, z) passes through. Drawn once, when Dot is left alone. */
export function ring(marks: Marks, x: number, z: number, radius: number, depth = 3): void {
  const steps = 24
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const { col, row } = cellOf(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius)
    deepen(marks, col, row, depth)
  }
}

/** How deep an end bites when it comes down with this much weight on it: deeper the heavier the end. */
export function biteDepth(weight: number): number {
  return Math.max(SHALLOWEST, Math.min(DEEPEST, 3 + Math.round(weight / 2)))
}

/** Where an end of the plank came down, at `x` along the tray. */
export function bite(marks: Marks, x: number, depth = 7): void {
  stamp(marks, x, PLANK.z - 0.3, 0.1, depth)
  stamp(marks, x, PLANK.z + 0.3, 0.1, depth)
}

/** The rake drawn across the tray: even raked lines again, and no mark left. */
export function rake(marks: Marks): void {
  marks.fill(RAKED)
}

/** The grid as one string of digits, row by row from the far rim. */
export function marksToText(marks: Marks): string {
  let text = ''
  for (let i = 0; i < MARK_CELLS; i++) text += String(Math.max(0, Math.min(DEEPEST, marks[i])))
  return text
}

/** Reads a saved grid. Anything that is not exactly a grid of digits gives the tray as it starts: raked. */
export function marksFromText(text: unknown): Marks {
  const marks = rakedSand()
  if (typeof text !== 'string' || text.length !== MARK_CELLS || !/^[0-9]+$/.test(text)) return marks
  for (let i = 0; i < MARK_CELLS; i++) marks[i] = text.charCodeAt(i) - 48
  return marks
}
