import { describe, expect, it } from 'vitest'
import { CUP_HOLDS } from './forms'
import { placeSpot } from './layout'
import type { GuestState, Party } from './party'
import { notedToTaste, noteLift, outcomeOf, seatParty, sittingEnded } from './sitting'
import { judgeLift, type Lift } from './tastes'
import { emptyWorld, pourInto, thingById, type GuestId, type Thing, type World } from './world'

const WHO: readonly GuestId[] = ['bear', 'mouse', 'hen', 'duckling-a']
const party = (count: number): Party => ({ guests: WHO.slice(0, count).map((who) => ({ who, cup: 'own' as const })), trayCups: [], laysOwnPlace: false })

/** What a lift finds, as tastes.ts would report it. */
const right: Lift = { taste: 'right', drinks: true, details: [] }
const short: Lift = { taste: 'short', drinks: false, details: [] }
const over: Lift = { taste: 'over', drinks: false, details: [] }
const tooSmall: Lift = { taste: 'short', drinks: true, details: ['cup-too-small', 'brimful'] }

/** A sitting played out: each guest finds these things in turn, and then drinks a cup to its taste. */
function sat(finds: readonly (readonly Lift[])[]): GuestState[] {
  let guests = seatParty(party(finds.length))
  finds.forEach((lifts, seat) => {
    for (const lift of lifts) guests = noteLift(guests, WHO[seat], lift)
    guests = noteLift(guests, WHO[seat], right)
  })
  return guests
}

describe('a party sits down', () => {
  it('in the party\'s order, with nothing noted and nobody content', () => {
    expect(seatParty(party(3))).toEqual([
      { who: 'bear', seat: 0, note: null, content: false },
      { who: 'mouse', seat: 1, note: null, content: false },
      { who: 'hen', seat: 2, note: null, content: false },
    ])
    expect(seatParty(party(0))).toEqual([])
  })
})

describe('what is noted about a guest', () => {
  it('is nothing for too little in a cup of the right size, however often it is found', () => {
    let guests = seatParty(party(2))
    for (let i = 0; i < 5; i++) guests = noteLift(guests, 'bear', short)
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, note: null, content: false })
  })

  it('is to taste for a pour made in several presses that ends at the ring', () => {
    let guests = seatParty(party(1))
    guests = noteLift(guests, 'bear', short)
    guests = noteLift(guests, 'bear', short)
    guests = noteLift(guests, 'bear', right)
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, note: 'to-taste', content: true })
    expect(outcomeOf(guests)).toBe('well')
  })

  it('is not to taste the first time a guest finds more than it likes, and stays so after it drinks', () => {
    let guests = noteLift(seatParty(party(2)), 'mouse', over)
    expect(guests[1]).toEqual({ who: 'mouse', seat: 1, note: 'not-to-taste', content: false })
    guests = noteLift(guests, 'mouse', right)
    expect(guests[1]).toEqual({ who: 'mouse', seat: 1, note: 'not-to-taste', content: true })
  })

  it('is not to taste for tea in a cup too small for the guest, who drains it and is not content', () => {
    const guests = noteLift(seatParty(party(1)), 'bear', tooSmall)
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, note: 'not-to-taste', content: false })
  })

  it('is not to taste for tea in a cup of the wrong size, even an amount the guest then drinks', () => {
    const guests = noteLift(seatParty(party(2)), 'mouse', { taste: 'right', drinks: true, details: ['cup-wrong-size'] })
    expect(guests.find((guest) => guest.who === 'mouse')).toMatchObject({ note: 'not-to-taste', content: true })
  })

  it('is made once: a guest noted as to taste stays so whatever it finds afterwards', () => {
    let guests = noteLift(seatParty(party(1)), 'bear', right)
    guests = noteLift(guests, 'bear', over)
    guests = noteLift(guests, 'bear', tooSmall)
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, note: 'to-taste', content: true })
  })

  it('changes nothing for a guest who is not at the table', () => {
    const guests = seatParty(party(2))
    expect(noteLift(guests, 'duckling-b', right)).toEqual(guests)
  })

  it('leaves the list it was given alone', () => {
    const guests = noteLift(seatParty(party(3)), 'mouse', over)
    const copy = JSON.parse(JSON.stringify(guests)) as GuestState[]
    const after = noteLift(guests, 'mouse', right)
    noteLift(guests, 'bear', short)
    outcomeOf(guests)
    sittingEnded(guests)
    notedToTaste(guests)
    expect(guests).toEqual(copy)
    expect(after).not.toBe(guests)
    for (const guest of after) expect(guests).not.toContain(guest)
  })
})

describe('a sitting ends', () => {
  it('only when every guest has drunk a cup to its taste', () => {
    for (let count = 1; count <= 4; count++) {
      let guests = seatParty(party(count))
      for (let seat = 0; seat < count; seat++) {
        expect(sittingEnded(guests)).toBe(false)
        guests = noteLift(guests, WHO[seat], over)
        expect(sittingEnded(guests)).toBe(false)
        guests = noteLift(guests, WHO[seat], right)
      }
      expect(sittingEnded(guests)).toBe(true)
    }
  })

  it('never at an empty table', () => {
    expect(sittingEnded([])).toBe(false)
    expect(outcomeOf([])).toBe('mixed')
    expect(notedToTaste([])).toBe(0)
  })
})

