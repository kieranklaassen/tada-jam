import { describe, expect, it } from 'vitest'
import { GARDEN, SAND, SEAM_DARKEN, THINGS_PAINT, TRUCK_PAINT, WATER, contrast, darker, hueGap, hueOf, lightnessOf, rgbOf } from './look'

describe('the colours of the look', () => {
  it('keeps the sand pale and plain, so working things stand out on it', () => {
    expect(lightnessOf(SAND.dry)).toBeGreaterThan(0.65)
    // The speckle is a grain, not a pattern.
    expect(contrast(SAND.dry, SAND.speck)).toBeLessThan(1.35)
  })

  it('turns wet sand clearly darker than dry, and mud darker again', () => {
    expect(contrast(SAND.dry, SAND.damp)).toBeGreaterThan(2)
    expect(lightnessOf(SAND.mud)).toBeLessThan(lightnessOf(SAND.damp))
  })

  it('sets the truck and every thing apart from the sand they stand on', () => {
    const onSand = [TRUCK_PAINT.red, THINGS_PAINT.poolWall, THINGS_PAINT.flameOuter, THINGS_PAINT.cat, THINGS_PAINT.pot, THINGS_PAINT.boat, THINGS_PAINT.log, THINGS_PAINT.shoot]
    for (const paint of onSand) expect(contrast(SAND.dry, paint)).toBeGreaterThan(1.6)
    // The duck and the wheel are light yellows: they stand apart from the sand by hue and from what they sit on by lightness.
    expect(contrast(THINGS_PAINT.duck, THINGS_PAINT.poolWall)).toBeGreaterThan(1.8)
  })

  it('gives the main things hues of their own', () => {
    const hues = { truck: TRUCK_PAINT.red, pool: THINGS_PAINT.poolWall, cat: THINGS_PAINT.cat, shoot: THINGS_PAINT.shoot, boat: THINGS_PAINT.boat, duck: THINGS_PAINT.duck }
    const names = Object.keys(hues) as (keyof typeof hues)[]
    for (let a = 0; a < names.length; a++) {
      for (let b = a + 1; b < names.length; b++) expect(hueGap(hues[names[a]], hues[names[b]]), `${names[a]} and ${names[b]}`).toBeGreaterThan(24)
    }
  })

  it('shows water as light blue against both dry and wet sand', () => {
    expect(hueOf(WATER.body)).toBeGreaterThan(180)
    expect(hueOf(WATER.body)).toBeLessThan(220)
    expect(contrast(WATER.body, SAND.damp)).toBeGreaterThan(1.5)
    expect(lightnessOf(WATER.light)).toBeGreaterThan(0.85)
  })

  it('keeps the grass apart from the sand by hue', () => {
    expect(hueGap(GARDEN.grass, SAND.dry)).toBeGreaterThan(40)
  })

  it('is sun-faded: no colour of a toy is at full strength', () => {
    for (const paint of [TRUCK_PAINT.red, TRUCK_PAINT.yellow, THINGS_PAINT.poolWall, THINGS_PAINT.cat, THINGS_PAINT.boat, GARDEN.gate]) {
      const [r, g, b] = rgbOf(paint)
      expect(Math.min(r, g, b)).toBeGreaterThan(0.15)
    }
  })
})

describe('the colour helpers', () => {
  it('reads a colour as three shares', () => {
    expect(rgbOf(0xff8000)).toEqual([1, 128 / 255, 0])
  })

  it('darkens a colour for its seam and keeps its hue', () => {
    const seam = darker(TRUCK_PAINT.red)
    expect(lightnessOf(seam)).toBeLessThan(lightnessOf(TRUCK_PAINT.red))
    expect(hueGap(seam, TRUCK_PAINT.red)).toBeLessThan(3)
    expect(SEAM_DARKEN).toBeLessThan(1)
  })

  it('measures contrast from 1 to 21', () => {
    expect(contrast(0xffffff, 0xffffff)).toBeCloseTo(1)
    expect(contrast(0xffffff, 0x000000)).toBeCloseTo(21)
  })

  it('calls a grey a grey', () => {
    expect(hueOf(0x808080)).toBe(-1)
  })
})
