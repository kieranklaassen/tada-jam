import { describe, expect, it } from 'vitest'
import { CREATURE_KINDS } from './kinds'
import { PERSONALITY, hash, stepSpring, type Personality } from './motion'

const FIELDS: (keyof Personality)[] = ['tempo', 'stiffness', 'damping', 'sway', 'bounce', 'hop']

describe('the personalities', () => {
  it('are no near-copies: any two creatures differ by a third or more in at least four of six ways', () => {
    for (const a of CREATURE_KINDS) for (const b of CREATURE_KINDS) {
      if (a >= b) continue
      const apart = FIELDS.filter((field) => {
        const x = PERSONALITY[a][field], y = PERSONALITY[b][field]
        return Math.max(x, y) / Math.min(x, y) >= 1.33
      })
      expect(apart.length, `${a} and ${b}`).toBeGreaterThanOrEqual(4)
    }
  })

  it('settle after a landing, each in its own time', () => {
    const settleTime = (kind: (typeof CREATURE_KINDS)[number]): number => {
      const p = PERSONALITY[kind], spring = { x: 1 - p.bounce, v: 0 }
      let settledAt = 0
      for (let frame = 1; frame <= 60 * 12; frame++) {
        stepSpring(spring, 1, p.stiffness, p.damping, 1 / 60)
        expect(Number.isFinite(spring.x)).toBe(true)
        if (Math.abs(spring.x - 1) > 0.01) settledAt = frame / 60
      }
      return settledAt
    }
    const times = CREATURE_KINDS.map(settleTime)
    for (const time of times) expect(time).toBeLessThan(6)
    expect(new Set(times.map((time) => time.toFixed(1))).size).toBe(CREATURE_KINDS.length)
    // The jelly loaf wobbles longest and the bean stops first.
    expect(Math.max(...times)).toBe(times[CREATURE_KINDS.indexOf('wig')])
    expect(Math.min(...times)).toBe(times[CREATURE_KINDS.indexOf('pip')])
  })
})

describe('a spring', () => {
  it('stays finite through a very long frame', () => {
    const spring = { x: 0, v: 0 }
    stepSpring(spring, 1, 420, 13, 5)
    expect(Number.isFinite(spring.x) && Number.isFinite(spring.v)).toBe(true)
    expect(Math.abs(spring.x)).toBeLessThan(3)
  })
})

describe('the hash', () => {
  it('gives the same number for the same input, between 0 and 1', () => {
    for (let n = 0; n < 200; n++) {
      expect(hash(n)).toBe(hash(n))
      expect(hash(n)).toBeGreaterThanOrEqual(0)
      expect(hash(n)).toBeLessThan(1)
    }
  })
})
