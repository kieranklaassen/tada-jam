import { describe, expect, it } from 'vitest'
import { feastOf, leavingFeast, wantedCount } from './feast'
import { shareLength, type Share } from './measure'
import type { Customer, Who } from './orders'
import { restShow, servedShow, type Show } from './scenes'
import { serveOf } from './serve'
import { tasteOf, type Taste } from './tastes'
import type { Piece } from './world'

const of = (who: Who, ...shares: Share[]): Customer => ({ who, fruit: 'long', shares, carries: null, written: true, lined: true })
const len = (num: number, den: number) => shareLength('long', { num, den })
const piece = (id: number, length: number): Piece => ({ id, fruit: 'long', length, place: { on: 'tin', part: 0, turn: id }, blind: true, ruled: 0, mark: 0 })
const taste = (customer: Customer, ...lists: number[][]): Taste => tasteOf(customer, serveOf(customer, lists.map((list, part) => list.map((length, i) => piece(part * 10 + i + 1, length)))))
const during = (set: Partial<Show>): Show => ({ ...restShow('serve'), lid: 1, lift: 1, ...set })

describe('what went in', () => {
  const pelican = of('pelican', { num: 3, den: 4 })
  const lengths = [len(1, 2), len(1, 4)]

  it('shows each piece at its own length, in the order eaten, and only those eaten so far', () => {
    expect(feastOf(pelican, lengths, null, during({ bites: 0 })).lumps).toEqual([])
    const half = feastOf(pelican, lengths, null, during({ bites: 0.5 }))
    expect(half.lumps).toEqual([{ at: 0.5, size: 0.5, fruit: 'long' }])
    expect(half.mouth).toBeGreaterThan(0.9)
    expect(feastOf(pelican, lengths, null, during({ bites: 2 })).lumps).toEqual([{ at: 1, size: 0.5, fruit: 'long' }, { at: 1, size: 0.25, fruit: 'long' }])
  })

  it('is all that stays once the serve is over, and on load: the pieces, at rest, and no taste', () => {
    const loaded = feastOf(pelican, lengths, null, null)
    expect(loaded).toEqual({ lumps: [{ at: 1, size: 0.5, fruit: 'long' }, { at: 1, size: 0.25, fruit: 'long' }], mouth: 0, first: null, eater: -1, hop: 0, shrug: 0, pull: 0, rope: 0, spin: 0, flat: [], cross2: [], cross: 0, gaze: 0, tail: 0, sneeze: -1, pleased: 0 })
    expect(feastOf(pelican, lengths, taste(pelican, lengths), servedShow(2))).toMatchObject({ lumps: loaded.lumps, hop: 0, mouth: 0 })
  })

  it('shrugs as the lid comes down and will not shut, when it is sent off with a misfit, and at no other time', () => {
    expect(feastOf(pelican, lengths, null, during({ lid: 0.5, lift: 0 }), false, true).shrug).toBeCloseTo(1)
    expect(feastOf(pelican, lengths, null, during({ lid: 1 }), false, true).shrug).toBeCloseTo(0)
    expect(feastOf(pelican, lengths, null, during({ lid: 0.5, lift: 0 })).shrug).toBe(0)
    expect(feastOf(pelican, lengths, null, null, false, true).shrug).toBe(0)
  })

  it('on its way out shows what it ate, and the pelican still hiccups for every seam, all the way', () => {
    const going = leavingFeast(pelican, lengths, 0.5)
    expect(going.lumps).toEqual(feastOf(pelican, lengths, null, null).lumps)
    expect(going.hop).toBeGreaterThan(3)
    expect(leavingFeast(pelican, [len(3, 4)], 0.5).hop).toBe(0)
    expect(leavingFeast(of('boa', { num: 5, den: 4 }), lengths, 0.5).hop).toBe(0)
  })

  it('shows exactly what went in: a piece of another fruit keeps its own colour', () => {
    expect(feastOf(pelican, lengths, null, null, false, false, ['short', 'middle']).lumps.map((one) => one.fruit)).toEqual(['short', 'middle'])
    expect(feastOf(pelican, lengths, null, null, false, false, ['short']).lumps.map((one) => one.fruit)).toEqual(['short', 'long'])
  })

  it('is eaten sticking out when the order was too long', () => {
    expect(feastOf(pelican, [len(1, 1)], null, during({ bites: 1 }), true).mouth).toBeCloseTo(0.4)
    expect(feastOf(pelican, [len(3, 4)], null, during({ bites: 1 }), false).mouth).toBe(0)
  })
})

