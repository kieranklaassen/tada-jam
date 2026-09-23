import { describe, expect, it } from 'vitest'
import { BAG, FEEDING, fitWorld, insideRect, MAT, SCALE, SHELF, TABLE, toScreen, toWorld, WORLD } from './layout'

describe('fitWorld', () => {
  for (const [w, h] of [
    [1024, 768],
    [1180, 820],
    [2400, 900],
    [600, 1200],
  ]) {
    it(`keeps the whole world inside a ${w}×${h} box, centered`, () => {
      const fit = fitWorld(w, h)
      expect(fit.usable).toBe(true)
      expect(WORLD.w * fit.scale).toBeLessThanOrEqual(w + 1e-9)
      expect(WORLD.h * fit.scale).toBeLessThanOrEqual(h + 1e-9)
      expect(fit.offsetX * 2 + WORLD.w * fit.scale).toBeCloseTo(w)
      expect(fit.offsetY * 2 + WORLD.h * fit.scale).toBeCloseTo(h)
    })
  }

  it('round-trips points between world and screen', () => {
    const fit = fitWorld(1180, 820)
    const p = { x: 321.5, y: 777.25 }
    const back = toWorld(toScreen(p, fit), fit)
    expect(back.x).toBeCloseTo(p.x)
    expect(back.y).toBeCloseTo(p.y)
  })

  it('reports a 0×0 box as unusable', () => {
    expect(fitWorld(0, 0).usable).toBe(false)
    expect(fitWorld(800, 0).usable).toBe(false)
  })
})

describe('geometry', () => {
  const inTable = (p: { x: number; y: number }) => insideRect(p, TABLE)

  it('puts the live mat inside the table, clear of the bag and the shelf', () => {
    expect(inTable({ x: MAT.x, y: MAT.y })).toBe(true)
    expect(inTable({ x: MAT.x + MAT.w, y: MAT.y + MAT.h })).toBe(true)
    expect(BAG.x + BAG.r).toBeLessThan(MAT.x)
    expect(MAT.x + MAT.w).toBeLessThan(SHELF.x)
  })

  it('keeps the scale pans on the mat', () => {
    for (const pan of SCALE.pans) {
      expect(insideRect({ x: pan.x - pan.r, y: pan.y - pan.r - SCALE.maxDrop }, MAT)).toBe(true)
      expect(insideRect({ x: pan.x + pan.r, y: pan.y + pan.r + SCALE.maxDrop }, MAT)).toBe(true)
    }
  })

  it('keeps every plate and guest on the table', () => {
    for (const seat of FEEDING.seats) {
      expect(inTable(seat.plate)).toBe(true)
      expect(inTable(seat.guest)).toBe(true)
    }
  })
})
