import { MAX_SHAPES } from './config'
import { COLS, ROWS } from './layout'

// The wool on the sheet, with no drawing in it. The sheet is a grid of cells.
// A shape is all the wool of one dye that hangs together: each of its cells
// holds how thick the wool lies there (1 to 7) and which of eight ways its
// strands lie. Wool that touches its own colour joins it, so two shapes of
// one dye never touch. Shapes are kept oldest first, and a later one lies
// over an earlier one. What a shape is (a hill, a cloud, a stream) follows
// from its dye and from how high its middle lies; a shape of another dye that
// lies over it is a veil on it.

export const CELLS = COLS * ROWS
export const DYES = 5
export const GREEN = 0, WHITE = 1, BLUE = 2, YELLOW = 3, RUSSET = 4
export const THICKEST = 7
export const WAYS = 8
/** A shape of fewer cells than this is a scrap and does not come alive. */
export const LIVING_CELLS = 10
/** Wool of another dye that lies over this many cells of a shape is a veil on it. */
export const VEIL_CELLS = 6

/** What a dye becomes at each height: low, middle, high. */
export const KINDS = [
  ['hill', 'bush', 'treetop'],
  ['mist', 'smoke', 'cloud'],
  ['pond', 'stream', 'wind'],
  ['corn', 'fire', 'sun'],
  ['earth', 'trunk', 'leaves'],
] as const
export type Kind = (typeof KINDS)[number][number] | 'fluff'
export const ALL_KINDS: readonly Kind[] = [...KINDS.flat(), 'fluff']

export type Shape = {
  id: number
  /**
   * What its marks are seeded from (carry.ts): its dye and where its box begins, which a save holds, and never
   * its id, which a load gives afresh. It is read again whenever the sheet is (`settleSheet`, and the toy's
   * `settle`), and not while a finger is laying into the shape, so nothing it carries jumps under the finger.
   */
  seed: number
  dye: number
  /** One byte a cell of the whole sheet: thickness times 8 plus the way, or 0 where this shape has no wool. */
  cells: Uint8Array
  /** The box that holds its wool, in cells, both ends counted. */
  x0: number; y0: number; x1: number; y1: number
  /** Cells with wool, and the sum of their thicknesses. */
  count: number
  mass: number
  /** Sums over the wool for its middle: row and column, each weighted by thickness. */
  sumRow: number
  sumCol: number
  kind: Kind
  /** The dye of the veil that lies over it: the newest shape of another dye that covers enough of it, or -1. */
  veil: number
}

/** One more level of wool on one cell: what the view stamps. */
export type Laid = { shape: number; dye: number; col: number; row: number; level: number; way: number }
/** One shape taken into another of its dye. */
export type Join = { from: number; into: number }

export type Sheet = {
  shapes: Shape[]
  /** For each dye, which shape holds each cell's wool of that dye: its id, or 0. */
  owner: Int16Array[]
  nextId: number
}

export function makeSheet(): Sheet {
  return { shapes: [], owner: Array.from({ length: DYES }, () => new Int16Array(CELLS)), nextId: 1 }
}

function makeShape(sheet: Sheet, dye: number): Shape {
  const shape: Shape = { id: sheet.nextId++, seed: 0, dye, cells: new Uint8Array(CELLS), x0: COLS, y0: ROWS, x1: -1, y1: -1, count: 0, mass: 0, sumRow: 0, sumCol: 0, kind: 'fluff', veil: -1 }
  sheet.shapes.push(shape)
  return shape
}

export function shapeById(sheet: Sheet, id: number): Shape | undefined {
  return sheet.shapes.find((shape) => shape.id === id)
}

/** The seed of a shape's marks, from what a save holds of it: no two shapes of one dye begin in the same cell for long, and it is the same after a load. */
export function seedOf(shape: Shape): number {
  return 1 + shape.dye + DYES * (shape.x0 + COLS * shape.y0)
}

