import { describe, expect, it } from 'vitest'
import { APART, ASKER, BASKET, EGG, FLOOR, GROUND, HILL_BEHIND, HILL_ROOM, HILL_SPOTS, SKYLINE, STAGE, STONE, TARGET, WRIST_LINE, bareAt, edgeSpot, eggSpots, fit, gap, hillTop, inView, inside, nestSpot, placeFrom, seedFrom, targets, toStage } from './stage'

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

describe('the nest and the finger', () => {
  it('keeps the nest whole on the page, a target of its own, clear of the row and out of the bottom strip', () => {
    for (const [width, height] of [[1180, 820], [1400, 700], [1024, 768]] as const) {
      const view = inView(width, height), nest = nestSpot(view)
      expect(nest.x).toBeGreaterThanOrEqual(view.x)
      expect(nest.x + nest.w).toBeLessThanOrEqual(view.x + view.w)
      expect(Math.min(nest.w, nest.h)).toBeGreaterThanOrEqual(TARGET)
      expect(nest.y + nest.h).toBeLessThanOrEqual(WRIST_LINE)
      for (const egg of eggSpots(3)) expect(gap(nest, egg)).toBeGreaterThanOrEqual(APART)
      for (const place of HILL_SPOTS) expect(gap(nest, place)).toBeGreaterThanOrEqual(APART)
    }
  })

  it('turns a point of the surface into a point of the design, whatever shape the surface has', () => {
    expect(toStage(1180, 820, 590, 410)).toEqual({ x: 590, y: 410 })
    expect(toStage(2360, 1640, 2360, 1640)).toEqual({ x: 1180, y: 820 })
    const wide = toStage(1400, 700, 700, 350)
    expect(wide.x).toBeCloseTo(590)
    expect(wide.y).toBeCloseTo(410)
  })

  it('counts a finger that lands just beside a thing as on it, by the slack it is given', () => {
    const rect = { x: 100, y: 100, w: 50, h: 50 }
    expect(inside(rect, 125, 125)).toBe(true)
    expect(inside(rect, 95, 125)).toBe(false)
    expect(inside(rect, 95, 125, 10)).toBe(true)
    expect(inside(rect, 170, 125, 10)).toBe(false)
  })
})

describe('the address', () => {
  it('gives a fixed seed for stills, and anything else is no seed', () => {
    expect(seedFrom('?seed=7')).toBe(7)
    expect(seedFrom('?chrome=0&seed=123456')).toBe(123456)
    expect(seedFrom('')).toBeNull()
    expect(seedFrom('?seed=')).toBeNull()
    expect(seedFrom('?seed=abc')).toBeNull()
    expect(seedFrom('?seed=-4')).toBeNull()
  })

  it('names a place of the order for a grown-up to look at', () => {
    expect(placeFrom('?seed=1&place=leaf-piles')).toBe('leaf-piles')
    expect(placeFrom('?seed=1')).toBeNull()
  })
})


describe('what a finger on nothing to tap has landed on', () => {
  it('is the hill on the face of the hill, the stone on the stone once it is there, and the page everywhere else', () => {
    // Half way up the dome, above the second place.
    const x = HILL_SPOTS[1].x + HILL_SPOTS[1].w / 2, top = hillTop(x)
    expect(top).toBeLessThan(GROUND.top)
    expect(bareAt(x, (top + GROUND.top) / 2, true)).toBe('hill')
    // The paler sheet behind the hill, which shows above its skyline, is hill too; above that it is the white page,
    // and on the ground strip under the hill it is the ground.
    const behind = hillTop(x - HILL_BEHIND.dx) + HILL_BEHIND.dy
    expect(behind).toBeLessThan(top)
    expect(bareAt(x, (behind + top) / 2, true)).toBe('hill')
    expect(bareAt(x, behind - 20, true)).toBe('page')
    expect(bareAt(x, GROUND.top + 30, true)).toBe('page')
    // Beside the hill, where the page shows down to the ground.
    expect(bareAt(STAGE.width - 6, 300, true)).toBe('page')
    // The stone answers as a stone only while it lies there.
    const sx = STONE.x + STONE.w / 2, sy = STONE.y + STONE.h / 2
    expect(bareAt(sx, sy, true)).toBe('stone')
    expect(bareAt(sx, sy, false)).toBe('page')
  })
})
