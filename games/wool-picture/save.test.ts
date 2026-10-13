import { describe, expect, it } from 'vitest'
import { FIRST_TUFT } from './config'
import { COLS, ROWS } from './layout'
import { makeRng } from './rng'
import { firstTuft, open, record } from './save'
import { STATE_VERSION, freshState } from './state'
import { Toy } from './toy'
import { DYES, THICKEST, encode, lay, makeSheet, shapeFor, type Join, type Laid } from './wool'

/** What ctx.storage hands back on the next visit. */
const stored = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe('the saved toy', () => {
  it('starts a first visit with a bare sheet, the green bowl, and a tuft sized by age: open at both ends, and no age as the youngest', () => {
    expect(FIRST_TUFT.map((row) => row.fromAge)).toEqual([4, 5, 7])
    expect([null, 2, 4, 5, 6, 7, 8, 11].map((age) => firstTuft(age))).toEqual([0, 0, 0, 1, 1, 2, 2, 2])
    const first = open(undefined, 6)
    expect(first.sheet.shapes).toEqual([])
    expect(first.hand).toBe(0)
    expect(first.size).toBe(1)
    expect(first.state).toEqual(freshState(6))
  })

  it('is found as left: the wool, the bowl and the size of the tuft come back, and a saved size wins over the age', () => {
    const toy = new Toy(makeSheet(), 0, 0, makeRng(1))
    toy.press({ x: 300, y: 500 })
    toy.move({ x: 520, y: 470 })
    toy.advance(1.2)
    toy.end('dragEnd')
    toy.press({ x: 376, y: 700 })
    toy.end('tap')
    toy.press({ x: 376, y: 700 })
    toy.end('tap')
    const back = open(stored(record(freshState(null), toy)), 8)
    expect(back.hand).toBe(2)
    expect(back.size).toBe(1)
    expect(stored(encode(back.sheet))).toEqual(stored(encode(toy.sheet)))
    expect(back.sheet.shapes.map((shape) => shape.kind)).toEqual(toy.sheet.shapes.map((shape) => shape.kind))
  })

  it('saves nothing of the hand: a put-away in the middle of a stroke keeps the wool already laid and nothing else', () => {
    const toy = new Toy(makeSheet(), 3, 1, makeRng(1))
    toy.press({ x: 300, y: 200 })
    toy.advance(0.3)
    const saved = stored(record(freshState(null), toy)) as Record<string, unknown>
    expect(Object.keys(saved).sort()).toEqual(['felt', 'finished', 'folk', 'hand', 'position', 'size', 'v', 'wall'])
    expect(open(saved, null).sheet.shapes[0].mass).toBe(toy.sheet.shapes[0].mass)
  })

  it('repairs each field by itself', () => {
    const good = stored(record(freshState(null), new Toy(makeSheet(), 4, 2, makeRng(1)))) as Record<string, unknown>
    expect(open({ ...good, hand: 9 }, null).hand).toBe(0)
    expect(open({ ...good, hand: 9 }, null).size).toBe(2)
    expect(open({ ...good, size: 'big' }, 7).size).toBe(2)
    expect(open({ ...good, size: 'big' }, null).size).toBe(0)
    expect(open({ ...good, felt: 'wool' }, null).sheet.shapes).toEqual([])
    expect(open({ ...good, felt: 'wool' }, null).hand).toBe(4)
    expect(open({ ...good, v: STATE_VERSION + 1 }, null).hand).toBe(0)
  })

  it('keeps a largest legal state under half of the 64 KB cap', () => {
    const sheet = makeSheet()
    for (let dye = 0; dye < DYES; dye++) {
      const laid: Laid[] = [], joins: Join[] = []
      const shape = shapeFor(sheet, dye, 0, 0, 1.5, joins)
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) lay(sheet, shape, col, row, 7, THICKEST, laid, joins)
    }
    const largest = record(freshState(null), { sheet, hand: 4, size: 2, finished: false, folk: [], wall: [] })
    expect(JSON.stringify(largest).length).toBeLessThan(32 * 1024)
  })
})
