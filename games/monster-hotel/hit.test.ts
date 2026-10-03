import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { CORNER, dropAt, guestAt, hitAt, roomUnder } from './hit'
import { bodyBox, fromPlain, lensOf, spotsOf, toPlain, upsideDown } from './inkPlaces'
import { TOUCH, layoutPage } from './layout'
import { pageOfArrangement } from './page'

const page = layoutPage(1180, 820, 'square')
const house = arrange({ shape: 'square', fixtures: [], twins: [] }, { troll: 2, bat: 'lobby', blob: 'bench' }, {}, { bench: 'blob' })
const standing = spotsOf(pageOfArrangement(house, null, true).guests, page)
const middle = (rect: { x: number; y: number; w: number; h: number }) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })

describe('what a finger landed on', () => {
  it('a guest, wherever it stands, with how high on its body', () => {
    for (const { guest, spot } of standing) {
      const box = bodyBox(spot, page)
      expect(box.w).toBeGreaterThanOrEqual(TOUCH)
      expect(box.h).toBeGreaterThanOrEqual(TOUCH)
      expect(hitAt(page, standing, middle(box))).toMatchObject({ kind: 'guest', id: guest.id })
      const head = hitAt(page, standing, { x: box.x + box.w / 2, y: box.y + 2 })
      const feet = hitAt(page, standing, { x: box.x + box.w / 2, y: box.y + box.h - 2 })
      if (head.kind !== 'guest' || feet.kind !== 'guest') throw new Error('expected the guest')
      expect(head.where).toBeGreaterThan(0.9)
      expect(feet.where).toBeLessThan(0.1)
    }
  })

  it('the wheel, a room, a wall with its nearer room, the lobby, the porter, the door, the house and the paper', () => {
    expect(hitAt(page, standing, middle(page.wheel)).kind).toBe('wheel')
    expect(hitAt(page, standing, { x: page.rooms[1].rect.x + 100, y: page.rooms[1].rect.y + 40 })).toEqual({ kind: 'room', room: 1 })
    const wall = page.edges.find((edge) => edge.id === '0-1')!.rect
    expect(hitAt(page, standing, { x: wall.x + 1, y: wall.y + 50 })).toEqual({ kind: 'edge', id: '0-1', nearer: 0 })
    expect(hitAt(page, standing, { x: wall.x + wall.w - 1, y: wall.y + 50 })).toEqual({ kind: 'edge', id: '0-1', nearer: 1 })
    const floor = page.edges.find((edge) => edge.id === '1-3')!.rect
    expect(hitAt(page, standing, { x: floor.x + 60, y: floor.y + floor.h - 1 })).toEqual({ kind: 'edge', id: '1-3', nearer: 1 })
    expect(hitAt(page, standing, middle(page.porter)).kind).toBe('porter')
    expect(hitAt(page, standing, middle(page.frontDoor)).kind).toBe('door')
    expect(hitAt(page, standing, middle(page.roof)).kind).toBe('house')
    expect(hitAt(page, standing, middle(page.cellar)).kind).toBe('house')
    expect(hitAt(page, standing, { x: 4, y: 400 }).kind).toBe('paper')
  })

  it('the top right corner is the grown-up and answers nothing', () => {
    expect(hitAt(page, standing, { x: 1180 - 5, y: 5 }).kind).toBe('corner')
    expect(hitAt(page, standing, { x: 1180 - CORNER - 1, y: 5 }).kind).not.toBe('corner')
  })

  it('every point of the page is something', () => {
    const kinds = new Set<string>()
    for (let x = 0; x <= 1180; x += 20) for (let y = 0; y <= 820; y += 20) kinds.add(hitAt(page, standing, { x, y }).kind)
    for (const kind of ['guest', 'wheel', 'room', 'edge', 'lobby', 'bench', 'porter', 'door', 'house', 'paper', 'corner']) expect(kinds, kind).toContain(kind)
  })
})

