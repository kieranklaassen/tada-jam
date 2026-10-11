import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { SPOTS, distance } from './layout'
import { THINGS, WANTING, type Kind } from './things'
import { FLOATS_AT, driestFreeSpot, gulpOn, gulpOnGround, wantMet, type Yard, type YardEvent } from './world'
import { ARRANGEMENTS, TURNS, arrangementsOf, isYardSpec, judge, layOut, nextTurn, nextYardSpec, type Arrangement } from './yards'

const all: { place: string; number: number; plan: Arrangement }[] = LADDER.flatMap((place) => arrangementsOf(place).map((plan, number) => ({ place, number, plan })))
const kinds = (plan: Arrangement) => plan.things.map((thing) => thing.kind)
const indexOf = (plan: Arrangement, kind: Kind) => plan.things.findIndex((thing) => thing.kind === kind)

/** Gulps on one thing until the want is met, or -1 when twelve do not meet it. Every event on the way is kept. */
function gulpsToMeet(start: Yard, index: number): { gulps: number; events: YardEvent[] } {
  const events: YardEvent[] = []
  let yard = start
  for (let gulps = 1; gulps <= 12; gulps++) {
    const step = gulpOn(yard, index)
    yard = step.yard
    events.push(...step.events)
    if (yard.met) return { gulps, events }
  }
  return { gulps: -1, events }
}

describe('the arrangements of the designed order', () => {
  it('gives every place of the ladder two to four arrangements, and no other place any', () => {
    expect(Object.keys(ARRANGEMENTS)).toEqual([...LADDER])
    for (const place of LADDER) {
      expect(arrangementsOf(place).length).toBeGreaterThanOrEqual(2)
      expect(arrangementsOf(place).length).toBeLessThanOrEqual(4)
      expect(TURNS % arrangementsOf(place).length).toBe(0)
    }
  })

  it('has exactly one want in each, held by the fire, the pool, the seed or the patch', () => {
    for (const { plan } of all) {
      expect(Number.isInteger(plan.want)).toBe(true)
      expect(WANTING).toContain(plan.things[plan.want].kind)
      expect(plan.things[plan.want].in).toBeUndefined()
    }
  })

  it('holds at most five things, on real spots, with no spot used twice', () => {
    for (const { plan } of all) {
      expect(plan.things.length).toBeGreaterThanOrEqual(1)
      expect(plan.things.length).toBeLessThanOrEqual(5)
      const standing = plan.things.filter((thing) => thing.in === undefined).map((thing) => thing.spot)
      expect(new Set(standing).size).toBe(standing.length)
      for (const spot of standing) expect(SPOTS[spot]).toBeDefined()
      // What is in another thing shares its spot: the boat in the pool, the cat in the boat.
      plan.things.forEach((thing, index) => {
        if (thing.in === undefined) return
        expect(thing.in).toBeLessThan(index)
        expect(thing.spot).toBe(plan.things[thing.in].spot)
        expect(`${thing.kind} in ${plan.things[thing.in].kind}`).toMatch(/^(boat in pool|cat in boat)$/)
      })
      // No kind stands twice in a yard, so a child never has to tell two alike apart.
      expect(new Set(kinds(plan)).size).toBe(plan.things.length)
    }
  })

  it('adds to each place what the sheet says it adds', () => {
    expect(arrangementsOf('one-thing').map(kinds)).toEqual([['fire'], ['seed'], ['pool'], ['patch']])
    for (const plan of arrangementsOf('two-things')) {
      expect(plan.things).toHaveLength(2)
      expect(['cat', 'wheel']).toContain(plan.things[1 - plan.want].kind)
    }
    for (const plan of arrangementsOf('afloat')) {
      expect(plan.things[plan.want].kind).toBe('pool')
      expect(plan.things[indexOf(plan, 'boat')].in).toBe(indexOf(plan, 'pool'))
    }
    expect(arrangementsOf('afloat').filter((plan) => plan.things.some((thing) => thing.kind === 'cat' && thing.in === indexOf(plan, 'boat')))).toHaveLength(1)
    for (const plan of arrangementsOf('downhill')) {
      expect(plan.runsTo).toBe(plan.want)
      // The pool stands above what it runs to: farther from the near edge.
      expect(SPOTS[plan.things[indexOf(plan, 'pool')].spot].z).toBeLessThan(SPOTS[plan.things[plan.want].spot].z)
    }
    expect(arrangementsOf('downhill').map((plan) => plan.things[plan.want].kind).sort()).toEqual(['fire', 'patch', 'seed'])
    for (const plan of arrangementsOf('round-and-round')) {
      const wheel = plan.things[indexOf(plan, 'wheel')]
      expect(plan.flingsTo).toEqual([plan.want, indexOf(plan, 'cat')])
      expect(distance(SPOTS[wheel.spot], SPOTS[plan.things[plan.want].spot])).toBeLessThan(4.3)
    }
    // In one whole garden the snail and a fire stand together: its dislike of the heat can be seen there.
    expect(arrangementsOf('whole-garden').filter((plan) => kinds(plan).includes('fire') && kinds(plan).includes('patch'))).toHaveLength(1)
    // And in one a wheel stands on the way down from the pool.
    expect(arrangementsOf('whole-garden').filter((plan) => plan.runsPast !== undefined && plan.things[plan.runsPast].kind === 'wheel')).toHaveLength(1)
    for (const plan of arrangementsOf('whole-garden')) {
      expect([4, 5]).toContain(plan.things.length)
      expect(plan.runsTo).toBe(plan.want)
      expect(plan.flingsTo).toContain(plan.want)
      expect(kinds(plan)).toEqual(expect.arrayContaining(['pool', 'wheel']))
    }
    expect(arrangementsOf('whole-garden').filter((plan) => kinds(plan).includes('cat')).length).toBeGreaterThanOrEqual(3)
  })

  it('brings in one new thing at a time: nothing stands in a yard before its place in the order', () => {
    const firstPlace = (has: (plan: Arrangement) => boolean) => LADDER.findIndex((place) => arrangementsOf(place).some(has))
    expect(firstPlace((plan) => kinds(plan).includes('cat') || kinds(plan).includes('wheel'))).toBe(LADDER.indexOf('two-things'))
    expect(firstPlace((plan) => kinds(plan).includes('boat'))).toBe(LADDER.indexOf('afloat'))
    expect(firstPlace((plan) => plan.runsTo !== undefined)).toBe(LADDER.indexOf('downhill'))
    expect(firstPlace((plan) => plan.flingsTo !== undefined)).toBe(LADDER.indexOf('round-and-round'))
  })

  it('points runsTo and flingsTo at things of the yard, and never at the pool or the wheel they start from', () => {
    for (const { plan } of all) {
      if (plan.runsTo !== undefined) expect(plan.things[plan.runsTo].kind).not.toBe('pool')
      for (const to of plan.flingsTo ?? []) expect(plan.things[to].kind).not.toBe('wheel')
      if (plan.runsTo !== undefined) expect(kinds(plan)).toContain('pool')
      if (plan.flingsTo !== undefined) expect(kinds(plan)).toContain('wheel')
    }
  })
})

