import { describe, expect, it } from 'vitest'
import { Director, LEAD_SPRING, RACCOON, Raccoon, stepSpring, type Spring } from './motion'

const run = (seconds: number, step: (dt: number, t: number) => void) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) step(1 / 60, i / 60)
}

describe('a spring', () => {
  it('overshoots and settles: a lead has weight', () => {
    const s: Spring = { x: 40, v: 0 }
    let lowest = 40
    run(4, (dt) => { stepSpring(s, 0, LEAD_SPRING.stiffness, LEAD_SPRING.damping, dt); lowest = Math.min(lowest, s.x) })
    expect(lowest).toBeLessThan(-2)
    expect(Math.abs(s.x)).toBeLessThan(0.05)
    expect(Math.abs(s.v)).toBeLessThan(0.5)
  })

  it('stays finite through a very long frame', () => {
    const s: Spring = { x: 1000, v: -5000 }
    stepSpring(s, 0, 300, 2, 5)
    expect(Number.isFinite(s.x) && Number.isFinite(s.v)).toBe(true)
    expect(Math.abs(s.x)).toBeLessThan(5000)
  })
})

describe('the director', () => {
  it('never plays the same variant twice running, and plays them all', () => {
    const director = new Director(3)
    let last: string | null = null
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const next: string = director.pick(RACCOON.idle, last)
      expect(next).not.toBe(last)
      seen.add(next)
      last = next
    }
    expect(seen.size).toBe(RACCOON.idle.length)
  })

  it('plays the same sequence from the same seed', () => {
    const a = new Director(77), b = new Director(77)
    for (let i = 0; i < 20; i++) expect(a.pick(RACCOON.idle, null)).toBe(b.pick(RACCOON.idle, null))
  })
})

describe('the old hand', () => {
  it('is alive at idle: she breathes, and does small things in her sleep with rests between', () => {
    const raccoon = new Raccoon(new Director(5))
    const breaths: number[] = [], done = new Set<string>()
    let busy = 0, frames = 0
    run(60, (dt) => { raccoon.step(dt); breaths.push(raccoon.breath); frames++; if (raccoon.doing) { busy++; done.add(raccoon.doing) } })
    expect(Math.max(...breaths)).toBeGreaterThan(0.9)
    expect(Math.min(...breaths)).toBeLessThan(-0.9)
    expect(done.size).toBeGreaterThanOrEqual(3)
    expect(busy / frames).toBeGreaterThan(0.05)
    expect(busy / frames).toBeLessThan(0.4)
  })

  it('at a pop her whiskers stand out, the tea jumps, one eye opens, and all of it settles', () => {
    const raccoon = new Raccoon(new Director(5))
    raccoon.pop()
    let whiskers = 0, slosh = 0, eye = 0
    run(1.2, (dt) => { raccoon.step(dt); whiskers = Math.max(whiskers, raccoon.whiskers.x); slosh = Math.max(slosh, Math.abs(raccoon.slosh.x)); eye = Math.max(eye, raccoon.eye) })
    expect(whiskers).toBeGreaterThan(0.6)
    expect(slosh).toBeGreaterThan(0.3)
    expect(eye).toBeGreaterThan(0.9)
    run(6, (dt) => raccoon.step(dt))
    expect(Math.abs(raccoon.whiskers.x)).toBeLessThan(0.02)
    expect(Math.abs(raccoon.slosh.x)).toBeLessThan(0.02)
    expect(raccoon.eye).toBeLessThan(0.05)
  })
})
