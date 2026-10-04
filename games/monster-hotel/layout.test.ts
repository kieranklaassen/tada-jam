import { describe, expect, it } from 'vitest'
import { SHAPES, edgesOf, outerEdgesOf, roomCount, type ShapeId } from './hotel'
import { TOUCH, layoutPage, type PageLayout, type Rect } from './layout'

const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[]
const SIZES: readonly (readonly [number, number])[] = [[1180, 820], [760, 560], [600, 400], [1400, 1100], [820, 1180]]

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6
const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x - 1e-6 && inner.y >= outer.y - 1e-6 && inner.x + inner.w <= outer.x + outer.w + 1e-6 && inner.y + inner.h <= outer.y + outer.h + 1e-6

function everything(page: PageLayout): Rect[] {
  return [
    page.house, page.roof, page.wheel, page.chimney, page.cellar, page.lobby, page.canopy, page.frontDoor, page.cupboard,
    page.porter, page.kerb, page.steps, page.coach, page.coachDoor, page.bench, page.benchGuest, page.luggage,
    ...page.rooms.flatMap((room) => [room.rect, room.bed, room.door]), ...page.edges.map((edge) => edge.rect),
    ...page.roofBays, ...page.cellarBays, ...page.slots,
  ]
}

/** What a finger can land on, besides the guests. */
function touchable(page: PageLayout): Rect[] {
  return [...page.slots, page.wheel, page.coachDoor, page.benchGuest]
}