describe('a yard laid out', () => {
  it('is fresh: dry sand, no water in anything, the want unmet, and plain JSON', () => {
    for (const { place, number, plan } of all) {
      const yard = layOut(place, number)
      expect(yard).toMatchObject({ place, arrangement: number, want: plan.want, met: false })
      expect(yard.things.map((thing) => thing.kind)).toEqual(kinds(plan))
      expect(yard.things.every((thing) => thing.gulps === 0)).toBe(true)
      expect(yard.ground.every((gulps) => gulps === 0)).toBe(true)
      expect(wantMet(yard)).toBe(false)
      expect(JSON.parse(JSON.stringify(yard))).toEqual(yard)
      expect(layOut(place, number)).toEqual(yard)
      expect(layOut(place, number).things).not.toBe(yard.things)
    }
  })

  it('falls back to the first place for an unknown place, and to the first arrangement for an unknown number', () => {
    expect(layOut('nowhere', 2)).toEqual(layOut(LADDER[0], 2))
    expect(layOut('toString', 0)).toEqual(layOut(LADDER[0], 0))
    for (const number of [-1, 99, 1.5, Number.NaN]) expect(layOut('afloat', number)).toEqual(layOut('afloat', 0))
    expect(arrangementsOf('nowhere')).toBe(arrangementsOf(LADDER[0]))
    expect(isYardSpec('afloat', 2)).toBe(true)
    for (const [place, number] of [['afloat', 3], ['afloat', '1'], ['nowhere', 0], [null, 0], ['constructor', 0]]) expect(isYardSpec(place, number)).toBe(false)
  })

  it('has its want met within twelve gulps aimed at the thing that wants', () => {
    for (const { place, number, plan } of all) {
      const { gulps } = gulpsToMeet(layOut(place, number), plan.want)
      // The duck wants to float, which a pool does a gulp before its fill.
      const kind = plan.things[plan.want].kind
      expect(gulps, `${place} ${number}`).toBe(kind === 'pool' ? FLOATS_AT : THINGS[kind].fill)
    }
  })

  it('from downhill on, has its want met at one remove as well: over the pool, or off the wheel', () => {
    for (const { place, number, plan } of all) {
      if (plan.runsTo !== undefined) expect(gulpsToMeet(layOut(place, number), indexOf(plan, 'pool')).gulps, `${place} ${number}`).toBeGreaterThan(THINGS.pool.fill)
      if (plan.flingsTo !== undefined) expect(gulpsToMeet(layOut(place, number), indexOf(plan, 'wheel')).gulps, `${place} ${number}`).toBeGreaterThan(THINGS.wheel.fill)
    }
  })

  it('leaves the cat a free spot to stalk off to, and maroons her where she naps in the boat', () => {
    for (const { place, number, plan } of all) {
      if (!kinds(plan).includes('cat')) continue
      expect(driestFreeSpot(layOut(place, number)), `${place} ${number}`).not.toBeNull()
      if (plan.things[indexOf(plan, 'cat')].in === undefined) continue
      const { events } = gulpsToMeet(layOut(place, number), indexOf(plan, 'pool'))
      expect(events.filter((event) => event.type === 'secret' && event.id === 'marooned-cat')).toHaveLength(1)
    }
  })
})

