import { describe, expect, it } from 'vitest'
import { DRYING_GULPS_PER_S, PUDDLE_AT, dryGround, pour } from './ground'
import { DAMP_PER_GULP, HEIGHT, WIDTH, WetPaint } from './wetPaint'

describe('the picture of the wet sand', () => {
  it('starts dry and asks to be drawn once', () => {
    const paint = new WetPaint()
    expect(paint.data).toHaveLength(WIDTH * HEIGHT * 4)
    expect(paint.data.every((byte) => byte === 0)).toBe(true)
    expect(paint.dirty).toBe(true)
  })

  it('darkens the sand where a gulp lands, most in the middle and not at all far away', () => {
    const paint = new WetPaint()
    paint.dirty = false
    paint.splash(8, 5, 1)
    expect(paint.at(8, 5).damp).toBeGreaterThan(DAMP_PER_GULP * 0.9)
    expect(paint.at(8.4, 5).damp).toBeLessThan(paint.at(8, 5).damp)
    expect(paint.at(8.4, 5).damp).toBeGreaterThan(0)
    expect(paint.at(10, 5).damp).toBe(0)
    expect(paint.dirty).toBe(true)
  })

  it('reaches full dark with two gulps on one place and never overflows a byte', () => {
    const paint = new WetPaint()
    for (let gulp = 0; gulp < 9; gulp++) paint.splash(8, 5, 1)
    expect(paint.at(8, 5).damp).toBe(255)
  })

  it('leaves a line where a stream sweeps', () => {
    const paint = new WetPaint()
    for (let x = 4; x <= 12; x += 0.25) paint.splash(x, 5, 0.12, 0.35)
    for (let x = 4.5; x <= 11.5; x += 0.5) expect(paint.at(x, 5).damp).toBeGreaterThan(12)
    expect(paint.at(8, 6.5).damp).toBe(0)
  })

  it('dries a blot edge first, and the middle of one gulp in a quarter of a minute', () => {
    const paint = new WetPaint()
    paint.splash(8, 5, 1)
    for (let frame = 0; frame < 60 * 8; frame++) paint.dry(1 / 60)
    expect(paint.at(8.5, 5).damp).toBe(0)
    expect(paint.at(8, 5).damp).toBeGreaterThan(0)
    for (let frame = 0; frame < 60 * 8; frame++) paint.dry(1 / 60)
    expect(paint.at(8, 5).damp).toBe(0)
    expect(DAMP_PER_GULP / (DRYING_GULPS_PER_S * DAMP_PER_GULP)).toBe(15)
  })

  it('dries the same on a slow device as on a fast one', () => {
    const fast = new WetPaint(), slow = new WetPaint()
    fast.splash(8, 5, 1)
    slow.splash(8, 5, 1)
    for (let frame = 0; frame < 300; frame++) fast.dry(1 / 60)
    for (let frame = 0; frame < 50; frame++) slow.dry(1 / 10)
    expect(Math.abs(fast.at(8, 5).damp - slow.at(8, 5).damp)).toBeLessThanOrEqual(1)
  })

  it('keeps a puddle, mud and the dark sand under them for as long as the yard is on screen', () => {
    const paint = new WetPaint()
    paint.splash(4, 4, 2)
    paint.puddle(4, 4)
    paint.splash(11, 4, 2)
    paint.puddle(11, 4)
    paint.mud(11, 4)
    const before = { puddle: { ...paint.at(4, 4) }, mud: { ...paint.at(11, 4) } }
    expect(before.puddle.puddle).toBeGreaterThan(230)
    expect(before.mud.mud).toBeGreaterThan(230)
    for (let second = 0; second < 600; second++) paint.dry(1)
    expect(paint.at(4, 4)).toEqual(before.puddle)
    expect(paint.at(11, 4)).toEqual(before.mud)
    expect(paint.at(4, 4).damp).toBeGreaterThan(230)
  })

  it('does no work and asks for no drawing while everything is dry', () => {
    const paint = new WetPaint()
    paint.dirty = false
    paint.dry(5)
    expect(paint.dirty).toBe(false)
  })

  it('plays no time on a frame of no length', () => {
    const paint = new WetPaint()
    paint.splash(8, 5, 1)
    const before = paint.at(8, 5).damp
    paint.dry(0)
    paint.dry(-3)
    expect(paint.at(8, 5).damp).toBe(before)
  })

  it('answers for any point, also outside the yard', () => {
    const paint = new WetPaint()
    paint.splash(-3, 40, 1)
    paint.splash(0.1, 0.1, 1)
    expect(paint.at(-3, 40)).toEqual({ damp: 0, puddle: 0, mud: 0 })
    expect(paint.at(0.1, 0.1).damp).toBeGreaterThan(0)
  })
})

describe('the picture found on load', () => {
  it('is made from the saved grid: damp, puddle and mud each where the grid has them', () => {
    let ground = pour(dryGround(), 2.5, 2.5, 1)
    for (let gulp = 0; gulp < PUDDLE_AT; gulp++) ground = pour(ground, 7.5, 3.5, 1)
    for (let gulp = 0; gulp < 5; gulp++) ground = pour(ground, 12.5, 6.5, 1)
    const paint = new WetPaint()
    paint.splash(15, 9, 1)
    paint.fromGround(ground)
    expect(paint.at(2.5, 2.5).damp).toBeGreaterThan(100)
    expect(paint.at(2.5, 2.5).puddle).toBe(0)
    expect(paint.at(7.5, 3.5).puddle).toBeGreaterThan(230)
    expect(paint.at(7.5, 3.5).mud).toBe(0)
    expect(paint.at(12.5, 6.5).mud).toBeGreaterThan(230)
    // What was only in the old picture is gone: the grid is the truth.
    expect(paint.at(15, 9).damp).toBe(0)
  })

  it('is all dry for dry ground', () => {
    const paint = new WetPaint()
    paint.splash(8, 5, 1)
    paint.fromGround(dryGround())
    expect(paint.data.every((byte) => byte === 0)).toBe(true)
  })
})
