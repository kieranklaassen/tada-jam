import { describe, expect, it } from 'vitest'
import { OVER, around, cruise, fly, held, heldOver, swung, type Obstacle } from './route'

const tower: Obstacle = { x: 0, z: 0, r: 0.7, top: 3.4 }
const point = () => ({ x: 0, y: 0, z: 0 })

describe('a way through the air', () => {
  it('is a plain arc where nothing stands in the way', () => {
    expect(cruise({ x: -3, z: 2 }, { x: 3, z: 2 }, 0.9, [tower])).toBeNull()
    const from = { x: -3, y: 0.3, z: 2 }, to = { x: 3, y: 0.3, z: 2 }
    expect(fly(0, from, to, 1, null, point())).toEqual(from)
    expect(fly(1, from, to, 1, null, point())).toEqual(to)
    expect(fly(0.5, from, to, 1, null, point()).y).toBeCloseTo(1.3, 5)
  })

  it('goes over the top of whatever stands on the way, with room to spare', () => {
    const high = cruise({ x: -3, z: 0.4 }, { x: 3, z: 0.4 }, 0.9, [tower])
    expect(high).toBe(tower.top + OVER)
    // And over the tallest of several.
    expect(cruise({ x: -3, z: 0 }, { x: 3, z: 0 }, 0.9, [tower, { x: 1.5, z: 0, r: 0.5, top: 5 }, { x: -1, z: 0, r: 0.5, top: 1 }])).toBe(5 + OVER)
  })

  it('counts a thing that stands at either end of the way, too', () => {
    expect(cruise({ x: 0.5, z: 0 }, { x: 4, z: 0 }, 0.9, [tower])).toBe(tower.top + OVER)
    expect(cruise({ x: -4, z: 0 }, { x: -0.5, z: 0 }, 0.9, [tower])).toBe(tower.top + OVER)
  })

  it('is never lower than the top of a thing while it is over it', () => {
    const from = { x: -3, y: 0.3, z: 0.4 }, to = { x: 3, y: 0, z: 0.4 }, r = 0.9
    const high = cruise(from, to, r, [tower])
    for (let i = 0; i <= 200; i++) {
      const at = fly(i / 200, from, to, 1, high, point())
      if (Math.hypot(at.x - tower.x, at.z - tower.z) < r + tower.r) expect(at.y).toBeGreaterThanOrEqual(tower.top)
    }
    // It goes straight up before it crosses and comes straight down after.
    expect(fly(0.2, from, to, 1, high, point()).x).toBe(from.x)
    expect(fly(0.8, from, to, 1, high, point()).x).toBe(to.x)
    expect(fly(1, from, to, 1, high, point())).toEqual(to)
  })

  it('never crosses lower than where it starts or ends', () => {
    const from = { x: -3, y: 6, z: 0 }, to = { x: 3, y: 0, z: 0 }
    expect(fly(0.5, from, to, 0, 3.7, point()).y).toBe(6)
  })
})

describe('a toy held by a finger', () => {
  it('hangs at its own height where nothing stands near', () => {
    expect(heldOver(5, 5, 0.9, 1.2, [tower])).toBe(1.2)
  })

  it('is over the top by the time the two would touch, from any side', () => {
    for (let a = 0; a < 16; a++) {
      const x = Math.cos((a / 16) * Math.PI * 2) * (0.9 + tower.r), z = Math.sin((a / 16) * Math.PI * 2) * (0.9 + tower.r)
      expect(heldOver(x, z, 0.9, 1.2, [tower])).toBeGreaterThanOrEqual(tower.top + OVER - 1e-9)
    }
    expect(heldOver(0, 0, 0.9, 1.2, [tower])).toBeCloseTo(tower.top + OVER, 9)
  })

  it('rises as it comes near, with no jump', () => {
    let last = heldOver(4, 0, 0.9, 1.2, [tower])
    for (let x = 4; x >= 0; x -= 0.02) {
      const y = heldOver(x, 0, 0.9, 1.2, [tower])
      expect(y).toBeGreaterThanOrEqual(last - 1e-9)
      expect(y - last).toBeLessThan(0.2)
      last = y
    }
  })

  it('is not lowered by a thing shorter than where it hangs', () => {
    expect(heldOver(0, 0, 0.9, 1.2, [{ x: 0, z: 0, r: 1, top: 0.5 }])).toBe(1.2)
  })
})

