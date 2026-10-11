import { describe, expect, it } from 'vitest'
import { drawn } from './fixtures'
import { BURROW, BURROW_INDEX, CAGE, grassNode } from './layout'
import { nextMove } from './route'
import { layWorld } from './world'

describe('the way to the finger', () => {
  it('stays where the finger is', () => {
    expect(nextMove(drawn('@e'), 0, 0)).toEqual({ type: 'stay' })
  })

  it('walks through what is dug, and strikes the block in the way when digging is shorter', () => {
    expect(nextMove(drawn('@oe'), 0, 2)).toEqual({ type: 'walk', to: 1 })
    expect(nextMove(drawn('@ee'), 0, 2)).toEqual({ type: 'strike', at: 1 })
  })

  it('takes the dug way round when it costs less than digging through', () => {
    const world = drawn('@so', 'ooo')
    expect(nextMove(world, 0, 2)).toEqual({ type: 'walk', to: 13 })
  })

  it('goes round granite, and strikes it only when it is all that lies between', () => {
    expect(nextMove(drawn('@ge', 'eee'), 0, 2)).toEqual({ type: 'strike', at: 13 })
    expect(nextMove(drawn('@g', 'gg'), 0, 1)).toEqual({ type: 'strike', at: 1 })
    expect(nextMove(drawn('@b', 'gg'), 0, 1)).toEqual({ type: 'strike', at: 1 })
  })

  it('goes round a pocket where the way round is short, and through it where it is not', () => {
    expect(nextMove(drawn('@wo', 'eoo'), 0, 2)).toEqual({ type: 'strike', at: 13 })
    expect(nextMove(drawn('@w', 'gg'), 0, 1)).toEqual({ type: 'strike', at: 1 })
  })

  it('reaches the grass through the mouth of the burrow and nowhere else, and the cage along the grass', () => {
    const world = layWorld(1, 'near')
    expect(nextMove(world, BURROW_INDEX, CAGE)).toEqual({ type: 'walk', to: grassNode(BURROW.c) })
    expect(nextMove(world, grassNode(BURROW.c), CAGE)).toEqual({ type: 'walk', to: grassNode(BURROW.c - 1) })
    expect(nextMove(world, grassNode(BURROW.c - 1), CAGE)).toEqual({ type: 'walk', to: CAGE })
    expect(nextMove(world, grassNode(12), BURROW_INDEX)).toEqual({ type: 'walk', to: grassNode(11) })
    // From under the grass somewhere else, the way up is still the burrow.
    world.kinds[BURROW_INDEX + 1] = 'open'
    expect(nextMove(world, BURROW_INDEX + 1, grassNode(BURROW.c + 1))).toEqual({ type: 'walk', to: BURROW_INDEX })
  })
})
