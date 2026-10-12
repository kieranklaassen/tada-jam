import { COLS, ROWS } from './layout'
import { DYES, THICKEST, topAt, type Sheet } from './wool'

// The pictures on the wall, with no drawing in them. A hung picture is kept at
// half the sheet's grid: one character a cell for the topmost dye there and how
// thick it lies. The wall holds the last three, oldest first, each on a peg.

export const HALF_COLS = COLS / 2
export const HALF_ROWS = ROWS / 2
export const WALL_HOLDS = 3

export type Picture = { peg: number; veils: string }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const BARE = ALPHABET[0]

/** The picture on the sheet at half its grid: for each cell of four, the thickest topmost wool among them. */
export function veilsOf(sheet: Sheet): string {
  let veils = ''
  for (let row = 0; row < HALF_ROWS; row++) {
    for (let col = 0; col < HALF_COLS; col++) {
      let dye = -1, thickness = 0
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const top = topAt(sheet, col * 2 + dx, row * 2 + dy)
        if (!top) continue
        const here = top.cells[(row * 2 + dy) * COLS + col * 2 + dx] >> 3
        if (here > thickness) { thickness = here; dye = top.dye }
      }
      veils += dye < 0 ? BARE : ALPHABET[1 + dye * THICKEST + thickness - 1]
    }
  }
  return veils
}

/** One cell of a hung picture: its dye (-1 where the felt is bare) and how thick the wool lies. */
export function veilAt(veils: string, col: number, row: number): { dye: number; thickness: number } {
  const value = ALPHABET.indexOf(veils[row * HALF_COLS + col]) - 1
  return value < 0 ? { dye: -1, thickness: 0 } : { dye: Math.floor(value / THICKEST), thickness: (value % THICKEST) + 1 }
}

const isVeils = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length !== HALF_COLS * HALF_ROWS) return false
  for (const char of value) { const at = ALPHABET.indexOf(char); if (at < 0 || at > DYES * THICKEST) return false }
  return true
}

/** The wall from what a save holds. Saved state is untrusted: an entry that is no picture is left out, a peg holds one picture (the later one), and only the last three are kept. */
export function readWall(raw: unknown): Picture[] {
  if (!Array.isArray(raw)) return []
  let wall: Picture[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const { peg, veils } = entry as Record<string, unknown>
    if (typeof peg !== 'number' || !Number.isInteger(peg) || peg < 0 || peg >= WALL_HOLDS || !isVeils(veils)) continue
    wall = wall.filter((picture) => picture.peg !== peg)
    wall.push({ peg, veils })
  }
  return wall.slice(-WALL_HOLDS)
}

/** The peg the ghost hand takes the loop to: the lowest free one, or the oldest picture's when all three are taken. */
export function freePeg(wall: readonly Picture[]): number {
  for (let peg = 0; peg < WALL_HOLDS; peg++) if (!wall.some((picture) => picture.peg === peg)) return peg
  return wall[0].peg
}

/** The pegs a dragged loop may take: the free ones, or the oldest picture's when none is free. */
export function openPegs(wall: readonly Picture[]): number[] {
  const free = [0, 1, 2].filter((peg) => !wall.some((picture) => picture.peg === peg))
  return free.length > 0 ? free : [wall[0].peg]
}