describe('how a yard went', () => {
  it('went well when the want was met, by any route', () => {
    const aimed = gulpOn(gulpOn(gulpOn(layOut('downhill', 0), 1).yard, 1).yard, 1).yard
    expect(judge(aimed)).toBe('well')
    let over = layOut('downhill', 0)
    for (let gulp = 0; gulp < 7; gulp++) over = gulpOn(over, 0).yard
    expect(judge(over)).toBe('well')
    expect(judge({ ...layOut('one-thing', 0), met: true })).toBe('well')
  })

  it('was mixed when the want was not met and something else is at its fill', () => {
    let yard = layOut('downhill', 0)
    for (let gulp = 0; gulp < 4; gulp++) yard = gulpOn(yard, 0).yard
    expect(judge(yard)).toBe('mixed')
    // A puddle on the sand is the ground at its fill.
    let puddle = layOut('one-thing', 0)
    for (let gulp = 0; gulp < 3; gulp++) puddle = gulpOnGround(puddle, 12.5, 7.5).yard
    expect(judge(puddle)).toBe('mixed')
  })

  it('went badly when the want was not met and nothing is at its fill', () => {
    expect(judge(layOut('two-things', 0))).toBe('badly')
    let yard = gulpOn(gulpOn(layOut('two-things', 0), 0).yard, 0).yard
    yard = gulpOnGround(gulpOnGround(gulpOn(yard, 1).yard, 12.5, 7.5).yard, 12.5, 7.5).yard
    expect(judge(yard)).toBe('badly')
  })
})

describe('which yard comes next', () => {
  it('never brings the same arrangement twice running for a place, nor after one yard somewhere else', () => {
    for (const place of LADDER) {
      for (let turn = 0; turn < TURNS; turn++) {
        const now = nextYardSpec(place, turn)
        expect(now.place).toBe(place)
        expect(isYardSpec(now.place, now.arrangement)).toBe(true)
        expect(nextYardSpec(place, nextTurn(turn)).arrangement).not.toBe(now.arrangement)
        if (arrangementsOf(place).length > 2) expect(nextYardSpec(place, nextTurn(nextTurn(turn))).arrangement).not.toBe(now.arrangement)
      }
    }
  })

  it('comes round to every arrangement of a place', () => {
    for (const place of LADDER) {
      const seen = new Set<number>()
      for (let turn = 0; turn < TURNS; turn++) seen.add(nextYardSpec(place, turn).arrangement)
      expect(seen.size).toBe(arrangementsOf(place).length)
    }
  })

  it('wraps the turn, so it is no tally of play, and reads a damaged turn as the first', () => {
    let turn = 0
    for (let step = 0; step < 100; step++) {
      turn = nextTurn(turn)
      expect(Number.isInteger(turn) && turn >= 0 && turn < TURNS).toBe(true)
    }
    expect(nextTurn(TURNS - 1)).toBe(0)
    for (const damaged of [-3, 2.5, Number.NaN, Infinity]) {
      expect(nextTurn(damaged)).toBe(1)
      expect(nextYardSpec('afloat', damaged)).toEqual({ place: 'afloat', arrangement: 0 })
    }
    expect(nextYardSpec('nowhere', 5)).toEqual(nextYardSpec(LADDER[0], 5))
  })
})