describe('the page layout', () => {
  it('lays out all three shapes at every size, with every room and edge', () => {
    for (const shape of SHAPE_IDS) {
      for (const [w, h] of SIZES) {
        const page = layoutPage(w, h, shape)
        expect(page.rooms).toHaveLength(roomCount(shape))
        expect(page.edges.map((edge) => edge.id)).toEqual([...edgesOf(shape), ...outerEdgesOf(shape)].map((edge) => edge.id))
        expect(page.slots).toHaveLength(5)
        expect(page.roofBays).toHaveLength(SHAPES[shape].cols)
        expect(page.cellarBays).toHaveLength(SHAPES[shape].cols)
        for (const r of everything(page)) {
          expect(Number.isFinite(r.x + r.y + r.w + r.h)).toBe(true)
          expect(r.w).toBeGreaterThan(0)
          expect(r.h).toBeGreaterThan(0)
        }
      }
    }
  })

  it('keeps everything inside the page', () => {
    for (const shape of SHAPE_IDS) {
      for (const [w, h] of SIZES) {
        const page = layoutPage(w, h, shape)
        const surface = { x: 0, y: 0, w, h }
        expect(inside(page.plate, surface)).toBe(true)
        for (const r of everything(page)) expect(inside(r, page.plate)).toBe(true)
        for (const spot of [...page.lobbySpots, ...page.rooms.map((room) => room.stand)]) {
          expect(inside({ x: spot.x, y: spot.y, w: 0, h: 0 }, page.plate)).toBe(true)
        }
      }
    }
  })

  it('keeps rooms apart, and each room over the one below it', () => {
    for (const shape of SHAPE_IDS) {
      const page = layoutPage(1180, 820, shape)
      const { cols } = SHAPES[shape]
      page.rooms.forEach((a, i) => page.rooms.forEach((b, j) => { if (i < j) expect(overlap(a.rect, b.rect)).toBe(false) }))
      page.rooms.forEach((room, i) => {
        expect(inside(room.rect, page.house)).toBe(true)
        expect(inside(room.bed, room.rect)).toBe(true)
        expect(inside(room.door, room.rect)).toBe(true)
        const above = page.rooms[i + cols]
        if (above) {
          expect(above.rect.x).toBeCloseTo(room.rect.x)
          expect(above.rect.y + above.rect.h).toBeLessThan(room.rect.y)
        }
      })
      // An edge lies between its two rooms and touches both.
      for (const edge of page.edges) {
        const a = page.rooms[edge.a]!.rect, b = page.rooms[edge.b]!.rect
        expect(overlap(edge.rect, a)).toBe(false)
        expect(overlap(edge.rect, b)).toBe(false)
        if (edge.a !== edge.b) {
          if (edge.kind === 'wall') expect(edge.rect.x).toBeCloseTo(a.x + a.w)
          else expect(edge.rect.y + edge.rect.h).toBeCloseTo(a.y)
        } else {
          // An outer side lies against its one room, on the side its name says, and inside the house.
          const side = edge.id.slice(0, edge.id.indexOf('-'))
          if (side === 'under') expect(edge.rect.y).toBeCloseTo(a.y + a.h)
          if (side === 'over') expect(edge.rect.y + edge.rect.h).toBeCloseTo(a.y)
          if (side === 'left') expect(edge.rect.x + edge.rect.w).toBeCloseTo(a.x)
          if (side === 'right') expect(edge.rect.x).toBeCloseTo(a.x + a.w)
          expect(edge.rect.x >= page.house.x - 0.5 && edge.rect.x + edge.rect.w <= page.house.x + page.house.w + 0.5 && edge.rect.y >= page.house.y - 0.5 && edge.rect.y + edge.rect.h <= page.house.y + page.house.h + 0.5, edge.id).toBe(true)
        }
      }
      // The lobby, the street and the house do not share ground.
      expect(overlap(page.lobby, page.house)).toBe(false)
      expect(overlap(page.kerb, page.lobby)).toBe(false)
      expect(overlap(page.kerb, page.cellar)).toBe(false)
      page.slots.forEach((a, i) => page.slots.forEach((b, j) => { if (i < j) expect(overlap(a, b)).toBe(false) }))
      for (const slot of page.slots) expect(inside(slot, page.cupboard)).toBe(true)
      // Nobody waiting in the lobby stands in front of the things: the cupboard is over it.
      expect(overlap(page.cupboard, page.lobby)).toBe(false)
      expect(overlap(page.cupboard, page.house)).toBe(false)
      expect(page.cupboard.y + page.cupboard.h).toBeLessThanOrEqual(page.lobby.y)
      expect(overlap(page.canopy, page.cupboard)).toBe(false)
      expect(overlap(page.coach, page.benchGuest)).toBe(false)
      expect(overlap(page.cupboard, page.frontDoor)).toBe(false)
    }
  })

  it('gives every room and everything touchable a finger of room at 1180 by 820 and at 760 by 560', () => {
    for (const shape of SHAPE_IDS) {
      for (const [w, h] of [[1180, 820], [760, 560]] as const) {
        const page = layoutPage(w, h, shape)
        for (const r of [...page.rooms.map((room) => room.rect), ...touchable(page)]) {
          expect(r.w).toBeGreaterThanOrEqual(TOUCH)
          expect(r.h).toBeGreaterThanOrEqual(TOUCH)
        }
        expect(page.guest).toBeGreaterThanOrEqual(TOUCH)
      }
    }
  })

  it('draws the long house at about a room of 200 and a guest of 90 on a tablet', () => {
    const page = layoutPage(1180, 820, 'long')
    for (const room of page.rooms) {
      expect(room.rect.w).toBeGreaterThanOrEqual(195)
      expect(room.rect.h).toBeGreaterThanOrEqual(190)
    }
    expect(page.guest).toBeGreaterThanOrEqual(90)
  })

  it('keeps the aspect of the drawing and centres it', () => {
    const wide = layoutPage(1400, 600, 'long'), tall = layoutPage(820, 1180, 'long')
    expect(wide.plate.w / wide.plate.h).toBeCloseTo(tall.plate.w / tall.plate.h, 6)
    for (const page of [wide, tall]) {
      expect(page.plate.x).toBeCloseTo(page.width - page.plate.x - page.plate.w, 6)
      expect(page.plate.y).toBeCloseTo(page.height - page.plate.y - page.plate.h, 6)
    }
  })
})
