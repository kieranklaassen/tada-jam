import { describe, expect, it } from 'vitest'
import { WHOLE, giveOf, shareLength, type Share } from './measure'
import type { Customer, Who } from './orders'
import { serveOf } from './serve'
import { dogTaste, isGlider, tasteOf } from './tastes'
import type { Piece } from './world'

let nextId = 1
const piece = (length: number, fruit: Piece['fruit'] = 'long'): Piece => ({ id: nextId++, fruit, length, place: { on: 'tin', part: 0, turn: 0 }, blind: true, ruled: 0 })
const of = (who: Who, ...shares: Share[]): Customer => ({ who, fruit: 'long', shares, carries: 'written', written: true, lined: true })
const len = (num: number, den: number) => shareLength('long', { num, den })
const taste = (customer: Customer, ...lists: number[][]) => tasteOf(customer, serveOf(customer, lists.map((list) => list.map((length) => piece(length)))))

describe('the pelican', () => {
  const pelican = of('pelican', { num: 3, den: 4 })
  it('likes its order in one piece', () => {
    expect(taste(pelican, [len(3, 4)])).toEqual({ who: 'pelican', liked: true, lumps: [len(3, 4)], hiccups: 0 })
  })
  it('hiccups once for every seam, and the order is still filled', () => {
    const result = taste(pelican, [len(1, 4), len(1, 4), len(1, 4)])
    expect(result).toMatchObject({ liked: false, hiccups: 2, lumps: [len(1, 4), len(1, 4), len(1, 4)] })
    expect(serveOf(pelican, [[piece(len(1, 2)), piece(len(1, 4))]]).kind).toBe('fit')
  })
})

describe('the twins', () => {
  const twins = of('twins', { num: 1, den: 2 })
  it('like one piece each of the same length', () => {
    expect(taste(twins, [len(1, 4)], [len(1, 4)])).toEqual({ who: 'twins', liked: true, pulled: null, by: 0 })
    expect(taste(twins, [len(1, 4) + giveOf('long')], [len(1, 4)])).toMatchObject({ liked: true, pulled: null })
  })
  it('pull the longer piece between them, whichever side it lies on', () => {
    expect(taste(twins, [len(3, 8)], [len(1, 8)])).toMatchObject({ liked: false, pulled: 0, by: len(1, 4) })
    expect(taste(twins, [len(1, 8)], [len(3, 8)])).toMatchObject({ liked: false, pulled: 1 })
  })
  it('do not like crumbs that only add up', () => {
    expect(taste(twins, [len(1, 8), len(1, 8)], [len(1, 4)])).toMatchObject({ liked: false, pulled: null })
  })
})

describe('the ants', () => {
  const ants = of('ants', { num: 3, den: 4 })
  it('like a piece of one part each', () => {
    expect(taste(ants, [len(1, 4), len(1, 4), len(1, 4)])).toEqual({ who: 'ants', liked: true, lifts: [1, 1, 1], flattened: [], idle: 0 })
  })
  it('lift a piece of two parts with two ants, which works, and one ant walks with nothing to carry alone', () => {
    expect(taste(ants, [len(1, 2), len(1, 4)])).toEqual({ who: 'ants', liked: false, lifts: [2, 1], flattened: [], idle: 0 })
    expect(taste(ants, [len(1, 2)])).toMatchObject({ lifts: [2], idle: 1 })
  })
  it('flatten the ant under a piece that ends between two of them', () => {
    const result = taste(ants, [len(3, 8), len(3, 8)])
    expect(result).toMatchObject({ liked: false, flattened: [1, 2] })
    expect(taste(ants, [len(3, 4)])).toMatchObject({ liked: false, lifts: [3], flattened: [] })
  })
})

describe('the cat', () => {
  const cat = of('cat', { num: 2, den: 3 }, { num: 3, den: 4 })
  it('likes the longer tin filled', () => {
    expect(taste(cat, [len(3, 4)])).toEqual({ who: 'cat', liked: true, gaveSmaller: false, crossEyed: false, gap: 0 })
  })
  it('looks at the gap when it is given the smaller share: the gap is the difference between the two', () => {
    expect(taste(cat, [len(2, 3)])).toEqual({ who: 'cat', liked: false, gaveSmaller: true, crossEyed: false, gap: len(3, 4) - len(2, 3) })
  })
  it('goes cross-eyed over two equal shares, and either fills the tin', () => {
    expect(taste(of('cat', { num: 1, den: 2 }, { num: 2, den: 4 }), [len(1, 2)])).toMatchObject({ liked: true, crossEyed: true, gaveSmaller: false })
  })
})

describe('the boa', () => {
  const boa = of('boa', { num: 5, den: 4 })
  it('likes long pieces', () => {
    expect(taste(boa, [WHOLE.long, len(1, 4)])).toEqual({ who: 'boa', liked: true, swellings: [WHOLE.long, len(1, 4)], sneezes: 0 })
  })
  it('sneezes once for every crumb', () => {
    expect(taste(boa, [WHOLE.long, len(1, 12), len(1, 12), len(1, 12)])).toMatchObject({ liked: false, sneezes: 3, swellings: [WHOLE.long] })
  })
})

describe('tastes', () => {
  it('never change: the same pieces get the same answer', () => {
    const pelican = of('pelican', { num: 1, den: 2 })
    expect(taste(pelican, [len(1, 4), len(1, 4)])).toEqual(taste(pelican, [len(1, 4), len(1, 4)]))
  })
  it('differ from one customer to the next for the very same pieces', () => {
    const lists = [[len(1, 4), len(1, 4)]]
    const answers = (['pelican', 'ants', 'boa'] as const).map((who) => JSON.stringify(taste(of(who, { num: 2, den: 4 }), ...lists)))
    expect(new Set(answers).size).toBe(3)
  })
})

describe('the dog', () => {
  it('turns a full circle for the smallest things, snaps up a piece, and struggles politely with a long one', () => {
    expect(dogTaste(giveOf('long') / 2, 'long').act).toBe('spin')
    expect(dogTaste(len(1, 12), 'long').act).toBe('spin')
    expect(dogTaste(len(1, 4), 'long')).toEqual({ act: 'snap', cheeks: 0.25 })
    expect(dogTaste(WHOLE.long, 'long')).toEqual({ act: 'cheeks', cheeks: 1 })
  })
})

describe('the secret', () => {
  it('is a whole uncut fruit fed to the pelican by hand, every time, and to nobody else', () => {
    expect(isGlider(of('pelican', { num: 1, den: 2 }), piece(WHOLE.long))).toBe(true)
    expect(isGlider(of('pelican', { num: 1, den: 2 }), piece(WHOLE.short, 'short'))).toBe(true)
    expect(isGlider(of('pelican', { num: 1, den: 2 }), piece(WHOLE.long - 100))).toBe(false)
    expect(isGlider(of('boa', { num: 5, den: 4 }), piece(WHOLE.long))).toBe(false)
  })
})
