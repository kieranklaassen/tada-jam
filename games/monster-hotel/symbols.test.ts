// template: cartridge/symbols.test.ts v2
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FRACTION, drawDecimal, drawFraction, drawMixed, drawSign, drawWhole, fractionBox, fractionLayout, isFraction, type Sign, type SymbolSurface } from './symbols'

// A surface that keeps what was drawn on it. Every digit is 0.6 of the size wide, as in a tabular face.
type Drawn = { kind: 'fill' | 'stroke'; text: string; x: number; y: number; size: number }
function recorder() {
  const texts: Drawn[] = []
  const rects: { kind: 'fill' | 'stroke'; x: number; y: number; width: number; height: number }[] = []
  const surface = {
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    size(): number {
      return Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 0)
    },
    fillText(text: string, x: number, y: number) {
      texts.push({ kind: 'fill', text, x, y, size: this.size() })
    },
    strokeText(text: string, x: number, y: number) {
      texts.push({ kind: 'stroke', text, x, y, size: this.size() })
    },
    measureText(text: string) {
      return { width: text.length * 0.6 * this.size() } as TextMetrics
    },
    fillRect(x: number, y: number, width: number, height: number) {
      rects.push({ kind: 'fill', x, y, width, height })
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      rects.push({ kind: 'stroke', x, y, width, height })
    },
  }
  return { surface: surface as unknown as SymbolSurface, texts, rects, filled: () => texts.filter((t) => t.kind === 'fill') }
}

const INK = { fill: '#111' }
const EDGED = { fill: '#fff', edge: '#111' }
/** Digits, the signs the jam lists, the decimal marks and a hyphen for a number below zero: nothing else may ever be drawn. */
const ALLOWED = /^[0-9+−×÷=<>%.,-]+$/

describe('a whole number', () => {
  it('is drawn as its own digits, centred where it was asked', () => {
    const r = recorder()
    const box = drawWhole(r.surface, 12, 100, 50, 40, INK)
    expect(r.filled()).toEqual([{ kind: 'fill', text: '12', x: 100, y: 50, size: 40 }])
    expect(box).toEqual({ x: 100 - 24, y: 30, width: 48, height: 40 })
  })

  it('is rounded, and one that is not a number draws nothing', () => {
    const r = recorder()
    drawWhole(r.surface, 2.6, 0, 0, 10, INK)
    expect(r.filled()[0].text).toBe('3')
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 1e300]) expect(drawWhole(r.surface, bad, 0, 0, 10, INK).width).toBe(0)
    expect(r.texts).toHaveLength(1)
  })

  it('has its outline drawn under its fill when the ink has one', () => {
    const r = recorder()
    drawWhole(r.surface, 7, 0, 0, 20, EDGED)
    expect(r.texts.map((t) => t.kind)).toEqual(['stroke', 'fill'])
  })
})

describe('a fraction', () => {
  it('stacks the upper number, a horizontal bar and the lower number, centred on the bar', () => {
    const r = recorder()
    const box = drawFraction(r.surface, { num: 3, den: 4 }, 200, 100, 50, INK)
    const [num, den] = r.filled()
    expect([num.text, den.text]).toEqual(['3', '4'])
    expect(num.x).toBe(200)
    expect(den.x).toBe(200)
    const bar = r.rects.find((rect) => rect.kind === 'fill')!
    expect(bar.y + bar.height / 2).toBeCloseTo(100)
    expect(bar.x + bar.width / 2).toBeCloseTo(200)
    expect(bar.width).toBeGreaterThan(bar.height * 4)
    // The numbers clear the bar and sit the same distance from it.
    const digit = 50 * FRACTION.scale
    expect(num.y + digit / 2).toBeLessThan(bar.y)
    expect(den.y - digit / 2).toBeGreaterThan(bar.y + bar.height)
    expect(100 - num.y).toBeCloseTo(den.y - 100)
    expect(box.y).toBeCloseTo(num.y - digit / 2)
    expect(box.width).toBeCloseTo(bar.width)
  })

  it('has a bar wider than the wider of its two numbers', () => {
    const r = recorder()
    drawFraction(r.surface, { num: 5, den: 12 }, 0, 0, 40, INK)
    const bar = r.rects.find((rect) => rect.kind === 'fill')!
    expect(bar.width).toBeGreaterThan(2 * 0.6 * 40 * FRACTION.scale)
    expect(fractionLayout(10, 30, 0, 0, 40).bar.width).toBe(fractionLayout(30, 10, 0, 0, 40).bar.width)
  })

  it('is drawn as it is given and never reduced', () => {
    const r = recorder()
    drawFraction(r.surface, { num: 2, den: 4 }, 0, 0, 40, INK)
    expect(r.filled().map((t) => t.text)).toEqual(['2', '4'])
  })

  it('draws nothing when the lower number is zero or either is not a number', () => {
    const r = recorder()
    for (const bad of [{ num: 1, den: 0 }, { num: Number.NaN, den: 2 }, { num: 1, den: Number.POSITIVE_INFINITY }]) {
      expect(isFraction(bad)).toBe(false)
      expect(drawFraction(r.surface, bad, 0, 0, 40, INK).width).toBe(0)
    }
    expect(r.texts).toHaveLength(0)
    expect(r.rects).toHaveLength(0)
  })

  it('reports the box it will take without drawing', () => {
    const r = recorder()
    const box = fractionBox(r.surface, { num: 1, den: 8 }, 10, 20, 30)
    expect(r.texts).toHaveLength(0)
    expect(box).toEqual(drawFraction(r.surface, { num: 1, den: 8 }, 10, 20, 30, INK))
  })

  it('lays a mixed number out as a whole number then a fraction, with no overlap', () => {
    const r = recorder()
    const box = drawMixed(r.surface, 1, { num: 1, den: 4 }, 300, 100, 50, INK)
    const [whole, num, den] = r.filled()
    expect([whole.text, num.text, den.text]).toEqual(['1', '1', '4'])
    const bar = r.rects.find((rect) => rect.kind === 'fill')!
    expect(whole.x + 0.3 * 50).toBeLessThan(bar.x)
    expect(box.x + box.width / 2).toBeCloseTo(300)
  })
})

