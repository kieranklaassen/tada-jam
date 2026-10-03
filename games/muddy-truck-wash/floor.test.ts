import { describe, expect, it } from 'vitest'
import { CREEP, DRAIN, DRY, FLOOR, Floor, SHEETS } from './floor'
import { KIND } from './fx'

const FRAME = 1 / 60

function run(floor: Floor, seconds: number): void {
  for (let t = 0; t < seconds; t += FRAME) floor.step(FRAME)
}

/** Where the weight of one sheet lies, in floor x and z. */
function middle(floor: Floor, sheet: number): { x: number; z: number; sum: number } {
  let sum = 0, x = 0, z = 0
  const cw = (FLOOR.x1 - FLOOR.x0) / FLOOR.w, ch = (FLOOR.z1 - FLOOR.z0) / FLOOR.h
  for (let j = 0; j < FLOOR.h; j++) for (let i = 0; i < FLOOR.w; i++) {
    const a = floor.amount[(j * FLOOR.w + i) * SHEETS + sheet]
    sum += a
    x += a * (FLOOR.x0 + (i + 0.5) * cw)
    z += a * (FLOOR.z0 + (j + 0.5) * ch)
  }
  return { x: x / (sum || 1), z: z / (sum || 1), sum }
}

describe('what lands on the floor', () => {
  it('a drop wets it, a splat or a crumb muddies it, a blob leaves foam, each on its own sheet', () => {
    for (const [kind, sheet] of [[KIND.drop, 0], [KIND.splat, 1], [KIND.crumb, 1], [KIND.blob, 2]] as const) {
      const floor = new Floor()
      floor.land({ kind, x: -2, y: 0, z: 1, size: 0.1 })
      expect(floor.live).toBe(true)
      for (let s = 0; s < SHEETS; s++) expect(middle(floor, s).sum > 0, `kind ${kind} sheet ${s}`).toBe(s === sheet)
      const at = middle(floor, sheet)
      expect(at.x).toBeCloseTo(-2, 0)
      expect(at.z).toBeCloseTo(1, 0)
    }
  })

  it('a puddle creeps to the drain and is gone after a few seconds of play', () => {
    const floor = new Floor()
    for (let i = 0; i < 6; i++) floor.land({ kind: KIND.drop, x: -2.5, y: 0, z: 0.4, size: 0.12 })
    const before = middle(floor, 0)
    const gap = Math.hypot(before.x - DRAIN.x, before.z - DRAIN.z)
    run(floor, 2)
    const after = middle(floor, 0)
    expect(after.sum).toBeGreaterThan(0)
    expect(after.sum).toBeLessThan(before.sum)
    // It has moved toward the drain, by about as far as it creeps in two seconds.
    const moved = gap - Math.hypot(after.x - DRAIN.x, after.z - DRAIN.z)
    expect(moved).toBeGreaterThan(CREEP * 2 * 0.5)
    expect(moved).toBeLessThan(CREEP * 2 * 1.5)
    run(floor, 6)
    expect(floor.total()).toBe(0)
    expect(floor.live).toBe(false)
  })

  it('the thickest mark there can be is gone within eight seconds, wherever it lies', () => {
    for (const [x, z] of [[-8, -2], [6, 3], [DRAIN.x, DRAIN.z], [0, 0]] as const) {
      const floor = new Floor()
      for (let i = 0; i < 20; i++) for (let s = 0; s < SHEETS; s++) floor.stamp(x, z, 0.8, s, 1)
      expect(Math.max(...floor.amount)).toBe(1)
      run(floor, 1 / DRY + 1)
      expect(1 / DRY + 1).toBeLessThan(8)
      expect(floor.total(), `at ${x}, ${z}`).toBe(0)
    }
  })

  it('never makes more of anything: creeping and drying only take away', () => {
    const floor = new Floor()
    floor.stamp(-3, 0, 0.9, 1, 1)
    floor.stamp(3, 2, 0.9, 2, 1)
    let last = floor.total()
    for (let i = 0; i < 300; i++) {
      floor.step(FRAME)
      const now = floor.total()
      expect(now).toBeLessThanOrEqual(last + 1e-3)
      last = now
    }
  })

  it('stands still and costs nothing while nothing lies on it, and while the game rests', () => {
    const floor = new Floor()
    expect(floor.step(FRAME)).toBe(false)
    floor.stamp(0, 0, 0.5, 0, 1)
    const before = floor.total()
    // No time passes while the game is unattended: no step is taken, so nothing dries behind the child's back.
    expect(floor.total()).toBe(before)
    // And a mark off the edge of the sheets is simply not laid.
    floor.stamp(100, 100, 0.5, 0, 1)
    expect(floor.total()).toBe(before)
  })

  it('is stepped at thirty a second at most, however fast the frames come', () => {
    const floor = new Floor()
    floor.stamp(0, 0, 0.5, 0, 1)
    let steps = 0
    for (let i = 0; i < 120; i++) if (floor.step(1 / 120)) steps += 1
    expect(steps).toBeLessThanOrEqual(31)
    expect(steps).toBeGreaterThanOrEqual(28)
  })
})
