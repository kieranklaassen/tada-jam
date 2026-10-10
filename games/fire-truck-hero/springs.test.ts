import { describe, expect, it } from 'vitest'
import { LONGEST_STEP_S, follow, kick, overshootOf, settled, spring, stepSpring } from './springs'

const lively = { stiffness: 180, damping: 14 }
const heavy = { stiffness: 60, damping: 16 }

describe('a spring', () => {
  it('starts at rest where it is put', () => {
    const s = spring(2)
    expect(s).toEqual({ value: 2, velocity: 0, target: 2 })
    expect(settled(s)).toBe(true)
  })

  it('goes to its target and settles there', () => {
    const s = spring(0)
    s.target = 1
    for (let frame = 0; frame < 240; frame++) stepSpring(s, lively, 1 / 60)
    expect(s.value).toBeCloseTo(1, 3)
    expect(settled(s)).toBe(true)
  })

  it('swings past its target when it is lively, and by about the share it says', () => {
    const s = spring(0)
    s.target = 1
    let most = 0
    for (let frame = 0; frame < 240; frame++) most = Math.max(most, stepSpring(s, lively, 1 / 60).value)
    expect(most).toBeGreaterThan(1.05)
    expect(most - 1).toBeCloseTo(overshootOf(lively), 1)
  })

  it('creeps in without swinging past when it is heavy', () => {
    const s = spring(0)
    s.target = 1
    let most = 0
    for (let frame = 0; frame < 240; frame++) most = Math.max(most, stepSpring(s, heavy, 1 / 60).value)
    expect(most).toBeLessThanOrEqual(1.001)
    expect(overshootOf(heavy)).toBe(0)
  })

  it('comes back by itself after a kick', () => {
    const s = spring(0)
    kick(s, 3)
    stepSpring(s, lively, 0.05)
    expect(s.value).toBeGreaterThan(0.05)
    for (let frame = 0; frame < 240; frame++) stepSpring(s, lively, 1 / 60)
    expect(settled(s)).toBe(true)
    expect(s.value).toBeCloseTo(0, 3)
  })

  it('plays the same motion on a slow device as on a fast one', () => {
    const fast = spring(0), slow = spring(0)
    fast.target = slow.target = 1
    for (let frame = 0; frame < 60; frame++) stepSpring(fast, lively, 1 / 60)
    for (let frame = 0; frame < 10; frame++) stepSpring(slow, lively, 1 / 10)
    expect(slow.value).toBeCloseTo(fast.value, 2)
    expect(LONGEST_STEP_S).toBeLessThanOrEqual(1 / 100)
  })

  it('plays no time on a frame of no length', () => {
    const s = spring(0)
    s.target = 1
    expect(stepSpring(s, lively, 0).value).toBe(0)
    expect(stepSpring(s, lively, -1).value).toBe(0)
    expect(stepSpring(s, lively, Number.NaN).value).toBe(0)
  })
})

describe('following with a lag', () => {
  it('closes most of the gap in a few lags and never passes the target', () => {
    let value = 0
    for (let frame = 0; frame < 30; frame++) {
      value = follow(value, 10, 0.1, 1 / 60)
      expect(value).toBeLessThanOrEqual(10)
    }
    expect(value).toBeGreaterThan(9.9)
  })

  it('is the same after one long frame as after many short ones', () => {
    let short = 0
    for (let frame = 0; frame < 6; frame++) short = follow(short, 10, 0.1, 1 / 60)
    expect(follow(0, 10, 0.1, 0.1)).toBeCloseTo(short, 6)
  })

  it('jumps when there is no lag and stays when there is no time', () => {
    expect(follow(0, 10, 0, 1 / 60)).toBe(10)
    expect(follow(3, 10, 0.1, 0)).toBe(3)
  })
})
