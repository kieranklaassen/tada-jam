import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { LADDER } from './config'
import { JUDGE, crossedOutcome, differences, differingKinds, givenUpOn, isFairTest, layOut, modelInMargin, neatWayDue, oneChangeDue } from './order'
import type { Ending } from './run'

const bend: Ending = { kind: 'gives', part: 0, spot: [1, 1], strain: 'bend' }
const bow: Ending = { kind: 'gives', part: 0, spot: [1, 1], strain: 'bow' }
const offTheEnd: Ending = { kind: 'road-ends', at: [8, 6] }

describe('the designed order as rules', () => {
  it('judges a cycle by the failed runs before the crossing, and gives a way back in at the eighth', () => {
    expect([0, 3, 4, 7].map(crossedOutcome)).toEqual(['well', 'well', 'mixed', 'mixed'])
    expect(givenUpOn(JUDGE.badly - 1)).toBe(false)
    expect(givenUpOn(JUDGE.badly)).toBe(true)
    // Most cycles should go well: the bound for "well" leaves room for real failures first.
    expect(JUDGE.well).toBeGreaterThanOrEqual(2)
  })

  it('takes the forms of a position in turn each time it is laid out', () => {
    expect(layOut('rock-prop', {})).toEqual({ site: 'rock-prop', variant: 0 })
    expect(layOut('rock-prop', { 'rock-prop': 1 })).toEqual({ site: 'rock-prop', variant: 1 })
    expect(layOut('rock-prop', { 'rock-prop': 3 })).toEqual({ site: 'rock-prop', variant: 0 })
    expect(layOut('renamed-away', {}).site).toBe(LADDER[0])
  })

  it('the child tries first, and every idea gets its one showing: at the second failed run it answers, or at the end of the crossing', () => {
    expect(neatWayDue('profile', 1, bend, false, [])).toBe(false)
    expect(neatWayDue('profile', 2, bend, false, [])).toBe(true)
    expect(neatWayDue('profile', 2, bend, false, ['profile'])).toBe(false)
    expect(neatWayDue('profile', 2, offTheEnd, true, [])).toBe(false)
    expect(neatWayDue('triangle', 2, offTheEnd, true, [])).toBe(true)
    // A child who crosses before that is shown it once the vehicle has parked; never twice, and never after another vehicle's run.
    expect(neatWayDue('triangle', 0, { kind: 'crossed' }, false, [])).toBe(true)
    expect(neatWayDue('triangle', 5, { kind: 'crossed' }, false, ['triangle'])).toBe(false)
    expect(neatWayDue('triangle', 0, { kind: 'crossed' }, false, [], false)).toBe(false)
    expect(neatWayDue('triangle', 3, offTheEnd, true, [], false)).toBe(false)
    expect(neatWayDue('tube', 2, bow, false, [])).toBe(true)
    expect(neatWayDue('tube', 2, bend, false, [])).toBe(false)
    expect(neatWayDue(null, 9, bend, true, [])).toBe(false)
  })

  it('counts the parts two designs differ in, and calls a comparison fair at one', () => {
    const king = CROSSINGS['first-triangle']
    expect(differences(king, king)).toBe(0)
    expect(differences(king, [...king].reverse())).toBe(0)
    expect(differences(king, king.slice(0, 4))).toBe(1)
    // The same plank turned over is one change, and so is a stick put where a thread was.
    const turned = king.map((p, i) => (i === 0 ? { ...p, turned: !p.turned } : p))
    expect(differences(king, turned)).toBe(1)
    const swapped = [...king.slice(0, 4), part('thread', 15, 6, 12, 4)]
    expect(differences(king, swapped)).toBe(1)
    expect(isFairTest(king, turned)).toBe(true)
    expect(isFairTest(king, king.slice(0, 3))).toBe(false)
    expect(oneChangeDue(king, king.slice(0, 3), [])).toBe(true)
    expect(oneChangeDue(king, king.slice(0, 3), ['one-change'])).toBe(false)
    expect(oneChangeDue(king, turned, [])).toBe(false)
    // What fills the chief's two models: the kinds of part the two designs differ in, two at most.
    expect(differingKinds(king, king.slice(0, 3))).toEqual(['stick'])
    expect(differingKinds(king, [...swapped.slice(1)])).toEqual(['plank', 'stick'])
    expect(differingKinds(king, king)).toEqual([])
    // A part hanging loose at one end is a change too.
    expect(differences(king, king.map((p, i) => (i === 2 ? { ...p, loose: 'a' as const } : p)))).toBe(1)
  })

  it('the model of an idea stands in the margin of every sheet of its position once it has been shown', () => {
    expect(modelInMargin('first-triangle', [])).toBeNull()
    expect(modelInMargin('first-triangle', ['triangle'])).toBe('triangle')
    expect(modelInMargin('first-triangle', ['prop'])).toBeNull()
    expect(modelInMargin('jelly-run', ['triangle'])).toBeNull()
  })
})
