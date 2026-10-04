import { describe, expect, it } from 'vitest'
import { BODIES, reachOut } from './bodies'
import { BALLOON, bunchOffsets, bunchReach, CLOUDS, farGroundAt, FAR_HILL, FRIEND_GAP, FRIEND_SCALE, friendX, GROUND, groundAt, HELD_HEIGHT, PARADE_SCALE, PARADE_TROOPS, paradeSpot, seenAt, SKY_ROW, skySlots, toWorld, viewFor, WAITING_SCALE, waitingSpot, GROWN_UP_CORNER } from './layout'

// The sizes a two-year-old needs (pack: game-design, ages-2-to-4.md), held at the size of the iPad the game is
// measured on, and the jam's floor held at a narrow surface.
const IPAD = viewFor(1180, 820)
const NARROW = viewFor(820, 1180)
/** A wide surface smaller than the iPad's, where a plain balloon would be under a hundred pixels. */
const SMALL = viewFor(1024, 640)

describe('the view', () => {
  it('shows the same world height on any wide surface and more on a narrow one', () => {
    expect(viewFor(1180, 820).height).toBe(viewFor(1366, 820).height)
    expect(NARROW.height).toBeGreaterThan(IPAD.height)
    expect(NARROW.width).toBeCloseTo(IPAD.width > 13.4 ? 13.4 : IPAD.width, 5)
  })

  it('turns a point of the surface into a point of the friends\' plane', () => {
    expect(toWorld(590, 410, 1180, 820, IPAD)).toEqual({ x: 0, y: 0 })
    const corner = toWorld(0, 0, 1180, 820, IPAD)
    expect(corner.x).toBeCloseTo(-IPAD.width / 2, 5)
    expect(corner.y).toBeCloseTo(IPAD.height / 2, 5)
  })
})

