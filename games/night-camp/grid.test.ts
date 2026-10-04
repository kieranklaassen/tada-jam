import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, OBJECTS, changesThePlan, use } from './grid'

const cells = OBJECTS.flatMap((thing) => ACTIONS.map((action) => ({ thing, action, cell: GRID[thing][action] })))

describe('the object-by-action grid', () => {
  it('is six objects by five actions with an answer in every cell', () => {
    expect(OBJECTS.length).toBe(6)
    expect(ACTIONS.length).toBe(5)
    expect(cells.length).toBe(30)
    for (const { thing, action } of cells) {
      expect(use(thing, action).result.length, `${thing} ${action}`).toBeGreaterThan(0)
      expect(use(thing, action, 'night').voice.length, `${thing} ${action}`).toBeGreaterThan(0)
    }
  })

  it('gives every cell a result that looks different from every other', () => {
    const results = cells.flatMap(({ cell }) => [cell.result, ...(cell.atNight ? [cell.atNight] : [])])
    expect(new Set(results).size).toBe(results.length)
  })

  it('gives every cell a sound that is different from every other', () => {
    const voices = cells.map(({ cell }) => cell.voice)
    expect(new Set(voices).size).toBe(voices.length)
  })

  it('gives every object a right use and at least three wrong ones', () => {
    for (const thing of OBJECTS) {
      const row = ACTIONS.map((action) => GRID[thing][action])
      expect(row.filter((cell) => cell.right).length, thing).toBeGreaterThanOrEqual(1)
      expect(row.filter((cell) => !cell.right).length, thing).toBeGreaterThanOrEqual(3)
      expect(GRID[thing].pull.right, `${thing}: pulling it along is its own use`).toBe(true)
    }
  })

  it('lets a wrong use work and cost nothing: it changes nothing the child set', () => {
    for (const { thing, action, cell } of cells) {
      if (cell.right) continue
      expect(cell.changes, `${thing} ${action}`).toBeNull()
      expect(changesThePlan(thing, action)).toBe(false)
    }
  })

  it('changes the plan only by laying in a supply, on its rod or on its own user, moving a lantern or clicking its wick', () => {
    const changing = cells.filter(({ thing, action }) => changesThePlan(thing, action)).map(({ thing, action }) => `${thing} ${action}`)
    expect(changing).toEqual(['log pull', 'log on-fire', 'flask pull', 'flask on-lantern', 'can pull', 'lantern pull', 'lantern tap'])
    // While the night runs, the log on the fire is a flare and nothing more.
    expect(use('log', 'on-fire', 'night')).toMatchObject({ right: false, changes: null })
  })

  it('answers differently at night where the sheet says so', () => {
    expect(use('log', 'on-fire', 'dusk').result).not.toBe(use('log', 'on-fire', 'night').result)
    expect(use('can', 'on-fire', 'night').result).toBe('steam-cloud-hides-a-patch-of-map')
    expect(use('flask', 'tap', 'night')).toEqual(use('flask', 'tap', 'dusk'))
  })

  it('holds no verdict and nothing addressed to the child', () => {
    const words = cells.flatMap(({ cell }) => [cell.result, cell.atNight ?? '', cell.voice]).join(' ')
    expect(words).not.toMatch(/wrong|buzz|fail|refus|penalt|score|bravo|well-done|sorry/)
  })
})
