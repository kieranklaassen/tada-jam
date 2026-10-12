import { describe, expect, it } from 'vitest'
import { COLS, ROWS } from './layout'
import { BLUE, DYES, GREEN, KINDS, LIVING_CELLS, THICKEST, WHITE, YELLOW, decode, encode, heightOf, kindOf, lay, makeSheet, middle, shapeFor, type Join, type Laid, type Sheet } from './wool'

/** Lays a block of one dye, one level thick, as one stroke would: into the shape the first cell finds. */
function block(sheet: Sheet, dye: number, col: number, row: number, w: number, h: number, levels = 1, way = 0) {
  const laid: Laid[] = [], joins: Join[] = []
  const shape = shapeFor(sheet, dye, col, row, 1.5, joins)
  for (let y = row; y < row + h; y++) for (let x = col; x < col + w; x++) lay(sheet, shape, x, y, way, levels, laid, joins)
  shape.kind = kindOf(shape)
  return { shape, laid, joins }
}

const stored = (sheet: Sheet): unknown => JSON.parse(JSON.stringify(encode(sheet)))

describe('laying wool', () => {
  it('lays level on level up to seven on a cell and no further, and says each level it laid', () => {
    const sheet = makeSheet(), laid: Laid[] = [], joins: Join[] = []
    const shape = shapeFor(sheet, GREEN, 10, 40, 1.5, joins)
    expect(lay(sheet, shape, 10, 40, 3, 2, laid, joins)).toBe(2)
    expect(laid.map((l) => l.level)).toEqual([1, 2])
    expect(lay(sheet, shape, 10, 40, 5, 9, laid, joins)).toBe(THICKEST - 2)
    expect(lay(sheet, shape, 10, 40, 5, 1, laid, joins)).toBe(0)
    expect(shape.cells[40 * COLS + 10]).toBe((THICKEST << 3) | 5)
    expect(shape.count).toBe(1)
    expect(shape.mass).toBe(THICKEST)
    expect(lay(sheet, shape, -1, 0, 0, 1, laid, joins)).toBe(0)
    expect(lay(sheet, shape, COLS, ROWS, 0, 1, laid, joins)).toBe(0)
  })

  it('joins wool that touches its own colour into one shape, and leaves another colour as a shape of its own lying over it', () => {
    const sheet = makeSheet()
    block(sheet, GREEN, 5, 40, 6, 3)
    block(sheet, GREEN, 30, 40, 6, 3)
    expect(sheet.shapes).toHaveLength(2)
    // A bridge between the two makes them one.
    const bridge = block(sheet, GREEN, 11, 41, 19, 1)
    expect(sheet.shapes).toHaveLength(1)
    expect(bridge.joins).toHaveLength(1)
    expect(sheet.shapes[0].count).toBe(18 + 18 + 19)
    block(sheet, WHITE, 8, 40, 4, 2)
    expect(sheet.shapes.map((shape) => shape.dye)).toEqual([GREEN, WHITE])
  })

  it('makes the shape a finger lays into the topmost', () => {
    const sheet = makeSheet()
    block(sheet, GREEN, 5, 40, 6, 3)
    block(sheet, BLUE, 5, 20, 6, 3)
    block(sheet, GREEN, 6, 41, 1, 1)
    expect(sheet.shapes.map((shape) => shape.dye)).toEqual([BLUE, GREEN])
  })

  it('holds no more shapes than the sheet may: past that, new wool joins the nearest of its colour', () => {
    const sheet = makeSheet(), joins: Join[] = [], laid: Laid[] = []
    for (let i = 0; i < 4; i++) {
      const shape = shapeFor(sheet, GREEN, 4 + i * 16, 40, 1.5, joins, 4)
      lay(sheet, shape, 4 + i * 16, 40, 0, 1, laid, joins)
    }
    expect(sheet.shapes).toHaveLength(4)
    const far = shapeFor(sheet, GREEN, 60, 4, 1.5, joins, 4)
    lay(sheet, far, 60, 4, 0, 1, laid, joins)
    expect(sheet.shapes).toHaveLength(4)
    expect(far.count).toBe(2)
    // A colour with no shape yet still gets one: the two nearest of one colour become one first.
    const yellow = shapeFor(sheet, YELLOW, 30, 4, 1.5, joins, 4)
    lay(sheet, yellow, 30, 4, 0, 1, laid, joins)
    expect(sheet.shapes).toHaveLength(4)
    expect(sheet.shapes.filter((shape) => shape.dye === YELLOW)).toHaveLength(1)
    expect(sheet.shapes.reduce((sum, shape) => sum + shape.count, 0)).toBe(6)
  })
})

