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
  it('a drop wets it, a splat muddies it, a blob leaves foam, a crumb of dried mud lies as a clod, each on its own sheet', () => {
    for (const [kind, sheet] of [[KIND.drop, 0], [KIND.splat, 1], [KIND.crumb, 3], [KIND.blob, 2]] as const) {
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

describe('the jet of the hose on the floor', () => {
  it('pushes the foam lying there away from where it lands, along the floor, and loses none of it', () => {
    const floor = new Floor()
    floor.land({ kind: KIND.blob, x: -1.0, y: 0, z: 1.0, size: 0.15 })
    const before = middle(floor, 2)
    expect(floor.push(-1.3, 1.0)).toBe(true)
    const after = middle(floor, 2)
    expect(after.x - before.x).toBeGreaterThan(0.2)
    expect(Math.abs(after.z - before.z)).toBeLessThan(0.15)
    expect(after.sum).toBeGreaterThan(before.sum * 0.8)
    expect(after.sum).toBeLessThanOrEqual(before.sum + 1e-6)
    // Again, from the same place: it goes further, and it is still foam and nothing else.
    floor.push(-1.0, 1.0)
    expect(middle(floor, 2).x).toBeGreaterThan(after.x)
    expect(middle(floor, 0).sum).toBe(0)
    expect(middle(floor, 1).sum).toBe(0)
  })

  it('moves no water and no mud, and does nothing where no foam lies', () => {
    const floor = new Floor()
    floor.land({ kind: KIND.drop, x: 0, y: 0, z: 1, size: 0.1 })
    floor.land({ kind: KIND.splat, x: 0.2, y: 0, z: 1, size: 0.1 })
    const water = middle(floor, 0), mud = middle(floor, 1)
    expect(floor.push(0.1, 1.0)).toBe(false)
    expect(middle(floor, 0)).toEqual(water)
    expect(middle(floor, 1)).toEqual(mud)
  })
})

describe('tyre lines', () => {
  it('a wet tyre\'s line is laid thick enough to be seen, and is still seen two seconds on; a line of single drops is not', () => {
    // The floor shows water from a quarter of the way up.
    const seen = 0.3
    const line = new Floor(), drops = new Floor()
    for (let x = -1; x >= -4; x -= 0.3) {
      line.land({ kind: KIND.drop, x, y: 0, z: 0.3, size: 0.09, strength: 0.9 })
      drops.land({ kind: KIND.drop, x, y: 0, z: 0.3, size: 0.02 })
    }
    const most = (floor: Floor): number => Math.max(...Array.from({ length: FLOOR.w * FLOOR.h }, (_, cell) => floor.amount[cell * SHEETS]))
    expect(most(line)).toBeGreaterThan(0.8)
    run(line, 2)
    run(drops, 2)
    expect(most(line)).toBeGreaterThan(seen)
    expect(most(drops)).toBeLessThan(seen)
    run(line, 8)
    expect(most(line)).toBe(0)
  })
})

describe('clods', () => {
  it('lie where they fell, in a row, while what is wet creeps to the drain; and are gone within some seconds like the rest', () => {
    const floor = new Floor()
    for (let x = -1; x >= -4; x -= 0.5) floor.land({ kind: KIND.crumb, x, y: 0, z: -0.4, size: 0.07 })
    floor.land({ kind: KIND.splat, x: -2.5, y: 0, z: -0.4, size: 0.1 })
    const clods = middle(floor, 3), mud = middle(floor, 1)
    run(floor, 3)
    // Three seconds on the clods are where they were, and still there to be seen; the soft mud has moved toward the drain.
    expect(middle(floor, 3).x).toBeCloseTo(clods.x, 1)
    expect(middle(floor, 3).z).toBeCloseTo(clods.z, 1)
    expect(Math.max(...Array.from({ length: FLOOR.w * FLOOR.h }, (_, cell) => floor.amount[cell * SHEETS + 3]))).toBeGreaterThan(0.4)
    expect(Math.hypot(middle(floor, 1).x - DRAIN.x, middle(floor, 1).z - DRAIN.z)).toBeLessThan(Math.hypot(mud.x - DRAIN.x, mud.z - DRAIN.z))
    run(floor, 8)
    expect(middle(floor, 3).sum).toBe(0)
  })
})
