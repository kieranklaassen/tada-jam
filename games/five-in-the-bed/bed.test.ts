import { describe, expect, it } from 'vitest'
import { BED, FIVE, HAND, R, STEP, grab, makeBed, other, parting, resting, rollOver, settle, sideOf, stepBed, type Bed, type Side } from './bed'
import { makeRng } from './rng'

const partings = Array.from({ length: 32 }, (_, n) => Array.from({ length: FIVE }, (_, i): Side => ((n >> i) & 1 ? 'left' : 'right')))
export function deepest(bed: Bed): number {
  let most = 0
  for (let i = 0; i < FIVE; i++) for (let j = i + 1; j < FIVE; j++) most = Math.max(most, R * 2 - Math.hypot(bed.sheep[i].x - bed.sheep[j].x, bed.sheep[i].y - bed.sheep[j].y))
  return most
}
const inside = (bed: Bed) => bed.sheep.every((s) => s.x >= BED.left + R - 0.01 && s.x <= BED.right - R + 0.01 && s.y >= BED.top + R - 0.01 && s.y <= BED.bottom - R + 0.01)

describe('the bed', () => {
  it('lays every one of the thirty-two partings down at rest, apart and off the ridge', () => {
    for (const p of partings) {
      const bed = makeBed(p)
      expect(resting(bed)).toBe(true)
      expect(bed.sheep.map((s) => sideOf(s.x))).toEqual(p)
      expect(deepest(bed)).toBeLessThan(1)
      for (const s of bed.sheep) expect(Math.abs(s.x - BED.crest)).toBeGreaterThan(SAFE)
    }
  })
  it('rolls any sheep over the ridge from any parting, and never loses one', () => {
    for (const p of partings) for (let who = 0; who < FIVE; who++) {
      const bed = makeBed(p)
      rollOver(bed, who)
      settle(bed)
      expect(resting(bed)).toBe(true)
      const parts = parting(bed)
      expect(parts.left.length + parts.right.length).toBe(FIVE)
      expect(sideOf(bed.sheep[who].x)).toBe(other(p[who]))
    }
  })
  it('keeps them apart and in bed however they are shoved', () => {
    const rng = makeRng(7)
    let worst = 0
    for (let round = 0; round < 60; round++) {
      const bed = makeBed(partings[round % 32])
      const point = () => ({ x: BED.left - 80 + rng.next() * (BED.right - BED.left + 160), y: BED.top - 80 + rng.next() * (BED.bottom - BED.top + 160) })
      const who = Math.floor(rng.next() * FIVE)
      if (round % 2) grab(bed, who, { x: bed.sheep[who].x, y: bed.sheep[who].y })
      else bed.hand = { at: point(), to: point() }
      for (let t = 0; t < 2 / STEP; t++) {
        if (t % 20 === 0) {
          if (bed.held) bed.held.at = point()
          if (bed.hand) bed.hand.to = point()
        }
        stepBed(bed)
        worst = Math.max(worst, deepest(bed))
        expect(inside(bed)).toBe(true)
      }
      settle(bed)
      expect(resting(bed)).toBe(true)
      expect(deepest(bed)).toBeLessThan(1)
      expect(HAND).toBeGreaterThan(0)
    }
    expect(worst).toBeLessThan(7)
  })
})

const SAFE = 60
