import { describe, expect, it } from 'vitest'
import { seeded, spring, STEADY_STEP, stiffSpring, toward, wrapAngle, type Spring } from './math'

/** A petal spring opening for one second, sampled every tenth of a second. */
function opening(step: typeof spring, fps: number): number[] {
  const s: Spring = { x: 0, v: 0 }
  const samples: number[] = []
  for (let i = 1; i <= fps; i++) {
    step(s, 1, 1 / fps, 170, 7.5)
    if (i % (fps / 10) === 0) samples.push(s.x)
  }
  return samples
}

function drift(step: typeof spring): number {
  const slow = opening(step, 30)
  const fast = opening(step, 60)
  return Math.max(...slow.map((x, i) => Math.abs(x - fast[i])))
}

/** How far the held seed's spring (520, 27) still is from its target after two seconds at 20 fps. */
function leftAfterSlowFrames(maxStep: number): number {
  const s: Spring = { x: 1, v: 0 }
  for (let i = 0; i < 40; i++) spring(s, 0, 1 / 20, 520, 27, maxStep)
  return Math.abs(s.x)
}

describe('math', () => {
  it('eases part of the way on a short frame and all of it on a long one', () => {
    expect(toward(0, 10, 0.1, 5)).toBeCloseTo(5)
    expect(toward(0, 10, 0.5, 5)).toBe(10)
  })

  it('wraps angles the short way round', () => {
    expect(wrapAngle((3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2)
    expect(wrapAngle(-0.25)).toBeCloseTo(-0.25)
  })

  it('moves a stiff spring the same at 30 and 60 fps, unlike a single step per frame', () => {
    expect(drift(stiffSpring)).toBeLessThan(1e-6)
    expect(drift(spring)).toBeGreaterThan(0.05)
  })

  it('splits a slow frame so a stiff, well-damped spring settles, where one step per frame flips past its target for ever', () => {
    expect(leftAfterSlowFrames(STEADY_STEP)).toBeLessThan(1e-6)
    expect(leftAfterSlowFrames(Infinity)).toBeGreaterThan(0.1)
  })

  it('steps a 60 fps frame in one step either way, exactly as the springs were tuned', () => {
    const split: Spring = { x: 0, v: 0 }
    const whole: Spring = { x: 0, v: 0 }
    for (let i = 0; i < 60; i++) expect(spring(split, 1, 1 / 60, 520, 27, STEADY_STEP)).toBe(spring(whole, 1, 1 / 60, 520, 27))
  })

  it('repeats its random sequence for the same seed', () => {
    const a = seeded(7)
    const b = seeded(7)
    for (let i = 0; i < 5; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
