import { describe, expect, it } from 'vitest'
import { LONGEST_FRAME_S } from './config'
import { IDLE_CURVES, Spring, dodge, nearness } from './motion'

const sample = (curve: (t: number) => number): number[] => Array.from({ length: 600 }, (_, i) => curve(i * 0.05))

/** How alike two curves are over half a minute: 1 is the same shape, 0 is unrelated. */
function likeness(a: number[], b: number[]): number {
  const mean = (v: number[]): number => v.reduce((sum, x) => sum + x, 0) / v.length
  const ma = mean(a), mb = mean(b)
  let ab = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) {
    ab += (a[i] - ma) * (b[i] - mb)
    aa += (a[i] - ma) ** 2
    bb += (b[i] - mb) ** 2
  }
  return Math.abs(ab) / Math.sqrt(aa * bb)
}

describe('how each creature moves by itself', () => {
  it('moves every one of them, within bounds, with nothing sudden but a hop or a turn of the head', () => {
    for (const [name, curve] of Object.entries(IDLE_CURVES)) {
      const values = sample(curve)
      expect(Math.max(...values) - Math.min(...values), name).toBeGreaterThan(0.05)
      for (const value of values) {
        expect(Number.isFinite(value), name).toBe(true)
        expect(Math.abs(value), name).toBeLessThanOrEqual(1.0001)
      }
    }
  })

  it('gives no two of them the same curve', () => {
    const names = Object.keys(IDLE_CURVES)
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const alike = likeness(sample(IDLE_CURVES[names[i]]), sample(IDLE_CURVES[names[j]]))
      expect(alike, `${names[i]} and ${names[j]}`).toBeLessThan(0.6)
    }
  })

  it('is the same at the same time, and reads no clock', () => {
    for (const curve of Object.values(IDLE_CURVES)) expect(curve(12.34)).toBe(curve(12.34))
  })
})

describe('a spring', () => {
  it('settles on its target, overshooting on the way when it is lightly damped', () => {
    const spring = new Spring(0, 120, 5.5)
    let highest = 0
    for (let n = 0; n < 600; n++) highest = Math.max(highest, spring.step(1, 1 / 60))
    expect(highest).toBeGreaterThan(1.02)
    expect(spring.value).toBeCloseTo(1, 3)
  })

  it('takes a kick and comes back to rest', () => {
    const spring = new Spring(0, 320, 13)
    spring.kick(8)
    spring.step(0, 1 / 60)
    expect(spring.value).toBeGreaterThan(0)
    for (let n = 0; n < 600; n++) spring.step(0, 1 / 60)
    expect(Math.abs(spring.value)).toBeLessThan(1e-3)
  })

  it('stays steady at the longest frame the game plays, for the stiffest spring it has', () => {
    const spring = new Spring(0, 500, 12)
    spring.kick(20)
    let furthest = 0
    for (let n = 0; n < 200; n++) furthest = Math.max(furthest, Math.abs(spring.step(0, LONGEST_FRAME_S)))
    expect(furthest).toBeLessThan(3)
    expect(Math.abs(spring.value)).toBeLessThan(1e-3)
  })

  it('is put somewhere at rest by `set`', () => {
    const spring = new Spring(0, 100, 10)
    spring.kick(50)
    spring.set(4)
    expect(spring.step(4, 1 / 60)).toBe(4)
  })
})

describe('what gets out of the way', () => {
  it('leaves a thing at rest when nothing is near, and puts it clear of a body that is', () => {
    const out = { x: 0, y: 0 }
    expect(dodge({ x: 10, y: 20 }, null, 50, out)).toEqual({ x: 10, y: 20 })
    expect(dodge({ x: 10, y: 20 }, { x: 200, y: 20 }, 50, out)).toEqual({ x: 10, y: 20 })
    for (const body of [{ x: 30, y: 20 }, { x: 10, y: 50 }, { x: -5, y: 0 }, { x: 10, y: 20 }]) {
      dodge({ x: 10, y: 20 }, body, 50, out)
      expect(Math.hypot(out.x - body.x, out.y - body.y)).toBeCloseTo(50, 6)
    }
    // A body right on it sends it straight up.
    expect(dodge({ x: 10, y: 20 }, { x: 10, y: 20 }, 50, out)).toEqual({ x: 10, y: -30 })
  })

  it('moves without a jump as a body comes by', () => {
    const out = { x: 0, y: 0 }
    let last = { ...dodge({ x: 0, y: 0 }, { x: -80, y: 30 }, 50, out) }
    for (let x = -80; x <= 80; x += 1) {
      const at = dodge({ x: 0, y: 0 }, { x, y: 30 }, 50, out)
      expect(Math.hypot(at.x - last.x, at.y - last.y)).toBeLessThan(4)
      last = { ...at }
    }
  })

  it('measures how near a body is from 0, far off, to 1, close by', () => {
    expect(nearness(0, 0, null, 50, 100)).toBe(0)
    expect(nearness(0, 0, { x: 300, y: 0 }, 50, 100)).toBe(0)
    expect(nearness(0, 0, { x: 75, y: 0 }, 50, 100)).toBeCloseTo(0.5, 6)
    expect(nearness(0, 0, { x: 10, y: 0 }, 50, 100)).toBe(1)
  })
})
