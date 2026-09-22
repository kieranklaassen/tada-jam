import { describe, expect, it } from 'vitest'
import { TABLE } from './layout'
import { stepWorld, STEP, type Body } from './physics'

const body = (over: Partial<Body>): Body => ({ id: 1, x: 700, y: 500, vx: 0, vy: 0, r: 30, kinematic: false, friction: 3, ...over })

describe('stepWorld', () => {
  it('slows a rolling stone to rest without reversing it', () => {
    const stone = body({ vx: 600 })
    let lastX = stone.x
    let steps = 0
    while ((stone.vx !== 0 || steps === 0) && steps < 2000) {
      stepWorld([stone], STEP, TABLE)
      expect(stone.vx).toBeGreaterThanOrEqual(0)
      expect(stone.x).toBeGreaterThanOrEqual(lastX)
      lastX = stone.x
      steps++
    }
    expect(stone.vx).toBe(0)
    expect(steps).toBeLessThan(2000)
  })

  it('separates two overlapping stones in one step', () => {
    const a = body({ id: 1, x: 700 })
    const b = body({ id: 2, x: 720 })
    stepWorld([a, b], STEP, TABLE)
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(59.99)
  })

  it('conserves momentum in a head-on collision', () => {
    const a = body({ id: 1, x: 600, vx: 400, friction: 0 })
    const b = body({ id: 2, x: 700, vx: -100, friction: 0 })
    const before = a.vx + b.vx
    for (let i = 0; i < 60; i++) stepWorld([a, b], STEP, TABLE)
    expect(a.vx + b.vx).toBeCloseTo(before, 5)
    expect(a.vx).toBeLessThan(b.vx)
  })

  it('lets a held stone push others without being pushed', () => {
    const held = body({ id: 1, x: 700, kinematic: true })
    const loose = body({ id: 2, x: 740 })
    stepWorld([held, loose], STEP, TABLE)
    expect(held.x).toBe(700)
    expect(loose.x).toBeGreaterThanOrEqual(760)
  })

  it('reports a stone that crosses the table edge as fallen', () => {
    const stone = body({ x: TABLE.x + TABLE.w - 5, vx: 900, friction: 0 })
    const report = stepWorld([stone], STEP * 4, TABLE)
    expect(report.fallen).toEqual([1])
  })

  it('reports hard impacts and stays quiet for resting contact', () => {
    const resting = stepWorld([body({ id: 1, x: 700 }), body({ id: 2, x: 760 })], STEP, TABLE)
    expect(resting.impacts).toEqual([])
    const hit = stepWorld([body({ id: 1, x: 700, vx: 500 }), body({ id: 2, x: 761 })], STEP * 2, TABLE)
    expect(hit.impacts.length).toBeGreaterThan(0)
    expect(hit.impacts[0].speed).toBeGreaterThan(90)
  })

  it('sweeps stones ahead of a pushing finger', () => {
    const stone = body({ x: 700 })
    const report = stepWorld([stone], STEP, TABLE, [{ x: 650, y: 500, vx: 800, vy: 0, r: 50 }])
    expect(stone.x).toBeGreaterThan(700)
    expect(stone.vx).toBeGreaterThan(0)
    expect(report.moving).toBe(true)
  })

  it('bounces stones off fixtures like guests and the bag', () => {
    const stone = body({ x: 640, vx: 600, friction: 0 })
    stepWorld([stone], STEP * 8, TABLE, [], [{ x: 720, y: 500, r: 50 }])
    expect(stone.vx).toBeLessThan(0)
    expect(Math.hypot(stone.x - 720, stone.y - 500)).toBeGreaterThanOrEqual(79.9)
  })

  it('keeps stones inside a walled bowl, even when crowded', () => {
    const wall = { x: 700, y: 500, r: 105 }
    const stones = Array.from({ length: 5 }, (_, i) => body({ id: i + 1, x: 690 + i * 5, y: 500 + (i % 2) * 5 }))
    for (let i = 0; i < 240; i++) stepWorld(stones, STEP, TABLE, [], [], [wall])
    for (const stone of stones) expect(Math.hypot(stone.x - wall.x, stone.y - wall.y)).toBeLessThanOrEqual(wall.r)
  })

  it('lets a stone outside a container roll in freely', () => {
    const stone = body({ x: 500, vx: 800, friction: 0 })
    for (let i = 0; i < 30; i++) stepWorld([stone], STEP, TABLE, [], [], [{ x: 700, y: 500, r: 105 }])
    expect(stone.x).toBeGreaterThan(600)
  })
})
