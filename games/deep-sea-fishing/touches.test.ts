import { describe, expect, it } from 'vitest'
import { make, run } from './kit'
import { CORNER, inCorner } from './overlay'
import { fit, toStage } from './stage'
import { Working, answer } from './touches'

// The grown-up's corner answers no touch (ART.md, "The toy"): not a press in
// it, and not a finger that draws the line into it.

describe('the grown-up corner', () => {
  const width = 1180, height = 820, by = fit(width, height)
  const stage = (at: { x: number; y: number }) => toStage(at, by), corner = (at: { x: number; y: number }) => inCorner(at.x, at.y, width)
  const inside = { x: width - CORNER / 2, y: CORNER / 2 }

  it('does not hand on a press in it: nothing moves, nothing sounds, nothing is saved', () => {
    const game = make()
    answer(game, { type: 'press', at: inside }, stage, corner)
    expect(game.held).toBe(false)
    expect(game.cues).toEqual([])
    expect(run(game, 1)).toEqual([])
    expect(game.dirty).toBe(0)
    // A drag that began there is not the game's either.
    answer(game, { type: 'dragStart', from: inside }, stage, corner)
    answer(game, { type: 'dragMove', from: inside, at: { x: 600, y: 500 } }, stage, corner)
    answer(game, { type: 'dragEnd', from: inside, at: { x: 600, y: 500 } }, stage, corner)
    expect(run(game, 1)).toEqual([])
    expect(game.dirty).toBe(0)
  })

  it('stops a finger that draws the line into it at its edge: the hook stays where it was last told, and goes on when the finger comes out', () => {
    const game = make()
    const from = { x: 700, y: 300 }
    answer(game, { type: 'press', at: from }, stage, corner)
    answer(game, { type: 'dragMove', from, at: { x: 640, y: 200 } }, stage, corner)
    run(game, 1)
    const stood = { x: game.hook.x, y: game.hook.y }
    for (const at of [{ x: width - 60, y: 60 }, inside, { x: width - 1, y: 1 }]) {
      answer(game, { type: 'dragMove', from, at }, stage, corner)
      run(game, 0.5)
      expect(game.hook.x).toBeCloseTo(stood.x, 0)
      expect(game.hook.y).toBeCloseTo(stood.y, 0)
    }
    answer(game, { type: 'dragMove', from, at: { x: 800, y: 400 } }, stage, corner)
    run(game, 1)
    expect(game.hook.x).toBeGreaterThan(780)
    answer(game, { type: 'dragEnd', from, at: inside }, stage, corner)
    expect(game.rest).toEqual({ x: 800, y: 400 })
  })

  it('does not count a finger in it as the child at work: the idle ladder is left as it stands until the finger comes out', () => {
    const working = new Working()
    expect(working.counts(false)).toBe(false)
    working.at({ x: 600, y: 400 }, corner)
    expect(working.counts(true)).toBe(true)
    // Landed in the corner, held there, tapped there: not the child.
    working.at(inside, corner)
    expect(working.counts(true)).toBe(false)
    // Drawn out of it, the finger is at work again; drawn into it, it is not.
    working.at({ x: width - CORNER - 4, y: CORNER + 4 }, corner)
    expect(working.counts(true)).toBe(true)
    working.at({ x: width - 2, y: 2 }, corner)
    expect(working.counts(true)).toBe(false)
    working.lifted()
    expect(working.counts(true)).toBe(true)
    expect(working.counts(false)).toBe(false)
  })
})
