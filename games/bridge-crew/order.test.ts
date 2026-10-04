import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { LADDER } from './config'
import { JUDGE, crossedOutcome, differences, givenUpOn, isFairTest, layOut, modelInMargin, nearestDifferences, neatWayDue, oneChangeDue } from './order'
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
    // A second failure of another kind shows nothing; the first later run that fails the way the idea answers does.
    expect(neatWayDue('profile', 2, offTheEnd, false, [])).toBe(false)
    expect(neatWayDue('profile', 5, bend, false, [])).toBe(true)
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
    // What fills the chief's two models: two of the differences, the two nearest the trolley, each named for what was done.
    expect(nearestDifferences(king, king, 12)).toEqual([])
    expect(nearestDifferences(king, king.slice(0, 3), 9).map((d) => d.what)).toEqual(['added', 'added'])
    expect(nearestDifferences(king.slice(0, 3), king, 9).map((d) => d.what)).toEqual(['left-out', 'left-out'])
    expect(nearestDifferences(turned, king, 12)).toEqual([{ what: 'turned', kind: 'plank', at: [10.5, 6] }])
    expect(nearestDifferences(swapped, king, 12)).toEqual([{ what: 'changed', kind: 'thread', at: [13.5, 5] }])
    // A stick with one end still on its pin and the other on the next grid point was moved, not taken off and added.
    const moved = king.map((p, i) => (i === 4 ? part('stick', 15, 6, 13, 4) : p))
    expect(nearestDifferences(moved, king, 12).map((d) => d.what)).toEqual(['moved'])
    // On a sheet of planks only there is still something to fill the models with, and with many differences only the two nearest the trolley.
    const planks = [part('plank', 10, 6, 14, 6), part('plank', 6, 6, 10, 6), part('plank', 14, 6, 18, 6)]
    expect(nearestDifferences(planks, [], 17).map((d) => d.at[0])).toEqual([16, 12])
    // A part hanging loose at one end is a change too.
    expect(differences(king, king.map((p, i) => (i === 2 ? { ...p, loose: 'a' as const } : p)))).toBe(1)
  })

  it('the model of an idea stands in the margin of every sheet of its position once it has been shown', () => {
    expect(modelInMargin('first-triangle', [])).toBeNull()
    expect(modelInMargin('first-triangle', ['triangle'])).toBe('triangle')
    expect(modelInMargin('first-triangle', ['prop'])).toBeNull()
    expect(modelInMargin('jelly-run', ['triangle'])).toBeNull()
  })

  it('a part moved is one difference, so a comparison of two designs that differ by one moved part is fair and the one change is not owed', () => {
    const bridge = [part('plank', 8, 6, 12, 6, true), part('stick', 12, 3, 12, 6)], moved = [part('plank', 8, 6, 12, 6, true), part('stick', 12, 3, 11, 6)]
    expect(differences(bridge, moved)).toBe(1)
    expect(isFairTest(bridge, moved)).toBe(true)
    expect(oneChangeDue(bridge, moved, [])).toBe(false)
    expect(nearestDifferences(bridge, moved, 12)).toMatchObject([{ what: 'moved', kind: 'stick' }])
    // Moved and turned: two things, and those two fill the showing.
    const both = [part('plank', 8, 6, 12, 6, false), part('stick', 12, 3, 11, 6)]
    expect(differences(bridge, both)).toBe(2)
    expect(oneChangeDue(bridge, both, [])).toBe(true)
    expect(nearestDifferences(bridge, both, 12).map((one) => one.what).sort()).toEqual(['moved', 'turned'])
  })
})
