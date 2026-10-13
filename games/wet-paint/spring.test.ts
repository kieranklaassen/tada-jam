import { describe, expect, it } from 'vitest'
import { Spring } from './spring'

describe('a spring', () => {
  it('overshoots and settles on its target', () => {
    const spring = new Spring(0, 160, 7)
    let most = 0
    for (let i = 0; i < 600; i++) most = Math.max(most, spring.step(1 / 60, 1))
    expect(most).toBeGreaterThan(1.05)
    expect(spring.value).toBeCloseTo(1, 3)
  })

  it('swings at a kick and comes back', () => {
    const spring = new Spring(0, 200, 11)
    spring.kick(-5)
    expect(spring.step(1 / 60, 0)).toBeLessThan(0)
    for (let i = 0; i < 600; i++) spring.step(1 / 60, 0)
    expect(Math.abs(spring.value)).toBeLessThan(1e-3)
  })

  it('stays steady on a long frame, and plays no time on an empty one', () => {
    const spring = new Spring(0, 210, 11)
    spring.kick(8)
    for (let i = 0; i < 50; i++) expect(Math.abs(spring.step(0.1, 0))).toBeLessThan(2)
    const value = spring.value
    expect(spring.step(0, 5)).toBe(value)
  })
})
