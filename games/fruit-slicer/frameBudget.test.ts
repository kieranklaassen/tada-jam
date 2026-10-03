import { describe, expect, it } from 'vitest'
import { freshGame, type Game } from './cycle'
import { newDog, poseOf, react } from './dogMotion'
import { newFx, spawn, step, type FxState } from './fx'
import { guideOf } from './guide'
import { CRATE, SHELF_BOX, BOARD, X0, PX } from './stage'
import { newStroke, poke, slice } from './moves'
import { paintFrame, paintPlate, type Frame } from './toyView'

// The frame budget, in the counted form: the painters run on a stand-in that counts every call made on the
// context, so the work of a frame is a number that does not depend on the machine the test runs on.

/** A stand-in for a canvas 2D context: every method does nothing and is counted, every property can be set. */
function counter() {
  const calls = new Map<string, number>()
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, name: string) => {
      if (name in target) return target[name]
      return (..._args: unknown[]) => void calls.set(name, (calls.get(name) ?? 0) + 1)
    },
    set: (target, name: string, value) => {
      target[name] = value
      return true
    },
  })
  const total = () => [...calls.values()].reduce((sum, count) => sum + count, 0)
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, total }
}
const dots = { of: () => '#000' }

/** A counter after a child has been at it: the fruit cut small on both lanes, the shelf full, and a stroke through all of it in progress. */
function busy(): { game: Game; fx: FxState } {
  let game = freshGame(null)
  let fx = newFx(1)
  const crate = { x: CRATE.x + 70, y: CRATE.y + 70 }
  for (let round = 0; round < 6; round++) {
    game = poke(game, crate).game
    for (let i = 1; i < 24; i++) {
      const x = X0 + i * 100 * PX
      const result = slice(game, { x, y: BOARD.y - 20 }, { x: x + 10, y: SHELF_BOX.y + SHELF_BOX.h + 10 }, newStroke())
      game = result.game
      if (round === 5) for (const event of result.events) fx = spawn(fx, event)
    }
  }
  return { game, fx: step(fx, 1 / 60) }
}

describe('the work of a frame', () => {
  const dog = poseOf(react(newDog(1), 'cheeks', 1))

  it('at rest is small: the plate is stamped and only what can move is drawn', () => {
    const game = freshGame(null)
    const c = counter()
    const frame: Frame = { world: game.world, fx: newFx(1), dog: poseOf(newDog(1)), time: 1, blade: null, glow: 0, guide: null, hand: null }
    const figures = paintFrame(c.ctx, dots, frame)
    // Measured when the toy was built: 35 figures and 213 calls.
    expect(figures).toBeLessThan(45)
    expect(c.total()).toBeLessThan(300)
    expect(c.calls.get('drawImage') ?? 0).toBe(0)
  })

  it('in the heaviest moment stays inside the budget: both lanes and the shelf full of pieces, every effect of a long stroke alive, the blade down, the glow and the hand showing', () => {
    const { game, fx } = busy()
    expect(game.world.pieces.length).toBeGreaterThanOrEqual(36)
    expect(fx.fx.length).toBeGreaterThan(40)
    const c = counter()
    const guide = guideOf(game.world)
    const frame: Frame = { world: game.world, fx, dog, time: 3, blade: { x: 400, y: 300 }, glow: 1, guide, hand: { travel: 0.5, press: 1, opacity: 1 } }
    const figures = paintFrame(c.ctx, dots, frame)
    // Measured when the toy was built: 178 figures and 1494 calls, with 46 pieces and 90 effects alive.
    expect(figures).toBeLessThan(220)
    expect(c.total()).toBeLessThan(2000)
    // Nothing a frame draws is a full-surface composite: the one stamp of the plate is the canvas's, not the painter's.
    expect(c.calls.get('drawImage') ?? 0).toBe(0)
    expect(c.calls.get('getImageData') ?? 0).toBe(0)
  })

  it('never leaves a save unrestored or a clip open, so one figure cannot leak into the next', () => {
    const { game, fx } = busy()
    const c = counter()
    paintFrame(c.ctx, dots, { world: game.world, fx, dog, time: 3, blade: { x: 400, y: 300 }, glow: 1, guide: guideOf(game.world), hand: { travel: 0.5, press: 1, opacity: 1 } })
    paintPlate(c.ctx, dots)
    expect(c.calls.get('save')).toBe(c.calls.get('restore'))
  })

  it('paints the plate with a handful of figures, once for a size of surface', () => {
    const c = counter()
    expect(paintPlate(c.ctx, dots)).toBeLessThan(20)
    expect(c.total()).toBeLessThan(120)
  })
})
