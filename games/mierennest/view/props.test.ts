import { describe, expect, it } from 'vitest'
import { CELL, MOUTH } from '../ground'
import { GRASS_Y, LOG, MOUTH_X } from './layout'
import { BELL, LIP, hillGrown, hillShape } from './props'

// The hill is set down by the game beside things the child aims at, so it is held clear of them at its largest
// (guide, ruling 15): with every cell of the ground dug out it still leaves the bell, the log and the mouth alone.

describe('the hill', () => {
  it('rises fast at first and then ever more slowly, up to a height it never passes', () => {
    const steps = [0, 0.1, 0.2, 0.4, 0.7, 1].map(hillGrown)
    for (let n = 1; n < steps.length; n++) expect(steps[n]).toBeGreaterThan(steps[n - 1])
    expect(steps[1] - steps[0]).toBeGreaterThan(steps[2] - steps[1])
    expect(hillGrown(0)).toBe(0)
    expect(hillGrown(1)).toBeLessThan(1)
    expect(hillShape(7).right.height).toBe(hillShape(1).right.height)
  })

  it('leaves the mouth open', () => {
    expect(LIP).toBeGreaterThanOrEqual((MOUTH.length * CELL) / 2)
  })

  for (const grown of [0, hillGrown(1), 1]) {
    it(`at a growth of ${grown.toFixed(2)} stops short of the party at the log`, () => {
      const hill = hillShape(grown)
      expect(MOUTH_X - LIP - hill.left.reach).toBeGreaterThanOrEqual(LOG.x + LOG.length)
    })

    it(`at a growth of ${grown.toFixed(2)} stands clear of the bell and of its stalk`, () => {
      const hill = hillShape(grown)
      // Under the bell: no part of the hill is as high as the lowest point a touch on the bell can land.
      expect(GRASS_Y - hill.right.height).toBeGreaterThan(BELL.y + BELL.reach)
      // The stalk's foot stands past the end of the right hump.
      expect(MOUTH_X + LIP + hill.right.reach).toBeLessThanOrEqual(BELL.x + 46)
    })
  }

  it('gives the bell a reach well over the smallest target', () => {
    expect(BELL.reach * 2).toBeGreaterThanOrEqual(48)
  })
})
