import { describe, expect, it } from 'vitest'
import { KINDS } from './kinds'
import { give, isCount, pop, served, troopOf, without, type Bunch, type Count, type Troop } from './world'

const COUNTS: readonly Count[] = [1, 2, 3]

/** A deep copy, to hold against a value that must not have been changed. */
const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value))

/** A troop of ducks in which these friends already hold a balloon. */
const ducks = (...held: boolean[]): Troop => ({ kind: 'duck', size: held.length as Count, held })

describe('a troop', () => {
  it('comes in with nobody holding a balloon', () => {
    for (const kind of KINDS) {
      for (const size of COUNTS) {
        const troop = troopOf(kind, size)
        expect(troop).toEqual({ kind, size, held: Array(size).fill(false) })
        expect(without(troop)).toEqual([0, 1, 2].slice(0, size))
        expect(served(troop)).toBe(false)
      }
    }
  })

  it('lists the friends without a balloon from the left, and is served when there are none', () => {
    expect(without(ducks(true, false, false))).toEqual([1, 2])
    expect(without(ducks(false, true, false))).toEqual([0, 2])
    expect(without(ducks(true, true))).toEqual([])
    expect(served(ducks(true, true))).toBe(true)
    expect(served(ducks(true, false))).toBe(false)
  })

  it('counts one, two and three and nothing else', () => {
    expect([0, 1, 2, 3, 4, 1.5, '2', null, undefined].map(isCount)).toEqual([false, true, true, true, false, false, false, false, false])
  })
})

describe('the one rule', () => {
  it('refuses a bunch of another colour whatever its size, and leaves the troop as it was', () => {
    for (const kind of KINDS) {
      for (const colour of KINDS.filter((other) => other !== kind)) {
        for (const size of COUNTS) {
          for (const count of COUNTS) {
            const troop = troopOf(kind, size)
            const result = give(troop, { colour, count })
            expect(result.given).toEqual({ result: 'refused' })
            expect(result.troop).toEqual(troopOf(kind, size))
          }
        }
      }
    }
    // A troop that already has its balloons still refuses another colour.
    expect(give(ducks(true, true), { colour: 'frog', count: 1 })).toEqual({ troop: ducks(true, true), given: { result: 'refused' } })
  })

  it('gives a single to the first friend without one', () => {
    expect(give(ducks(false), { colour: 'duck', count: 1 })).toEqual({ troop: ducks(true), given: { result: 'taken', takers: [0], served: true } })
    expect(give(ducks(false, false, false), { colour: 'duck', count: 1 })).toEqual({ troop: ducks(true, false, false), given: { result: 'taken', takers: [0], served: false } })
    expect(give(ducks(true, false, false), { colour: 'duck', count: 1 })).toEqual({ troop: ducks(true, true, false), given: { result: 'taken', takers: [1], served: false } })
    expect(give(ducks(false, true, false), { colour: 'duck', count: 1 })).toEqual({ troop: ducks(true, true, false), given: { result: 'taken', takers: [0], served: false } })
  })

  it('serves a whole troop with a bunch that holds one for each', () => {
    expect(give(ducks(false, false), { colour: 'duck', count: 2 })).toEqual({ troop: ducks(true, true), given: { result: 'taken', takers: [0, 1], served: true } })
    expect(give(ducks(false, false, false), { colour: 'duck', count: 3 })).toEqual({ troop: ducks(true, true, true), given: { result: 'taken', takers: [0, 1, 2], served: true } })
    // One for each of the friends who are still without one.
    expect(give(ducks(false, true, false), { colour: 'duck', count: 2 })).toEqual({ troop: ducks(true, true, true), given: { result: 'taken', takers: [0, 2], served: true } })
  })

  it('takes a bunch smaller than the troop, one each: not yet enough is not an error', () => {
    const result = give(ducks(false, false, false), { colour: 'duck', count: 2 })
    expect(result).toEqual({ troop: ducks(true, true, false), given: { result: 'taken', takers: [0, 1], served: false } })
    expect(without(result.troop)).toEqual([2])
    // The child adds to it.
    expect(give(result.troop, { colour: 'duck', count: 1 }).given).toEqual({ result: 'taken', takers: [2], served: true })
  })

  it('lets a bunch get away when it holds more balloons than there are friends without one', () => {
    expect(give(ducks(false), { colour: 'duck', count: 2 })).toEqual({ troop: ducks(false), given: { result: 'gotAway', grabber: 0, spare: 1 } })
    expect(give(ducks(false), { colour: 'duck', count: 3 })).toEqual({ troop: ducks(false), given: { result: 'gotAway', grabber: 0, spare: 2 } })
    expect(give(ducks(false, false), { colour: 'duck', count: 3 })).toEqual({ troop: ducks(false, false), given: { result: 'gotAway', grabber: 0, spare: 1 } })
    // The friends come down with what they had before, and the first one without a balloon is the one that held on.
    expect(give(ducks(true, false, false), { colour: 'duck', count: 3 })).toEqual({ troop: ducks(true, false, false), given: { result: 'gotAway', grabber: 1, spare: 1 } })
    expect(give(ducks(true, true, false), { colour: 'duck', count: 2 })).toEqual({ troop: ducks(true, true, false), given: { result: 'gotAway', grabber: 2, spare: 1 } })
  })

  it('lets anything of its colour get away from a troop that already has its balloons, a single too', () => {
    expect(give(ducks(true), { colour: 'duck', count: 1 })).toEqual({ troop: ducks(true), given: { result: 'gotAway', grabber: 0, spare: 1 } })
    expect(give(ducks(true, true, true), { colour: 'duck', count: 1 })).toEqual({ troop: ducks(true, true, true), given: { result: 'gotAway', grabber: 0, spare: 1 } })
    expect(give(ducks(true, true), { colour: 'duck', count: 3 })).toEqual({ troop: ducks(true, true), given: { result: 'gotAway', grabber: 0, spare: 3 } })
  })

  it('never changes what it was handed', () => {
    const bunches: Bunch[] = KINDS.flatMap((colour) => COUNTS.map((count) => ({ colour, count })))
    for (const troop of [ducks(false), ducks(false, false, false), ducks(true, false), ducks(true, true, true)]) {
      for (const bunch of bunches) {
        const troopBefore = copyOf(troop), bunchBefore = copyOf(bunch)
        give(troop, bunch)
        expect(troop).toEqual(troopBefore)
        expect(bunch).toEqual(bunchBefore)
      }
    }
  })

  it('can always be finished one balloon at a time', () => {
    for (const size of COUNTS) {
      let troop = troopOf('crab', size)
      for (let sent = 0; sent < size; sent++) troop = give(troop, { colour: 'crab', count: 1 }).troop
      expect(served(troop)).toBe(true)
    }
  })
})

describe('a pop', () => {
  it('leaves that friend without a balloon again, and the others as they were', () => {
    const before = ducks(true, true, true)
    expect(pop(before, 1)).toEqual({ troop: ducks(true, false, true), popped: true })
    expect(before).toEqual(ducks(true, true, true))
    // The friend reaches up again and can be given another.
    expect(give(ducks(true, false, true), { colour: 'duck', count: 1 }).given).toEqual({ result: 'taken', takers: [1], served: true })
  })

  it('does nothing for a friend who holds none or is not there', () => {
    for (const friend of [0, 2, 3, -1, 1.5, Number.NaN]) expect(pop(ducks(false, true, false), friend)).toEqual({ troop: ducks(false, true, false), popped: false })
  })
})
