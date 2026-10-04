import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CLOTH, SEAT_COUNT, TRAY, placeSpot, spoonSpot } from './layout'
import { FIRST_SEED, nextSeed, partyFor, pick, plainCupFor, setTable } from './order'
import { LIKES, type Party } from './party'
import type { Thing } from './world'

/** 200 seeds as the game would meet them: each is the one the stream left behind. */
const SEEDS = (() => {
  const seeds = [FIRST_SEED]
  while (seeds.length < 200) seeds.push(nextSeed(seeds[seeds.length - 1]))
  return seeds
})()

/** A party written out on one line, so two can be compared and counted. */
const written = (party: Party): string => `${party.guests.map((guest) => `${guest.who}:${guest.cup}`).join(' ')} | ${party.trayCups.join(' ')} | ${party.laysOwnPlace}`

/** Every order of a list. */
function orders<T>(list: readonly T[]): T[][] {
  if (list.length <= 1) return [[...list]]
  return list.flatMap((first, index) => orders([...list.slice(0, index), ...list.slice(index + 1)]).map((rest) => [first, ...rest]))
}

/** Every party written from these guests in any seat order and these tray cups in any order. */
const anyOrder = (guests: string[], cups: string[] = [], lays = false): string[] =>
  orders(guests).flatMap((seats) => orders(cups).map((tray) => `${seats.join(' ')} | ${tray.join(' ')} | ${lays}`))

/** The parties each position may lay out, and whether the seed has a say. */
const LAID: Record<string, { parties: string[]; varies: boolean }> = {
  brim: { parties: anyOrder(['bear:own'], [], true), varies: false },
  drop: { parties: anyOrder(['mouse:own'], [], true), varies: false },
  'lay-a-place': { parties: [...anyOrder(['bear:own']), ...anyOrder(['mouse:own'])], varies: true },
  'two-guests': { parties: anyOrder(['bear:own', 'mouse:own']), varies: true },
  halfway: { parties: [...anyOrder(['hen:own', 'bear:own']), ...anyOrder(['hen:own', 'mouse:own'])], varies: true },
  'three-guests': { parties: anyOrder(['bear:own', 'hen:own', 'mouse:own']), varies: true },
  twins: { parties: ['duckling-a:own duckling-b:own |  | false'], varies: false },
  'whose-cup': { parties: anyOrder(['bear:none', 'mouse:none'], ['house', 'thimble']), varies: true },
  'three-cups': { parties: orders(['thimble', 'small', 'house']).map((tray) => `mouse:none hen:none bear:none | ${tray.join(' ')} | false`), varies: true },
  'full-table': {
    // The twins as one block with two of the other three, each of the two with its own cup or with the plain cup of its size on the tray.
    parties: [['bear', 'mouse'], ['bear', 'hen'], ['mouse', 'hen']].flatMap(([one, two]) =>
      [[true, true], [true, false], [false, true], [false, false]].flatMap(([oneOwn, twoOwn]) => {
        const cups = [...(oneOwn ? [] : [plainCupFor(one as 'bear')]), ...(twoOwn ? [] : [plainCupFor(two as 'bear')])]
        const blocks = ['duckling-a:own duckling-b:own', `${one}:${oneOwn ? 'own' : 'none'}`, `${two}:${twoOwn ? 'own' : 'none'}`]
        return anyOrder(blocks, cups)
      }),
    ),
    varies: true,
  },
}

describe('the seeded stream', () => {
  /** The same step in whole numbers of any size, where no sign can creep in. */
  const byHand = (seed: number): number => {
    let x = BigInt(seed)
    x ^= (x << 13n) & 0xffffffffn
    x ^= x >> 17n
    x ^= (x << 5n) & 0xffffffffn
    return Number(x)
  }

  it('never returns 0 and does not come round again within 10000 steps', () => {
    const seen = new Set<number>()
    let seed = FIRST_SEED
    expect(nextSeed(1)).toBe(270369)
    for (let step = 0; step < 10000; step++) {
      expect(nextSeed(seed)).toBe(byHand(seed))
      seed = nextSeed(seed)
      expect(seed).not.toBe(0)
      expect(Number.isInteger(seed) && seed > 0 && seed <= 0xffffffff).toBe(true)
      seen.add(seed)
    }
    expect(seen.size).toBe(10000)
  })

  it('starts from a fixed seed when it is handed 0 or something that is not a number', () => {
    for (const bad of [0, NaN, Infinity, -Infinity, 0.4]) expect(nextSeed(bad)).toBe(nextSeed(FIRST_SEED))
    expect(nextSeed(FIRST_SEED)).not.toBe(0)
  })

  it('picks a whole number below n, and reaches every one of them', () => {
    for (const n of [1, 2, 3, 4, 6]) {
      const picked = new Set(SEEDS.map((seed) => pick(seed, n)))
      expect([...picked].sort()).toEqual(Array.from({ length: n }, (_, index) => index))
    }
    expect(pick(FIRST_SEED, 0)).toBe(0)
    expect(pick(NaN, 3)).toBe(0)
  })
})

