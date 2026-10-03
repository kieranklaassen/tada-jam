import { describe, expect, it } from 'vitest'
import { chancesOf } from './breed'
import { FIRST_VISIT, LADDER, type PositionId } from './config'
import { KIT_IDS, STEPS, asksOf, bigAsksOf, isKitId, isPositionId, judge, kitAt, layVisit, readVisit, shownAsksOf, traitsOnPage, type KitId, type Visit } from './order'
import { PACKETS, TRAITS, isPacketId, lookOf, pairOf, type Pairs, type Trait } from './plant'
import { LIKES, SECRETS, VISITORS, answer, fits, heightMiss, secretOf, wanted } from './visitors'

const SEED = 20261003
const ALL = Array.from({ length: 256 }, (_, pairs) => pairs)

/** Every plant that can be bred from the packets of a kit: each factor it carries is in some packet on the page. */
function breedable(kit: readonly KitId[]): Pairs[] {
  const packets = kit.filter(isPacketId).map((id) => PACKETS[id])
  const has = (trait: Trait, factor: number) => packets.some((packet) => pairOf(packet, trait).includes(factor as 0 | 1))
  return ALL.filter((pairs) => TRAITS.every((trait) => pairOf(pairs, trait).every((factor) => has(trait, factor))))
}

const soils = (kit: readonly KitId[]) => (kit.includes('water') ? [false, true] : [false])

describe('the visitors', () => {
  it('each like a different plant, and between them like every value of every trait', () => {
    expect(new Set(VISITORS.map((who) => JSON.stringify(LIKES[who]))).size).toBe(VISITORS.length)
    expect(new Set(VISITORS.map((who) => LIKES[who].colour))).toEqual(new Set(['red', 'pink', 'white']))
    expect(new Set(VISITORS.map((who) => LIKES[who].joints))).toEqual(new Set([1, 2, 4]))
    expect(new Set(VISITORS.map((who) => LIKES[who].leaf))).toEqual(new Set(['round', 'jagged']))
    expect(new Set(VISITORS.map((who) => LIKES[who].petals))).toEqual(new Set(['plain', 'spotted']))
  })

  it('want their own likes, cut down to the traits asked', () => {
    expect(wanted('snail', ['colour'])).toEqual({ colour: 'red' })
    expect(wanted('ant', ['height'])).toEqual({ joints: 1 })
    expect(wanted('moth', TRAITS)).toEqual(LIKES.moth)
    expect(wanted('bee', [])).toEqual({})
  })

  it('answer a plant trait by trait, likes first, and say what they saw where it missed', () => {
    const plant = { colour: 'red', joints: 4, leaf: 'jagged', petals: 'plain' } as const
    const answers = answer('snail', TRAITS, plant)
    expect(answers.map((one) => [one.trait, one.fits])).toEqual([['colour', true], ['petals', true], ['height', false], ['leaf', false]])
    expect(answers[2]).toEqual({ trait: 'height', fits: false, seen: 4, liked: 2 })
    expect(fits('snail', TRAITS, plant)).toBe(false)
    expect(fits('snail', ['colour', 'petals'], plant)).toBe(true)
  })

  it('answer only what the sketch shows: a trait that is not asked cannot miss', () => {
    for (const who of VISITORS) for (const pairs of ALL) expect(fits(who, [], lookOf(pairs, false))).toBe(true)
  })

  it('give the same answer to the same plant every time', () => {
    for (const who of VISITORS) for (const pairs of ALL) expect(answer(who, TRAITS, lookOf(pairs, true))).toEqual(answer(who, TRAITS, lookOf(pairs, true)))
  })

  it('like a height as it is seen, however the plant came by it', () => {
    const tallFromDrySoil = ALL.find((pairs) => lookOf(pairs, false).joints === 4)!
    expect(fits('snail', ['height'], lookOf(tallFromDrySoil, true))).toBe(true)
    expect(fits('snail', ['height'], lookOf(tallFromDrySoil, false))).toBe(false)
    expect(heightMiss('snail', 4)).toBe('higher')
    expect(heightMiss('snail', 1)).toBe('lower')
    expect(heightMiss('snail', 2)).toBe(null)
  })

  it('have secrets that work every time and depend only on who is offered what', () => {
    expect(SECRETS).toEqual(['hat', 'vanish'])
    for (const pairs of ALL) {
      for (const dry of [false, true]) {
        const look = lookOf(pairs, dry)
        expect(secretOf('snail', look)).toBe(look.joints === 1 ? 'hat' : null)
        expect(secretOf('ladybird', look)).toBe(look.colour === 'red' && look.petals === 'spotted' ? 'vanish' : null)
        expect(secretOf('bee', look)).toBe(null)
      }
    }
  })
})