describe('the balloons', () => {
  it('are about 100 logical pixels across on the iPad held either way, and never under the jam\'s floor on a phone', () => {
    expect(IPAD.balloon).toBe(1)
    expect(2 * BALLOON * IPAD.pixelsPerUnit).toBeGreaterThanOrEqual(100)
    // Held upright the same world is narrower on screen, so the balloons a finger touches are drawn larger.
    expect(NARROW.balloon).toBeGreaterThan(1.2)
    expect(2 * BALLOON * NARROW.balloon * NARROW.pixelsPerUnit).toBeGreaterThanOrEqual(99.5)
    // A small wide surface has one row and less room: larger, as far as the row allows.
    expect(2 * BALLOON * SMALL.balloon * SMALL.pixelsPerUnit).toBeGreaterThanOrEqual(99.5)
    // A phone held wide, the smallest surface the jam's shell shows a game on (it asks for an upright one to be turned).
    const phone = viewFor(844, 390)
    expect(2 * BALLOON * phone.balloon * phone.pixelsPerUnit).toBeGreaterThanOrEqual(48)
  })

  it('hang well apart: no two bunches nearer than half a balloon, whatever is in them', () => {
    for (const view of [IPAD, NARROW, SMALL, viewFor(1024, 768), viewFor(390, 844), viewFor(844, 390)]) for (const slots of [3, 4, 5]) {
      const places = skySlots(slots, view, slots === 5 ? 1 : 3)
      // Five places hold singles; three or four may each hold a bunch of three. Every pair of places is held apart
      // by the nearest two balloons of full bunches, as large as they are drawn on that surface.
      const offsets = bunchOffsets(slots === 5 ? 1 : 3), reach = bunchReach(slots === 5 ? 1 : 3).x * view.balloon
      for (let i = 0; i < slots; i++) for (let j = i + 1; j < slots; j++) {
        let nearest = Infinity
        for (const a of offsets) for (const b of offsets) nearest = Math.min(nearest, Math.hypot(places[j].x + b.x * view.balloon - places[i].x - a.x * view.balloon, places[j].y + b.y * view.balloon - places[i].y - a.y * view.balloon))
        expect(nearest - 2 * BALLOON * view.balloon, `${slots} places, ${i} and ${j}, ${view.width.toFixed(1)} wide`).toBeGreaterThan(BALLOON * 0.5)
      }
      expect(places[0].x - reach, 'the first is inside the view').toBeGreaterThan(-view.width / 2)
    }
  })

  it('stay inside the top of the view, a bunch of three included, in one row', () => {
    for (const view of [IPAD, NARROW, SMALL, viewFor(390, 844), viewFor(844, 390)]) {
      for (const slots of [3, 4, 5]) for (const place of skySlots(slots, view)) expect(place.y + bunchReach(3).y * view.balloon, `${view.width.toFixed(1)} wide`).toBeLessThan(view.height / 2)
    }
    expect(skySlots(5, IPAD).every((place) => place.y === SKY_ROW)).toBe(true)
  })

  it('are never in the top right corner, which is the grown-up\'s and answers no touch, on any shape of surface', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [1080, 810], [1366, 1024], [1024, 640], [960, 620], [844, 390], [2000, 900]]) {
      const view = viewFor(w, h), corner = GROWN_UP_CORNER / view.pixelsPerUnit
      // Five places hold singles; three or four may hold a bunch of up to three.
      for (const [slots, largest] of [[5, 1], [4, 1], [4, 3], [3, 3], [4, 2]] as const) {
        for (const place of skySlots(slots, view, largest)) for (const offset of bunchOffsets(largest)) {
          const right = place.x + (offset.x + BALLOON) * view.balloon, top = place.y + (offset.y + BALLOON * 1.12) * view.balloon
          expect(right < view.width / 2 - corner || top < view.height / 2 - corner, `${w} by ${h}, ${slots} places of ${largest}`).toBe(true)
        }
      }
    }
    // On the iPad held wide the row is as it always was.
    expect(skySlots(4, IPAD, 3)).toEqual(skySlots(4, IPAD))
    expect(skySlots(5, IPAD, 1)).toEqual(skySlots(5, IPAD))
  })

  it('keep one arrangement for each number, with no balloon over another', () => {
    for (const count of [1, 2, 3]) {
      const offsets = bunchOffsets(count)
      expect(offsets).toHaveLength(count)
      for (const a of offsets) for (const b of offsets) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(BALLOON * 1.6)
    }
  })

  it('bob above the head of the tallest friend when held, and below the row in the sky, however large they are drawn', () => {
    const tallest = Math.max(...Object.values(BODIES).map((body) => body.height)) * FRIEND_SCALE
    for (const view of [IPAD, NARROW, SMALL, viewFor(390, 844), viewFor(844, 390)]) {
      const lowest = Math.min(...skySlots(4, view).map((place) => place.y))
      expect(HELD_HEIGHT - BALLOON * 1.3 * view.balloon, `${view.width.toFixed(1)} wide`).toBeGreaterThan(tallest)
      expect(GROUND + HELD_HEIGHT + BALLOON * 1.2 * view.balloon, `${view.width.toFixed(1)} wide`).toBeLessThan(lowest - BALLOON * 1.3 * view.balloon)
    }
  })
})

describe('the friends', () => {
  it('are each at least about 100 logical pixels across, the waiting ones included', () => {
    for (const [kind, body] of Object.entries(BODIES)) {
      expect(2 * body.halfWidth * FRIEND_SCALE * IPAD.pixelsPerUnit, kind).toBeGreaterThanOrEqual(100)
      const far = IPAD.distance / (IPAD.distance - waitingSpot(0, IPAD).z)
      // The waiting troop is drawn a little under that, and the touch reads it wider than it is drawn.
      expect(2 * body.halfWidth * FRIEND_SCALE * WAITING_SCALE * far * IPAD.pixelsPerUnit, `${kind} waiting`).toBeGreaterThanOrEqual(90)
    }
  })

  it('are as wide as their plans say, arms up: no kind reaches further out than its half-width', () => {
    const over = Object.entries(BODIES).filter(([, body]) => reachOut(body) > body.halfWidth + 1e-9).map(([kind, body]) => `${kind} reaches ${reachOut(body).toFixed(3)} past ${body.halfWidth}`)
    expect(over).toEqual([])
  })

  it('stand side by side without touching, the widest kind in a troop of three', () => {
    const widest = Math.max(...Object.values(BODIES).map((body) => body.halfWidth)) * FRIEND_SCALE
    expect(FRIEND_GAP).toBeGreaterThan(2 * widest)
    expect(friendX(0, 3)).toBe(-FRIEND_GAP)
    expect(friendX(0, 1)).toBe(0)
    expect(friendX(2, 3) + widest).toBeLessThan(IPAD.width / 2)
  })

  it('stand on the hill, above the strip where wrists rest', () => {
    expect(groundAt(0, 0)).toBeCloseTo(GROUND, 1)
    // The bottom eighth of the surface holds nothing to touch: only the hill.
    expect(GROUND).toBeGreaterThan(-IPAD.height / 2 + IPAD.height / 8)
    for (const x of [-FRIEND_GAP, 0, FRIEND_GAP]) expect(Math.abs(groundAt(x, 0) - GROUND)).toBeLessThan(0.12)
  })

  it('leave the waiting troop clear of a troop of three in the middle', () => {
    const widest = Math.max(...Object.values(BODIES).map((body) => body.halfWidth)) * FRIEND_SCALE
    const spot = waitingSpot(0, IPAD), far = IPAD.distance / (IPAD.distance - spot.z)
    expect((spot.x + widest * WAITING_SCALE) * far).toBeLessThan(friendX(0, 3) - widest)
  })
})