describe('where a carried guest is set down', () => {
  it('on another guest, in a room, on a wall, in the lobby, on the bench, or nowhere', () => {
    const troll = standing.find((one) => one.guest.id === 'troll')!
    expect(dropAt(page, standing, middle(bodyBox(troll.spot, page)), 'bat')).toEqual({ kind: 'guest', id: 'troll' })
    // The guest in the hand is never under itself.
    expect(dropAt(page, standing, middle(bodyBox(troll.spot, page)), 'troll')).toEqual({ kind: 'room', room: 2 })
    expect(guestAt(page, standing, middle(bodyBox(troll.spot, page)), 'troll')).toBe(null)
    expect(dropAt(page, standing, { x: page.rooms[1].rect.x + 100, y: page.rooms[1].rect.y + 40 }, 'bat')).toEqual({ kind: 'room', room: 1 })
    expect(dropAt(page, standing, middle(page.edges.find((edge) => edge.id === '0-1')!.rect), 'bat').kind).toBe('edge')
    expect(dropAt(page, standing, { x: page.lobby.x + page.lobby.w * 0.7, y: page.lobby.y + 30 }, 'troll')).toEqual({ kind: 'lobby' })
    expect(dropAt(page, standing, { x: page.kerb.x + page.kerb.w * 0.6, y: page.kerb.y + page.kerb.h * 0.8 }, 'troll')).toEqual({ kind: 'bench' })
    expect(dropAt(page, standing, { x: 3, y: 3 }, 'troll')).toEqual({ kind: 'nowhere' })
    expect(roomUnder(page, middle(page.rooms[3].rect))).toBe(3)
    expect(roomUnder(page, middle(page.lobby))).toBe(null)
  })
})

describe('the page from a guest place and the finger agree', () => {
  it('a point taken into a view and back is the same point, large room or not, upside down or not', () => {
    for (const view of [null, { from: 'troll' as const, room: 2 }, { from: 'bat' as const, room: 3 }, { from: 'bat' as const, room: 1, large: false }, { from: 'blob' as const, room: null }]) {
      for (const point of [middle(page.rooms[2].rect), middle(page.rooms[3].rect), middle(page.lobby), middle(page.wheel), middle(page.rooms[0].rect)]) {
        const back = toPlain(page, view, fromPlain(page, view, point))
        expect(back.x).toBeCloseTo(point.x, 6)
        expect(back.y).toBeCloseTo(point.y, 6)
      }
    }
  })

  it('what the large room covers is the large room: a finger on its overlap lands in that room, as drawn', () => {
    // Room 3 is over room 1. Drawn large, it reaches a little way down over the top of room 1.
    const view = { from: 'bat' as const, room: 3 }
    const top = { x: page.rooms[1].rect.x + 60, y: page.rooms[1].rect.y + 4 }
    const seen = toPlain(page, { from: 'troll', room: 3 }, top)
    expect(roomUnder(page, seen)).toBe(3)
    expect(roomUnder(page, toPlain(page, { ...view, large: false }, fromPlain(page, { ...view, large: false }, top)))).toBe(1)
  })

  it('the large room is its room enlarged about its middle and kept on the plate', () => {
    for (let room = 0; room < 4; room++) {
      const lens = lensOf(page, room)!
      expect(lens.to.w).toBeCloseTo(lens.from.w * lens.scale)
      expect(lens.to.x).toBeGreaterThanOrEqual(page.plate.x)
      expect(lens.to.y).toBeGreaterThanOrEqual(page.plate.y)
      expect(lens.to.x + lens.to.w).toBeLessThanOrEqual(page.plate.x + page.plate.w + 1e-6)
      expect(lens.to.y + lens.to.h).toBeLessThanOrEqual(page.plate.y + page.plate.h + 1e-6)
    }
    expect(lensOf(page, null)).toBe(null)
    expect(lensOf(page, 9)).toBe(null)
  })

  it('only the bat hangs: its page alone is upside down', () => {
    expect(upsideDown('bat')).toBe(true)
    for (const id of ['troll', 'blob', 'yeti', 'lizard', 'cook', 'fly', 'singer', null] as const) expect(upsideDown(id)).toBe(false)
    // In the child's hand even the bat's page lies as it is.
    expect(upsideDown('bat', true)).toBe(false)
    expect(fromPlain(page, { from: 'bat', room: 1, large: false, inHand: true }, { x: 300, y: 300 })).toEqual({ x: 300, y: 300 })
    const top = { x: page.plate.x + 10, y: page.plate.y + 10 }
    const turned = fromPlain(page, { from: 'bat', room: null }, top)
    expect(turned.x).toBeCloseTo(page.plate.x + page.plate.w - 10)
    expect(turned.y).toBeCloseTo(page.plate.y + page.plate.h - 10)
  })
})