describe('the party a position lays out', () => {
  it('has a row here for every position of the order', () => {
    expect(Object.keys(LAID)).toEqual([...LADDER])
  })

  it.each([...LADDER])('at %s: one to four guests, only the parties of the design, the same for the same seed', (position) => {
    const seen = new Set<string>()
    for (const seed of SEEDS) {
      const { party, seed: next } = partyFor(position, seed)
      expect(party.guests.length).toBeGreaterThanOrEqual(1)
      expect(party.guests.length).toBeLessThanOrEqual(SEAT_COUNT)
      expect(LAID[position].parties, `seed ${seed}`).toContain(written(party))
      expect(partyFor(position, seed)).toEqual({ party, seed: next })
      // The stored seed has moved on, and is one the stream can go on from.
      expect(next).not.toBe(seed)
      expect(next).not.toBe(0)
      seen.add(written(party))
    }
    if (LAID[position].varies) expect(seen.size).toBeGreaterThan(1)
    else expect(seen.size).toBe(1)
  })

  it('reaches every party of the design at the positions with only a few', () => {
    for (const position of ['lay-a-place', 'two-guests', 'halfway', 'three-guests', 'whose-cup', 'three-cups']) {
      const seen = new Set(SEEDS.map((seed) => written(partyFor(position, seed).party)))
      expect([...seen].sort(), position).toEqual([...new Set(LAID[position].parties)].sort())
    }
  })

  it('always seats the three cupless guests as Mouse, Hen, Bear', () => {
    for (const seed of SEEDS) expect(partyFor('three-cups', seed).party.guests.map((guest) => guest.who)).toEqual(['mouse', 'hen', 'bear'])
  })

  it('brings the Ducklings as a pair, side by side, at every position', () => {
    let pairs = 0
    for (const position of LADDER) for (const seed of SEEDS) {
      const who = partyFor(position, seed).party.guests.map((guest) => guest.who)
      expect(new Set(who).size, 'nobody comes twice').toBe(who.length)
      const first = who.indexOf('duckling-a')
      expect(who.includes('duckling-b')).toBe(first >= 0)
      if (first >= 0) expect(who[first + 1]).toBe('duckling-b')
      if (first >= 0) pairs++
    }
    expect(pairs).toBe(2 * SEEDS.length)
  })

  it('lays out the first party for an id the order does not know', () => {
    for (const seed of SEEDS.slice(0, 20)) expect(partyFor('retired-step', seed)).toEqual(partyFor(LADDER[0], seed))
    expect(written(partyFor('', 7).party)).toBe('bear:own |  | true')
  })

  it('gives each guest the plain cup that holds its amount', () => {
    expect([plainCupFor('bear'), plainCupFor('hen'), plainCupFor('mouse'), plainCupFor('duckling-a'), plainCupFor('duckling-b')]).toEqual(['house', 'small', 'thimble', 'house', 'house'])
  })
})