describe('the designed order', () => {
  it('has a step for every position of the ladder and no other', () => {
    expect(Object.keys(STEPS).sort()).toEqual([...LADDER].sort())
    expect(LADDER.every(isPositionId)).toBe(true)
    for (const bad of ['first', '', 3, null]) expect(isPositionId(bad)).toBe(false)
  })

  it('names its positions for places in its own order, never for a grade, a groep or a level', () => {
    for (const id of LADDER) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|level|fase|year|class|age|easy|hard/)
  })

  it('adds one new thing at a time: a position brings one thing, or asks more of what is known, never both', () => {
    let asked = 0
    for (const id of LADDER) {
      const step = STEPS[id]
      expect(step.brings.length).toBeLessThanOrEqual(1)
      const load = step.asks.length + Math.max(...step.counts) - 1
      if (step.brings.length === 1 && step.brings[0] !== 'runner') expect(step.asks, `${id} asks about its one new thing only`).toHaveLength(1)
      else expect(load, `${id} asks at least as much as any step before it`).toBeGreaterThanOrEqual(asked)
      if (step.brings.length === 0 || step.brings[0] === 'runner') asked = load
    }
  })

  it('brings every packet and tool exactly once, and keeps all that came before', () => {
    expect(LADDER.flatMap((id) => STEPS[id].brings).sort()).toEqual([...KIT_IDS].sort())
    let before: KitId[] = []
    for (const id of LADDER) {
      const kit = kitAt(id)
      for (const thing of before) expect(kit).toContain(thing)
      before = kit
    }
    expect(kitAt('colour')).toEqual(['pink'])
    expect(kitAt('whole-plant').sort()).toEqual([...KIT_IDS].sort())
    expect(KIT_IDS.every(isKitId)).toBe(true)
    expect(isKitId('loupe')).toBe(false)
  })

  it('starts a first visit on the ladder, with the packets of every position up to it', () => {
    for (const row of FIRST_VISIT) expect(kitAt(row.position)).toContain('pink')
    expect(FIRST_VISIT.map((row) => row.position)).toEqual(['colour', 'short'])
  })

  it('opens each trait to the page with its packet or tool', () => {
    expect(traitsOnPage(['pink'])).toEqual(['colour'])
    expect(traitsOnPage(kitAt('short'))).toEqual(['colour', 'height'])
    expect(traitsOnPage(kitAt('whole-plant'))).toEqual(['colour', 'height', 'leaf', 'petals'])
  })
})

describe('every wish of every position', () => {
  const cases = LADDER.flatMap((id) => STEPS[id].visitors.map((who) => ({ id, who })))

  it('is never a packet plant as it stands: it has to be bred', () => {
    const packet = lookOf(PACKETS.pink, false)
    for (const { id, who } of cases) expect(fits(who, STEPS[id].asks, packet), `${who} at ${id}`).toBe(false)
  })

  it('can be met with what has arrived by then', () => {
    for (const { id, who } of cases) {
      const kit = kitAt(id)
      const met = breedable(kit).some((pairs) => soils(kit).some((dry) => fits(who, STEPS[id].asks, lookOf(pairs, dry))))
      expect(met, `${who} at ${id}`).toBe(true)
    }
  })

  it('has a route that gives it for certain, so nothing wanted comes only by luck', () => {
    for (const { id, who } of cases) {
      const kit = kitAt(id), plants = breedable(kit)
      const certain = plants.some((onto) => plants.some((dust) => soils(kit).some((dry) => [...chancesOf(onto, dust).keys()].every((young) => fits(who, STEPS[id].asks, lookOf(young, dry))))))
      expect(certain, `${who} at ${id}`).toBe(true)
    }
  })

  it('where the ant asks for its height, needs both a short plant and dry soil', () => {
    const kit = kitAt('dry')
    for (const pairs of breedable(kit)) {
      for (const dry of [false, true]) {
        const look = lookOf(pairs, dry)
        if (fits('ant', STEPS.dry.asks, look)) expect(dry && lookOf(pairs, false).joints === 2).toBe(true)
      }
    }
  })

  it('at the first position is met more often than not by one pod of two packet plants', () => {
    for (const who of STEPS.colour.visitors) {
      let miss = 1
      for (const [young, chance] of chancesOf(PACKETS.pink, PACKETS.pink)) if (fits(who, STEPS.colour.asks, lookOf(young, false))) miss -= chance
      // `miss` is now the chance that one seed is not the wanted colour; six seeds all missing is under a fifth.
      expect(miss ** 6).toBeLessThan(0.2)
    }
  })
})

