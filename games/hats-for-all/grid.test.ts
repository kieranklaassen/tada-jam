import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, HEARD, OBJECTS, act, type Action, type ObjectKind } from './grid'
import { placeOf, tapHat, dropHat, type Drop, type World } from './rules'

const cells = OBJECTS.flatMap((object) => ACTIONS.map((action) => ({ object, action, cell: GRID[object][action] })))

/**
 * One world that holds every object of the grid at once: a bare head (spot 0), a head with one hat
 * (spot 1, hat 0), a tower of two (spot 2, hats 1 and 2), a loose hat (hat 3) and a hat in the tile (hat 4).
 */
function everything(): World {
  let world: World = {
    crew: [{ kind: 'bop', spot: 0, hats: [] }, { kind: 'lanky', spot: 1, hats: [] }, { kind: 'flop', spot: 2, hats: [] }],
    tile: ['cone', 'dome', 'brim', 'cone', 'dome'], loose: [], changes: [], guest: null, leaver: null, slips: 0,
  }
  for (const [hat, to] of [[0, { on: 'head', spot: 1 }], [1, { on: 'head', spot: 2 }], [2, { on: 'head', spot: 2 }], [3, { on: 'floor', spot: 4 }]] as [number, Drop][]) world = dropHat(world, hat, to).world
  return world
}

const SUBJECT: Record<ObjectKind, { hat?: number; spot?: number }> = {
  'hat-in-tile': { hat: 4 }, 'hat-on-head': { hat: 0 }, 'loose-hat': { hat: 3 }, 'tower-top': { hat: 2 }, 'bare-creature': { spot: 0 }, 'hatted-creature': { spot: 1 },
}
/** Where each drag lets go. A hat already on the one-hatted head is dragged to the tower instead, and a tower's top to the one-hatted head. */
function dropFor(object: ObjectKind, action: Action): Drop {
  if (action === 'to-bare-head') return { on: 'head', spot: 0 }
  if (action === 'to-hatted-head') return { on: 'head', spot: object === 'hat-on-head' ? 2 : 1 }
  if (action === 'to-tile') return { on: 'tile' }
  return { on: 'floor', spot: 3 }
}

describe('the grid', () => {
  it('is six objects by five actions', () => {
    expect(OBJECTS.length).toBe(6)
    expect(ACTIONS.length).toBe(5)
    expect(cells.length).toBe(30)
  })

  it('gives every cell a result that looks different and sounds different', () => {
    expect(new Set(cells.map(({ cell }) => cell.seen)).size).toBe(30)
    expect(new Set(cells.map(({ cell }) => cell.heard.join(' '))).size).toBe(30)
  })

  it('answers every cell with a sound from the first touch, in voices the game has', () => {
    for (const { cell, object, action } of cells) {
      expect(cell.heard[0], `${object} ${action}`).toBe('creak')
      expect(cell.heard.length).toBeGreaterThanOrEqual(2)
      for (const voice of cell.heard) expect(HEARD as readonly string[]).toContain(voice)
    }
  })

  it('says of every cell whether a hat changes place, as the rules have it', () => {
    for (const { object, action, cell } of cells) {
      const before = everything()
      const { world: after } = act(before, object, action, { ...SUBJECT[object], to: dropFor(object, action) })
      const moved = before.tile.some((_, hat) => JSON.stringify(placeOf(before, hat)) !== JSON.stringify(placeOf(after, hat)))
      expect(moved, `${object} ${action}`).toBe(cell.moves)
    }
  })

  it('refuses nothing: the wrong use of every object works', () => {
    // A second hat on a head, a hat on the floor and a third hat on a tower all change the world.
    for (const [object, action] of [['hat-in-tile', 'to-hatted-head'], ['hat-in-tile', 'elsewhere'], ['tower-top', 'to-hatted-head'], ['hat-on-head', 'elsewhere']] as [ObjectKind, Action][]) expect(GRID[object][action].moves).toBe(true)
    const world = everything()
    // The top of a tower moved onto a head with one hat: the tower changes heads, and nothing falls.
    const changed = act(world, 'tower-top', 'to-hatted-head', { hat: 2, to: { on: 'head', spot: 1 } })
    expect(changed.world.crew.map((creature) => creature.hats)).toEqual([[], [0, 2], [1]])
    expect(changed.happened.some((event) => event.type === 'towerFell')).toBe(false)
    // Onto a head that already has two: the tower of three falls, every time, and every hat of it goes home.
    const fell = act(changed.world, 'tower-top', 'to-hatted-head', { hat: 1, to: { on: 'head', spot: 1 } })
    expect(fell.happened).toContainEqual({ type: 'towerFell', spot: 1, hats: [0, 2, 1] })
    expect(fell.world.crew.every((creature) => creature.hats.length === 0)).toBe(true)
    expect(tapHat(fell.world, 1).happened.length).toBeGreaterThan(0)
  })
})
