import { describe, expect, it } from 'vitest'
import { Director, LEAD_SPRING, PAW, RACCOON, Raccoon, stepSpring, type Spring } from './motion'

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
  it('is alive at idle: she breathes, and does small things of her own with rests between', () => {
    const raccoon = new Raccoon(new Director(5))
    const breaths: number[] = [], done = new Set<string>()
    let busy = 0, frames = 0
    run(60, (dt) => { raccoon.step(dt); breaths.push(raccoon.breath); frames++; if (raccoon.doing) { busy++; done.add(raccoon.doing) } })
    expect(Math.max(...breaths)).toBeGreaterThan(0.9)
    expect(Math.min(...breaths)).toBeLessThan(-0.9)
    expect(done.size).toBeGreaterThanOrEqual(3)
    expect(busy / frames).toBeGreaterThan(0.05)
    expect(busy / frames).toBeLessThan(0.6)
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

  it('at a pop her whole coat stands on end, and then she smooths it down as if nothing had happened', () => {
    const raccoon = new Raccoon(new Director(5))
    raccoon.pop()
    expect(raccoon.fur.x).toBe(1)
    let smoothing = false, lowest = 0
    run(1.2, (dt) => raccoon.step(dt))
    expect(raccoon.fur.x).toBeGreaterThan(0.5)
    run(3, (dt) => { raccoon.step(dt); if (raccoon.doing === 'smooth-down') { smoothing = true; lowest = Math.min(lowest, raccoon.paw.y.x) } })
    expect(smoothing).toBe(true)
    // Her paw went up over her head to do it.
    expect(lowest).toBeLessThan(-20)
    expect(raccoon.fur.x).toBeLessThan(0.15)
  })

  it('turns an ear to a new sound whatever she is doing, and a fan\'s wind lifts her coat for as long as it blows', () => {
    const raccoon = new Raccoon(new Director(5))
    raccoon.hark()
    expect(raccoon.ear).toBeGreaterThan(0.5)
    run(1, (dt) => raccoon.step(dt))
    expect(raccoon.ear).toBe(0)
    run(4, (dt) => raccoon.step(dt, { wind: 2 }))
    expect(raccoon.fur.x).toBeGreaterThan(0.25)
    run(6, (dt) => raccoon.step(dt, { wind: 0 }))
    expect(raccoon.fur.x).toBeLessThan(0.06)
    // A fan that sucks draws her whiskers in for as long as it turns; one that blows does not.
    expect(raccoon.drawn).toBeLessThan(0.01)
    run(2, (dt) => raccoon.step(dt, { wind: -2 }))
    expect(raccoon.drawn).toBeGreaterThan(0.9)
    run(3, (dt) => raccoon.step(dt, { wind: 0 }))
    expect(raccoon.drawn).toBeLessThan(0.01)
  })

  it('watches the hand at work: her eyes are on the finger while it is down', () => {
    const raccoon = new Raccoon(new Director(5))
    run(0.6, (dt) => raccoon.step(dt, { finger: { x: 400, y: 300 } }))
    expect(raccoon.gaze.x).toBeGreaterThan(0.6)
    expect(raccoon.gaze.y).toBeGreaterThan(0.4)
    run(0.6, (dt) => raccoon.step(dt, { finger: { x: -60, y: 200 } }))
    expect(raccoon.gaze.x).toBeLessThan(-0.1)
  })

  it('guards what is hers: touched, it has her eyes on it and, where she can reach, her paw', () => {
    const raccoon = new Raccoon(new Director(5)), plate = { x: 20, y: 170 }
    raccoon.guard(plate)
    expect(raccoon.doing).toBe('guard')
    let nearest = Infinity
    run(1.2, (dt) => { raccoon.step(dt); nearest = Math.min(nearest, Math.hypot(raccoon.paw.x.x - plate.x, raccoon.paw.y.x - plate.y)) })
    expect(nearest).toBeLessThan(20)
    // Her clutter is out of reach: she only looks.
    const far = new Raccoon(new Director(5))
    far.guard({ x: 100, y: 600 })
    let moved = 0
    run(1.2, (dt) => { far.step(dt); moved = Math.max(moved, Math.hypot(far.paw.x.x - PAW.rest.x, far.paw.y.x - PAW.rest.y)) })
    expect(moved).toBeLessThan(5)
    expect(far.gaze.y).toBeGreaterThan(0.5)
  })

  it('meddles: a part laid within her reach is picked up, looked at through her goggles and put back; a lid gets two knocks', () => {
    const raccoon = new Raccoon(new Director(5)), loose = { x: -9, y: 246 }, lid = { x: 100, y: 190 }
    let held = 0, goggled = 0, inspected = 0, knocks = 0, frames = 0
    run(120, (dt) => {
      raccoon.step(dt, { loose, lid })
      frames++
      if (raccoon.doing === 'inspect') inspected++
      if (raccoon.holds === 'part') { held++; if (raccoon.goggles > 0.8) goggled++ }
      knocks += raccoon.knocks
      raccoon.knocks = 0
    })
    expect(inspected).toBeGreaterThan(0)
    expect(held).toBeGreaterThan(60)
    expect(goggled).toBeGreaterThan(30)
    expect(knocks).toBeGreaterThanOrEqual(2)
    expect(knocks % 2).toBe(0)
    // With nothing of the child's in reach she does neither.
    const alone = new Raccoon(new Director(5))
    run(120, (dt) => { alone.step(dt); expect(alone.doing === 'inspect' || alone.doing === 'knock-lid').toBe(false); expect(alone.holds === 'part').toBe(false) })
  })

  it('lets go at once when the child wants the thing, or when it has gone', () => {
    const raccoon = new Raccoon(new Director(5)), loose = { x: -9, y: 246 }
    let frames = 0
    while (raccoon.holds !== 'part' && frames++ < 60 * 200) raccoon.step(1 / 60, { loose })
    expect(raccoon.holds).toBe('part')
    raccoon.leave()
    expect(raccoon.holds).toBeNull()
    expect(raccoon.doing).toBeNull()
    // The same when the part is no longer there to be seen.
    frames = 0
    while (raccoon.holds !== 'part' && frames++ < 60 * 200) raccoon.step(1 / 60, { loose })
    raccoon.step(1 / 60, {})
    expect(raccoon.holds).toBeNull()
  })

  it('keeps her paws to herself while she shows a neat way: her paw goes to her board and back', () => {
    const raccoon = new Raccoon(new Director(5)), practice = { x: 166, y: -76 }
    let nearest = Infinity
    for (let i = 0; i <= 290; i++) {
      raccoon.step(1 / 60, { practice, neat: i / 290, loose: { x: -9, y: 246 } })
      nearest = Math.min(nearest, Math.hypot(raccoon.paw.x.x - practice.x, raccoon.paw.y.x - practice.y))
      expect(raccoon.doing === 'inspect').toBe(false)
    }
    expect(nearest).toBeLessThan(25)
  })
})