/** The middle of a shape's wool, in cells. */
export function middle(shape: Shape): { col: number; row: number } {
  return shape.mass > 0 ? { col: shape.sumCol / shape.mass + 0.5, row: shape.sumRow / shape.mass + 0.5 } : { col: 0, row: 0 }
}

/** 0 low, 1 middle, 2 high: the third of the sheet a row lies in. */
export function heightOf(row: number): 0 | 1 | 2 {
  return row < ROWS / 3 ? 2 : row < (ROWS * 2) / 3 ? 1 : 0
}

/** What a shape is now, from its dye, its size and where its middle lies. */
export function kindOf(shape: Shape): Kind {
  if (shape.count < LIVING_CELLS) return 'fluff'
  return KINDS[shape.dye][heightOf(middle(shape).row)]
}

function distanceToBox(shape: Shape, col: number, row: number): number {
  const dx = Math.max(shape.x0 - col, 0, col - shape.x1), dy = Math.max(shape.y0 - row, 0, row - shape.y1)
  return Math.hypot(dx, dy)
}

function boxGap(a: Shape, b: Shape): number {
  const dx = Math.max(a.x0 - b.x1, 0, b.x0 - a.x1), dy = Math.max(a.y0 - b.y1, 0, b.y0 - a.y1)
  return Math.hypot(dx, dy)
}

/** Takes `from` into `into`: its wool, its cells and its place in the sums. `from` leaves the sheet. */
function join(sheet: Sheet, from: Shape, into: Shape, joins: Join[]): void {
  const owner = sheet.owner[into.dye]
  for (let row = from.y0; row <= from.y1; row++) {
    for (let col = from.x0; col <= from.x1; col++) {
      const at = row * COLS + col, value = from.cells[at]
      if (!value) continue
      into.cells[at] = value
      owner[at] = into.id
    }
  }
  into.x0 = Math.min(into.x0, from.x0); into.y0 = Math.min(into.y0, from.y0)
  into.x1 = Math.max(into.x1, from.x1); into.y1 = Math.max(into.y1, from.y1)
  into.count += from.count; into.mass += from.mass; into.sumRow += from.sumRow; into.sumCol += from.sumCol
  sheet.shapes.splice(sheet.shapes.indexOf(from), 1)
  joins.push({ from: from.id, into: into.id })
}

/**
 * The shape a finger that lands at this cell lays into: the shape of this dye that has wool within `reach`
 * cells, or a new one. Either way it becomes the topmost. At the most shapes the sheet holds, new wool joins
 * the nearest shape of its dye, and where there is none, the two nearest shapes of one dye become one first.
 */
export function shapeFor(sheet: Sheet, dye: number, col: number, row: number, reach: number, joins: Join[], most = MAX_SHAPES): Shape {
  const owner = sheet.owner[dye]
  let found: Shape | undefined
  const r = Math.ceil(reach)
  search: for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const c = col + dx, w = row + dy
      if (c < 0 || w < 0 || c >= COLS || w >= ROWS || dx * dx + dy * dy > reach * reach) continue
      const id = owner[w * COLS + c]
      if (id) { found = shapeById(sheet, id); break search }
    }
  }
  if (!found && sheet.shapes.length >= most) {
    const same = sheet.shapes.filter((shape) => shape.dye === dye)
    if (same.length > 0) {
      found = same.reduce((best, shape) => (distanceToBox(shape, col, row) < distanceToBox(best, col, row) ? shape : best))
    } else {
      let pair: [Shape, Shape] | null = null, gap = Infinity
      for (const a of sheet.shapes) for (const b of sheet.shapes) if (a.id < b.id && a.dye === b.dye && boxGap(a, b) < gap) { gap = boxGap(a, b); pair = [a, b] }
      if (pair) join(sheet, pair[1], pair[0], joins)
    }
  }
  if (!found) return makeShape(sheet, dye)
  sheet.shapes.splice(sheet.shapes.indexOf(found), 1)
  sheet.shapes.push(found)
  return found
}

