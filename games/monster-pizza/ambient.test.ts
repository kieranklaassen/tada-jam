import { describe, expect, it } from 'vitest'
import { PUFF_LASTS, bird, clouds, flames, puff, smoke } from './ambient'
import { COUNTER_Y, DOOR, OVEN } from './layout'

describe('what goes on at the edges', () => {
  it('keeps the fire alive: three tongues, never still, hardly ever the same, and taller while it bakes', () => {
    const seen = new Set<string>()
    let least = Infinity, most = 0
    for (let t = 0; t < 20; t += 1 / 30) {
      const fire = flames(t, 0)
      expect(fire.length).toBe(3)
      seen.add(fire.map((f) => f.size.toFixed(2)).join(' '))
      for (const f of fire) {
        least = Math.min(least, f.size)
        most = Math.max(most, f.size)
        // On the logs, inside the mouth.
        expect(Math.abs(f.x - OVEN.x)).toBeLessThan(OVEN.w * 0.2)
        expect(f.y).toBeGreaterThan(OVEN.y)
      }
      // The three never move as one.
      expect(new Set(fire.map((f) => f.size.toFixed(3))).size).toBeGreaterThan(1)
    }
    // Of six hundred frames, hundreds are different from every other.
    expect(seen.size).toBeGreaterThan(200)
    expect(least).toBeGreaterThan(0.3)
    expect(most).toBeLessThan(1.3)
    for (let t = 0; t < 5; t += 0.1) flames(t, 1).forEach((f, i) => expect(f.size).toBeGreaterThan(flames(t, 0)[i].size))
  })

  it('drifts two clouds over the street, and brings a bird past now and then', () => {
    let birds = 0
    for (let t = 0; t < 60; t += 0.25) {
      for (const c of clouds(t)) {
        expect(c.y).toBeGreaterThan(DOOR.y)
        expect(c.y).toBeLessThan(DOOR.y + DOOR.h * 0.5)
        expect(c.x).toBeGreaterThan(DOOR.x - DOOR.w / 2 - 121)
        expect(c.x).toBeLessThan(DOOR.x + DOOR.w / 2 + 121)
      }
      const b = bird(t)
      if (b) {
        birds += 1
        expect(b.y).toBeLessThan(COUNTER_Y - 120)
      }
    }
    // It is there for a third of the time, and away for the rest.
    expect(birds).toBeGreaterThan(60)
    expect(birds).toBeLessThan(100)
    expect(clouds(3)[0].x).not.toBe(clouds(4)[0].x)
  })

  it('lets smoke rise from the chimney and thin away to nothing', () => {
    const top = OVEN.y - OVEN.h * 0.68
    for (let t = 0; t < 10; t += 0.1) {
      for (const s of smoke(t)) {
        expect(s.y).toBeLessThanOrEqual(top)
        expect(s.y).toBeGreaterThan(top - 110)
        expect(s.alpha).toBeGreaterThanOrEqual(0)
        expect(s.alpha).toBeLessThanOrEqual(0.8)
      }
    }
  })

  it('leaves a puff of flour that grows and is gone in about half a second', () => {
    expect(puff(0).alpha).toBeGreaterThan(0.9)
    expect(puff(PUFF_LASTS / 2).size).toBeGreaterThan(puff(0).size)
    expect(puff(PUFF_LASTS).alpha).toBe(0)
    expect(PUFF_LASTS).toBeLessThan(0.8)
  })
})
