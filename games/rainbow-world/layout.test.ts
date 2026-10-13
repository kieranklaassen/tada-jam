import { describe, expect, it } from 'vitest'
import { BASKET, CAT, FIELD, GROWN_UP_CORNER, HOME_CONTROL, MAT, SILL_TOP, freeSpot, homeIsClear, inBox, inField, onMat, shrinkFor, toField } from './layout'
import { ALL_PIECES } from './pieces'
import { STAGE } from './stage'
import { MIN_TARGET } from './world'

describe('where things lie', () => {
  it('keeps every thing by the mat clear of the home control, the grown-up corner and the strip where wrists rest', () => {
    for (const piece of ALL_PIECES) expect(homeIsClear(piece), piece.id).toBe(true)
    expect(BASKET.y).toBeLessThan(SILL_TOP)
    expect(BASKET.x + BASKET.halfWidth).toBeLessThanOrEqual(STAGE.width)
    // The mat itself keeps out of all three as well.
    expect(MAT.y - MAT.ry).toBeGreaterThan(HOME_CONTROL.y + HOME_CONTROL.r)
    expect(MAT.y + MAT.ry).toBeLessThan(SILL_TOP)
    expect(onMat(STAGE.width - GROWN_UP_CORNER, GROWN_UP_CORNER)).toBe(false)
  })

  it('makes every target about a hundred units across or more, and keeps the places by the mat well apart', () => {
    for (const piece of ALL_PIECES) {
      expect(piece.halfWidth * 2, piece.id).toBeGreaterThanOrEqual(MIN_TARGET)
      // An arch is half a ring, so the smallest is half as high as it is wide. What a touch takes of it is measured in reach.test.ts.
      expect(piece.height, piece.id).toBeGreaterThanOrEqual(MIN_TARGET / 2)
    }
    expect(BASKET.halfWidth * 2).toBeGreaterThanOrEqual(MIN_TARGET)
    // The three arches share one place, the nest; every other place is its own.
    const homes = [...new Map(ALL_PIECES.map((piece) => [`${piece.home.x},${piece.home.y}`, piece])).values()]
    expect(homes.length).toBe(6)
    const boxes = [...homes.map((piece) => ({ id: piece.id as string, x: piece.home.x, y: piece.home.y, halfWidth: piece.halfWidth, height: piece.height })), { id: 'basket', ...BASKET }]
    for (const a of boxes) for (const b of boxes) {
      if (a === b) continue
      const apartX = Math.abs(a.x - b.x) - a.halfWidth - b.halfWidth, apartY = Math.max(a.y - a.height - b.y, b.y - b.height - a.y)
      expect(Math.max(apartX, apartY), `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(24)
    }
  })

  it('never stands a thing on the mat in a thing that lies by it, in the basket or in the cat', () => {
    const still = [...ALL_PIECES.map((piece) => ({ x: piece.home.x, y: piece.home.y, halfWidth: piece.halfWidth, height: piece.height })), BASKET, CAT]
    for (const piece of ALL_PIECES) for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const shrink = shrinkFor(piece), x = FIELD.x + Math.cos(a) * (FIELD.rx - shrink), y = FIELD.y + Math.sin(a) * FIELD.ry
      expect(onMat(x - piece.reach, y) && onMat(x + piece.reach, y), `${piece.id} at ${Math.round(x)},${Math.round(y)}`).toBe(true)
      for (const other of still) for (const side of [-1, 0, 1]) expect(inBox(x + side * piece.reach, y, other.x, other.y, other.halfWidth, other.height), piece.id).toBe(false)
    }
  })

  it('brings a point off the field to the nearest point on it, and leaves a point on it alone', () => {
    expect(toField(600, 560)).toEqual({ x: 600, y: 560 })
    for (const [x, y] of [[0, 0], [1180, 820], [590, 0], [30, 560]]) {
      const to = toField(x, y)
      expect(inField(to.x, to.y, -0.001)).toBe(true)
    }
  })

  it('gives the asked place when it is free and the nearest free place when it is not', () => {
    const [arch, , , doll] = ALL_PIECES
    expect(freeSpot(doll, 600, 560, [])).toEqual({ x: 600, y: 560 })
    const spot = freeSpot(doll, 600, 560, [{ def: arch, x: 600, y: 560 }])
    expect(spot).not.toEqual({ x: 600, y: 560 })
    expect(Math.hypot(spot.x - 600, spot.y - 560)).toBeLessThan(arch.reach + doll.reach + 20)
    expect(inField(spot.x, spot.y)).toBe(true)
  })
})
