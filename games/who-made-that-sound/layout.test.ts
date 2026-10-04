import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { FIRST_SEED, type Clutch, draw, isOver, isSound, layClutch, layOther, stir } from './layout'
import { PLACES } from './places'
import { KINDS, type Kind, familyOf, isNear } from './voices'

const seeds = Array.from({ length: 300 }, (_, i) => stir(FIRST_SEED, i))

describe('the seeded stream', () => {
  it('gives the same numbers for the same state, each from 0 up to but not 1', () => {
    let a = FIRST_SEED, b = FIRST_SEED
    for (let i = 0; i < 1000; i++) {
      const one = draw(a), two = draw(b)
      expect(one).toEqual(two)
      expect(one.value).toBeGreaterThanOrEqual(0)
      expect(one.value).toBeLessThan(1)
      expect(Number.isInteger(one.rng) && one.rng >= 0 && one.rng < 2 ** 32).toBe(true)
      a = one.rng; b = two.rng
    }
  })

  it('spreads evenly enough', () => {
    const buckets = new Array(10).fill(0)
    let rng = FIRST_SEED
    for (let i = 0; i < 10000; i++) {
      const next = draw(rng)
      buckets[Math.floor(next.value * 10)]++
      rng = next.rng
    }
    for (const count of buckets) expect(Math.abs(count - 1000)).toBeLessThan(150)
  })

  it('stirs to a state of the same kind, and differently for different acts', () => {
    const stirred = new Set(Array.from({ length: 50 }, (_, i) => stir(FIRST_SEED, i)))
    expect(stirred.size).toBe(50)
    for (const state of stirred) expect(Number.isInteger(state) && state >= 0 && state < 2 ** 32).toBe(true)
  })
})

describe('a clutch as laid out', () => {
  for (const id of LADDER) {
    it(`${id}: what the place says, for every seed and every egg in the basket`, () => {
      const place = PLACES[id]
      for (const seed of seeds) for (const avoid of [null, ...KINDS] as (Kind | null)[]) {
        const { clutch, rng } = layClutch(id, seed, avoid)
        expect(clutch.form).toBe(place.form)
        expect(clutch.place).toBe(id)
        expect(clutch.kinds).toHaveLength(place.row)
        expect(clutch.slots).toEqual(clutch.kinds.map(() => 'fresh'))
        expect(clutch.asker).toBeNull()
        expect(clutch.wrong).toBe(0)
        expect(clutch.kinds).not.toContain(avoid)
        expect(isSound(clutch)).toBe(true)
        expect(isOver(clutch)).toBe(false)
        expect(rng).not.toBe(seed)
        const distinct = [...new Set(clutch.kinds)]
        const families = new Set(distinct.map(familyOf))
        if (place.form === 'alike') {
          expect(distinct).toHaveLength(2)
          expect(families.size).toBe(2)
          expect(clutch.queue).toEqual([])
        } else {
          expect(distinct).toHaveLength(place.row)
          expect([...clutch.queue].sort()).toEqual([...clutch.kinds].sort())
          if (place.voices === 'far') expect(families.size).toBe(place.row)
          else {
            const nearPairs = distinct.flatMap((a, i) => distinct.slice(i + 1).filter((b) => isNear(a, b)))
            expect(nearPairs).toHaveLength(1)
            expect(families.size).toBe(2)
          }
        }
      }
    })
  }

  it('is the same clutch for the same seed, and not always the same one', () => {
    const laid = new Set<string>()
    for (const seed of seeds) {
      expect(layClutch('near-voice', seed)).toEqual(layClutch('near-voice', seed))
      laid.add(JSON.stringify(layClutch('near-voice', seed).clutch))
    }
    expect(laid.size).toBeGreaterThan(20)
  })

  it('puts every kind in the row and at the front of the queue sooner or later', () => {
    const inRow = new Set<Kind>(), first = new Set<Kind>(), spots = new Set<string>()
    for (const seed of seeds) {
      const { clutch } = layClutch('three-eggs', seed)
      clutch.kinds.forEach((kind, i) => { inRow.add(kind); spots.add(`${kind}@${i}`) })
      first.add(clutch.queue[0])
    }
    expect(inRow.size).toBe(KINDS.length)
    expect(first.size).toBe(KINDS.length)
    expect(spots.size).toBe(KINDS.length * 3)
  })

  it('lays out the first place for an id it does not know', () => {
    expect(layClutch('no-such-place', FIRST_SEED).clutch.place).toBe(LADDER[0])
  })
})

