import { describe, expect, it } from 'vitest'
import { CARRIERS } from './cast'
import { homeTurn, move, rest, STRIDE, type Pose } from './motion'

const trace = (who: (typeof CARRIERS)[number], o: { squash: number; hop: number; speed: number }): Pose[] =>
  Array.from({ length: 80 }, (_, i) => structuredClone(move(who, { walked: i * 9, speed: o.speed, time: 2 + i / 60, squash: o.squash ? 1 - i / 80 : 0, hop: o.hop ? 1 - i / 80 : 0 }, rest())))

describe('each who carries moves like itself', () => {
  it('in walking, being touched and hopping', () => {
    for (const o of [{ squash: 0, hop: 0, speed: 900 }, { squash: 1, hop: 0, speed: 0 }, { squash: 0, hop: 1, speed: 0 }]) {
      const all = CARRIERS.map((who) => trace(who, o))
      for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
        const far = all[a].reduce((s, p, i) => { const q = all[b][i]; return s + Math.abs(p.lift - q.lift) / 20 + Math.abs(p.turn - q.turn) * 4 + Math.abs(p.part - q.part) + Math.abs(p.squash - q.squash) * 5 + Math.abs(p.mouth - q.mouth) }, 0) / 80
        expect(far).toBeGreaterThan(0.12)
      }
    }
    expect(new Set(Object.values(STRIDE)).size).toBe(4)
    expect(new Set(CARRIERS.map((who) => homeTurn(who, 0.7).toFixed(3))).size).toBe(4)
  })
  it('never leaves the ground downward or turns over while walking', () => {
    for (const who of CARRIERS) for (const p of trace(who, { squash: 1, hop: 1, speed: 1200 })) {
      expect(p.lift).toBeGreaterThanOrEqual(0)
      expect(Math.abs(p.turn)).toBeLessThan(0.8)
      expect(p.squash).toBeGreaterThan(0.6)
    }
  })
})
