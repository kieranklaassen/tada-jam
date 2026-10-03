import { describe, expect, it } from 'vitest'
import { CUP_HOLDS, dishOf } from './forms'
import { CLOTH } from './layout'
import { CELL_HOLDS, PUDDLE_COLS, PUDDLE_ROWS, cellAt, cellSpot, dab, emptyWorld, holds, pourInto, puddleNear, puddled, spill, teaOut, tip, wipe, type Thing, type World } from './world'

const thing = (id: string, kind: Thing['kind'], over: Partial<Thing> = {}): Thing => ({ id, kind, size: 'house', ring: null, owner: null, x: 0, z: 0, on: null, tea: 0, ...over })

function table(): World {
  const world = emptyWorld()
  world.things.push(thing('pot', 'pot', { x: 3, z: 2 }), thing('saucer-0', 'saucer'), thing('cup-bear', 'cup', { on: 'saucer-0', owner: 'bear', ring: 0.92 }), thing('sponge', 'sponge', { x: 1, z: 2 }), thing('bowl', 'bowl', { x: 5, z: 1 }))
  return world
}

describe('pouring into a cup', () => {
  it('fills the cup and nothing else until the rim', () => {
    const world = table()
    const flow = pourInto(world, 'cup-bear', 0.6)
    expect(world.things[2].tea).toBeCloseTo(0.6, 9)
    expect(flow.into).toEqual([{ id: 'cup-bear', amount: 0.6 }])
    expect(flow.spilled).toBe(0)
    expect(puddled(world)).toBe(0)
  })

  it('runs over the rim into the saucer, and over the saucer onto the cloth, losing nothing', () => {
    const world = table()
    const poured = 1.5
    const flow = pourInto(world, 'cup-bear', poured)
    const saucer = dishOf('house').holds
    expect(world.things[2].tea).toBeCloseTo(1, 9)
    expect(world.things[1].tea).toBeCloseTo(saucer, 9)
    expect(flow.spilled).toBeCloseTo(poured - 1 - saucer, 9)
    expect(puddled(world)).toBeCloseTo(poured - 1 - saucer, 9)
    expect(teaOut(world)).toBeCloseTo(poured, 9)
    expect(flow.lost).toBe(0)
  })

  it('goes straight onto the cloth from a cup that stands on no saucer', () => {
    const world = table()
    world.things[2].on = null
    pourInto(world, 'cup-bear', 1.2)
    expect(world.things[1].tea).toBe(0)
    expect(puddled(world)).toBeCloseTo(0.2, 9)
  })

  it('keeps every drop through many small pours', () => {
    const world = table()
    for (let i = 0; i < 400; i++) pourInto(world, 'cup-bear', 0.0071)
    expect(teaOut(world)).toBeCloseTo(400 * 0.0071, 6)
  })

  it('takes tea poured at the pot back into the pot', () => {
    const world = table()
    const flow = pourInto(world, 'pot', 0.4)
    expect(teaOut(world)).toBe(0)
    expect(flow.into).toEqual([{ id: 'pot', amount: 0.4 }])
  })

  it('ignores a pour of nothing and a thing that is not there', () => {
    const world = table()
    expect(pourInto(world, 'cup-bear', 0).into).toEqual([])
    expect(pourInto(world, 'cup-bear', -1).into).toEqual([])
    expect(pourInto(world, 'nobody', 1).into).toEqual([])
    expect(teaOut(world)).toBe(0)
  })
})

describe('a puddle', () => {
  it('is as large as what ran over: a cell holds a little and the rest creeps outward', () => {
    const world = emptyWorld()
    spill(world, { x: 0, z: 0 }, CELL_HOLDS * 5)
    const wet = world.puddles.filter((amount) => amount > 0).length
    expect(wet).toBe(5)
    expect(Math.max(...world.puddles)).toBeLessThanOrEqual(CELL_HOLDS + 1e-12)
    expect(world.puddles[cellAt({ x: 0, z: 0 })]).toBeCloseTo(CELL_HOLDS, 12)
    spill(world, { x: 0, z: 0 }, CELL_HOLDS * 5)
    expect(world.puddles.filter((amount) => amount > 0).length).toBe(10)
  })

  it('stays near where it fell', () => {
    const world = emptyWorld()
    spill(world, { x: -3, z: 1 }, CELL_HOLDS * 9)
    expect(puddleNear(world, { x: -3, z: 1 }, 1.4)).toBeCloseTo(CELL_HOLDS * 9, 9)
    expect(puddleNear(world, { x: 4, z: -2 }, 1.4)).toBe(0)
  })

  it('runs off the edge only when the whole cloth is wet', () => {
    const world = emptyWorld()
    const all = CELL_HOLDS * PUDDLE_COLS * PUDDLE_ROWS
    const flow = spill(world, { x: CLOTH.minX, z: CLOTH.minZ }, all + 0.5)
    expect(flow.spilled).toBeCloseTo(all, 6)
    expect(flow.lost).toBeCloseTo(0.5, 6)
    expect(puddled(world)).toBeCloseTo(all, 6)
  })

  it('maps every spot to a cell and every cell back to a spot inside itself', () => {
    for (let cell = 0; cell < PUDDLE_COLS * PUDDLE_ROWS; cell++) expect(cellAt(cellSpot(cell))).toBe(cell)
    expect(cellAt({ x: -99, z: -99 })).toBe(0)
    expect(cellAt({ x: 99, z: 99 })).toBe(PUDDLE_COLS * PUDDLE_ROWS - 1)
  })
})

