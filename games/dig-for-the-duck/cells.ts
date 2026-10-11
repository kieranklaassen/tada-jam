// What a cell of the hill can hold, and the hill as one string. Pure numbers:
// the rules that move them are in ground.ts and the hills in hills.ts.

/** The hill is this many cells across and down. */
export const COLS = 184
export const ROWS = 122
/** One cell in stage units, and where the pane's top left corner lies on the stage. */
export const CELL = 6
export const PANE = { x: 38, y: 44, width: COLS * CELL, height: ROWS * CELL } as const

export const OPEN = 0
export const WATER = 1
/** The bath's tin: not dug, and it holds water. */
export const TIN = 2
/** Clay as laid, clay that water has reached, and clay a wet finger has polished. */
export const CLAY = 3
export const CLAY_WET = 4
export const CLAY_SLICK = 5
export const ROCK = 6
export const ROCK_WET = 7
/** Moss as laid, moss that has drunk, and what a drunk moss has swollen into the open space beside it. */
export const MOSS = 8
export const MOSS_FULL = 9
export const MOSS_GROWN = 10
/** A hot stone, and one that water has reached: it steams. */
export const HOT = 11
export const HOT_WET = 12
export const STEAM = 13
export const EARTH = 14
export const EARTH_WET = 15
/** A seed, a seed that has sprouted, its root, and the two growing ends of a root. */
export const SEED = 16
export const SPROUT = 17
export const ROOT = 18
export const TIP_LEFT = 19
export const TIP_RIGHT = 20
/** Sand carries its colour and whether it is loose or wet in the code itself, so a pile keeps the colours of the bands it fell from. */
export const SAND = 32
export const SAND_COLOURS = 5
export const LOOSE = 8
export const WET = 16
/** The highest code a cell can hold. */
export const TOP = SAND + 31

export const isSand = (code: number): boolean => code >= SAND
export const isLoose = (code: number): boolean => code >= SAND && (code & LOOSE) !== 0
export const isWet = (code: number): boolean => code >= SAND && (code & WET) !== 0
export const colourOf = (code: number): number => code & 7
export const sand = (colour: number, loose = false, wet = false): number => SAND + colour + (loose ? LOOSE : 0) + (wet ? WET : 0)

/** Space that water, steam, a falling grain or a root can enter. */
export const isAir = (code: number): boolean => code === OPEN || code === STEAM
/** Space or water: what gives way to anything that falls. */
export const isFluid = (code: number): boolean => code === OPEN || code === WATER || code === STEAM
export const isClay = (code: number): boolean => code >= CLAY && code <= CLAY_SLICK
export const isRock = (code: number): boolean => code === ROCK || code === ROCK_WET
export const isMoss = (code: number): boolean => code >= MOSS && code <= MOSS_GROWN
export const isHot = (code: number): boolean => code === HOT || code === HOT_WET
export const isEarth = (code: number): boolean => code === EARTH || code === EARTH_WET
export const isRoot = (code: number): boolean => code >= SPROUT && code <= TIP_RIGHT

/** The six grounds of the design sheet's grid, and the other things a fingertip can land on. */
export type Kind = 'sand' | 'clay' | 'rock' | 'moss' | 'hot' | 'earth' | 'tin' | 'water' | 'root' | 'open'
export const GROUNDS = ['sand', 'clay', 'rock', 'moss', 'hot', 'earth'] as const
export type GroundKind = (typeof GROUNDS)[number]

export function kindOf(code: number): Kind {
  if (code >= SAND) return 'sand'
  if (code === WATER) return 'water'
  if (code === TIN) return 'tin'
  if (isClay(code)) return 'clay'
  if (isRock(code)) return 'rock'
  if (isMoss(code)) return 'moss'
  if (isHot(code)) return 'hot'
  if (isEarth(code) || code === SEED) return 'earth'
  if (isRoot(code)) return 'root'
  return 'open'
}

/** Whether water has reached a ground: the sheet's "wet". */
export function wetOf(code: number): boolean {
  return isWet(code) || code === CLAY_WET || code === CLAY_SLICK || code === ROCK_WET || code === MOSS_FULL || code === MOSS_GROWN || code === HOT_WET || code === EARTH_WET || isRoot(code)
}

/** Whether a code is one a cell can hold. A saved hill with any other is not this game's. */
export function known(code: number): boolean {
  if (code >= OPEN && code <= TIP_RIGHT) return true
  return code >= SAND && code <= TOP && colourOf(code) < SAND_COLOURS
}

/** A place on the hill in stage units, as cells. */
export const cellAt = (x: number, y: number): { col: number; row: number } => ({ col: (x - PANE.x) / CELL, row: (y - PANE.y) / CELL })
/** The middle of a cell in stage units. */
export const stageOf = (col: number, row: number): { x: number; y: number } => ({ x: PANE.x + (col + 0.5) * CELL, y: PANE.y + (row + 0.5) * CELL })

/** A box of cells, both ends included. */
export type Box = { col0: number; row0: number; col1: number; row1: number }
export const inBox = (box: Box, col: number, row: number): boolean => col >= box.col0 && col <= box.col1 && row >= box.row0 && row <= box.row1
export const boxCells = (box: Box): number => (box.col1 - box.col0 + 1) * (box.row1 - box.row0 + 1)

/** Where things lie on a hill. Rooms are open space the residents live in; the cells themselves are in the grid. */
export type Layout = {
  /** The row of the ground's top in each column, as the hill was laid: above it is sky. */
  surface: Int16Array
  /** The pond's bowl: its middle column, its brim row, and its half width and depth in cells. */
  pond: { col: number; brim: number; half: number; depth: number }
  /** The inside of the bath, where what lies under the water counts toward floating the duck. */
  bath: Box
  /** The open chamber over the bath. */
  chamber: Box
  moleRoom: Box
  wormRoom: Box
  /** The flat ground the badger's line stands on: its columns and the row of its top. */
  drying: { col0: number; col1: number; row: number }
  /** Where the duck sits in the bath and where the plug's chain hangs, as columns. */
  seat: { col0: number; col1: number }
  chain: { col0: number; col1: number }
  /** Boxes that a root or swelling moss treats as ground: where a resident and its things stand. */
  kept: Box[]
  /** Which way the wind carries a cloud, and the columns it rains over. */
  wind: 1 | -1
  rain: { col0: number; col1: number }
  /** For each ground this hill holds beyond sand: the cell where its first showing puts its water, or knocks. */
  spots: Partial<Record<GroundKind, { col: number; row: number }>>
}

// --- A hill as one string ---------------------------------------------------

const FIRST_CHAR = 48

/** The whole hill as one string, a character for each cell in rows from the top. */
export function encode(cells: Uint8Array): string {
  let out = ''
  for (let row = 0; row < ROWS; row++) out += String.fromCharCode(...Array.from(cells.subarray(row * COLS, (row + 1) * COLS), (code) => code + FIRST_CHAR))
  return out
}

/** A saved hill, or null when the string is not one: the wrong length, or a cell that holds nothing this game knows. */
export function decode(text: unknown): Uint8Array | null {
  if (typeof text !== 'string' || text.length !== COLS * ROWS) return null
  const cells = new Uint8Array(COLS * ROWS)
  for (let i = 0; i < cells.length; i++) {
    const code = text.charCodeAt(i) - FIRST_CHAR
    if (!known(code)) return null
    cells[i] = code
  }
  return cells
}
