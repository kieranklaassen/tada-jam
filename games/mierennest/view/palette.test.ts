import { describe, expect, it } from 'vitest'
import * as P from './palette'

// The three materials the child builds with are told apart at a glance: far apart in lightness, each a hue of its
// own, and none of them the colour of the earth they lie in or of the dark of an open tunnel.

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
/** How light a colour is to the eye, from 0 to 1. */
const light = (hex: string) => {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** How much brighter one colour is than another, as contrast is counted: 1 is none, 21 is black on white. */
const contrast = (a: string, b: string) => (Math.max(light(a), light(b)) + 0.05) / (Math.min(light(a), light(b)) + 0.05)
/** How much colour a colour has, from 0 (grey) to 1, and which way it leans: warm when red is over blue. */
const colourful = (hex: string) => Math.max(...rgb(hex)) - Math.min(...rgb(hex))
const warm = (hex: string) => rgb(hex)[0] - rgb(hex)[2]

const EARTHS = [...P.EARTH.strata, P.EARTH.deep]

describe('the three materials', () => {
  it('are far apart in lightness: sand lightest, then stone, then mud', () => {
    expect(contrast(P.SAND.fill, P.STONE.fill)).toBeGreaterThan(1.6)
    expect(contrast(P.STONE.fill, P.MUD.fill)).toBeGreaterThan(4)
    expect(light(P.SAND.fill)).toBeGreaterThan(light(P.STONE.fill))
    expect(light(P.STONE.fill)).toBeGreaterThan(light(P.MUD.fill))
  })

  it('each lean their own way: sand warm and full, stone cool, mud near grey and dark', () => {
    expect(warm(P.SAND.fill)).toBeGreaterThan(0.3)
    expect(warm(P.STONE.fill)).toBeLessThan(0)
    expect(colourful(P.MUD.fill)).toBeLessThan(0.08)
    expect(colourful(P.SAND.fill)).toBeGreaterThan(colourful(P.STONE.fill) + 0.25)
  })

  it('are none of them the colour of the earth: sand and stone lighter than any of it, mud darker and far less brown', () => {
    for (const earth of EARTHS.slice(0, 3)) {
      expect(contrast(P.SAND.fill, earth)).toBeGreaterThan(1.9)
      expect(contrast(P.MUD.fill, earth)).toBeGreaterThan(1.9)
      expect(warm(earth) - warm(P.STONE.fill)).toBeGreaterThan(0.3)
    }
    for (const earth of EARTHS) expect(warm(earth) - warm(P.MUD.fill)).toBeGreaterThan(0.08)
  })

  it('stand out of the dark of an open tunnel: mud by its body a little and by its lip and its glint a lot', () => {
    for (const dark of [P.EARTH.open, P.EARTH.openLow]) {
      expect(contrast(P.SAND.fill, dark)).toBeGreaterThan(9)
      expect(contrast(P.STONE.fill, dark)).toBeGreaterThan(5)
      expect(contrast(P.MUD.fill, dark)).toBeGreaterThan(1.2)
      expect(contrast(P.MUD.lip, dark)).toBeGreaterThan(2.5)
      expect(contrast(P.MUD.shine, P.MUD.fill)).toBeGreaterThan(8)
    }
  })
})

describe('ours and theirs', () => {
  it('the kingdom is gold and light, the raiders red and darker', () => {
    expect(light(P.ANT.body)).toBeGreaterThan(light(P.RAIDER.body) * 1.8)
    expect(light(P.WORKER.body)).toBeGreaterThan(light(P.RAIDER.body) * 1.8)
    // Gold has green in it and the raiders' red has almost none.
    const green = (hex: string) => rgb(hex)[1] - rgb(hex)[2]
    expect(green(P.ANT.body)).toBeGreaterThan(green(P.RAIDER.body) + 0.25)
  })
})