describe('the sponge', () => {
  it('takes up the puddle under it and holds it', () => {
    const world = table()
    spill(world, { x: 0, z: 1 }, 0.2)
    const took = wipe(world, 'sponge', { x: 0, z: 1 }, 1.2)
    expect(took).toBeCloseTo(0.2, 9)
    expect(puddled(world)).toBeCloseTo(0, 9)
    expect(world.things[3].tea).toBeCloseTo(0.2, 9)
  })

  it('stops when it is full, and the rest of the puddle stays', () => {
    const world = table()
    spill(world, { x: 0, z: 1 }, 0.6)
    const before = teaOut(world)
    wipe(world, 'sponge', { x: 0, z: 1 }, 3)
    expect(world.things[3].tea).toBeCloseTo(holds(world.things[3]), 9)
    expect(puddled(world)).toBeCloseTo(0.6 - holds(world.things[3]), 9)
    expect(teaOut(world)).toBeCloseTo(before, 9)
  })

  it('dabs a thimbleful out of a cup', () => {
    const world = table()
    pourInto(world, 'cup-bear', 0.7)
    expect(dab(world, 'sponge', 'cup-bear')).toBeCloseTo(CUP_HOLDS.thimble, 9)
    expect(world.things[2].tea).toBeCloseTo(0.7 - CUP_HOLDS.thimble, 9)
    expect(teaOut(world)).toBeCloseTo(0.7, 9)
  })

  it('gives its tea back when it is tipped into a cup', () => {
    const world = table()
    world.things[3].tea = 0.25
    tip(world, 'sponge', 'cup-bear')
    expect(world.things[3].tea).toBe(0)
    expect(world.things[2].tea).toBeCloseTo(0.25, 9)
  })
})

describe('tipping one thing into another', () => {
  it('moves all the tea, and what does not fit runs over', () => {
    const world = table()
    world.things.push(thing('cup-mouse', 'cup', { size: 'thimble', x: 2, z: 0 }))
    pourInto(world, 'cup-bear', 1)
    tip(world, 'cup-bear', 'cup-mouse')
    expect(world.things[2].tea).toBe(0)
    expect(world.things[5].tea).toBeCloseTo(CUP_HOLDS.thimble, 9)
    expect(puddled(world)).toBeCloseTo(1 - CUP_HOLDS.thimble, 9)
    expect(puddleNear(world, { x: 2, z: 0 }, 2.5)).toBeGreaterThan(0.5)
  })

  it('shows that a thimbleful is the Mouse\'s drop and two halves are a cupful', () => {
    const world = table()
    world.things.push(thing('thimble', 'cup', { size: 'thimble', x: 2, z: 0 }), thing('small', 'cup', { size: 'small', x: -2, z: 0 }))
    for (let i = 0; i < 2; i++) {
      pourInto(world, 'small', 5)
      world.puddles.fill(0)
      tip(world, 'small', 'cup-bear')
    }
    expect(world.things[2].tea).toBeCloseTo(1, 9)
    expect(puddled(world)).toBe(0)
  })

  it('never empties the pot and never tips a thing into itself', () => {
    const world = table()
    pourInto(world, 'cup-bear', 0.5)
    expect(tip(world, 'pot', 'cup-bear').into).toEqual([])
    expect(tip(world, 'cup-bear', 'cup-bear').into).toEqual([])
    expect(world.things[2].tea).toBeCloseTo(0.5, 9)
  })

  it('pours a cup back into the pot', () => {
    const world = table()
    pourInto(world, 'cup-bear', 0.5)
    tip(world, 'cup-bear', 'pot')
    expect(teaOut(world)).toBe(0)
  })
})
