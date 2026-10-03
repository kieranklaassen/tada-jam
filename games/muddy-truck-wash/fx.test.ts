import { describe, expect, it } from 'vitest'
import { CAPACITY, KIND, Particles, type Landing } from './fx'

const FRAME = 1 / 60

function run(pool: Particles, seconds: number, heard: Landing[] = []): Landing[] {
  for (let t = 0; t < seconds; t += FRAME) pool.step(FRAME, (landing) => heard.push(landing))
  return heard
}

describe('the pool of flying things', () => {
  it('is the same for the same seed and touches', () => {
    const a = new Particles(3), b = new Particles(3)
    for (const pool of [a, b]) {
      pool.burst(KIND.drop, 8, 0, 1, 0, 2, 1, 0.1, 1)
      run(pool, 0.3)
    }
    expect(Array.from(a.x.slice(0, a.count))).toEqual(Array.from(b.x.slice(0, b.count)))
    expect(a.count).toBe(b.count)
  })

  it('never holds more than its capacity, and a new touch still gets its things', () => {
    const pool = new Particles()
    for (let i = 0; i < CAPACITY + 40; i++) pool.emit(KIND.glint, i, 1, 0, 0, 0, 0, 0.1, 5)
    expect(pool.count).toBe(CAPACITY)
    pool.step(1)
    pool.emit(KIND.bubble, 999, 1, 0, 0, 0, 0, 0.1, 1)
    expect(pool.count).toBe(CAPACITY)
    expect(Array.from(pool.x)).toContain(999)
  })

  it('a bubble lifts and pops when its time is up, and the pop is heard once', () => {
    const pool = new Particles()
    pool.emit(KIND.bubble, 0, 1, 0, 0, 0, 0, 0.12, 0.5)
    run(pool, 0.3)
    expect(pool.y[0]).toBeGreaterThan(1)
    const heard = run(pool, 0.4)
    expect(heard).toHaveLength(1)
    expect(heard[0].kind).toBe(KIND.bubble)
    expect(pool.count).toBe(0)
  })

  it('a drop falls, lands on the floor once and is gone', () => {
    const pool = new Particles()
    pool.emit(KIND.drop, 2, 1.5, 0.3, 0, 0, 0, 0.08, 4)
    const heard = run(pool, 2)
    expect(heard).toEqual([{ kind: KIND.drop, x: 2, y: 0, z: expect.closeTo(0.3), size: expect.closeTo(0.08) }])
    expect(pool.count).toBe(0)
  })

  it('a crumb bounces once, marks the floor once, and lies where it stops until its time is up', () => {
    const pool = new Particles()
    pool.emit(KIND.crumb, 0, 1, 0, 0.5, 0, 0, 0.07, 3)
    const heard = run(pool, 2.5)
    expect(heard).toHaveLength(1)
    expect(pool.count).toBe(1)
    expect(pool.y[0]).toBeCloseTo(0.02)
    expect(pool.vx[0]).toBe(0)
    run(pool, 1)
    expect(pool.count).toBe(0)
  })

  it('a glint stays where it was laid and makes no sound', () => {
    const pool = new Particles()
    pool.emit(KIND.glint, 1, 2, 3, 5, 5, 5, 0.4, 0.5)
    run(pool, 0.2)
    expect([pool.x[0], pool.y[0], pool.z[0]]).toEqual([1, 2, 3])
    expect(run(pool, 1)).toHaveLength(0)
  })

  it('a thing that is never above the floor still ends', () => {
    const pool = new Particles()
    pool.burst(KIND.splat, 20, 0, 0.01, 0, 3, -1, 0.1, 1)
    pool.burst(KIND.dust, 10, 0, 0.5, 0, 1, 1, 0.3, 1)
    pool.burst(KIND.blob, 10, 0, 2, 0, 1, 1, 0.2, 2)
    run(pool, 4)
    expect(pool.count).toBe(0)
  })
})
