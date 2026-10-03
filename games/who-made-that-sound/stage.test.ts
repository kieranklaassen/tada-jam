import { describe, expect, it } from 'vitest'
import { APART, ASKER, BASKET, EGG, FLOOR, GROUND, HILL_ROOM, HILL_SPOTS, SKYLINE, STAGE, STONE, TARGET, WRIST_LINE, edgeSpot, eggSpots, fit, gap, hillTop, inView, targets } from './stage'

/** Surfaces the shell may give: the design's own shape, a wider one, a shorter one and a small one. */
const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1400, 700], [1024, 768], [667, 375]]

describe('the page on a surface', () => {
  it('is scaled as one piece and centred', () => {
    expect(fit(1180, 820)).toEqual({ scale: 1, x: 0, y: 0 })
    const wide = fit(2360, 1000)
    expect(wide.scale).toBeCloseTo(1000 / 820)
    expect(wide.y).toBeCloseTo(0)
    expect(wide.x).toBeCloseTo((2360 - STAGE.width * wide.scale) / 2)
  })

  it('shows the whole design whatever the shape of the surface', () => {
    for (const [width, height] of SURFACES) {
      const view = inView(width, height)
      expect(view.x).toBeLessThanOrEqual(1e-9)
      expect(view.y).toBeLessThanOrEqual(1e-9)
      expect(view.x + view.w).toBeGreaterThanOrEqual(STAGE.width - 1e-9)
      expect(view.y + view.h).toBeGreaterThanOrEqual(STAGE.height - 1e-9)
    }
  })
})

describe('what can be tapped', () => {
  const rows = [2, 3, 4]

  it('is about 100 across or more, both ways', () => {
    for (const [width, height] of SURFACES) for (const count of rows) {
      for (const { name, rect } of targets(count, inView(width, height))) {
        expect(rect.w, name).toBeGreaterThanOrEqual(TARGET)
        expect(rect.h, name).toBeGreaterThanOrEqual(TARGET)
      }
    }
  })

  it('stands well apart: no two overlap, and there is clear page between any two', () => {
    for (const [width, height] of SURFACES) for (const count of rows) {
      const all = targets(count, inView(width, height))
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        expect(gap(all[i].rect, all[j].rect), `${all[i].name} and ${all[j].name}`).toBeGreaterThanOrEqual(APART - 1e-9)
      }
    }
  })

  it('keeps out of the bottom strip, where wrists rest, and so do the stone and the ground', () => {
    expect(WRIST_LINE).toBeCloseTo(STAGE.height * 0.88)
    for (const count of rows) for (const { name, rect } of targets(count, inView(1180, 820))) expect(rect.y + rect.h, name).toBeLessThanOrEqual(WRIST_LINE)
    expect(STONE.y + STONE.h).toBeLessThanOrEqual(WRIST_LINE)
    expect(GROUND.bottom).toBeLessThanOrEqual(WRIST_LINE)
  })

  it('is on the page', () => {
    for (const [width, height] of SURFACES) {
      const view = inView(width, height)
      for (const { name, rect } of targets(4, view)) {
        expect(rect.x, name).toBeGreaterThanOrEqual(view.x)
        expect(rect.y, name).toBeGreaterThanOrEqual(view.y)
        expect(rect.x + rect.w, name).toBeLessThanOrEqual(view.x + view.w + 1e-9)
      }
    }
  })
})

describe('the row', () => {
  it('holds two to four hides, every one the same size, standing on the floor inside the ground strip', () => {
    for (const count of [2, 3, 4]) {
      const eggs = eggSpots(count)
      expect(eggs).toHaveLength(count)
      for (const egg of eggs) {
        expect([egg.w, egg.h]).toEqual([EGG.w, EGG.h])
        expect(egg.y + egg.h).toBe(FLOOR)
        expect(egg.y).toBeGreaterThan(GROUND.top)
        expect(egg.y + egg.h).toBeLessThan(GROUND.bottom)
      }
    }
  })

  it('is spread evenly about one middle, left to right', () => {
    for (const count of [2, 3, 4]) {
      const middles = eggSpots(count).map((egg) => egg.x + egg.w / 2)
      expect((middles[0] + middles[count - 1]) / 2).toBeCloseTo(605)
      for (let i = 2; i < count; i++) expect(middles[i] - middles[i - 1]).toBeCloseTo(middles[1] - middles[0])
      expect(middles[1]).toBeGreaterThan(middles[0])
    }
  })

  it('has the stone and the one who asks on its left, and the basket and the edge on its right', () => {
    const eggs = eggSpots(4), view = inView(1180, 820)
    expect(ASKER.x + ASKER.w).toBeLessThan(eggs[0].x)
    expect(BASKET.x).toBeGreaterThan(eggs[3].x + eggs[3].w)
    expect(edgeSpot(view).x).toBeGreaterThan(BASKET.x + BASKET.w)
    // The one who asks stands on the stone: its feet are on the stone's top, and the stone is wider than it is.
    expect(ASKER.y + ASKER.h).toBeGreaterThanOrEqual(STONE.y)
    expect(ASKER.y + ASKER.h).toBeLessThan(STONE.y + STONE.h)
    expect(STONE.x).toBeLessThan(ASKER.x)
    expect(STONE.x + STONE.w).toBeGreaterThan(ASKER.x + ASKER.w)
  })

  it('has the one who waits at the edge of whatever the surface shows', () => {
    for (const [width, height] of SURFACES) {
      const view = inView(width, height), edge = edgeSpot(view)
      expect(edge.x + edge.w).toBeCloseTo(view.x + view.w)
    }
  })
})

describe('the hill', () => {
  it('rises from both ends to one top', () => {
    const top = Math.min(...SKYLINE.map(([, y]) => y))
    expect(hillTop(588)).toBe(top)
    expect(hillTop(200)).toBeGreaterThan(hillTop(400))
    expect(hillTop(1000)).toBeGreaterThan(hillTop(800))
    // Beside the hill there is only the ground.
    expect(hillTop(10)).toBe(GROUND.top)
    expect(hillTop(1170)).toBe(GROUND.top)
  })

  it('has room for four, each with its feet on the face of the hill above the ground', () => {
    expect(HILL_SPOTS).toHaveLength(HILL_ROOM)
    for (const spot of HILL_SPOTS) {
      const feet = spot.y + spot.h, middle = spot.x + spot.w / 2
      expect(feet).toBeGreaterThan(hillTop(middle))
      expect(feet).toBeLessThan(GROUND.top)
    }
  })

  it('tucks its foot under the ground strip', () => {
    expect(SKYLINE[0][1]).toBeGreaterThan(GROUND.top)
    expect(SKYLINE[SKYLINE.length - 1][1]).toBeGreaterThan(GROUND.top)
  })
})