/** Sets one cell of a shape, keeps the sums, and takes in any other shape of the dye that the cell now touches. */
function put(sheet: Sheet, shape: Shape, col: number, row: number, thickness: number, way: number, joins: Join[]): void {
  const at = row * COLS + col, before = shape.cells[at] >> 3
  shape.cells[at] = (thickness << 3) | way
  shape.mass += thickness - before
  shape.sumRow += (thickness - before) * row
  shape.sumCol += (thickness - before) * col
  if (before > 0) return
  shape.count += 1
  if (col < shape.x0) shape.x0 = col
  if (col > shape.x1) shape.x1 = col
  if (row < shape.y0) shape.y0 = row
  if (row > shape.y1) shape.y1 = row
  const owner = sheet.owner[shape.dye]
  owner[at] = shape.id
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const c = col + dx, w = row + dy
      if (c < 0 || w < 0 || c >= COLS || w >= ROWS) continue
      const id = owner[w * COLS + c]
      if (id && id !== shape.id) {
        const other = shapeById(sheet, id)
        if (other) join(sheet, other, shape, joins)
      }
    }
  }
}

/**
 * Lays up to `levels` more levels of wool on one cell of a shape, strands lying `way`. A cell holds seven at
 * most. Returns how many were laid; each is written to `laid` for the view, and any shape taken in to `joins`.
 */
export function lay(sheet: Sheet, shape: Shape, col: number, row: number, way: number, levels: number, laid: Laid[], joins: Join[]): number {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 0
  const before = shape.cells[row * COLS + col] >> 3
  const add = Math.min(levels, THICKEST - before)
  if (add <= 0) return 0
  put(sheet, shape, col, row, before + add, way, joins)
  for (let level = before + 1; level <= before + add; level++) laid.push({ shape: shape.id, dye: shape.dye, col, row, level, way })
  return add
}

/** The topmost shape with wool on this cell, or undefined on bare felt. */
export function topAt(sheet: Sheet, col: number, row: number): Shape | undefined {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return undefined
  const at = row * COLS + col
  for (let i = sheet.shapes.length - 1; i >= 0; i--) if (sheet.shapes[i].cells[at]) return sheet.shapes[i]
  return undefined
}

/** Combs up to `levels` levels of wool off one cell of a shape. Returns how many came off. */
export function thin(sheet: Sheet, shape: Shape, col: number, row: number, levels: number): number {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return 0
  const at = row * COLS + col, value = shape.cells[at], before = value >> 3
  const off = Math.min(levels, before)
  if (off <= 0) return 0
  shape.mass -= off; shape.sumRow -= off * row; shape.sumCol -= off * col
  if (off < before) { shape.cells[at] = ((before - off) << 3) | (value & 7); return off }
  shape.cells[at] = 0
  shape.count -= 1
  sheet.owner[shape.dye][at] = 0
  return off
}

/**
 * After a comb: a shape with no wool left leaves the sheet, and the box of one that lost cells is measured
 * again. A shape the comb has parted stays one shape, so its parts go on moving together.
 */
export function tidy(sheet: Sheet, shape: Shape): void {
  if (shape.count <= 0) {
    const at = sheet.shapes.indexOf(shape)
    if (at >= 0) sheet.shapes.splice(at, 1)
    return
  }
  let x0 = COLS, y0 = ROWS, x1 = -1, y1 = -1
  for (let row = shape.y0; row <= shape.y1; row++) {
    for (let col = shape.x0; col <= shape.x1; col++) {
      if (!shape.cells[row * COLS + col]) continue
      if (col < x0) x0 = col
      if (col > x1) x1 = col
      if (row < y0) y0 = row
      if (row > y1) y1 = row
    }
  }
  shape.x0 = x0; shape.y0 = y0; shape.x1 = x1; shape.y1 = y1
}

