import { describe, expect, it } from 'vitest'
import { THING_KINDS, type Arrangement, type ThingAt, type ThingKind } from './arrangement'
import { CASTS, neatOf, startOf, withBenchOf } from './casts'
import { GUEST_IDS } from './guests'
import { edgesOf, roomCount, type ShapeId } from './hotel'
import { bodyBox, lensOf, spotsOf, thingBox } from './inkPlaces'
import { layoutPage, type PageLayout, type Rect } from './layout'
import { pageOfArrangement } from './page'

// Nothing passes through anything. A canvas game has no audit to read its
// scene, so this is its own: the boxes the page draws guests and things in
// (inkPlaces.ts, the same ones a finger is found in) are laid out for every
// cast and every place a thing can be put, and what a child would see cross
// is measured. Every overlap that is meant is allowed here by name, with a
// reason and a cap.

const SIZES: [number, number][] = [[1180, 820], [760, 560], [1400, 1000]]
const SHAPES: ShapeId[] = ['square', 'long', 'tower']

/** The share of the smaller box that two boxes have in common. */
function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.min(a.w * a.h, b.w * b.h)
}
const within = (inner: Rect, outer: Rect, slack: number) =>
  inner.x >= outer.x - slack && inner.y >= outer.y - slack && inner.x + inner.w <= outer.x + outer.w + slack && inner.y + inner.h <= outer.y + outer.h + slack
const pairs = <T,>(items: T[]) => items.flatMap((a, i) => items.slice(i + 1).map((b) => [a, b] as const))

function guestsOn(arrangement: Arrangement, page: PageLayout) {
  return spotsOf(pageOfArrangement(arrangement, null, true).guests, page).map(({ guest, spot }) => ({ guest, box: bodyBox(spot, page) }))
}

/** What is allowed to overlap, each with its reason and its cap (a share of the smaller box). */
const ALLOWED = {
  // Guests waiting in the lobby stand in a queue: in a narrow lobby each stands partly behind the next. Never more than three quarters hidden.
  queue: 0.78,
  // A room with two beds is a tight fit: the two who share it stand between the beds, one in front of the other. Never more than two thirds hidden.
  roommates: 0.66,
  // A guest sitting up in bed has its own quilt and its bedside clock about it: the folded quilt lies on its lap and the clock stands at its head.
  inBed: 1.001,
  // The porter stands at the back of the lobby and the first guests of the queue stand in front of him: he is staff, and is drawn behind them.
  behindTheQueue: 0.8,
  // A thing on the floor of a room stands in front of the foot of the bed, and a standing guest may stand a little in front of it.
  onFloor: 0.35,
  // The cook stands beside its cauldron, and a stove or an ice box in its room goes under the cauldron: that is where the cook puts it.
  underTheCauldron: 0.85,
  // A guest sitting up in bed leans on the wall at the bed's head: the box a finger finds it in reaches this far into that wall, in the drawing's units.
  leaningOnTheWall: 34,
}

