import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { CORNER, dropAt, guestAt, hitAt, roomUnder } from './hit'
import { GUEST_IDS } from './guests'
import { spotReach } from './inkGuests'
import { bodyBox, fromPlain, lensOf, reachBoxes, spotsOf, toPlain, upsideDown } from './inkPlaces'
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

  it('a finger on what a guest holds out in the spot colour takes that guest: the horn, its music, its cloud and string, its bag', () => {
    // By day and by night, so that each of the four is seen awake: the singer holds her music out only while she sings.
    const stoodAt = (phase: 'day' | 'night') => spotsOf(pageOfArrangement(arrange({ shape: 'square', fixtures: [], twins: [] }, { troll: 2, singer: 0, yeti: 1, bat: 'lobby' }, {}, { phase }), null, true).guests, page)
    const seen = new Set<string>()
    for (const stood of [stoodAt('day'), stoodAt('night')]) for (const { guest, spot } of stood) {
      const body = bodyBox(spot, page)
      for (const box of reachBoxes(guest, spot, page)) {
        // Somewhere in the box that is on no body: there the finger used to land on the room or the lobby behind.
        const at = [middle(box), { x: box.x + 3, y: box.y + 3 }, { x: box.x + box.w - 3, y: box.y + 3 }, { x: box.x + 3, y: box.y + box.h - 3 }, { x: box.x + box.w - 3, y: box.y + box.h - 3 }]
          .find((point) => guestAt(page, stood, point) === null)
        if (!at) continue
        expect(at.x < body.x || at.x > body.x + body.w || at.y < body.y).toBe(true)
        expect(hitAt(page, stood, at)).toMatchObject({ kind: 'guest', id: guest.id })
        seen.add(guest.id)
      }
    }
    expect([...seen].sort()).toEqual(['bat', 'singer', 'troll', 'yeti'])
    // The horn is on the side the troll is drawn facing away from its bed, and mirrors with the figure.
    const troll = stoodAt('day').find((entry) => entry.guest.id === 'troll')!
    const horn = reachBoxes(troll.guest, troll.spot, page)[0]
    expect(horn.x + horn.w / 2 > troll.spot.x).toBe(!troll.spot.flip)
  })

  it('a body comes before what another guest holds out over it, and a guest is never set down on a horn', () => {
    const queue = arrange({ shape: 'square', fixtures: [], twins: [] }, { troll: 'lobby', bat: 'lobby', singer: 'lobby' }, {}, {})
    const stood = spotsOf(pageOfArrangement(queue, null, true).guests, page)
    for (const { guest, spot } of stood) {
      const body = bodyBox(spot, page)
      for (let x = body.x + 2; x < body.x + body.w; x += 9) {
        for (let y = body.y + 2; y < body.y + body.h; y += 9) {
          const plain = guestAt(page, stood, { x, y })
          expect(guestAt(page, stood, { x, y }, null, true)).toEqual(plain)
          expect(plain).not.toBeNull()
        }
      }
      void guest
    }
    const troll = stood.find((entry) => entry.guest.id === 'troll')!
    const free = reachBoxes(troll.guest, troll.spot, page).map(middle).find((point) => guestAt(page, stood, point) === null)
    if (free) expect(dropAt(page, stood, free, 'bat').kind).not.toBe('guest')
  })

  it('every guest has a box for its bag, and a guest rolled in the quilt holds nothing out but its bag and, the yeti, its cloud', () => {
    for (const id of GUEST_IDS) {
      expect(spotReach(id, { awake: true, wrapped: false, bag: true }).length).toBe(spotReach(id, { awake: true, wrapped: false, bag: false }).length + 1)
      expect(spotReach(id, { awake: true, wrapped: true, bag: false }).length).toBe(id === 'yeti' ? 2 : 0)
      for (const [x1, y1, x2, y2] of spotReach(id, { awake: true, wrapped: false, bag: true })) {
        expect(x2).toBeGreaterThan(x1)
        expect(y2).toBeGreaterThan(y1)
      }
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

  it('a room door, a bed, the boiler in its bay, the luggage and the bird cage on it are each themselves, and a house without a boiler or a second bed has plaster and air there', () => {
    const room = page.rooms[1]
    expect(hitAt(page, standing, middle(room.door))).toEqual({ kind: 'roomDoor', room: 1 })
    expect(hitAt(page, standing, middle(room.bed))).toEqual({ kind: 'bed', room: 1 })
    // The slab under a room on the ground lies along the foot of its bed and does not reach over it, and a finger on the slab itself still lands there.
    expect(hitAt(page, standing, { x: middle(room.bed).x, y: room.bed.y + room.bed.h - 2 })).toEqual({ kind: 'bed', room: 1 })
    expect(hitAt(page, standing, { x: middle(room.bed).x, y: room.rect.y + room.rect.h + 2 })).toEqual({ kind: 'edge', id: 'under-1', nearer: 1 })
    const mirrored = { x: 2 * (room.rect.x + room.rect.w / 2) - (room.bed.x + room.bed.w / 2), y: room.bed.y + 4 }
    expect(hitAt(page, standing, mirrored, [], false, { fixtures: [], twins: [] }).kind).not.toBe('bed')
    expect(hitAt(page, standing, mirrored, [], false, { fixtures: [], twins: [1] })).toEqual({ kind: 'bed', room: 1 })
    const bay = middle(page.cellarBays[0])
    expect(hitAt(page, standing, bay).kind).toBe('house')
    expect(hitAt(page, standing, bay, [], false, { fixtures: [{ kind: 'snow', col: 0 }], twins: [] }).kind).toBe('house')
    expect(hitAt(page, standing, bay, [], false, { fixtures: [{ kind: 'boiler', col: 0 }], twins: [] }).kind).toBe('boiler')
    const lg = page.luggage
    expect(hitAt(page, standing, { x: lg.x + lg.w / 2, y: lg.y + lg.h - 10 }).kind).toBe('luggage')
    expect(hitAt(page, standing, { x: lg.x + 26 * page.scale, y: lg.y + 12 * page.scale }).kind).toBe('cage')
    // Each is at least a finger across.
    for (const rect of [room.door, room.bed, page.cellarBays[0], lg]) expect(Math.min(rect.w, rect.h)).toBeGreaterThanOrEqual(TOUCH)
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

describe('two who share a room for two are both seen', () => {
  const twins = { shape: 'square' as const, fixtures: [], twins: [0, 3] }
  const pairs: [string, string][] = []
  for (const a of GUEST_IDS) for (const b of GUEST_IDS) if (a < b) pairs.push([a, b])

  it('each has its own half of the room, by day and by night, and a finger finds each of them', () => {
    for (const [a, b] of pairs) for (const phase of ['day', 'night'] as const) for (const room of [0, 3]) {
      const stood = spotsOf(pageOfArrangement(arrange(twins, { [a]: room, [b]: room }, {}, { phase }), null, true).guests, page)
      const [one, two] = stood
      const middle = page.rooms[room].rect.x + page.rooms[room].rect.w / 2
      // One on either side of the middle of the room.
      expect((one.spot.x - middle) * (two.spot.x - middle), `${a} ${b} ${phase}`).toBeLessThan(0)
      // Their bodies are at least two thirds clear of each other, where one used to stand in front of the other.
      const apart = Math.abs(bodyBox(one.spot, page).x - bodyBox(two.spot, page).x)
      expect(apart / bodyBox(one.spot, page).w, `${a} ${b} ${phase}`).toBeGreaterThan(0.66)
      for (const { guest, spot } of stood) {
        const box = bodyBox(spot, page)
        const own = spot.x < middle ? box.x + box.w * 0.25 : box.x + box.w * 0.75
        expect(guestAt(page, stood, { x: own, y: box.y + box.h / 2 })?.id, `${a} ${b} ${phase}`).toBe(guest.id)
      }
    }
  })

  it('nobody changes halves when the list comes back in the order it was drawn, and the fly is drawn first, its wings behind the other', () => {
    for (const [a, b] of pairs) {
      const scene = pageOfArrangement(arrange(twins, { [a]: 0, [b]: 0 }, {}, {}), null, true)
      const stood = spotsOf(scene.guests, page)
      const again = spotsOf(stood.map((one) => one.guest), page)
      const backwards = spotsOf([...scene.guests].reverse(), page)
      for (const list of [again, backwards]) for (const { guest, spot } of list) expect(spot, `${a} ${b}`).toEqual(stood.find((one) => one.guest.id === guest.id)!.spot)
      if (a === 'fly' || b === 'fly') expect(stood[0].guest.id).toBe('fly')
    }
  })

  it('a guest alone in a room for two stands where it would in any room', () => {
    const alone = spotsOf(pageOfArrangement(arrange(twins, { troll: 0 }, {}, {}), null, true).guests, page)
    const plain = spotsOf(pageOfArrangement(arrange({ shape: 'square', fixtures: [], twins: [] }, { troll: 0 }, {}, {}), null, true).guests, page)
    expect(alone[0].spot).toEqual(plain[0].spot)
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