/** How many cells two shapes both have wool on. */
export function overlap(a: Shape, b: Shape): number {
  const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1), y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1)
  let n = 0
  for (let row = y0; row <= y1; row++) for (let col = x0; col <= x1; col++) if (a.cells[row * COLS + col] && b.cells[row * COLS + col]) n++
  return n
}

/** The veil on a shape: the dye of the newest shape of another dye that lies over enough of it, or -1. */
export function veilOn(sheet: Sheet, shape: Shape): number {
  const from = sheet.shapes.indexOf(shape)
  for (let i = sheet.shapes.length - 1; i > from; i--) {
    const over = sheet.shapes[i]
    if (over.dye !== shape.dye && overlap(shape, over) >= VEIL_CELLS) return over.dye
  }
  return -1
}

/** What every shape is now and what lies over it, read from the wool. Called on load; the toy does the same after each touch, shape by shape, to hear what changed. */
export function settleSheet(sheet: Sheet): void {
  for (const shape of sheet.shapes) { shape.seed = seedOf(shape); shape.kind = kindOf(shape); shape.veil = shape.kind === 'fluff' ? -1 : veilOn(sheet, shape) }
}

// --- The save ----------------------------------------------------------------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const VALUE_OF = new Map([...ALPHABET].map((char, value) => [char, value]))

/** A shape as the save holds it: its dye, its box in cells, and the box row by row. */
export type SavedShape = { dye: number; x: number; y: number; w: number; h: number; cells: string }

/** One character a cell with wool (its byte, 8 to 63), and one character, 0 to 7, for a run of one to eight empty cells. */
export function encode(sheet: Sheet): SavedShape[] {
  return sheet.shapes.filter((shape) => shape.count > 0).map((shape) => {
    let cells = '', run = 0
    for (let row = shape.y0; row <= shape.y1; row++) {
      for (let col = shape.x0; col <= shape.x1; col++) {
        const value = shape.cells[row * COLS + col]
        if (!value) {
          if (++run === 8) { cells += ALPHABET[7]; run = 0 }
          continue
        }
        if (run > 0) { cells += ALPHABET[run - 1]; run = 0 }
        cells += ALPHABET[value]
      }
    }
    return { dye: shape.dye, x: shape.x0, y: shape.y0, w: shape.x1 - shape.x0 + 1, h: shape.y1 - shape.y0 + 1, cells }
  })
}

const whole = (value: unknown, least: number, most: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= least && value <= most

/**
 * The sheet from what a save holds. Saved state is untrusted: a shape that is not a shape is left out, a
 * character that is none of the alphabet ends its shape there, and wool that touches its own dye is joined as
 * it would have been when laid. No more shapes are read than the sheet may hold.
 */
export function decode(raw: unknown, most = MAX_SHAPES): Sheet {
  const sheet = makeSheet()
  if (!Array.isArray(raw)) return sheet
  const joins: Join[] = []
  for (const entry of raw) {
    if (sheet.shapes.length >= most) break
    if (typeof entry !== 'object' || entry === null) continue
    const { dye, x, y, w, h, cells } = entry as Record<string, unknown>
    if (!whole(dye, 0, DYES - 1) || !whole(x, 0, COLS - 1) || !whole(y, 0, ROWS - 1) || !whole(w, 1, COLS - x) || !whole(h, 1, ROWS - y) || typeof cells !== 'string') continue
    let shape: Shape | null = null, at = 0
    for (const char of cells) {
      const value = VALUE_OF.get(char)
      if (value === undefined || at >= w * h) break
      if (value < 8) { at += value + 1; continue }
      const col = x + (at % w), row = y + Math.floor(at / w)
      at += 1
      // A cell this dye already has belongs to a shape read before: the wool is there, and it is not laid twice.
      if (sheet.owner[dye][row * COLS + col]) continue
      // A shape of this dye that the cell touches is taken into this one, so this one is never the one that leaves.
      if (!shape) shape = makeShape(sheet, dye)
      put(sheet, shape, col, row, value >> 3, value & 7, joins)
    }
  }
  settleSheet(sheet)
  return sheet
}
