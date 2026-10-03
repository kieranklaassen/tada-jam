import { describe, expect, it } from 'vitest'
import { GROWN, HUES, WIDE } from './figures'
import { PAPER, blink, kindsRow, wantsKinds } from './spikeScene'
import { STAGE } from './stage'
import { toHsl } from './tissue'
import { KINDS } from './voices'

describe('the address', () => {
  it('asks for the six kinds side by side with kinds=1, and for the scene otherwise', () => {
    expect(wantsKinds('?kinds=1')).toBe(true)
    expect(wantsKinds('?chrome=0&kinds=1')).toBe(true)
    expect(wantsKinds('')).toBe(false)
    expect(wantsKinds('?kinds=0')).toBe(false)
    expect(wantsKinds('?fps=1')).toBe(false)
  })
})

describe('the six kinds side by side', () => {
  it('are all there, in the order of the grid, on the page, with the same clear page between each two', () => {
    const row = kindsRow()
    expect(row.map((one) => one.kind)).toEqual([...KINDS])
    const edges = row.map(({ kind, x, size }) => [x - (size * WIDE[kind]) / 2, x + (size * WIDE[kind]) / 2])
    const between = edges[0][0]
    expect(between).toBeGreaterThan(12)
    for (let i = 1; i < edges.length; i++) expect(edges[i][0] - edges[i - 1][1]).toBeCloseTo(between)
    expect(STAGE.width - edges[edges.length - 1][1]).toBeCloseTo(between)
  })

  it('keep their sizes to one another', () => {
    for (const { kind, size } of kindsRow(0.8)) expect(size).toBeCloseTo(GROWN[kind] * 0.8)
  })
})

describe('a blink', () => {
  it('leaves the eyes open on the first frame, so the page is drawn still before anything moves', () => {
    for (const [every, start] of [[5, 0.4], [4.6, 1.2], [3.9, 2.5], [5.3, 3.1], [3.3, 0.9], [4.2, 2], [7.5, 5]]) expect(blink(0, every, start)).toBe(0)
  })

  it('shuts the eyes once every so often, briefly, and opens them again', () => {
    const every = 4, samples = Array.from({ length: 4000 }, (_, i) => blink((i / 4000) * every * 3, every, 1))
    expect(Math.min(...samples)).toBe(0)
    expect(Math.max(...samples)).toBeGreaterThan(0.99)
    expect(Math.max(...samples)).toBeLessThanOrEqual(1)
    // Shut, or part shut, for well under a tenth of the time.
    expect(samples.filter((value) => value > 0).length / samples.length).toBeLessThan(0.06)
    expect(blink(1.3, every, 1)).toBeCloseTo(blink(1.3 + every, every, 1))
  })
})

describe('the paper that is not a creature', () => {
  const hue = (hex: string) => toHsl(hex)[0], light = (hex: string) => toHsl(hex)[2]

  it('gives the hill a hue no creature has', () => {
    for (const kind of KINDS) {
      const turn = Math.abs(hue(PAPER.hill) - hue(HUES[kind]))
      expect(Math.min(turn, 360 - turn), kind).toBeGreaterThanOrEqual(45)
    }
  })

  it('makes the ground the dark piece: darker than every creature, and far darker than the eggs on it', () => {
    for (const kind of KINDS) expect(light(HUES[kind]) - light(PAPER.ground), kind).toBeGreaterThan(0.15)
    expect(light(PAPER.egg) - light(PAPER.ground)).toBeGreaterThan(0.55)
    expect(toHsl(PAPER.ground)[1]).toBeLessThan(0.35)
  })

  it('keeps the eggs pale: lighter than every creature and less of a colour', () => {
    for (const kind of KINDS) {
      expect(light(PAPER.egg), kind).toBeGreaterThan(light(HUES[kind]) + 0.2)
    }
    expect(light(PAPER.egg)).toBeGreaterThan(0.85)
  })
})