describe('the table a party sits down to', () => {
  const kind = (things: Thing[], wanted: Thing['kind']) => things.filter((thing) => thing.kind === wanted)
  const onStack = (things: Thing[]) => kind(things, 'saucer').filter((saucer) => saucer.x === TRAY.saucers.x && saucer.z === TRAY.saucers.z)

  it.each([...LADDER])('at %s: unique ids, everything dry and on the cloth, a cup for every guest', (position) => {
    for (const seed of SEEDS.slice(0, 60)) {
      const { party } = partyFor(position, seed)
      const { things, puddles } = setTable(party)
      const seats = party.guests.length
      expect(new Set(things.map((thing) => thing.id)).size).toBe(things.length)
      // The whole service of four, or, for a party that lays its own place, only what it laid: the tray is not out yet.
      const service = party.laysOwnPlace ? seats : 4
      expect(things.map((thing) => thing.kind).filter((k) => k !== 'cup')).toEqual(['pot', ...Array(service).fill('saucer'), ...Array(service).fill('spoon'), 'sponge', 'bowl'])
      expect(puddles.every((amount) => amount === 0) && things.every((thing) => thing.tea === 0)).toBe(true)
      for (const thing of things) {
        expect(thing.x > CLOTH.minX && thing.x < CLOTH.maxX && thing.z > CLOTH.minZ && thing.z < CLOTH.maxZ, `${thing.id} on the cloth`).toBe(true)
        if (thing.on !== null) expect(things.some((other) => other.id === thing.on && other !== thing)).toBe(true)
      }

      let laid = 0
      party.guests.forEach((guest, seat) => {
        const cup = things.find((thing) => thing.id === `cup-${guest.who}`)
        if (guest.cup === 'none') return expect(cup).toBeUndefined()
        const place = placeSpot(seats, seat)
        const ring = guest.who.startsWith('duckling') ? null : LIKES[guest.who as 'bear']
        expect(cup).toMatchObject({ kind: 'cup', size: 'house', owner: guest.who, ring, x: place.x, z: place.z })
        if (!party.laysOwnPlace) return expect(cup).toMatchObject({ heldBy: guest.who, on: null })
        // The first two positions: the cup stands on a saucer at the place, with a spoon to its right.
        laid++
        const saucer = things.find((thing) => thing.id === cup?.on)
        expect(cup?.heldBy).toBeNull()
        expect(saucer).toMatchObject({ kind: 'saucer', x: place.x, z: place.z, on: null })
        const spoon = spoonSpot(seats, seat)
        expect(kind(things, 'spoon').filter((thing) => Math.hypot(thing.x - spoon.x, thing.z - spoon.z) < 0.006).length).toBe(1)
      })
      expect(party.laysOwnPlace).toBe(position === 'brim' || position === 'drop')
      // The pot waits beside a cup that stands at a laid place, to its right and nearer the child.
      const pot = things.find((thing) => thing.kind === 'pot')!
      if (party.laysOwnPlace) expect([pot.x > placeSpot(seats, 0).x + 1.5, pot.z > placeSpot(seats, 0).z + 1]).toEqual([true, true])
      // Where no cup stands yet it waits beside the first cup all the same, in its guest's paw or on the tray: never on its stand, and in nothing.
      expect(Math.hypot(pot.x - TRAY.pot.x, pot.z - TRAY.pot.z)).toBeGreaterThan(0.5)
      for (const other of things) if (other !== pot && other.on === null && other.heldBy === null) expect(Math.hypot(other.x - pot.x, other.z - pot.z), `${position}: the pot and ${other.id}`).toBeGreaterThan(1)

      // What was not laid is still on the tray: the stack whole from the bottom up, the spoons in their row. A party that
      // lays its own place has no tray yet: nothing is on the table before it means something.
      const spare = party.laysOwnPlace ? 0 : 4 - laid
      const stack = onStack(things)
      expect(stack.map((saucer) => saucer.id)).toEqual(Array.from({ length: spare }, (_, index) => `saucer-${index}`))
      expect(stack.map((saucer) => saucer.on)).toEqual(Array.from({ length: spare }, (_, index) => (index === 0 ? null : `saucer-${index - 1}`)))
      expect(kind(things, 'spoon').filter((spoon) => spoon.z === TRAY.spoons.z).length).toBe(spare)

      // Each guest who brings no cup finds a plain one of its size on the tray, with no ring and no owner.
      const plain = kind(things, 'cup').filter((cup) => cup.owner === null)
      expect(plain.map((cup) => cup.size)).toEqual(party.trayCups)
      expect(plain.every((cup) => cup.ring === null && cup.heldBy === null && cup.on === null && cup.z === TRAY.cups.z)).toBe(true)
      expect(new Set(plain.map((cup) => cup.x)).size).toBe(plain.length)
      expect([...party.trayCups].sort()).toEqual(party.guests.filter((guest) => guest.cup === 'none').map((guest) => plainCupFor(guest.who)).sort())
      expect(kind(things, 'cup').length).toBe(seats)
    }
  })

  it('keeps every spot to a hundredth, as a save stores it', () => {
    for (const position of LADDER) for (const thing of setTable(partyFor(position, FIRST_SEED).party).things) {
      expect(Math.round(thing.x * 100) / 100).toBe(thing.x)
      expect(Math.round(thing.z * 100) / 100).toBe(thing.z)
    }
  })

  it('seats four cupless guests without a thing off the cloth or two with one id', () => {
    const things = setTable({ guests: [{ who: 'bear', cup: 'none' }, { who: 'hen', cup: 'none' }, { who: 'mouse', cup: 'none' }, { who: 'duckling-a', cup: 'none' }], trayCups: ['house', 'house', 'house', 'house'], laysOwnPlace: false }).things
    expect(new Set(things.map((thing) => thing.id)).size).toBe(things.length)
    expect(things.every((thing) => thing.x > CLOTH.minX && thing.x < CLOTH.maxX)).toBe(true)
  })
})
