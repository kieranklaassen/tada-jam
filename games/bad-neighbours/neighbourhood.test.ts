import Matter from 'matter-js'
import { describe, expect, it } from 'vitest'
import { Game, PLATFORM_WIDTH } from './model'
import { MAX_PROPS, Neighbourhood } from './neighbourhood'

describe('neighbourhood', () => {
  it('decorations never add bodies or move the simulation', () => {
    const game = new Game(2), street = new Neighbourhood(), first = game.active!, position = { ...first.body.position }
    const count = Matter.Composite.allBodies(game.engine.world).length
    street.spill(first, 7, true); street.rescue(first)
    for (let i = 0; i < 60; i++) street.update(1000 / 60, game.pieces, PLATFORM_WIDTH)
    expect(first.body.position).toEqual(position)
    expect(Matter.Composite.allBodies(game.engine.world).length).toBe(count)
    expect(street.props.some(p => p.kind === 'resident')).toBe(true)
    game.dispose()
  })

  it('spills are bounded, expire, and reset', () => {
    const game = new Game(3), street = new Neighbourhood()
    street.spill(game.active!, MAX_PROPS + 100, true); expect(street.props.length).toBe(MAX_PROPS)
    for (let i = 0; i < 800; i++) street.update(50, game.pieces, PLATFORM_WIDTH)
    expect(street.props.length).toBe(0)
    street.spill(game.active!, 3); street.reset()
    expect(street.props.length).toBe(0); expect(street.time).toBe(0)
    game.dispose()
  })

  it('a paused update freezes props and the clock', () => {
    const game = new Game(4), street = new Neighbourhood(); street.spill(game.active!, 3, true)
    const before = JSON.stringify({ props: street.props, time: street.time })
    for (let i = 0; i < 60; i++) street.update(0, game.pieces, PLATFORM_WIDTH)
    expect(JSON.stringify({ props: street.props, time: street.time })).toBe(before)
    game.dispose()
  })
})