describe('the far hill', () => {
  it('keeps every friend of the parade on its skin, each following the one in front at more than a body\'s depth, all the way round', () => {
    // They walk in single file, each turned along the ring, so what must clear is the deepest body, front to back.
    const deepest = Math.max(...Object.values(BODIES).map((body) => Math.max(...body.body.map((p) => p.size[2])))) * 2 * FRIEND_SCALE * PARADE_SCALE
    const a = { x: 0, y: 0, z: 0, turn: 0 }, b = { x: 0, y: 0, z: 0, turn: 0 }
    for (let time = 0; time < 70; time += 0.37) {
      for (let troop = 0; troop < PARADE_TROOPS; troop++) for (let member = 0; member < 3; member++) {
        const at = paradeSpot(troop, member, time, a)
        expect(at.y).toBeCloseTo(farGroundAt(at.x, at.z), 6)
        expect(at.y, 'well up on the hill').toBeGreaterThan(FAR_HILL.y + FAR_HILL.ry * 0.6)
        // The one behind it: the next member of its troop, or the first of the troop behind.
        const behind = member < 2 ? paradeSpot(troop, member + 1, time, b) : paradeSpot((troop + PARADE_TROOPS - 1) % PARADE_TROOPS, 0, time, b)
        expect(Math.hypot(at.x - behind.x, at.z - behind.z), `troop ${troop}, friend ${member}, at ${time.toFixed(1)}`).toBeGreaterThan(deepest)
      }
    }
  })

  it('is seen to the right of a troop of three, behind it and smaller', () => {
    const at = seenAt(FAR_HILL.x, FAR_HILL.y + FAR_HILL.ry, FAR_HILL.z, IPAD, { x: 0, y: 0, scale: 1 })
    expect(at.scale).toBeLessThan(0.6)
    expect(at.x).toBeGreaterThan(friendX(2, 3))
    expect(at.x).toBeLessThan(IPAD.width / 2)
  })
})

describe('the clouds', () => {
  it('stay below the row of balloons, so nothing stands behind a balloon but sky', () => {
    for (const cloud of CLOUDS) {
      const at = seenAt(cloud.x, cloud.y, cloud.z, IPAD, { x: 0, y: 0, scale: 1 })
      expect(at.y + 0.95 * cloud.scale * at.scale).toBeLessThan(SKY_ROW - BALLOON * 1.3)
    }
  })

  it('are each big enough to touch, and the last hangs over the troop', () => {
    for (const cloud of CLOUDS) {
      const at = seenAt(cloud.x, cloud.y, cloud.z, IPAD, { x: 0, y: 0, scale: 1 })
      expect(5 * cloud.scale * at.scale * IPAD.pixelsPerUnit).toBeGreaterThanOrEqual(100)
    }
    const over = CLOUDS[CLOUDS.length - 1], at = seenAt(over.x, over.y, over.z, IPAD, { x: 0, y: 0, scale: 1 })
    expect(Math.abs(at.x)).toBeLessThan(FRIEND_GAP)
    expect(at.y).toBeGreaterThan(GROUND + 2.5)
  })
})
