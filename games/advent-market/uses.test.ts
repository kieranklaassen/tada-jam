import { describe, expect, it } from 'vitest'
import { STALLS, type Stall } from './places'
import { CRAFTS, LEFT, fatCandle, fresh, icedCells, type Biscuit, type Craft, type Star, type Thing, type Wreath } from './things'
import { comesOff, use } from './uses'
import { notesOf } from './voices'

const made = (craft: Craft): Thing =>
  craft === 'candle' ? fatCandle(1)
  : craft === 'star' ? { ...(fresh('star', 1, 2) as Star), points: 4 }
  : craft === 'wreath' ? { ...(fresh('wreath', 1, 1) as Wreath), twigs: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  : { ...(fresh('biscuit', 1, 0) as Biscuit), cut: true }

const others = (stall: Stall): Craft[] => CRAFTS.filter((craft) => craft !== stall)

describe('a thing used at another stall', () => {
  it('works in all twelve cells, each with its own two sounds', () => {
    const heard = new Set<string>()
    for (const stall of STALLS) for (const craft of others(stall)) {
      const used = use(stall, made(craft), fresh(stall), 2)
      const key = JSON.stringify([notesOf(used.first), used.times > 0 ? notesOf(used.then) : null, used.times])
      expect(heard.has(key), `${craft} at the ${stall} stall`).toBe(false)
      heard.add(key)
    }
    expect(heard.size).toBe(12)
  })

  it('dips whatever is brought to the wax: a coat in the colour of the pot, and the thing goes back', () => {
    for (const craft of others('candle')) {
      const thing = made(craft)
      const used = use('candle', thing, fresh('candle'), 2)
      expect(used.kind).toBe('dip')
      expect(used.back).toEqual([thing])
      expect([thing.left, thing.tint]).toEqual([LEFT.wax, 2])
    }
  })

  it('at the star stall stands a candle behind the star, hangs a wreath round it, and wraps a biscuit in the paper that is out', () => {
    const star = made('star') as Star
    const candle = made('candle')
    expect(use('star', candle, star, star.colour).kind).toBe('set')
    expect(star.on).toBe(candle)
    const wreath = made('wreath')
    // The second thing takes the place of the first, which comes off.
    expect(use('star', wreath, star, star.colour).back).toEqual([candle])
    expect(star.on).toBe(wreath)
    const biscuit = made('biscuit')
    const wrapped = use('star', biscuit, star, star.colour)
    expect(wrapped.kind).toBe('wrap')
    expect([biscuit.left, biscuit.tint]).toEqual([LEFT.wrap, star.colour])
    expect(wrapped.back).toEqual([biscuit])
  })

  it('at the wreath stall sets a candle, a star or a biscuit on the ring', () => {
    for (const craft of others('wreath')) {
      const ring = fresh('wreath'), thing = made(craft)
      expect(use('wreath', thing, ring, 0).kind).toBe('set')
      expect(ring.on).toBe(thing)
    }
  })

  it('at the biscuit stall makes a cake of a candle, a stencil of a star and a ring biscuit of a wreath, cutting the dough first', () => {
    const cake = fresh('biscuit', 1) as Biscuit, candle = made('candle')
    expect(use('biscuit', candle, cake, 0).kind).toBe('set')
    expect([cake.cut, cake.on]).toEqual([true, candle])
    const printed = fresh('biscuit', 2) as Biscuit, star = made('star')
    expect(use('biscuit', star, printed, 0).back).toEqual([star])
    // Icing all over, but for a bare ring round one iced dot in the middle: a round print, never a letter or an arrow.
    expect(icedCells(printed)).toBeGreaterThan(10)
    expect(printed.icing[3] & (1 << 3)).not.toBe(0)
    const bare: string[] = []
    for (let row = 0; row < printed.icing.length; row++) for (let col = 0; col < 7; col++) if (row >= 2 && row <= 4 && col >= 2 && col <= 4 && !(printed.icing[row] & (1 << col))) bare.push(`${row}${col}`)
    expect(bare).toEqual(['22', '23', '24', '32', '34', '42', '43', '44'])
    // The same turned over or on its side: it has no way up.
    for (const cell of bare) expect(bare).toContain(`${cell[1]}${cell[0]}`)
    const ring = fresh('biscuit', 1) as Biscuit, wreath = made('wreath')
    expect(use('biscuit', wreath, ring, 0).back).toEqual([wreath])
    expect([ring.cut, ring.left]).toEqual([true, LEFT.ring])
  })

  it('never leaves a thing on a thing that is on a thing: what the used thing carried comes off too', () => {
    const ring = { ...(fresh('wreath') as Wreath), on: made('biscuit') }, star = { ...(made('star') as Star), on: made('candle') }
    expect(comesOff('wreath', star, ring)).toBe(2)
    const used = use('wreath', star, ring, 0)
    expect(used.back.map((thing) => thing.craft)).toEqual(['candle', 'biscuit'])
    expect(ring.on).toBe(star)
    expect(star.on).toBeNull()
    expect(comesOff('candle', star, fresh('candle'))).toBe(0)
  })
})
