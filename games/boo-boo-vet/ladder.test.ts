import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { CARRIER_FROM, above, carrierCanStand, place, rung, shownAtStart } from './ladder'
import { CARES, FITS, NEEDS, PLAIN, QUIET } from './needs'

describe('the designed order', () => {
  it('has a rung for every position id and no other', () => {
    for (const id of LADDER) expect(rung(id).id).toBe(id)
    expect(new Set(LADDER).size).toBe(LADDER.length)
  })

  it('names no grade, groep, level, year or number in a position id', () => {
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|level|fase|year|class|kinder|\d/i)
  })

  it('adds one need with its care thing at each of the first five steps', () => {
    for (let index = 0; index < NEEDS.length; index++) {
      const step = rung(LADDER[index])
      expect(step.needs).toEqual(NEEDS.slice(0, index + 1))
      expect(step.cart).toEqual(CARES.slice(0, index + 1))
      expect(step.newest).toBe(NEEDS[index])
      expect(step.start).toBe(PLAIN)
      expect(step.perPatient).toBe(1)
      // The thing that fits every need in play is always on the cart.
      for (const need of step.needs) expect(step.cart).toContain(FITS[need])
    }
  })

  it('changes one thing from each step to the next', () => {
    for (let index = 1; index < LADDER.length; index++) {
      const before = rung(LADDER[index - 1]), after = rung(LADDER[index])
      const changes = [after.needs.length !== before.needs.length, after.start !== before.start, after.perPatient !== before.perPatient].filter(Boolean).length
      // From `quiet` to `two` the support comes back as the second need arrives, so that step alone changes two fields
      // and still asks one new thing of the child.
      expect(changes, `${before.id} to ${after.id}`).toBeLessThanOrEqual(after.id === 'two' ? 2 : 1)
      expect(changes).toBeGreaterThan(0)
    }
  })

  it('then removes a support, then combines needs, then both', () => {
    expect(rung('quiet')).toMatchObject({ start: QUIET, perPatient: 1, newest: null })
    expect(rung('two')).toMatchObject({ start: PLAIN, perPatient: 2, newest: null })
    expect(rung('two-quiet')).toMatchObject({ start: QUIET, perPatient: 2, newest: null })
    for (const id of ['quiet', 'two', 'two-quiet']) expect(rung(id).cart).toHaveLength(CARES.length)
  })

  it('never puts more than five things on the cart or more than two needs in a patient', () => {
    for (const id of LADDER) {
      expect(rung(id).cart.length).toBeLessThanOrEqual(5)
      expect(rung(id).perPatient).toBeLessThanOrEqual(2)
    }
  })

  it('lays out an unknown id as the first step', () => {
    expect(rung('no-such-place')).toBe(rung(LADDER[0]))
    expect(place('no-such-place')).toBe(0)
  })

  it('finds the step above and stays at the top', () => {
    expect(above('bowl')).toBe('blanket')
    expect(above(LADDER[LADDER.length - 1])).toBe(LADDER[LADDER.length - 1])
  })

  it('lets the carrier stand once all five things are known, at every position but the last', () => {
    expect(rung(CARRIER_FROM).cart).toHaveLength(CARES.length)
    expect(LADDER.filter((id) => carrierCanStand(id))).toEqual(['basket', 'quiet', 'two'])
    // Whoever is in it comes from one step above, so there is always a step above.
    for (const id of LADDER) if (carrierCanStand(id)) expect(above(id)).not.toBe(id)
  })

  it('counts as shown, on a first visit, the first thing and the things of the steps before the start', () => {
    expect(shownAtStart('bowl')).toEqual(['bowl'])
    expect(shownAtStart('blanket')).toEqual(['bowl'])
    expect(shownAtStart('plaster')).toEqual(['bowl', 'blanket'])
    // So a first visit always opens with at most one thing still to be shown.
    for (const row of FIRST_VISIT) expect(rung(row.position).cart.length - shownAtStart(row.position).length).toBeLessThanOrEqual(1)
  })
})
