import { describe, expect, it } from 'vitest'
import { BODIES, reachOut } from './bodies'
import { BALLOON, bunchOffsets, bunchReach, CLOUDS, farGroundAt, FAR_HILL, FRIEND_GAP, FRIEND_SCALE, friendX, GROUND, groundAt, HELD_HEIGHT, PARADE_SCALE, PARADE_TROOPS, paradeSpot, seenAt, SKY_ROW, skySlots, toWorld, viewFor, WAITING_SCALE, waitingSpot } from './layout'

// The sizes a two-year-old needs (pack: game-design, ages-2-to-4.md), held at the size of the iPad the game is
// measured on, and the jam's floor held at a narrow surface.
const IPAD = viewFor(1180, 820)
const NARROW = viewFor(820, 1180)

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
  it('are about 100 logical pixels across on the iPad and never under the jam\'s floor', () => {
    expect(2 * BALLOON * IPAD.pixelsPerUnit).toBeGreaterThanOrEqual(100)
    expect(2 * BALLOON * NARROW.pixelsPerUnit).toBeGreaterThanOrEqual(48)
  })

  it('hang well apart: no two bunches nearer than half a balloon, whatever is in them', () => {
    for (const view of [IPAD, NARROW]) for (const slots of [3, 4, 5]) {
      const places = skySlots(slots, view)
      // Five places hold singles; three or four may each hold a bunch of three.
      const reach = bunchReach(slots === 5 ? 1 : 3).x
      for (let i = 1; i < slots; i++) expect(places[i].x - places[i - 1].x - 2 * reach, `${slots} places`).toBeGreaterThan(view === IPAD ? BALLOON : 0)
      expect(places[0].x - reach, 'the first is inside the view').toBeGreaterThan(-view.width / 2)
    }
  })

  it('stay inside the top of the view, a bunch of three included', () => {
    expect(SKY_ROW + bunchReach(3).y).toBeLessThan(IPAD.height / 2)
  })

  it('keep one arrangement for each number, with no balloon over another', () => {
    for (const count of [1, 2, 3]) {
      const offsets = bunchOffsets(count)
      expect(offsets).toHaveLength(count)
      for (const a of offsets) for (const b of offsets) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(BALLOON * 1.6)
    }
  })

  it('bob above the head of the tallest friend when held, and below the row in the sky', () => {
    const tallest = Math.max(...Object.values(BODIES).map((body) => body.height)) * FRIEND_SCALE
    expect(HELD_HEIGHT - BALLOON * 1.3).toBeGreaterThan(tallest)
    expect(GROUND + HELD_HEIGHT + BALLOON * 1.2).toBeLessThan(SKY_ROW - BALLOON * 1.3)
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
