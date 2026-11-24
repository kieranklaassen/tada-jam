import { describe, expect, it } from 'vitest'
import { CAST, PARTY, ROUND, WHO, lengthOf, needs } from './cast'
import { KINDS, LENGTH, MOST, SNAP, STRIP_LENGTH, endOf, fitOf, scootTo, settle, slide, type Kind, type Piece } from './row'

const row = (...p: [Kind, number][]): Piece[] => p.map(([k, x]) => ({ k, x }))

describe('the row', () => {
  it('pushes the train ahead, keeps its order and never leaves the strip', () => {
    const r = row(['sausage', 0], ['duck', 144], ['shoe', 300])
    slide(r, 0, 100)
    expect(r.map((p) => p.x)).toEqual([100, 244, 316])
    slide(r, 0, 5000)
    expect(endOf(r[2])).toBe(STRIP_LENGTH)
    expect(r[1].x).toBe(endOf(r[0]))
    slide(r, 2, -5000)
    expect(r.map((p) => p.x)).toEqual([0, 144, 216])
  })
  it('keeps every invariant under a thousand random shoves', () => {
    let s = 7
    const rand = (): number => (s = (s * 16807) % 2147483647) / 2147483647
    for (let n = 0; n < 200; n++) {
      const r: Piece[] = []
      for (let i = 0; i < 6; i++) { const k = KINDS[Math.floor(rand() * 3)]; r.push({ k, x: Math.round(rand() * (STRIP_LENGTH - LENGTH[k])) }) }
      for (let i = 0; i < 8; i++) {
        slide(r, Math.floor(rand() * 6), rand() * 1200 - 150)
        for (const p of r) { expect(p.x).toBeGreaterThanOrEqual(-0.01); expect(endOf(p)).toBeLessThanOrEqual(STRIP_LENGTH + 0.01) }
      }
    }
  })
  it('closes up what is nearly touching and leaves a wider gap', () => {
    const r = row(['sausage', 0])
    expect(settle(r, 'duck', 144 + SNAP)).toEqual({ x: 144, kissed: true })
    expect(settle(r, 'duck', 144 + SNAP + 1)).toEqual({ x: 144 + SNAP + 1, kissed: false })
    expect(settle([], 'duck', 9).x).toBe(0)
  })
  it('scoots up to the next thing, or off what it lies on', () => {
    expect(scootTo(row(['duck', 0], ['duck', 120]), 1)).toBe(72)
    expect(scootTo(row(['duck', 0]), 0)).toBeNull()
    expect(scootTo(row(['sausage', 0], ['duck', 30]), 1)).toBe(144)
    expect(scootTo(row(['sausage', 756], ['duck', 760]), 1)).toBeNull()
  })
  it('finds each fault where it is, alone', () => {
    const just = fitOf(row(['sausage', 0], ['sausage', 144]), 288)
    expect(just.close).toBe(true)
    expect(fitOf(row(['sausage', 40], ['sausage', 184]), 328).holes).toEqual([{ from: 0, to: 40 }])
    expect(fitOf(row(['sausage', 0], ['sausage', 180]), 324).holes).toEqual([{ from: 144, to: 180 }])
    expect(fitOf(row(['sausage', 0], ['sausage', 100]), 244).bulges).toEqual([{ from: 100, to: 144 }])
    expect(fitOf(row(['sausage', 0]), 288)).toMatchObject({ short: true, long: false, faults: 1 })
    expect(fitOf(row(['sausage', 0], ['sausage', 144]), 200)).toMatchObject({ short: false, long: true, faults: 1 })
    expect(fitOf([], 288)).toMatchObject({ short: true, close: false })
  })
})

const exact = (length: number, kinds: readonly Kind[]): boolean => {
  const can = new Set([0])
  for (let n = 1; n <= length; n++) if (kinds.some((k) => can.has(n - LENGTH[k]))) can.add(n)
  return can.has(length)
}
describe('the customers', () => {
  it('each party has an exact row in the trays that are open for it, within what the strip holds', () => {
    for (const on of [...Object.values(PARTY), ...ROUND]) {
      expect(exact(lengthOf(on), needs(on)), on.join()).toBe(true)
      expect(lengthOf(on)).toBeLessThanOrEqual(864)
    }
    expect(STRIP_LENGTH / LENGTH.duck).toBeLessThan(MOST)
  })
  it('some come out in one measure and not in another, and one only in a mix', () => {
    expect(exact(CAST.snail.length, ['sausage'])).toBe(false)
    expect(exact(CAST.snail.length, ['duck'])).toBe(true)
    expect(exact(CAST.seal.length, ['shoe'])).toBe(true)
    for (const k of KINDS) expect(exact(CAST.python.length, [k])).toBe(false)
    expect(exact(CAST.python.length, ['sausage', 'shoe'])).toBe(true)
  })
  it('no two customers are as long, and every way to take a piece is its own', () => {
    expect(new Set(WHO.map((w) => CAST[w].length)).size).toBe(WHO.length)
    const turns = WHO.flatMap((w) => KINDS.map((k) => CAST[w].turn[k]))
    expect(new Set(turns).size).toBe(turns.length)
  })
})
