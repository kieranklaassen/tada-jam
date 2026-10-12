import { describe, expect, it } from 'vitest'
import { FATTEST, PARTS } from './candle'
import { CRAFTS, GRID, LEFT, MARK, POINTS, RING_PLACES, colourOf, copyThing, fatCandle, fresh, icedCells, isMade, readThing, sizeOf, twigCount, type Biscuit, type CandleThing, type Star, type Wreath } from './things'

const star = (over: Partial<Star> = {}): Star => ({ ...(fresh('star') as Star), points: 3, ...over })
const wreath = (twigs: number, colour = 0): Wreath => ({ ...(fresh('wreath', 1, colour) as Wreath), twigs: Array.from({ length: RING_PLACES }, (_, i) => (i < twigs ? 1 : 0)) })
const biscuit = (over: Partial<Biscuit> = {}): Biscuit => ({ ...(fresh('biscuit') as Biscuit), cut: true, ...over })

describe('the four things', () => {
  it('start as a piece nobody has made anything of: a bare wick, an unfolded sheet, a bare ring, a sheet of dough', () => {
    for (const craft of CRAFTS) expect(isMade(fresh(craft)), craft).toBe(false)
  })

  it('count as made after one piece of work, or with another thing on them, or with what another stall left', () => {
    expect(isMade(star({ points: 1 }))).toBe(true)
    expect(isMade(wreath(1))).toBe(true)
    expect(isMade(biscuit())).toBe(true)
    expect(isMade(fatCandle())).toBe(true)
    expect(isMade({ ...(fresh('wreath') as Wreath), on: fatCandle() })).toBe(true)
    expect(isMade({ ...(fresh('star') as Star), left: LEFT.wax })).toBe(true)
  })

  it('come in three sizes: a candle by its coats, a star by its sheet, a wreath by its twigs, a biscuit by its tin', () => {
    const thin: CandleThing = { ...fatCandle(), r: new Array<number>(PARTS).fill(6) }
    expect([sizeOf(thin), sizeOf({ ...fatCandle(), r: new Array<number>(PARTS).fill(20) }), sizeOf(fatCandle())]).toEqual([0, 1, 2])
    expect([0, 1, 2].map((size) => sizeOf(star({ size })))).toEqual([0, 1, 2])
    expect([2, 6, 11].map((twigs) => sizeOf(wreath(twigs)))).toEqual([0, 1, 2])
    expect([0, 1, 2].map((tin) => sizeOf(biscuit({ tin })))).toEqual([0, 1, 2])
  })

  it('give a larger sheet more points to fold', () => {
    expect(POINTS[0]).toBeLessThan(POINTS[1])
    expect(POINTS[1]).toBeLessThan(POINTS[2])
  })

  it('come in three colours: a candle is the wax there is most of, the others their paper, ribbon and icing', () => {
    const banded: CandleThing = { ...fatCandle(0), c: Array.from({ length: PARTS }, (_, i) => (i < 3 ? 0 : 2)) }
    expect(colourOf(banded)).toBe(2)
    expect(colourOf(fatCandle(1))).toBe(1)
    expect(colourOf(fresh('candle'))).toBe(0)
    expect(colourOf(star({ colour: 1 }))).toBe(1)
    expect(colourOf(wreath(3, 2))).toBe(2)
  })

  it('are copied whole, with the thing on them', () => {
    const cake = biscuit({ on: fatCandle(1), icing: [1, 2, 3, 4, 5, 6, 7] })
    const copy = copyThing(cake)
    expect(copy).toEqual(cake)
    copy.icing[0] = 99
    copy.on!.mark = MARK.blown
    expect(cake.icing[0]).toBe(1)
    expect(cake.on!.mark).toBe(MARK.none)
  })

  it('are read back as written', () => {
    const things = [fatCandle(2), star({ size: 2, colour: 1, points: 9, left: LEFT.wax, tint: 2 }), { ...wreath(7, 1), on: star(), mark: MARK.chewed }, biscuit({ tin: 2, icing: [0, 28, 62, 127, 62, 28, 0], on: fatCandle(), left: LEFT.ring })]
    for (const thing of things) expect(readThing(JSON.parse(JSON.stringify(thing)))).toEqual(thing)
  })

  it('are repaired field by field when a save is damaged, and what names no craft is no thing', () => {
    for (const raw of [null, 7, 'star', [], {}, { craft: 'kite' }]) expect(readThing(raw)).toBeNull()
    const read = readThing({ craft: 'star', size: 9, colour: -1, points: 50, left: 7, tint: 'red', mark: 2.5 }) as Star
    expect(read).toEqual({ craft: 'star', size: 1, colour: 0, points: 0, left: LEFT.nothing, tint: 0, mark: MARK.none, on: null })
    const candle = readThing({ craft: 'candle', r: [FATTEST + 1, 4, 'x'], c: [0, 5] }) as CandleThing
    expect(candle.r.slice(0, 3)).toEqual([0, 4, 0])
    expect(candle.c.slice(0, 2)).toEqual([0, 0])
    const iced = readThing({ craft: 'biscuit', cut: 'yes', icing: [128, 3, -1] }) as Biscuit
    expect(iced.cut).toBe(false)
    expect(iced.icing).toEqual([0, 3, 0, 0, 0, 0, 0])
    expect(readThing({ craft: 'star' }, 'wreath')).toBeNull()
  })

  it('carry at most one other thing, which carries none itself, and nothing stands on a candle', () => {
    const nested = readThing({ craft: 'wreath', on: { craft: 'star', points: 2, on: { craft: 'biscuit', cut: true } } }) as Wreath
    expect(nested.on?.craft).toBe('star')
    expect(nested.on?.on).toBeNull()
    expect((readThing({ ...fatCandle(), on: star() }) as CandleThing).on).toBeNull()
    expect((readThing({ craft: 'star', on: { craft: 'star', points: 2 } }) as Star).on).toBeNull()
  })

  it('count twigs and icing cells', () => {
    expect(twigCount(wreath(5))).toBe(5)
    expect(icedCells(biscuit({ icing: [1, 3, 7, 0, 0, 0, 127] }))).toBe(1 + 2 + 3 + GRID)
  })
})