describe('laying out a visitor', () => {
  it('is the same for the same page and place in the stream', () => {
    for (const id of LADDER) expect(layVisit(SEED, 5, id, null)).toEqual(layVisit(SEED, 5, id, null))
  })

  it('picks from the position’s visitors and counts, starts empty, and never sends the same animal twice running', () => {
    for (const id of LADDER) {
      const step = STEPS[id]
      let before = null as Visit['who'] | null
      const seen = new Set<string>()
      for (let laid = 0; laid < 200; laid++) {
        const visit = layVisit(SEED, laid, id, before)
        expect(step.visitors).toContain(visit.who)
        expect(step.counts).toContain(visit.count)
        expect(visit).toMatchObject({ at: id, big: false, given: [], pods: 0 })
        if (step.visitors.length > 1) expect(visit.who).not.toBe(before)
        before = visit.who
        seen.add(visit.who)
      }
      expect(seen.size, `every visitor of ${id} comes`).toBe(step.visitors.length)
    }
  })

  it('offers a larger sketch only when the page holds more traits than the wish asks about', () => {
    const visit = layVisit(SEED, 0, 'colour', null)
    expect(asksOf(visit)).toEqual(['colour'])
    expect(bigAsksOf(visit, kitAt('colour'))).toBe(null)
    expect(bigAsksOf(visit, kitAt('jagged'))).toEqual(['colour', 'height', 'leaf'])
    expect(shownAsksOf(visit, kitAt('jagged'))).toEqual(['colour'])
    expect(shownAsksOf({ ...visit, big: true }, kitAt('jagged'))).toEqual(['colour', 'height', 'leaf'])
    expect(shownAsksOf({ ...visit, big: true }, kitAt('colour'))).toEqual(['colour'])
    expect(bigAsksOf(layVisit(SEED, 0, 'whole-plant', null), kitAt('whole-plant'))).toBe(null)
  })
})

describe('how a visit went', () => {
  const visit = (over: Partial<Visit>): Visit => ({ who: 'snail', at: 'colour-short' as PositionId, count: 1, big: false, given: [], pods: 0, ...over })

  it('went well when the wish was met within the position’s pods, a plant bred earlier included', () => {
    expect(judge(visit({ given: [3], pods: 0 }))).toBe('well')
    expect(judge(visit({ given: [3], pods: STEPS['colour-short'].podsForWell }))).toBe('well')
  })

  it('was mixed when it took more pods, or when the visitor got some and not all', () => {
    expect(judge(visit({ given: [3], pods: STEPS['colour-short'].podsForWell + 1 }))).toBe('mixed')
    expect(judge(visit({ at: 'runner', count: 2, given: [3], pods: 1 }))).toBe('mixed')
  })

  it('went badly when the visitor left with nothing', () => {
    expect(judge(visit({ pods: 0 }))).toBe('badly')
    expect(judge(visit({ pods: 40 }))).toBe('badly')
  })
})

describe('a saved visit', () => {
  it('reads back as it was written', () => {
    const visit: Visit = { who: 'ladybird', at: 'three-traits', count: 2, big: true, given: [7], pods: 3 }
    expect(readVisit(JSON.parse(JSON.stringify(visit)))).toEqual(visit)
  })

  it('is none when it is not a visit, or names a visitor that does not come at that position', () => {
    for (const bad of [null, 3, 'snail', [], {}, { who: 'cat', at: 'colour' }, { who: 'snail', at: 'nowhere' }, { who: 'ant', at: 'colour' }]) expect(readVisit(bad)).toBe(null)
  })

  it('repairs each damaged field by itself', () => {
    expect(readVisit({ who: 'snail', at: 'runner', count: 9, big: 'yes', given: [1, 99, 'x', 2, 3], pods: -4 })).toEqual({ who: 'snail', at: 'runner', count: 2, big: false, given: [1, 2], pods: 0 })
  })
})
