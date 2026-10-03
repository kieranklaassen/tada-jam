import { describe, expect, it } from 'vitest'
import { freshGame, type Game } from './cycle'
import { GameRun } from './gameRun'
import { paintFrame, paintPlate } from './gameView'
import { tinParts, type Customer } from './orders'
import { BOARD, CRATE, PX, QUEUE, SHELF_BOX, TIN, X0, type Point } from './stage'

// The frame budget, in the counted form: the painters run on a stand-in that counts every call made on the
// context, so the work of a frame is a number that does not depend on the machine the test runs on.

/** A stand-in for a canvas 2D context: every method does nothing and is counted, every property can be set. */
function counter() {
  const calls = new Map<string, number>()
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, name: string) => {
      if (name in target) return target[name]
      if (name === 'measureText') return (text: string) => ({ width: text.length * 8 })
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
const IDLE = { glow: 1, demo: 0.5, demoIndex: 0 }
const BUSY = { glow: 0, demo: null, demoIndex: -1 }
const mid = (index: 0 | 1): Point => ({ x: QUEUE[index].x + 100, y: QUEUE[index].y + 80 })

/** A game as heavy to draw as the rules allow: the busiest customers, an open tin, both lanes cut small, the shelf full, and a long stroke through all of it in progress. */
function heaviest(): GameRun {
  const ants: Customer = { who: 'ants', fruit: 'long', shares: [{ num: 12, den: 12 }], carries: null, written: true, lined: true }
  const cat: Customer = { who: 'cat', fruit: 'middle', shares: [{ num: 11, den: 12 }, { num: 5, den: 6 }], carries: null, written: true, lined: true }
  const game: Game = { ...freshGame(null), queue: [ants, cat] }
  const run = new GameRun(game, 3)
  run.tap(mid(0))
  // Fresh fruit, cut small on both lanes, with one piece laid in the tin to open it.
  for (let round = 0; round < 4; round++) {
    run.tap({ x: CRATE.x + 70, y: CRATE.y + 70 })
    for (let i = 1; i < 24; i++) {
      const x = X0 + i * 100 * PX
      run.press({ x, y: BOARD.y - 20 })
      run.move({ x: x + 6, y: SHELF_BOX.y + SHELF_BOX.h + 10 })
      run.lift()
    }
    if (round === 0) {
      run.press({ x: X0 + 12, y: BOARD.y + BOARD.h - 40 })
      run.move({ x: X0 + 30, y: TIN.bodyY + 20 })
      run.move({ x: X0 + 40, y: TIN.bodyY + 24 })
      run.lift()
    }
  }
  for (let i = 0; i < 400; i++) run.step(1 / 60)
  // A last long stroke, caught in the frame after it, with every effect alive.
  for (let i = 1; i < 24; i++) {
    const x = X0 + i * 100 * PX + 40
    run.press({ x, y: BOARD.y - 20 })
    run.move({ x: x + 6, y: SHELF_BOX.y + SHELF_BOX.h + 10 })
  }
  run.step(1 / 60)
  return run
}

describe('the work of a frame', () => {
  it('at rest is small: the plate is stamped and only what can move is drawn', () => {
    const run = new GameRun(freshGame(null), 1)
    const c = counter()
    const figures = paintFrame(c.ctx, dots, run.frame(1, BUSY))
    // Measured when the game was built: 81 figures and 457 calls.
    expect(figures).toBeLessThan(110)
    expect(c.total()).toBeLessThan(600)
    expect(c.calls.get('drawImage') ?? 0).toBe(0)
  })

  it('in the heaviest moment stays inside the budget', () => {
    const run = heaviest()
    expect(run.game.window).toMatchObject({ who: 'ants' })
    expect(tinParts(run.game.window!)).toHaveLength(1)
    expect(run.game.world.tinOpen).toBe(true)
    expect(run.game.world.pieces.length).toBeGreaterThanOrEqual(28)
    expect(run.fx.fx.length).toBeGreaterThan(40)
    const c = counter()
    const figures = paintFrame(c.ctx, dots, run.frame(3, IDLE))
    // Measured when the game was built: 301 figures and 2763 calls, with twelve ants at the window, a cat and its
    // two tickets waiting, 32 pieces and 90 effects alive, the open tin ruled into twelfths, the glow and the hand.
    expect(figures).toBeLessThan(380)
    expect(c.total()).toBeLessThan(3600)
    // Nothing a frame draws is a full-surface composite: the one stamp of the plate is the canvas's, not the painter's.
    expect(c.calls.get('drawImage') ?? 0).toBe(0)
    expect(c.calls.get('getImageData') ?? 0).toBe(0)
  })

  it('never leaves a save unrestored, so one figure cannot leak into the next', () => {
    const run = heaviest()
    const c = counter()
    paintFrame(c.ctx, dots, run.frame(3, IDLE))
    paintPlate(c.ctx, dots)
    expect(c.calls.get('save')).toBe(c.calls.get('restore'))
  })

  it('paints the plate with a handful of figures, once for a size of surface', () => {
    const c = counter()
    expect(paintPlate(c.ctx, dots)).toBeLessThan(30)
    expect(c.total()).toBeLessThan(160)
  })
})
