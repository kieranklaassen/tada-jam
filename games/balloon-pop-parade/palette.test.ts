import { describe, expect, it } from 'vitest'
import { contrast, hue, KIND_COLOURS, luminance, PALETTE, rgb, shade } from './palette'

const kinds = Object.entries(KIND_COLOURS)
const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

describe('the palette', () => {
  it('gives every kind a hue well away from every other kind', () => {
    for (const [a, colourA] of kinds) for (const [b, colourB] of kinds) {
      if (a < b) expect(apart(hue(colourA), hue(colourB)), `${a} and ${b}`).toBeGreaterThan(45)
    }
  })

  it('keeps every balloon colour away from the hue of the sky', () => {
    for (const [kind, colour] of kinds) expect(apart(hue(colour), hue(PALETTE.skyTop)), kind).toBeGreaterThan(30)
  })

  it('tells the two colours a red-green colour-blind child could mix up apart by lightness', () => {
    expect(Math.abs(luminance(KIND_COLOURS.frog) - luminance(KIND_COLOURS.crab))).toBeGreaterThan(0.15)
  })

  it('makes every balloon darker than the sky it hangs in, top and horizon', () => {
    for (const [kind, colour] of kinds) {
      expect(luminance(colour), kind).toBeLessThan(luminance(PALETTE.skyTop))
      expect(luminance(colour), kind).toBeLessThan(luminance(PALETTE.skyLow))
    }
  })

  it('sets the three darker kinds off from the sky by lightness, and the duck by hue', () => {
    for (const kind of ['frog', 'hippo', 'crab'] as const) expect(contrast(KIND_COLOURS[kind], PALETTE.skyLow), kind).toBeGreaterThan(2)
    expect(apart(hue(KIND_COLOURS.duck), hue(PALETTE.skyTop))).toBeGreaterThan(120)
  })

  it('shades a colour without leaving its hue', () => {
    for (const [kind, colour] of kinds) {
      expect(apart(hue(shade(colour, -0.15)), hue(colour)), kind).toBeLessThan(4)
      expect(luminance(shade(colour, -0.15)), kind).toBeLessThan(luminance(colour))
      expect(luminance(shade(colour, 0.3)), kind).toBeGreaterThan(luminance(colour))
    }
    expect(rgb('#ff8000')).toEqual([1, 128 / 255, 0])
  })
})
