import { describe, expect, it } from 'vitest'
import { WEARERS } from './kinds'
import { MANNERS, Spring, blinking, glanceOf, idleOf } from './motion'

const pairs = WEARERS.flatMap((a, i) => WEARERS.slice(i + 1).map((b) => [a, b] as const))
const times = Array.from({ length: 300 }, (_, i) => i * 0.1)

describe('how the characters move', () => {
  it.each(pairs)('%s and %s share no tempo, no weight and no idle curve', (a, b) => {
    const ma = MANNERS[a], mb = MANNERS[b]
    expect(ma.blinkEvery).not.toBe(mb.blinkEvery)
    expect(ma.glanceEvery).not.toBe(mb.glanceEvery)
    expect(ma.eyeSpeed).not.toBe(mb.eyeSpeed)
    for (const move of ['squash', 'tilt', 'hop'] as const) expect(ma[move].stiffness).not.toBe(mb[move].stiffness)
    const curve = (who: typeof a) => JSON.stringify(times.map((t) => idleOf(who, t)))
    expect(curve(a)).not.toBe(curve(b))
  })

  it.each(WEARERS)('%s is alive at idle, and only a little', (who) => {
    const idle = times.map((t) => idleOf(who, t))
    const moves = (key: 'tilt' | 'squash' | 'hop' | 'bend') => new Set(idle.map((at) => at[key].toFixed(4))).size > 1
    expect(moves('tilt') || moves('squash') || moves('hop') || moves('bend')).toBe(true)
    for (const at of idle) {
      expect(Math.abs(at.tilt)).toBeLessThan(0.1)
      expect(Math.abs(at.squash)).toBeLessThan(0.03)
      expect(at.hop).toBeGreaterThanOrEqual(0)
      expect(at.hop).toBeLessThan(20)
      expect(Math.abs(at.bend)).toBeLessThan(0.6)
    }
    const fine = Array.from({ length: 1200 }, (_, i) => i * 0.01)
    expect(fine.some((t) => blinking(who, t))).toBe(true)
    expect(fine.filter((t) => blinking(who, t)).length).toBeLessThan(fine.length / 8)
    for (const t of fine) {
      expect(glanceOf(who, t)).toBeGreaterThanOrEqual(0)
      expect(glanceOf(who, t)).toBeLessThanOrEqual(1)
    }
    expect(fine.some((t) => glanceOf(who, t) > 0.9)).toBe(true)
  })

  it.each(WEARERS)('%s comes to rest after a push, at the longest frame the game plays', (who) => {
    for (const move of ['squash', 'tilt', 'hop', 'bend'] as const) {
      const m = MANNERS[who][move], spring = new Spring(m.stiffness, m.damping)
      spring.kick(m.push)
      let furthest = 0
      for (let i = 0; i < 300; i++) {
        spring.step(0.1)
        furthest = Math.max(furthest, Math.abs(spring.x))
      }
      expect(spring.resting).toBe(true)
      expect(furthest).toBeGreaterThan(0)
      expect(furthest).toBeLessThan(move === 'hop' ? 60 : 0.3)
    }
  })
})