describe('a way round', () => {
  const from = { x: -3, z: 0 }, to = { x: 3, z: 0 }, spot = { x: 0, z: 0 }

  it('swings furthest out at its middle and not at all at either end', () => {
    expect(swung(from, to, 2, 0, { x: 0, z: 0 })).toEqual({ x: -3, z: 0 })
    expect(swung(from, to, 2, 0.5, spot).z).toBeCloseTo(2)
    expect(swung(from, to, -2, 0.5, spot).z).toBeCloseTo(-2)
    expect(swung(from, to, 2, 1, spot).x).toBeCloseTo(3)
    expect(swung(from, to, 2, 1, spot).z).toBeCloseTo(0)
  })

  it('is the straight way where nothing stands on it', () => {
    expect(around(from, to, 0.5, [{ ...tower, z: 3 }])).toBe(0)
  })

  it('is the least swing that passes clear of a thing on the straight way, on the side asked for first', () => {
    const far = around(from, to, 0.5, [tower], 1)
    expect(far).toBeGreaterThan(tower.r + 0.5)
    expect(far).toBeLessThan(tower.r + 0.5 + 0.7)
    expect(around(from, to, 0.5, [tower], -1)).toBe(-far!)
    // Clear all the way.
    for (let u = 0; u <= 1; u += 0.02) expect(Math.hypot(swung(from, to, far!, u, spot).x, spot.z)).toBeGreaterThan(tower.r + 0.5)
  })

  it('takes the other side when the first is shut, unless it is told to keep to one', () => {
    const wall: Obstacle[] = [tower, { x: 0, z: 1.6, r: 0.9, top: 2 }, { x: 0, z: 3.4, r: 0.9, top: 2 }, { x: 0, z: 5.2, r: 0.9, top: 2 }]
    expect(around(from, to, 0.5, wall, 1)).toBeLessThan(0)
    expect(around(from, to, 0.5, wall, 1, true)).toBeUndefined()
  })

  it('finds none where a thing stands on an end of the way', () => {
    expect(around(from, { x: 0.4, z: 0 }, 0.5, [tower])).toBeUndefined()
  })
})

describe('a toy carried under the lid of the frame', () => {
  // A lid that leans toward the viewer: 4.6 high over z = -2, and 0.27 higher for each unit forward.
  const lid = (z: number): number => 4.6 + (z + 2) * 0.27
  const flat = (): number => 0
  const at = (x: number, z: number, tall: number, obstacles: Obstacle[], more = 0) => held(x, z, 0.9, tall, more, 1.25, flat, lid, obstacles, point())
  const house: Obstacle = { x: 0, z: 0, r: 1, top: 2.2 }

  it('hangs over the fingertip where nothing stands near and the lid is high enough', () => {
    expect(at(1, 2, 1.8, [])).toEqual({ x: 1, y: 1.25, z: 2 })
  })

  it('rises over a thing it can clear under the lid, as before', () => {
    const over = at(0.2, 0.1, 1.8, [house])
    expect(over.x).toBe(0.2)
    expect(over.z).toBe(0.1)
    expect(over.y).toBeGreaterThanOrEqual(house.top + OVER)
    expect(over.y + 1.8).toBeLessThanOrEqual(lid(0.1))
  })

  it('is held beside a thing it cannot clear, on the viewer\'s side, and slides round it with no jump', () => {
    let last = at(3, -0.2, 1.8, [tower])
    for (let x = 3; x >= -3; x -= 0.05) {
      const now = at(x, -0.2, 1.8, [tower])
      expect(Math.hypot(now.x, now.z)).toBeGreaterThanOrEqual(0.9 + tower.r)
      expect(now.y + 1.8).toBeLessThanOrEqual(lid(now.z) + 1e-9)
      if (Math.abs(x) < 0.8) expect(now.z).toBeGreaterThan(tower.r)
      expect(Math.hypot(now.x - last.x, now.z - last.z)).toBeLessThan(0.3)
      last = { ...now }
    }
    // Clear of it again, it is over the fingertip again.
    expect(last.x).toBeCloseTo(-3)
    expect(last.z).toBeCloseTo(-0.2)
  })

  it('goes round the same thing wherever the finger is: never over it from one side and beside it from the other', () => {
    for (const z of [-2.5, -1, 0, 1, 2.5]) for (const x of [-0.5, 0, 0.5]) expect(Math.hypot(at(x, z, 1.8, [tower]).x, at(x, z, 1.8, [tower]).z)).toBeGreaterThanOrEqual(Math.min(0.9 + tower.r, Math.hypot(x, z)))
  })

  it('is held lower where the lid is low, down to the ground, and no further back than it can stand', () => {
    // A tall thing: far back, the lid is lower than it is tall.
    const tall = at(0, -9, 3.4, [])
    expect(tall.y).toBeLessThan(0.05)
    expect(tall.z).toBeGreaterThan(-9)
    expect(tall.y + 3.4).toBeLessThanOrEqual(lid(tall.z) + 1e-9)
    // Nearer, it hangs as high as the lid lets it.
    const near = at(0, -3, 3.4, [])
    expect(near.z).toBe(-3)
    expect(near.y).toBeCloseTo(lid(-3) - 3.4)
    // And stretched as it is lifted, lower by that much.
    expect(at(0, -3, 3.4, [], 0.2).y).toBeCloseTo(lid(-3) - 3.6)
  })
})
