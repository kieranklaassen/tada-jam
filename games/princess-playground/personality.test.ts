import { describe, expect, it } from 'vitest'
import { PERSONALITY, type Personality } from './personality'
import { CROWN, FRIEND_IDS, FRIENDS } from './world'

describe('the friends move like themselves', () => {
  const keys = Object.keys(PERSONALITY.pim) as (keyof Personality)[]

  it('no two friends share a way of moving, or a near copy of one', () => {
    for (let i = 0; i < FRIEND_IDS.length; i++) {
      for (let j = i + 1; j < FRIEND_IDS.length; j++) {
        const a = PERSONALITY[FRIEND_IDS[i]], b = PERSONALITY[FRIEND_IDS[j]]
        // Count the numbers that differ by more than a tenth.
        const apart = keys.filter((key) => Math.abs(a[key] - b[key]) > 0.1 * Math.max(Math.abs(a[key]), Math.abs(b[key]), 1e-6))
        expect(apart.length, `${FRIEND_IDS[i]} and ${FRIEND_IDS[j]}`).toBeGreaterThanOrEqual(10)
      }
    }
  })

  it('a hop takes its own time for each friend, and the two of one size do not hop alike', () => {
    const tempo = FRIEND_IDS.map((id) => FRIENDS[id].hopSeconds + PERSONALITY[id].gather)
    expect(new Set(tempo.map((t) => t.toFixed(2))).size).toBe(4)
    expect(Math.abs(tempo[1] - tempo[2])).toBeGreaterThan(0.01)
    expect(PERSONALITY.mog.heldStretch).toBeGreaterThan(PERSONALITY.dot.heldStretch + 0.15)
  })

  it('size alone shows weight: Pim with her crown on is still the lowest and narrowest outline, and the two of one weight are one size', () => {
    const pimTop = FRIENDS.pim.halfHeight * CROWN.seat + FRIENDS.pim.radius * CROWN.rise
    for (const id of ['mog', 'dot', 'bo'] as const) {
      expect(pimTop, id).toBeLessThan(FRIENDS[id].halfHeight * 2)
      expect(FRIENDS.pim.radius * Math.max(1, CROWN.girth), id).toBeLessThan(FRIENDS[id].radius)
    }
    expect(FRIENDS.mog.radius).toBe(FRIENDS.dot.radius)
    expect(FRIENDS.mog.halfHeight).toBe(FRIENDS.dot.halfHeight)
    expect(PERSONALITY.mog.tossGain).toBe(PERSONALITY.dot.tossGain)
    // Heavier is bigger, every time.
    const byWeight = [...FRIEND_IDS].sort((a, b) => FRIENDS[a].weight - FRIENDS[b].weight)
    for (let i = 1; i < byWeight.length; i++) expect(FRIENDS[byWeight[i]].halfHeight).toBeGreaterThanOrEqual(FRIENDS[byWeight[i - 1]].halfHeight)
  })

  it('the heavier the friend, the less of a throw it takes: Pim flies and Bo barely lifts', () => {
    expect(PERSONALITY.pim.tossGain).toBeGreaterThan(PERSONALITY.mog.tossGain)
    expect(PERSONALITY.mog.tossGain).toBeGreaterThan(PERSONALITY.bo.tossGain)
    expect(PERSONALITY.dot.tossGain).toBeGreaterThan(PERSONALITY.bo.tossGain)
  })

  it('every spring settles: none is undamped, and none is so stiff a 120 Hz step breaks it', () => {
    for (const id of FRIEND_IDS) {
      const p = PERSONALITY[id]
      expect(p.springDamp).toBeGreaterThan(0)
      expect(p.followDamp).toBeGreaterThan(0)
      expect(p.springStiff / (120 * 120)).toBeLessThan(0.1)
    }
  })
})