describe('the egg in the basket', () => {
  it('is never a kind already taken', () => {
    for (const seed of seeds) {
      const { clutch, rng } = layClutch('near-voice', seed)
      const other = layOther(clutch.kinds, rng)
      expect(clutch.kinds).not.toContain(other.kind)
      expect(KINDS).toContain(other.kind)
    }
  })
})

describe('a saved clutch is checked before it is played', () => {
  const sound = (): Clutch => ({ form: 'seek', place: 'three-eggs', kinds: ['pip', 'hoom', 'wheep'], slots: ['fresh', 'heard', 'fresh'], queue: ['pip', 'wheep'], asker: 'hoom', wrong: 1 })

  it('accepts one in the middle of play', () => {
    expect(isSound(sound())).toBe(true)
    expect(isSound({ ...sound(), slots: ['done', 'heard', 'fresh'], queue: ['pip', 'wheep'] })).toBe(true)
    expect(isSound({ form: 'alike', place: 'two-alike', kinds: ['pip', 'hoom', 'hoom', 'pip'], slots: ['done', 'fresh', 'heard', 'fresh'], queue: [], asker: 'pip', wrong: 0 })).toBe(true)
    expect(isSound({ form: 'who', place: 'who-is-inside', kinds: ['pip', 'tok', 'hoom'], slots: ['done', 'heard', 'fresh'], queue: ['hoom'], asker: 'tok', wrong: 2 })).toBe(true)
  })

  it.each([
    ['a place it does not know', { place: 'tenth' }],
    ['slots that do not fit the row', { slots: ['fresh'] }],
    ['a row of one', { kinds: ['pip'], slots: ['fresh'], queue: [], asker: 'pip' }],
    ['the same kind twice where every kind is different', { kinds: ['pip', 'pip', 'wheep'] }],
    ['an asker who is not of the row', { asker: 'dooo' }],
    ['an asker whose own is already out', { slots: ['fresh', 'done', 'fresh'] }],
    ['someone twice in the queue', { queue: ['pip', 'pip'] }],
    ['a hide with nobody coming for it', { queue: ['pip'] }],
    ['a count of wrong attempts out of range', { wrong: 9 }],
    ['a count that is not a whole number', { wrong: 0.5 }],
  ])('refuses %s', (_, change) => {
    expect(isSound({ ...sound(), ...change } as Clutch)).toBe(false)
  })

  it('refuses a row of pairs that is not two pairs, or has a queue, or an asker with no twin left', () => {
    const pairs = (): Clutch => ({ form: 'alike', place: 'two-alike', kinds: ['pip', 'hoom', 'hoom', 'pip'], slots: ['fresh', 'fresh', 'fresh', 'fresh'], queue: [], asker: null, wrong: 0 })
    expect(isSound(pairs())).toBe(true)
    expect(isSound({ ...pairs(), kinds: ['pip', 'hoom', 'hoom', 'hoom'] })).toBe(false)
    expect(isSound({ ...pairs(), queue: ['pip'] })).toBe(false)
    expect(isSound({ ...pairs(), asker: 'pip' })).toBe(false)
    expect(isSound({ ...pairs(), asker: 'pip', slots: ['done', 'fresh', 'fresh', 'done'] })).toBe(false)
  })

  it('knows a finished clutch', () => {
    expect(isOver({ ...sound(), slots: ['done', 'done', 'done'], queue: [], asker: null })).toBe(true)
    expect(isOver({ ...sound(), slots: ['done', 'done', 'done'], queue: ['pip'], asker: null })).toBe(false)
    expect(isOver(sound())).toBe(false)
  })
})
