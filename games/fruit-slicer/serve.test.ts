import { describe, expect, it } from 'vitest'
import { giveOf, shareLength } from './measure'
import type { Customer } from './orders'
import { offInParts, ruling, serveOf, served } from './serve'
import { cut, emptyWorld, giveToTin, landFruit, type Piece } from './world'

const customer = (over: Partial<Customer> = {}): Customer => ({ who: 'pelican', fruit: 'long', shares: [{ num: 3, den: 4 }], carries: 'written', written: true, lined: true, ...over })
const piece = (length: number, fruit: Piece['fruit'] = 'long', id = 1): Piece => ({ id, fruit, length, place: { on: 'tin', part: 0, turn: 0 }, blind: true, ruled: 0 })
const ORDERED = shareLength('long', { num: 3, den: 4 })
const GIVE = giveOf('long')

describe('a piece laid in a tin', () => {
  it('fits when it is within the give, and the consequence says by how much it is off', () => {
    expect(serveOf(customer(), [[piece(ORDERED)]])).toMatchObject({ kind: 'fit', by: 0 })
    expect(serveOf(customer(), [[piece(ORDERED - GIVE)]])).toMatchObject({ kind: 'fit', by: -GIVE })
  })

  it('sticks out by exactly the excess', () => {
    const result = serveOf(customer(), [[piece(ORDERED + 250)]])
    expect(result).toMatchObject({ kind: 'over', by: 250 })
    expect(result.parts[0]).toMatchObject({ ordered: ORDERED, total: ORDERED + 250 })
  })

  it('leaves a gap exactly as long as what is missing', () => {
    expect(serveOf(customer(), [[piece(ORDERED - 400)]])).toMatchObject({ kind: 'under', by: -400 })
  })

  it('adds up: a half and a quarter lie exactly on three quarters', () => {
    const half = piece(shareLength('long', { num: 1, den: 2 }), 'long', 1), quarter = piece(shareLength('long', { num: 1, den: 4 }), 'long', 2)
    expect(serveOf(customer(), [[half, quarter]])).toMatchObject({ kind: 'fit', by: 0 })
  })

  it('is empty when nothing of the ordered fruit is in it, and leaves a piece of another fruit out', () => {
    expect(serveOf(customer(), [[]])).toMatchObject({ kind: 'empty', by: -ORDERED })
    const stray = piece(ORDERED, 'short')
    const result = serveOf(customer(), [[stray]])
    expect(result.kind).toBe('empty')
    expect(result.strays).toEqual([stray])
    expect(serveOf(customer(), [[piece(ORDERED), stray]])).toMatchObject({ kind: 'fit', strays: [stray] })
  })

  it('says how much of a part is missing', () => {
    expect(offInParts(customer(), -300)).toBeCloseTo(-0.5)
    expect(offInParts(customer({ shares: [{ num: 1, den: 2 }] }), 300)).toBeCloseTo(0.25)
  })
})

describe('the twins', () => {
  const twins = customer({ who: 'twins', shares: [{ num: 1, den: 2 }] })
  const quarter = shareLength('long', { num: 1, den: 4 })

  it('are served when each of the two compartments fits', () => {
    expect(serveOf(twins, [[piece(quarter, 'long', 1)], [piece(quarter, 'long', 2)]]).kind).toBe('fit')
  })

  it('are not served by one piece, however right its length, and the worse compartment says how', () => {
    const one = serveOf(twins, [[piece(2 * quarter)], []])
    expect(one.kind).toBe('over')
    expect(one.parts.map((part) => part.fit.kind)).toEqual(['over', 'under'])
    expect(serveOf(twins, [[piece(quarter)], []])).toMatchObject({ kind: 'under', by: -quarter })
  })
})

describe('what lies in the tin at the window', () => {
  it('is read from the world, compartment by compartment, in the order the pieces came', () => {
    const landed = landFruit(emptyWorld(), 'long')
    const result = cut(landed.world, landed.id, ORDERED - 150)
    if (result.kind !== 'cut') throw new Error('no cut')
    const world = giveToTin(result.world, result.left, 0)
    expect(served(world, customer())).toMatchObject({ kind: 'under', by: -150 })
    expect(served(giveToTin(world, result.right, 0), customer())).toMatchObject({ kind: 'over', by: shareLength('long', { num: 1, den: 4 }) })
  })
})

describe('the ruling on the rail', () => {
  it('rules the whole into the parts of the order and lights the ordered ones', () => {
    expect(ruling(customer())).toEqual({ whole: 2400, rows: [{ share: { num: 3, den: 4 }, parts: 4, lit: 3 }], sign: null })
    expect(ruling(customer({ shares: [{ num: 2, den: 4 }] })).rows[0]).toMatchObject({ parts: 4, lit: 2 })
  })

  it("rules the cat's two shares into the same parts and puts the sign between them", () => {
    const cat = customer({ who: 'cat', shares: [{ num: 2, den: 3 }, { num: 3, den: 4 }] })
    expect(ruling(cat)).toEqual({ whole: 2400, rows: [{ share: { num: 2, den: 3 }, parts: 12, lit: 8 }, { share: { num: 3, den: 4 }, parts: 12, lit: 9 }], sign: 'less' })
    expect(ruling(customer({ who: 'cat', shares: [{ num: 1, den: 2 }, { num: 2, den: 4 }] }))).toMatchObject({ sign: 'equals', rows: [{ parts: 4, lit: 2 }, { parts: 4, lit: 2 }] })
  })
})