describe('how a sitting went', () => {
  it('well when every guest was noted as to taste, for one to four guests', () => {
    for (let count = 1; count <= 4; count++) {
      const guests = sat(new Array<Lift[]>(count).fill([]))
      expect(outcomeOf(guests)).toBe('well')
      expect(notedToTaste(guests)).toBe(count)
    }
  })

  it('well for a child who creeps up to every ring', () => {
    expect(outcomeOf(sat([[short, short, short], [short], [short, short]]))).toBe('well')
  })

  it('badly when two or more guests all found too much or a cup too small', () => {
    expect(outcomeOf(sat([[over], [over]]))).toBe('badly')
    expect(outcomeOf(sat([[tooSmall], [over], [over]]))).toBe('badly')
    expect(outcomeOf(sat([[over], [tooSmall], [over], [over]]))).toBe('badly')
  })

  it('mixed for one guest who found too much: one guest alone never goes badly', () => {
    expect(outcomeOf(sat([[over]]))).toBe('mixed')
    expect(outcomeOf(sat([[tooSmall]]))).toBe('mixed')
  })

  it('mixed when some were to taste and some not', () => {
    expect(outcomeOf(sat([[], [over]]))).toBe('mixed')
    expect(outcomeOf(sat([[over], [], [over]]))).toBe('mixed')
    expect(outcomeOf(sat([[], [], [], [over]]))).toBe('mixed')
  })

  it('mixed while some guest has no note yet, so a sitting judged early moves nothing', () => {
    expect(outcomeOf(noteLift(seatParty(party(2)), 'bear', right))).toBe('mixed')
    expect(outcomeOf(noteLift(seatParty(party(3)), 'mouse', over))).toBe('mixed')
    expect(outcomeOf(noteLift(seatParty(party(2)), 'bear', short))).toBe('mixed')
  })
})

describe('with what a lift really finds', () => {
  const thing = (id: string, kind: Thing['kind'], over: Partial<Thing> = {}): Thing => ({ id, kind, size: 'house', ring: null, owner: null, x: 0, z: 0, on: null, heldBy: null, worn: false, tea: 0, ...over })
  /** Two Ducklings, each with a cup on a saucer at its place. */
  function twins(): { world: World; a: { x: number; z: number }; b: { x: number; z: number } } {
    const world = emptyWorld()
    const a = placeSpot(2, 0), b = placeSpot(2, 1)
    world.things.push(thing('saucer-0', 'saucer', a), thing('cup-duckling-a', 'cup', { ...a, on: 'saucer-0' }), thing('saucer-1', 'saucer', b), thing('cup-duckling-b', 'cup', { ...b, on: 'saucer-1' }))
    world.things.push(thing('spoon-0', 'spoon', { x: a.x - 1.32, z: a.z + 0.12 }), thing('spoon-1', 'spoon', { x: b.x - 1.32, z: b.z + 0.12 }))
    return { world, a, b }
  }
  const lifted = (found: ReturnType<typeof judgeLift>): Lift | null => ('waits' in found ? null : found)

  it('a Duckling whose twin has no tea yet waits, and nothing is noted', () => {
    const { world, a, b } = twins()
    pourInto(world, 'cup-duckling-a', 0.4)
    expect(lifted(judgeLift(world, 'duckling-a', a, b))).toBe(null)
  })

  it('the Duckling with less is not noted, and the one with more is, once both cups hold tea', () => {
    const { world, a, b } = twins()
    pourInto(world, 'cup-duckling-a', 0.6)
    pourInto(world, 'cup-duckling-b', 0.2)
    let guests = seatParty({ guests: [{ who: 'duckling-a', cup: 'own' }, { who: 'duckling-b', cup: 'own' }], trayCups: [], laysOwnPlace: false })
    guests = noteLift(guests, 'duckling-a', lifted(judgeLift(world, 'duckling-a', a, b))!)
    guests = noteLift(guests, 'duckling-b', lifted(judgeLift(world, 'duckling-b', b, a))!)
    expect(guests.map((guest) => guest.note)).toEqual(['not-to-taste', null])
    // The child tops up the lower cup: both drink, and the one that was never noted is to taste.
    pourInto(world, 'cup-duckling-b', 0.4)
    guests = noteLift(guests, 'duckling-a', lifted(judgeLift(world, 'duckling-a', a, b))!)
    guests = noteLift(guests, 'duckling-b', lifted(judgeLift(world, 'duckling-b', b, a))!)
    expect(guests.map((guest) => [guest.note, guest.content])).toEqual([['not-to-taste', true], ['to-taste', true]])
    expect(outcomeOf(guests)).toBe('mixed')
  })

  it('the Bear with a full thimble is noted as not to taste and is not content', () => {
    const world = emptyWorld()
    const place = placeSpot(1, 0)
    world.things.push(thing('saucer-0', 'saucer', place), thing('cup-plain-0', 'cup', { ...place, size: 'thimble', on: 'saucer-0' }), thing('spoon-0', 'spoon', { x: place.x - 1.32, z: place.z + 0.12 }))
    pourInto(world, 'cup-plain-0', CUP_HOLDS.thimble)
    const lift = lifted(judgeLift(world, 'bear', place))!
    expect(lift.details).toContain('cup-too-small')
    const guests = noteLift(seatParty(party(1)), 'bear', lift)
    expect(guests[0]).toEqual({ who: 'bear', seat: 0, note: 'not-to-taste', content: false })
    // Judging a lift moves no tea: the view drains the cup when the lick plays.
    expect(thingById(world, 'cup-plain-0')!.tea).toBeCloseTo(CUP_HOLDS.thimble, 9)
  })
})
