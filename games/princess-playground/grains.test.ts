import { describe, expect, it } from 'vitest'
import { Grains } from './grains'

describe('the grains', () => {
  it('fly from a landing, fall back and are gone', () => {
    const grains = new Grains()
    grains.burst(1, 0, 1, 12)
    expect(grains.flying).toBe(12)
    for (let t = 0; t < 3; t += 1 / 60) grains.step(1 / 60)
    expect(grains.flying).toBe(0)
  })

  it('lie on a head for a moment, and are then shaken off and fall to the sand', () => {
    const grains = new Grains()
    grains.settle(2, 1.4, -1, 0.2, 7, 0.3)
    expect(grains.flying).toBe(7)
    const heights = () => Array.from({ length: 7 }, (_, i) => grains.positions[i * 3 + 1])
    const lying = heights()
    // Still there a quarter of a second on: they lie on the head, within its top.
    for (let t = 0; t < 0.25; t += 1 / 60) grains.step(1 / 60)
    expect(heights()).toEqual(lying)
    for (let i = 0; i < 7; i++) expect(Math.hypot(grains.positions[i * 3] - 2, grains.positions[i * 3 + 2] + 1)).toBeLessThanOrEqual(0.2 + 1e-6)
    // Then off they go, up and out first, and down to the sand.
    for (let t = 0; t < 0.15; t += 1 / 60) grains.step(1 / 60)
    expect(heights().some((y, i) => y !== lying[i])).toBe(true)
    for (let t = 0; t < 3; t += 1 / 60) grains.step(1 / 60)
    expect(grains.flying).toBe(0)
  })
})