describe('nothing passes through anything: guests', () => {
  for (const [width, height] of SIZES) {
    it(`every cast, as the coach leaves it, in its neat way and with the bench guest in, at ${width} by ${height}`, () => {
      for (const cast of CASTS) {
        const page = layoutPage(width, height, cast.house.shape)
        for (const arrangement of [startOf(cast), neatOf(cast), withBenchOf(cast)]) {
          const boxes = guestsOn(arrangement, page)
          for (const [a, b] of pairs(boxes)) {
            const shared = overlap(a.box, b.box)
            const label = `${cast.id}: ${a.guest.id} and ${b.guest.id}`
            const bothInLobby = a.guest.place === 'lobby' && b.guest.place === 'lobby'
            const roommates = typeof a.guest.place === 'object' && typeof b.guest.place === 'object' && a.guest.place.room === b.guest.place.room
            if (bothInLobby) expect(shared, `${label} in the queue`).toBeLessThanOrEqual(ALLOWED.queue)
            else if (roommates) expect(shared, `${label} sharing a room`).toBeLessThanOrEqual(ALLOWED.roommates)
            else expect(shared, label).toBeLessThan(1e-9)
          }
          for (const { guest, box } of boxes) {
            // A guest in a room is inside it: no head through a ceiling, no elbow through a wall.
            if (typeof guest.place === 'object') {
              const inBed = !guest.awake && (guest.id === 'blob' || guest.id === 'lizard')
              expect(within(box, page.rooms[guest.place.room].rect, (inBed ? ALLOWED.leaningOnTheWall : 2) * page.scale), `${cast.id}: ${guest.id} in room ${guest.place.room}`).toBe(true)
            }
            if (guest.place === 'lobby') expect(within(box, page.lobby, 2 * page.scale), `${cast.id}: ${guest.id} in the lobby`).toBe(true)
            expect(overlap(box, page.coach), `${cast.id}: ${guest.id} and the coach`).toBe(0)
            // The porter stands at the back of the lobby, by the cupboard's ladder, and the queue forms in front of him.
            expect(overlap(box, page.porter), `${cast.id}: ${guest.id} and the porter`).toBeLessThanOrEqual(guest.place === 'lobby' ? ALLOWED.behindTheQueue : 0.12)
          }
        }
      }
    })
  }

  it('no two guests in a queue stand in the very same place, so each can be told and touched', () => {
    for (const cast of CASTS) {
      const page = layoutPage(1180, 820, cast.house.shape)
      const lobby = guestsOn(startOf(cast), page).filter((one) => one.guest.place === 'lobby')
      for (const [a, b] of pairs(lobby)) expect(Math.abs(a.box.x - b.box.x), `${cast.id}: ${a.guest.id} and ${b.guest.id}`).toBeGreaterThanOrEqual(30 * page.scale)
    }
  })
})

describe('nothing passes through anything: things', () => {
  const everyGuest = (shape: ShapeId, room: number): Arrangement => ({ house: { shape, fixtures: [], twins: [] }, guests: [{ id: 'troll', at: room }], things: [], bench: null, phase: 'day' })
  const boxOf = (kind: ThingKind, at: ThingAt, page: PageLayout, arrangement: Arrangement) =>
    thingBox({ kind, at }, page, spotsOf(pageOfArrangement(arrangement, null, true).guests, page))

  for (const shape of SHAPES) {
    it(`in the ${shape} house: all five things in one room lie inside it and apart from each other`, () => {
      for (const [width, height] of SIZES) {
        const page = layoutPage(width, height, shape)
        for (let room = 0; room < roomCount(shape); room++) {
          const arrangement = everyGuest(shape, room)
          const boxes = THING_KINDS.map((kind) => ({ kind, box: boxOf(kind, { room }, page, arrangement)! }))
          for (const { kind, box } of boxes) expect(within(box, page.rooms[room].rect, 1), `${kind} in room ${room} at ${width}`).toBe(true)
          for (const [a, b] of pairs(boxes)) expect(overlap(a.box, b.box), `${a.kind} and ${b.kind} in room ${room} at ${width}`).toBeLessThan(1e-9)
        }
      }
    })

    it(`in the ${shape} house: things on a wall or a floor lie on it, apart from each other, and reach no further than the rooms on its two sides`, () => {
      const page = layoutPage(1180, 820, shape)
      const arrangement = everyGuest(shape, 0)
      for (const edge of edgesOf(shape)) {
        const boxes = (['quilt', 'pipe', 'clock'] as const).map((kind) => ({ kind, box: boxOf(kind, { edge: edge.id }, page, arrangement)! }))
        const wall = page.edges.find((one) => one.id === edge.id)!.rect
        for (const { kind, box } of boxes) {
          // Its middle is on the wall or the floor itself.
          const cx = box.x + box.w / 2, cy = box.y + box.h / 2
          expect(cx >= wall.x && cx <= wall.x + wall.w && cy >= wall.y && cy <= wall.y + wall.h, `${kind} on ${edge.id}`).toBe(true)
          const a = page.rooms[edge.a].rect, b = page.rooms[edge.b].rect
          const both: Rect = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) }
          expect(within(box, both, 1), `${kind} on ${edge.id} stays between its two rooms`).toBe(true)
        }
        // The quilt, the pipe and the clock may all be fixed to one wall or floor, each clear of the others.
        for (const [x, y] of pairs(boxes)) expect(overlap(x.box, y.box), `${x.kind} and ${y.kind} on ${edge.id}`).toBeLessThan(1e-9)
      }
    })
  }

  it('a guest and the things in its room: a standing guest hides little of a thing on the floor, and never the pipe or the clock', () => {
    for (const shape of SHAPES) {
      const page = layoutPage(1180, 820, shape)
      for (let room = 0; room < roomCount(shape); room++) {
        for (const id of GUEST_IDS) {
          for (const phase of ['day', 'night'] as const) {
            const arrangement: Arrangement = { house: { shape, fixtures: [], twins: [] }, guests: [{ id, at: room }], things: [], bench: null, phase }
            const [{ guest, box: body }] = guestsOn(arrangement, page)
            const inBed = !guest.awake && (id === 'blob' || id === 'lizard')
            for (const kind of THING_KINDS) {
              const shared = overlap(body, boxOf(kind, { room }, page, arrangement)!)
              const onFloor = kind === 'stove' || kind === 'ice'
              const cap = inBed ? ALLOWED.inBed : onFloor && id === 'cook' ? ALLOWED.underTheCauldron : onFloor || kind === 'quilt' ? ALLOWED.onFloor : 1e-9
              expect(shared, `${id} and the ${kind} in room ${room} of the ${shape} house by ${phase}`).toBeLessThanOrEqual(cap)
            }
          }
        }
      }
    }
  })

  it('what a guest holds lies beside it, each thing apart from the others', () => {
    const page = layoutPage(1180, 820, 'long')
    for (const id of GUEST_IDS) {
      for (let room = 0; room < 6; room++) {
        const arrangement: Arrangement = { house: { shape: 'long', fixtures: [], twins: [] }, guests: [{ id, at: room }], things: [], bench: null, phase: 'day' }
        const [{ box: body }] = guestsOn(arrangement, page)
        const held = (['quilt', 'pipe', 'clock'] as const).map((kind) => ({ kind, box: boxOf(kind, { guest: id }, page, arrangement)! }))
        for (const [a, b] of pairs(held)) expect(overlap(a.box, b.box), `${id}: ${a.kind} and ${b.kind}`).toBeLessThan(1e-9)
        for (const { kind, box } of held) {
          // Within arm's reach of the body, and inside the room it stands in (or a hair into its wall).
          const reach: Rect = { x: body.x - 40 * page.scale, y: body.y - 20 * page.scale, w: body.w + 80 * page.scale, h: body.h + 20 * page.scale }
          expect(within(box, reach, 1), `${id} holds the ${kind} within reach`).toBe(true)
          expect(within(box, page.rooms[room].rect, 8 * page.scale), `${id}'s ${kind} in room ${room}`).toBe(true)
        }
      }
    }
  })
})

