import { describe, expect, it } from 'vitest'
import { CUP_HOLDS, HOUSE_CUP, WALL_ROWS, amountAt, bowlOf, cupProfile, dishOf, fillLevel, lidProfile, potProfile, saucerProfile, surfaceOf, wallRowAt, type CupSize } from './forms'

const SIZES = Object.keys(CUP_HOLDS) as CupSize[]

describe('how high the tea stands', () => {
  it('is at the floor when empty and at the rim when full', () => {
    for (const size of SIZES) {
      const bowl = bowlOf(size)
      expect(fillLevel(bowl, 0)).toBe(0)
      expect(fillLevel(bowl, bowl.holds)).toBe(1)
      expect(fillLevel(bowl, bowl.holds * 3)).toBe(1)
      expect(fillLevel(bowl, -1)).toBe(0)
    }
  })

  it('rises with every drop, so the level can be read at every moment of a pour', () => {
    let last = -1
    for (let i = 0; i <= 200; i++) {
      const level = fillLevel(HOUSE_CUP, i / 200)
      expect(level).toBeGreaterThan(last - 1e-9)
      if (i > 0 && i < 200) expect(level - last).toBeGreaterThan(0.0015)
      last = level
    }
  })

  it('stands above halfway at half a cupful, because the cup flares', () => {
    expect(fillLevel(HOUSE_CUP, 0.5)).toBeGreaterThan(0.5)
    expect(fillLevel(HOUSE_CUP, 0.5)).toBeLessThan(0.7)
  })

  it('gives the same amount back from a level', () => {
    for (const size of SIZES) {
      const bowl = bowlOf(size)
      for (const share of [0.1, 0.15, 0.5, 0.9]) expect(amountAt(bowl, fillLevel(bowl, bowl.holds * share))).toBeCloseTo(bowl.holds * share, 5)
    }
  })

  it('shows a drop as a disc wide enough to see from across the table', () => {
    const drop = surfaceOf(HOUSE_CUP, CUP_HOLDS.thimble)
    expect(drop.r).toBeGreaterThan(HOUSE_CUP.floorR)
    expect(drop.y).toBeGreaterThan(HOUSE_CUP.floorY + 0.06)
    const half = surfaceOf(HOUSE_CUP, 0.5)
    const full = surfaceOf(HOUSE_CUP, 1)
    // The three tastes stand well apart, in height and in width.
    expect(half.y - drop.y).toBeGreaterThan(0.1)
    expect(full.y - half.y).toBeGreaterThan(0.1)
    expect(full.r).toBeCloseTo(HOUSE_CUP.rimR, 6)
  })
})

describe('the three sizes of cup', () => {
  it('are one shape, and hold what their names say', () => {
    for (const size of SIZES) {
      const bowl = bowlOf(size)
      expect(bowl.holds).toBe(CUP_HOLDS[size])
      expect(bowl.rimR / bowl.floorR).toBeCloseTo(HOUSE_CUP.rimR / HOUSE_CUP.floorR, 6)
    }
    expect(bowlOf('house')).toEqual(HOUSE_CUP)
  })

  it('differ enough in size to tell apart at a glance, and the smallest is still a target for a finger', () => {
    const thimble = bowlOf('thimble'), small = bowlOf('small'), house = bowlOf('house')
    expect(small.rimR / thimble.rimR).toBeGreaterThan(1.3)
    expect(house.rimR / small.rimR).toBeGreaterThan(1.2)
    expect(thimble.rimR / house.rimR).toBeGreaterThan(0.5)
  })

  it('make the Mouse\'s drop a thimbleful and two halves a cupful', () => {
    expect(CUP_HOLDS.small * 2).toBe(CUP_HOLDS.house)
    expect(CUP_HOLDS.thimble).toBeLessThan(CUP_HOLDS.small / 2)
  })
})

describe('profiles', () => {
  const sound = (points: { r: number; y: number }[]) => {
    for (const point of points) {
      expect(Number.isFinite(point.r) && Number.isFinite(point.y)).toBe(true)
      expect(point.r).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeGreaterThanOrEqual(0)
    }
  }

  it('gives a cup an inside wall of the stated rows, from the rim down to the floor', () => {
    for (const size of SIZES) {
      const bowl = bowlOf(size)
      const { points, insideFrom } = cupProfile(bowl)
      sound(points)
      expect(points[insideFrom].r).toBeCloseTo(bowl.rimR, 6)
      expect(points[insideFrom].y).toBeCloseTo(bowl.rimY, 6)
      expect(points[insideFrom + WALL_ROWS].r).toBeCloseTo(bowl.floorR, 6)
      expect(points[insideFrom + WALL_ROWS].y).toBeCloseTo(bowl.floorY, 6)
      expect(points.length).toBe(insideFrom + WALL_ROWS + 2)
      // The outside is always outside the inside at the same height: the wall has thickness.
      expect(points[insideFrom - 2].r).toBeGreaterThan(bowl.rimR)
    }
  })

  it('finds the row of the wall a ring is painted on', () => {
    expect(wallRowAt(1)).toBe(0)
    expect(wallRowAt(0)).toBe(WALL_ROWS)
    expect(wallRowAt(0.5)).toBe(WALL_ROWS / 2)
  })

  it('makes a saucer wider than its cup, with a well the foot sits in', () => {
    for (const size of SIZES) {
      const bowl = bowlOf(size), dish = dishOf(size)
      sound(saucerProfile(dish))
      expect(dish.rimR).toBeGreaterThan(bowl.rimR * 1.3)
      expect(dish.wellR).toBeGreaterThan(bowl.floorR * 0.78)
      expect(dish.holds).toBeLessThan(bowl.holds)
    }
  })

  it('gives the pot and its lid sound profiles', () => {
    sound(potProfile())
    sound(lidProfile())
    expect(Math.max(...potProfile().map((p) => p.r))).toBeLessThanOrEqual(1.0001)
  })
})