describe('a sign', () => {
  const SIGNS: Record<Sign, string> = { plus: '+', minus: '−', times: '×', divide: '÷', equals: '=', less: '<', greater: '>', percent: '%' }

  it('is one literal with no letter, chosen by name', () => {
    for (const [sign, glyph] of Object.entries(SIGNS) as [Sign, string][]) {
      const r = recorder()
      drawSign(r.surface, sign, 5, 6, 30, EDGED)
      expect(r.texts.map((t) => t.text)).toEqual([glyph, glyph])
      expect(r.texts[1]).toMatchObject({ kind: 'fill', x: 5, y: 6 })
    }
  })
})

describe('a decimal number', () => {
  it('keeps its places, zeros included, with a point or a comma', () => {
    const r = recorder()
    drawDecimal(r.surface, 3.05, 2, 'point', 0, 0, 20, INK)
    expect(r.filled().map((t) => t.text).join('')).toBe('3.05')
    const c = recorder()
    drawDecimal(c.surface, 0.5, 1, 'comma', 0, 0, 20, INK)
    expect(c.filled().map((t) => t.text).join('')).toBe('0,5')
  })

  it('runs left to right without overlap and is centred', () => {
    const r = recorder()
    const box = drawDecimal(r.surface, 12.75, 2, 'point', 100, 0, 20, INK)
    const xs = r.filled().map((t) => t.x)
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
    expect(box.x + box.width / 2).toBeCloseTo(100)
  })

  it('with no places is a whole number and no mark', () => {
    const r = recorder()
    drawDecimal(r.surface, 6.4, 0, 'comma', 0, 0, 20, INK)
    expect(r.filled().map((t) => t.text)).toEqual(['6'])
  })
})

describe('the module as a whole', () => {
  it('never draws a letter, whatever numbers it is given', () => {
    const r = recorder()
    const numbers = [0, 1, 7, 12, 100, -3, 2.5, 1e6, Number.NaN, Number.POSITIVE_INFINITY]
    for (const a of numbers) {
      drawWhole(r.surface, a, 0, 0, 10, EDGED)
      drawDecimal(r.surface, a, 3, 'comma', 0, 0, 10, EDGED)
      for (const b of numbers) {
        drawFraction(r.surface, { num: a, den: b }, 0, 0, 10, EDGED)
        drawMixed(r.surface, a, { num: b, den: a }, 0, 0, 10, EDGED)
      }
    }
    expect(r.texts.length).toBeGreaterThan(100)
    for (const drawn of r.texts) expect(drawn.text).toMatch(ALLOWED)
  })

  const source = readFileSync(fileURLToPath(new URL('./symbols.ts', import.meta.url)), 'utf8')

  it('carries the numeral comment on every text call', () => {
    const lines = source.split('\n')
    const calls = lines.map((line, i) => ({ line, i })).filter(({ line }) => /\b(?:fillText|strokeText)\(/.test(line))
    expect(calls.length).toBeGreaterThan(0)
    for (const { line, i } of calls) expect(`${lines[i - 1]}\n${line}`).toMatch(/wordless-ok: numeral \S/)
  })

  it('imports nothing and takes no string to draw', () => {
    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/\b(?:text|label|caption|word)\s*:\s*string\b/)
  })
})
