// template: cartridge/stage.test.ts v3
import { describe, expect, it } from 'vitest'
import { STAGE, fit, toStage } from './stage'

describe('the stage fitted into a surface', () => {
  it('is drawn one to one on a surface of its own size', () => {
    expect(fit(STAGE.width, STAGE.height)).toEqual({ scale: 1, x: 0, y: 0 })
  })

  it('keeps its shape and sits in the middle of a surface of another shape', () => {
    // Twice as wide as the stage needs: the height decides, and the spare width is shared between the sides.
    expect(fit(STAGE.width * 2, STAGE.height)).toEqual({ scale: 1, x: STAGE.width / 2, y: 0 })
    // Half the size and taller than it needs: the width decides.
    const tall = fit(STAGE.width / 2, STAGE.height)
    expect(tall.scale).toBe(0.5)
    expect(tall.x).toBe(0)
    expect(tall.y).toBe(STAGE.height / 4)
  })

  it('brings a touch back to the stage, whatever the surface', () => {
    for (const [width, height] of [[1180, 820], [2360, 1640], [590, 820], [1024, 400], [333, 777]]) {
      const by = fit(width, height)
      // The middle of the surface is the middle of the stage, and the stage's corners are where the fit put them.
      const middle = toStage({ x: width / 2, y: height / 2 }, by)
      expect(middle.x).toBeCloseTo(STAGE.width / 2)
      expect(middle.y).toBeCloseTo(STAGE.height / 2)
      const far = toStage({ x: by.x + STAGE.width * by.scale, y: by.y + STAGE.height * by.scale }, by)
      expect(far.x).toBeCloseTo(STAGE.width)
      expect(far.y).toBeCloseTo(STAGE.height)
      expect(toStage({ x: by.x, y: by.y }, by)).toEqual({ x: 0, y: 0 })
    }
  })

  it('brings a touch back to the thing drawn under it at a pixel ratio of 2, with the one fit made in CSS pixels', () => {
    const dpr = 2, width = 590, height = 500
    const by = fit(width, height)
    const thing = { x: 300, y: 700 }
    // Where the draw's transform, the pixel ratio times the fit, puts the thing in the backing store.
    const drawnAt = { x: dpr * by.scale * thing.x + dpr * by.x, y: dpr * by.scale * thing.y + dpr * by.y }
    // The finger lands on it, and the touch arrives in CSS pixels: the backing store's pixel over the ratio.
    const touch = toStage({ x: drawnAt.x / dpr, y: drawnAt.y / dpr }, by)
    expect(touch.x).toBeCloseTo(thing.x)
    expect(touch.y).toBeCloseTo(thing.y)
    // A fit made from the backing store's size would put the same touch somewhere else on the stage.
    const wrong = toStage({ x: drawnAt.x / dpr, y: drawnAt.y / dpr }, fit(width * dpr, height * dpr))
    expect(wrong.x).toBeCloseTo(thing.x / dpr)
  })

  it('puts a touch beside the stage outside its bounds, so nothing on the stage answers it', () => {
    const by = fit(STAGE.width * 2, STAGE.height)
    expect(toStage({ x: 10, y: 10 }, by).x).toBeLessThan(0)
    expect(toStage({ x: STAGE.width * 2 - 10, y: 10 }, by).x).toBeGreaterThan(STAGE.width)
  })

  it('has no scale on a surface that has not been measured or is parked', () => {
    for (const [width, height] of [[0, 0], [0, 820], [1180, 0], [-1, 820], [NaN, NaN]]) expect(fit(width, height)).toEqual({ scale: 0, x: 0, y: 0 })
  })
})
