import { describe, expect, it } from 'vitest'
import { Director, LEAD_SPRING, MOTH, Moth, RACCOON, Raccoon, stepSpring, type Spring } from './motion'

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
    for (let i = 0; i < 20; i++) expect(a.pick(MOTH.perched, null)).toBe(b.pick(MOTH.perched, null))
  })
})

describe('every character moves like itself', () => {
  it('no variant is shared between the old hand and the moth', () => {
    const hers: readonly string[] = RACCOON.idle, its: readonly string[] = [...MOTH.perched, ...MOTH.circling]
    for (const name of hers) expect(its).not.toContain(name)
    expect(new Set([...hers, ...its]).size).toBe(hers.length + its.length)
    expect(hers.length).toBeGreaterThanOrEqual(3)
    expect(MOTH.perched.length).toBeGreaterThanOrEqual(3)
    expect(MOTH.circling.length).toBeGreaterThanOrEqual(3)
  })

  it('their tempos are far apart: a wing beats fifty times in one of her breaths', () => {
    expect(MOTH.flutter / RACCOON.breath).toBeGreaterThan(40)
    // And their springs are not copies: hers is heavy, its is quick.
    expect(RACCOON.whiskers.stiffness).toBeLessThan(MOTH.pull.stiffness)
    expect(RACCOON.whiskers).not.toEqual(MOTH.pull)
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

describe('the moth', () => {
  const perch = { x: 985, y: 120 }, lamp = { x: 848, y: 498 }

  it('sits on its perch, wings near shut, and does a moth\'s small things', () => {
    const moth = new Moth(new Director(9), perch)
    const done = new Set<string>()
    run(40, (dt) => { moth.step(dt, null); if (moth.doing) done.add(moth.doing); expect(moth.flying).toBe(false) })
    expect(moth.x.x).toBe(perch.x)
    expect(moth.y.x).toBe(perch.y)
    expect(done.size).toBeGreaterThanOrEqual(3)
    for (const name of done) expect(MOTH.perched).toContain(name)
  })

  it('cannot leave a lit lamp alone: it is off its perch in the frame the lamp lights and rings the lamp within two seconds', () => {
    const moth = new Moth(new Director(9), perch)
    moth.step(1 / 60, lamp)
    expect(moth.flying).toBe(true)
    run(2, (dt) => moth.step(dt, lamp))
    expect(Math.hypot(moth.x.x - lamp.x, moth.y.x - lamp.y)).toBeLessThan(160)
    const ways = new Set<string>()
    run(30, (dt) => { moth.step(dt, lamp); ways.add(moth.doing!); expect(Math.hypot(moth.x.x - lamp.x, moth.y.x - lamp.y)).toBeLessThan(220) })
    expect(ways.size).toBeGreaterThanOrEqual(3)
    for (const name of ways) expect(MOTH.circling).toContain(name)
  })

  it('goes back to its perch when the lamp goes out, and comes to rest exactly there', () => {
    const moth = new Moth(new Director(9), perch)
    run(3, (dt) => moth.step(dt, lamp))
    run(6, (dt) => moth.step(dt, null))
    expect(moth.flying).toBe(false)
    expect([moth.x.x, moth.y.x]).toEqual([perch.x, perch.y])
  })

  it('darts back at a pop, even from a lit lamp, and returns to the lamp after', () => {
    const moth = new Moth(new Director(9), perch)
    run(3, (dt) => moth.step(dt, lamp))
    moth.pop()
    run(1.6, (dt) => moth.step(dt, lamp))
    expect(Math.hypot(moth.x.x - perch.x, moth.y.x - perch.y)).toBeLessThan(120)
    run(4, (dt) => moth.step(dt, lamp))
    expect(Math.hypot(moth.x.x - lamp.x, moth.y.x - lamp.y)).toBeLessThan(160)
  })

  it('beats its wings in flight far faster than it fans them at rest', () => {
    const moth = new Moth(new Director(9), perch)
    let turns = 0, before = moth.wings, rising = true
    run(2, (dt) => { moth.step(dt, lamp); const up = moth.wings > before; if (up !== rising) turns++; rising = up; before = moth.wings })
    // 60 samples a second cannot count 11 beats exactly; it sees many turns all the same.
    expect(turns).toBeGreaterThan(20)
  })
})