describe('what a shape is', () => {
  it('is fluff below ten cells, and wakes with more wool', () => {
    const sheet = makeSheet()
    const { shape } = block(sheet, GREEN, 5, 40, LIVING_CELLS - 1, 1)
    expect(shape.kind).toBe('fluff')
    expect(block(sheet, GREEN, 5, 41, 1, 1).shape.kind).toBe('hill')
  })

  it('follows its dye and the third of the sheet its middle lies in: fifteen kinds, all different', () => {
    expect(heightOf(0)).toBe(2)
    expect(heightOf(ROWS / 3)).toBe(1)
    expect(heightOf(ROWS - 1)).toBe(0)
    const seen = new Set<string>()
    for (let dye = 0; dye < DYES; dye++) {
      for (const [height, row] of [[0, 40], [1, 22], [2, 4]] as const) {
        const sheet = makeSheet()
        const { shape } = block(sheet, dye, 20, row, 6, 3)
        expect(shape.kind).toBe(KINDS[dye][height])
        seen.add(shape.kind)
      }
    }
    expect(seen.size).toBe(15)
  })

  it('reads its height from the middle of its wool, by thickness: a thin tail does not move a thick heap', () => {
    const sheet = makeSheet()
    block(sheet, WHITE, 20, 2, 6, 4, 6)
    const { shape } = block(sheet, WHITE, 22, 6, 1, 30, 1)
    expect(middle(shape).row).toBeLessThan(ROWS / 3)
    expect(shape.kind).toBe('cloud')
  })
})

describe('the saved sheet', () => {
  it('comes back as it was laid: every cell, its thickness and way, the order of the shapes and what each is', () => {
    const sheet = makeSheet()
    block(sheet, GREEN, 3, 36, 30, 9, 3, 2)
    block(sheet, WHITE, 40, 3, 12, 5, 2, 7)
    block(sheet, BLUE, 0, 22, 72, 2, 1, 4)
    block(sheet, WHITE, 5, 37, 3, 3, 1, 1)
    const back = decode(stored(sheet))
    expect(back.shapes.map((shape) => [shape.dye, shape.kind, shape.count, shape.mass])).toEqual(sheet.shapes.map((shape) => [shape.dye, shape.kind, shape.count, shape.mass]))
    back.shapes.forEach((shape, i) => expect(shape.cells).toEqual(sheet.shapes[i].cells))
    expect(stored(back)).toEqual(stored(sheet))
  })

  it.each([
    ['nothing', undefined],
    ['a string', 'felt'],
    ['a record', { dye: 0 }],
    ['shapes that are not shapes', [null, 7, 'x', { dye: 9, x: 0, y: 0, w: 1, h: 1, cells: 'J' }, { dye: 0, x: 70, y: 0, w: 5, h: 1, cells: 'J' }, { dye: 0, x: 0, y: 0, w: 1, h: 1, cells: 42 }]],
  ])('gives a bare sheet for %s', (_, raw) => {
    expect(decode(raw).shapes).toEqual([])
  })

  it('reads what it can of a damaged shape, and joins wool that touches its own colour', () => {
    // A character outside the alphabet ends the shape there; the cells before it stay.
    const cut = decode([{ dye: 1, x: 2, y: 2, w: 4, h: 1, cells: 'JJ!J' }])
    expect(cut.shapes).toHaveLength(1)
    expect(cut.shapes[0].count).toBe(2)
    // Two saved shapes of one dye that touch are one shape, as they would have been when laid.
    const joined = decode([{ dye: 0, x: 0, y: 0, w: 2, h: 1, cells: 'JJ' }, { dye: 0, x: 2, y: 0, w: 2, h: 1, cells: 'JJ' }])
    expect(joined.shapes).toHaveLength(1)
    expect(joined.shapes[0].count).toBe(4)
    // More cells than the box holds are not read.
    expect(decode([{ dye: 0, x: 0, y: 0, w: 2, h: 1, cells: 'JJJJJ' }]).shapes[0].count).toBe(2)
  })

  it('keeps a largest sheet under half of the 64 KB cap: every dye over every cell at its thickest, and twenty thin shapes that span the sheet', () => {
    const full = makeSheet()
    for (let dye = 0; dye < DYES; dye++) block(full, dye, 0, 0, COLS, ROWS, THICKEST)
    expect(full.shapes).toHaveLength(DYES)
    expect(JSON.stringify(encode(full)).length).toBeLessThan(20 * 1024)
    // Twenty shapes that each span the sheet from corner to corner as a thin stair, four of each dye.
    const sparse = makeSheet()
    for (let i = 0; i < 20; i++) {
      const laid: Laid[] = [], joins: Join[] = []
      const dye = i % DYES, shift = Math.floor(i / DYES) * 12
      const shape = shapeFor(sparse, dye, shift, 0, 1.5, joins)
      for (let row = 0; row < ROWS; row++) lay(sparse, shape, shift + Math.floor(row / 2), row, 0, 1, laid, joins)
    }
    expect(sparse.shapes).toHaveLength(20)
    expect(JSON.stringify(encode(sparse)).length).toBeLessThan(16 * 1024)
  })
})
