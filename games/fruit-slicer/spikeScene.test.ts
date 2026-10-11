import { describe, expect, it } from 'vitest'
import { fitOf, giveOf, shareLength } from './measure'
import { inRange, tinParts, wanted } from './orders'
import { SPIKE_SEED, spikeScene } from './spikeScene'
import { inTin, onLane, onShelf, tinTotal } from './world'

describe('the scene the look spike shows', () => {
  const scene = spikeScene()

  it('is the same every time it is built', () => {
    expect(spikeScene()).toEqual(scene)
    expect(spikeScene(SPIKE_SEED)).toEqual(scene)
  })

  it('has a customer at the window and two who wait, each with an order inside the limits', () => {
    for (const customer of [scene.window, ...scene.queue]) expect(inRange(customer)).toEqual([])
    expect(scene.window).toMatchObject({ who: 'pelican', fruit: 'long', shares: [{ num: 3, den: 4 }], written: true, lined: true })
    expect(scene.queue.map((customer) => customer.who)).toEqual(['twins', 'ants'])
    expect(new Set([scene.window, ...scene.queue].map((customer) => customer.fruit)).size).toBe(3)
  })

  it('shows a first cut that came out short by more than the give, with the tin open', () => {
    const [ordered] = tinParts(scene.window)
    expect(ordered).toBe(shareLength('long', wanted(scene.window)))
    expect(scene.world.tinOpen).toBe(true)
    expect(inTin(scene.world, 0)).toHaveLength(1)
    const fit = fitOf(tinTotal(scene.world, 0), ordered, giveOf('long'))
    expect(fit.kind).toBe('under')
    expect(fit.by).toBe(-150)
    expect(inTin(scene.world, 0)[0].blind).toBe(true)
  })

  it('leaves the rest of the fruit where it was cut, and leftovers on the far lane and the shelf', () => {
    const near = onLane(scene.world, 0)
    expect(near).toHaveLength(1)
    expect(near[0]).toMatchObject({ fruit: 'long', place: { on: 'board', lane: 0, x: scene.cutAt + giveOf('long') / 4 } })
    expect(onLane(scene.world, 1).map((piece) => piece.fruit)).toEqual(['middle'])
    expect(onShelf(scene.world)).toHaveLength(2)
  })
})