describe('nothing passes through anything: the page', () => {
  it('the cupboard, the coach, the bench, the wheel and the chimney each have their own ground', () => {
    for (const shape of SHAPES) {
      for (const [width, height] of SIZES) {
        const page = layoutPage(width, height, shape)
        for (const [a, b] of pairs(page.slots)) expect(overlap(a, b), `two slots at ${width} in the ${shape} house`).toBe(0)
        for (const slot of page.slots) expect(within(slot, page.cupboard, 1)).toBe(true)
        expect(overlap(page.coach, page.bench)).toBe(0)
        expect(overlap(page.coach, page.benchGuest)).toBe(0)
        expect(within(page.coachDoor, page.coach, 2 * page.scale)).toBe(true)
        expect(overlap(page.wheel, page.chimney)).toBe(0)
        for (const room of page.rooms) expect(overlap(page.wheel, room.rect)).toBe(0)
        expect(overlap(page.lobby, page.kerb)).toBe(0)
        for (const [a, b] of pairs(page.rooms)) expect(overlap(a.rect, b.rect)).toBe(0)
      }
    }
  })

  it('a room drawn large stays on the plate and never covers the middle of another room', () => {
    for (const shape of SHAPES) {
      const page = layoutPage(1180, 820, shape)
      for (let room = 0; room < roomCount(shape); room++) {
        const lens = lensOf(page, room)!
        expect(within(lens.to, page.plate, 1)).toBe(true)
        for (let other = 0; other < roomCount(shape); other++) {
          if (other === room) continue
          const rect = page.rooms[other].rect
          const middle = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
          const covered = middle.x >= lens.to.x && middle.x <= lens.to.x + lens.to.w && middle.y >= lens.to.y && middle.y <= lens.to.y + lens.to.h
          expect(covered, `the large room ${room} over the middle of room ${other} in the ${shape} house`).toBe(false)
        }
      }
    }
  })
})
