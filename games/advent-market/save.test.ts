import { describe, expect, it } from 'vitest'
import { CLOTHS_OFF_FROM } from './config'
import { BASKET, WHO } from './hall'
import { adventMarketManifest } from './manifest'
import { STALLS } from './places'
import { deserialize, freshSave, serialize, type Save } from './save'
import { STATE_VERSION } from './state'
import { LEFT, MARK, fatCandle, fresh, type Biscuit, type Star, type Thing, type Wreath } from './things'

/** The largest thing there is: a bushy wreath with a wax coat, a mark, and an iced biscuit on it. */
const largest = (): Thing => ({
  ...(fresh('wreath', 1, 2) as Wreath), twigs: new Array<number>(12).fill(1), left: LEFT.wax, tint: 2, mark: MARK.chewed,
  on: { ...(fresh('biscuit', 2, 2) as Biscuit), cut: true, icing: new Array<number>(7).fill(127), left: LEFT.ring, mark: MARK.bitten },
})

/** A fair with every piece in work, a full basket and five full hands, each thing with another on it. */
function fullest(): Save {
  const save = freshSave(8, 4000000000)
  save.finished = true
  save.at = 'door'
  save.candle = { ...fatCandle(2), c: Array.from({ length: 12 }, (_, i) => i % 3) }
  save.star = { ...(fresh('star', 2, 1) as Star), points: 9, on: fatCandle(1) }
  save.wreath = largest() as Wreath
  save.biscuit = { ...(fresh('biscuit', 2, 1) as Biscuit), cut: true, icing: new Array<number>(7).fill(127), on: fatCandle(0) }
  save.pot = 2
  save.basket = new Array(BASKET.slots).fill(null).map(largest)
  for (const who of WHO) save.held[who] = largest()
  return save
}

describe('the saved fair', () => {
  it('starts at the candle stall with a fresh piece on every bench, an empty basket and empty hands', () => {
    const save = freshSave(null, 77)
    expect(save.v).toBe(STATE_VERSION)
    expect(save.position).toBe('fair')
    expect(save.finished).toBe(false)
    expect(save.at).toBe('candle')
    expect(save.basket).toEqual([])
    expect(Object.values(save.held)).toEqual([null, null, null, null, null])
    expect(save.chance).toBe(77)
    expect(save.pot).toBe(0)
  })

  it('takes the age as a first-visit default only: one colour open for the young and for no age, every cloth off from six, both ends open', () => {
    const [youngest, oldest] = adventMarketManifest.ageBand
    for (const age of [null, 1, youngest, CLOTHS_OFF_FROM - 1]) for (const stall of STALLS) expect(freshSave(age, 1).uncovered[stall], `${age}`).toBe(false)
    for (const age of [CLOTHS_OFF_FROM, oldest, oldest + 20]) for (const stall of STALLS) expect(freshSave(age, 1).uncovered[stall], `${age}`).toBe(true)
    // Nothing else differs.
    const young = freshSave(null, 1), old = freshSave(12, 1)
    expect({ ...old, uncovered: young.uncovered }).toEqual(young)
  })

  it('lets a saved fair win over the age: a cloth the child lifted stays off, and one that lies stays on', () => {
    const young = freshSave(4, 1)
    young.uncovered.star = true
    const read = deserialize(JSON.parse(JSON.stringify(serialize(young))), 8, 1)
    expect(read.uncovered).toEqual({ candle: false, star: true, wreath: false, biscuit: false })
  })

  it('comes back as it was written, every field', () => {
    const save = fullest()
    const written = JSON.parse(JSON.stringify(serialize(save)))
    expect(deserialize(written, null, 1)).toEqual(save)
    expect(Object.keys(written).sort()).toEqual(['at', 'basket', 'biscuit', 'candle', 'chance', 'finished', 'held', 'position', 'pot', 'star', 'uncovered', 'v', 'wreath'])
  })

  it('stays far under half of the 64 KB cap at its fullest', () => {
    expect(JSON.stringify(serialize(fullest())).length).toBeLessThan(16 * 1024)
  })

  it('gives a fresh fair for anything that is not its record, or is from a later version', () => {
    for (const raw of [undefined, null, 7, 'fair', [], { position: 'fair' }, { v: STATE_VERSION + 1, at: 'door' }]) {
      expect(deserialize(raw, null, 9)).toEqual(freshSave(null, 9))
    }
  })

  it('repairs each field by itself and keeps the rest', () => {
    const good = fullest()
    const read = deserialize({ ...JSON.parse(JSON.stringify(serialize(good))), position: 'nowhere', at: 'roof', uncovered: 'all', star: { craft: 'candle' }, pot: 9, basket: [largest(), 7, { craft: 'kite' }, fresh('star'), fatCandle()], held: { tuba: 'x', maker: fatCandle(), goat: fresh('wreath') }, chance: -3 }, null, 11)
    expect(read.position).toBe('fair')
    expect(read.at).toBe('candle')
    expect(read.uncovered).toEqual(freshSave(null, 1).uncovered)
    expect(read.star).toEqual(fresh('star'))
    expect(read.pot).toBe(0)
    // What is no made thing never lies in the basket or in a hand.
    expect(read.basket).toEqual([largest(), fatCandle()])
    expect(read.held).toEqual({ tuba: null, maker: fatCandle(), baker: null, bundle: null, goat: null })
    expect(read.chance).toBe(11)
    expect(read.wreath).toEqual(good.wreath)
    expect(read.finished).toBe(true)
  })

  it('never reads more than six things into the basket', () => {
    const read = deserialize({ v: STATE_VERSION, basket: new Array(9).fill(null).map(() => fatCandle()) }, null, 1)
    expect(read.basket).toHaveLength(BASKET.slots)
  })
})