describe('the taste landing', () => {
  const mid = (customer: Customer, bites: number, t = 0.3) => (flavour: Taste, lengths: number[]) => feastOf(customer, lengths, flavour, during({ bites, taste: t }))

  it('the pelican hiccups once for every seam, and not at all for one piece', () => {
    const pelican = of('pelican', { num: 3, den: 4 })
    const one = [len(3, 4)], three = [len(1, 4), len(1, 4), len(1, 4)]
    expect(mid(pelican, 1)(taste(pelican, one), one)).toMatchObject({ hop: 0 })
    expect(mid(pelican, 1)(taste(pelican, one), one).pleased).toBeGreaterThan(0.5)
    expect(mid(pelican, 3, 0.25)(taste(pelican, three), three).hop).toBeGreaterThan(3)
    expect(mid(pelican, 3)(taste(pelican, three), three).pleased).toBe(0)
  })

  it('the twins pull the longer piece between them and the tin spins; equal pieces, and they do not', () => {
    const twins = of('twins', { num: 1, den: 2 })
    const fair = taste(twins, [len(1, 4)], [len(1, 4)]), unfair = taste(twins, [len(3, 8)], [len(1, 8)])
    expect(mid(twins, 2)(fair, [len(1, 4), len(1, 4)])).toMatchObject({ pull: 0, spin: 0 })
    const pulled = mid(twins, 2, 0.08)(unfair, [len(3, 8), len(1, 8)])
    expect(pulled.pull).toBeGreaterThan(0.5)
    expect(pulled.spin).toBeGreaterThan(0)
    // Given one piece each of one length they eat in step: both pieces go down together and both mouths open for the one bite.
    const together = feastOf(twins, [len(1, 4), len(1, 4)], fair, during({ bites: 1 }))
    expect(together.lumps.map((one) => one.at)).toEqual([0.5, 0.5])
    expect(together.eater).toBe(-1)
    expect(together.mouth).toBeGreaterThan(0.9)
    // Otherwise one eats after the other, and only the twin whose piece it is opens its mouth.
    const first = feastOf(twins, [len(3, 8), len(1, 8)], unfair, during({ bites: 0.5 }))
    expect(first.lumps.map((one) => one.at)).toEqual([0.5])
    expect(first.eater).toBe(0)
    expect(feastOf(twins, [len(3, 8), len(1, 8)], unfair, during({ bites: 1.5 })).eater).toBe(1)
    // The rope is as long as the longer twin's share: three eighths of the fruit.
    expect(pulled.rope).toBeCloseTo(3 / 8)
    // The tin comes to rest the right way up: whole turns.
    expect(Math.cos(mid(twins, 2, 1)(unfair, [len(3, 8), len(1, 8)]).spin)).toBeCloseTo(1)
  })

  it('an ant is flattened under a piece that ends between two ants, and peels itself up', () => {
    const ants = of('ants', { num: 3, den: 4 })
    expect(wantedCount(ants)).toBe(3)
    const lengths = [len(3, 8), len(3, 8)]
    const flavour = taste(ants, lengths)
    expect(mid(ants, 2, 0.3)(flavour, lengths).flat).toEqual([0, 1, 1])
    expect(mid(ants, 2, 0.9)(flavour, lengths).flat).toEqual([0, 0, 0])
    const neat = [len(1, 4), len(1, 4), len(1, 4)]
    expect(mid(ants, 3)(taste(ants, neat), neat).flat).toEqual([0, 0, 0])
  })

  it('the cat looks at the gap and then at the piece when it was given the smaller share, and goes cross-eyed over equal ones', () => {
    const cat = of('cat', { num: 2, den: 3 }, { num: 3, den: 4 })
    const small = [len(2, 3)]
    // While the piece still lies in the tin: at the gap as the lid comes down, at the piece as the tin is lifted, and no more once it eats.
    expect(feastOf(cat, small, taste(cat, small), { ...restShow('serve'), lid: 0.6 }).gaze).toBeLessThan(-0.5)
    expect(feastOf(cat, small, taste(cat, small), { ...restShow('serve'), lid: 1, lift: 0.6 }).gaze).toBeGreaterThan(0.5)
    expect(mid(cat, 1, 0.5)(taste(cat, small), small).gaze).toBe(0)
    const right = [len(3, 4)]
    expect(mid(cat, 1, 0.5)(taste(cat, right), right)).toMatchObject({ gaze: 0, cross: 0 })
    expect(mid(cat, 1, 0.5)(taste(cat, right), right).tail).toBeGreaterThan(0.3)
    const equal = of('cat', { num: 1, den: 2 }, { num: 2, den: 4 })
    expect(mid(equal, 1, 0.5)(taste(equal, [len(1, 2)]), [len(1, 2)]).cross).toBeGreaterThan(0.9)
  })

  it('a sneeze travels the length of the boa for every crumb, and none for long pieces', () => {
    const boa = of('boa', { num: 5, den: 4 })
    const crumbs = [len(1, 1), len(1, 12), len(1, 12), len(1, 12)]
    const places = [0.1, 0.2, 0.3].map((t) => mid(boa, 4, t)(taste(boa, crumbs), crumbs).sneeze)
    expect(places.every((place) => place >= 0 && place < 1)).toBe(true)
    expect(new Set(places.map((place) => place.toFixed(2))).size).toBe(3)
    const long = [len(1, 1), len(1, 4)]
    expect(mid(boa, 2)(taste(boa, long), long).sneeze).toBe(-1)
  })
})
