import { describe, expect, it } from 'vitest'
import { BORDER_PLACES, HANDLE, HOME, KEPT_PLACES, PACKET_PLACES, PLANT, POTS_PER_ROW, REFERENCE, flowerHandle, layoutOf, placesOf, stemHeight, type Circle, type Rect } from './layout'
import type { Joints } from './plant'

const SIZES = [[REFERENCE.w, REFERENCE.h], [1024, 768], [820, 1180]] as const
const JOINTS: Joints[] = [1, 2, 4]
const EPS = 1e-6

const box = (c: Circle): Rect => ({ x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 })
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
const within = (inner: Rect, outer: Rect) => inner.x >= outer.x - EPS && inner.y >= outer.y - EPS && inner.x + inner.w <= outer.x + outer.w + EPS && inner.y + inner.h <= outer.y + outer.h + EPS

describe.each(SIZES)('the page at %i by %i', (w, h) => {
  const layout = layoutOf(w, h)
  const surface = { x: 0, y: 0, w, h }

  it('has every place the page needs', () => {
    expect(layout.shelf).toHaveLength(POTS_PER_ROW)
    expect(layout.tray).toHaveLength(POTS_PER_ROW)
    expect(layout.border).toHaveLength(BORDER_PLACES)
    expect(layout.packets).toHaveLength(PACKET_PLACES)
    expect(layout.kept).toHaveLength(KEPT_PLACES)
  })

  it('lets no two places overlap', () => {
    const places = placesOf(layout)
    for (let a = 0; a < places.length; a++) {
      for (let b = a + 1; b < places.length; b++) {
        expect(overlap(places[a].rect, places[b].rect), `${places[a].name} and ${places[b].name}`).toBe(false)
      }
    }
  })

  it('keeps everything inside the surface', () => {
    for (const { name, rect } of placesOf(layout)) {
      expect(within(rect, surface), name).toBe(true)
      expect(rect.w, name).toBeGreaterThan(0)
      expect(rect.h, name).toBeGreaterThan(0)
    }
    for (const board of [layout.shelfBoard, layout.trayBoard, layout.borderStrip]) expect(within(board, surface)).toBe(true)
  })

  it('gives every pot three handles of 48 px or more that keep clear of each other and stay in the slot', () => {
    for (const place of [...layout.shelf, ...layout.tray]) {
      expect(place.pot.w).toBeGreaterThanOrEqual(HANDLE)
      expect(place.pot.h).toBeGreaterThanOrEqual(HANDLE)
      expect(place.bud.r * 2).toBeGreaterThanOrEqual(HANDLE)
      expect(within(place.pot, place.cell)).toBe(true)
      expect(within(box(place.bud), place.cell)).toBe(true)
      expect(overlap(place.pot, box(place.bud))).toBe(false)
      for (const joints of JOINTS) {
        const flower = flowerHandle(place, joints, layout.k)
        expect(flower.r * 2).toBeGreaterThanOrEqual(HANDLE)
        expect(within(box(flower), place.cell), `flower of ${joints}`).toBe(true)
        expect(overlap(box(flower), place.pot)).toBe(false)
        expect(overlap(box(flower), box(place.bud))).toBe(false)
      }
    }
  })

  it('fits a four-joint plant with its flower in its row, and its leaves in its slot', () => {
    for (const place of [...layout.shelf, ...layout.tray]) {
      const flowerTop = place.soil - stemHeight(4, layout.k) - PLANT.flower * layout.k
      expect(flowerTop).toBeGreaterThanOrEqual(place.cell.y)
      expect(place.x - PLANT.leaf * layout.k).toBeGreaterThanOrEqual(place.cell.x)
      expect(place.x + PLANT.leaf * layout.k).toBeLessThanOrEqual(place.cell.x + place.cell.w)
    }
  })

  it('draws both rows at one scale and stands each row on its board', () => {
    const size = (rect: Rect) => [rect.w, rect.h].map((value) => value.toFixed(6)).join()
    expect(new Set([...layout.shelf, ...layout.tray].map((place) => size(place.pot))).size).toBe(1)
    for (const place of layout.shelf) expect(place.foot).toBeCloseTo(layout.shelfBoard.y)
    for (const place of layout.tray) expect(place.foot).toBeCloseTo(layout.trayBoard.y)
    expect(layout.tray[0].cell.y).toBeGreaterThanOrEqual(layout.shelf[0].cell.y + layout.shelf[0].cell.h - EPS)
  })

  it('fits a tall small plant in the border', () => {
    const tall = (4 * PLANT.joint + PLANT.stalk + PLANT.flower) * layout.small
    for (const place of layout.border) {
      expect(place.ground - tall).toBeGreaterThanOrEqual(place.cell.y)
      expect(place.ground).toBeLessThanOrEqual(place.cell.y + place.cell.h)
    }
  })

  it('puts the wish above the visitor, and the one who waits at the edge: beside the wish on a wide page, to the right of the visitor on an upright one', () => {
    expect(layout.wish.y + layout.wish.h).toBeLessThanOrEqual(layout.visitor.y + EPS)
    if (layout.wide) {
      expect(layout.waiting.x).toBeGreaterThanOrEqual(layout.wish.x + layout.wish.w - EPS)
      expect(layout.waiting.y + layout.waiting.h).toBeLessThanOrEqual(layout.visitor.y + EPS)
      expect(layout.waiting.x + layout.waiting.w).toBeCloseTo(layout.visitor.x + layout.visitor.w, 6)
    } else expect(layout.waiting.x).toBeGreaterThanOrEqual(layout.visitor.x + layout.visitor.w - EPS)
    for (const packet of layout.packets) expect(packet.x + packet.w).toBeLessThanOrEqual(layout.shelf[0].cell.x + EPS)
  })
})

// The shell lays one round home control over every game: 48 px across, in the middle of the top edge, 10 px down.
// A tap there goes home and never reaches the game, so nothing a finger can touch may lie under it.
describe.each([[REFERENCE.w, REFERENCE.h], [1133, 744], [1024, 768], [820, 1180]] as const)('the shell’s home control over the page at %i by %i', (w, h) => {
  const layout = layoutOf(w, h)
  const control: Rect = { x: w / 2 - HOME.size / 2 - HOME.clear, y: 0, w: HOME.size + HOME.clear * 2, h: HOME.top + HOME.size + HOME.clear }

  it('lies over no place of the page: the kept drawings of the top margin stand on either side of it, with room for a finger between', () => {
    for (const { name, rect } of placesOf(layout)) expect(overlap(rect, control), name).toBe(false)
  })

  it('leaves the four kept drawings and the eight sketches their room: a card no narrower than it is high, a sketch 8 px or more', () => {
    for (const card of layout.kept) expect(card.w).toBeGreaterThanOrEqual(card.h)
    for (const sketch of layout.sketches) expect(sketch.w).toBeGreaterThanOrEqual(8)
    // Newest first from the right, as before: each card lies to the left of the one before it.
    for (let i = 1; i < layout.kept.length; i++) expect(layout.kept[i].x + layout.kept[i].w).toBeLessThanOrEqual(layout.kept[i - 1].x + EPS)
  })
})

describe('the layout', () => {
  it('is the same for the same size, and scales its plants with the surface', () => {
    expect(layoutOf(1180, 820)).toEqual(layoutOf(1180, 820))
    expect(layoutOf(590, 410).k).toBeCloseTo(layoutOf(1180, 820).k / 2, 1)
    expect(layoutOf(1180, 820).k).toBeGreaterThan(0.95)
  })

  it('survives a surface with no size', () => {
    const layout = layoutOf(0, 0)
    for (const { rect } of placesOf(layout)) expect(Number.isFinite(rect.x + rect.y + rect.w + rect.h)).toBe(true)
  })
})
