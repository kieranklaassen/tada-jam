import { describe, expect, it } from 'vitest'
import { EngineLife, IDLES, LASTS, type Bearing, type Does, type Happens, type Idle } from './life'
import { makeRng } from './rng'

const DT = 1 / 60
const rest = (life: EngineLife, seconds: number, speed = 0, travelled = 0, rough = false): Does[] => {
  const does: Does[] = []
  for (let t = 0; t < seconds; t += DT) does.push(...life.step(DT, speed, travelled, rough, null))
  return does
}
const inRange = (b: Bearing) => {
  for (const key of ['eyeX', 'eyeY', 'cheek'] as const) expect(Math.abs(b[key])).toBeLessThanOrEqual(1)
  for (const key of ['cross', 'dizzy', 'blink', 'toot', 'dusted'] as const) { expect(b[key]).toBeGreaterThanOrEqual(0); expect(b[key]).toBeLessThanOrEqual(1) }
  expect(Math.abs(b.squash)).toBeLessThan(0.5)
  expect(Math.abs(b.lean)).toBeLessThan(0.6)
  expect(b.hop).toBeGreaterThanOrEqual(0)
  expect(b.hop).toBeLessThan(60)
}

describe('the engine as a character', () => {
  it('is alive at rest: it breathes smoke, blinks, and finds things of its own to do', () => {
    const life = new EngineLife(makeRng(1))
    const does: Does[] = []
    let blinked = false
    const idles = new Set<Idle>()
    for (let t = 0; t < 60; t += DT) {
      does.push(...life.step(DT, 0, 0, false, null))
      if (life.bearing.blink === 1) blinked = true
      if (life.idling) idles.add(life.idling)
      inRange(life.bearing)
    }
    expect(does.filter((d) => d === 'breath').length).toBeGreaterThan(20)
    expect(blinked).toBe(true)
    expect(idles.size).toBe(IDLES.length)
  })

  it('never does the same idle thing twice running', () => {
    const life = new EngineLife(makeRng(7))
    const order: Idle[] = []
    let last: Idle | null = null
    for (let t = 0; t < 120; t += DT) {
      life.step(DT, 0, 0, false, null)
      if (life.idling && life.idling !== last) order.push(life.idling)
      last = life.idling
    }
    expect(order.length).toBeGreaterThan(12)
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1])
  })

  it('drops whatever it was idly doing the moment something happens, and does not idle while moving or watched', () => {
    const life = new EngineLife(makeRng(3))
    while (!life.idling) life.step(DT, 0, 0, false, null)
    life.happen('land', { x: 1, y: 0 })
    expect(life.idling).toBe(null)
    for (let t = 0; t < 20; t += DT) { life.step(DT, 400, t * 400, false, null); expect(life.idling).toBe(null) }
    for (let t = 0; t < 20; t += DT) { life.step(DT, 0, 0, false, { x: 0.5, y: -0.5 }); expect(life.idling).toBe(null) }
  })

  it('snaps its eyes to where the finger lands and follows the finger while a line is drawn', () => {
    const life = new EngineLife(makeRng(2))
    life.happen('land', { x: -0.9, y: -0.6 })
    for (let i = 0; i < 8; i++) life.step(DT, 0, 0, false, { x: -0.9, y: -0.6 })
    expect(life.bearing.eyeX).toBeLessThan(-0.7)
    expect(life.bearing.toot).toBeGreaterThan(0.2)
    for (let i = 0; i < 40; i++) life.step(DT, 0, 0, false, { x: 0.9, y: 0.4 })
    expect(life.bearing.eyeX).toBeGreaterThan(0.7)
  })

  it('acts out everything that can happen to it, each in its own way, and comes back to rest', () => {
    const seen = new Map<Happens, string>()
    for (const what of Object.keys(LASTS) as Happens[]) {
      const life = new EngineLife(makeRng(5))
      rest(life, 0.5)
      life.happen(what)
      const peak: Record<string, number> = {}
      for (let t = 0; t < LASTS[what]; t += DT) {
        life.step(DT, 0, 0, false, null)
        const b = life.bearing
        inRange(b)
        for (const [key, value] of Object.entries(b)) peak[key] = Math.max(peak[key] ?? 0, Math.abs(value as number))
      }
      // What it did, as the set of things that clearly moved.
      const least: Record<string, number> = { squash: 0.05, hop: 3, eyeX: 2, eyeY: 2, blink: 2, dusted: 0.5 }
      const moved = Object.entries(peak).filter(([key, value]) => value > (least[key] ?? 0.04)).map(([key]) => key).sort().join('+')
      expect(moved.length, what).toBeGreaterThan(0)
      seen.set(what, moved)
      rest(life, 3.2)
      const after = life.bearing
      for (const key of ['cross', 'dizzy', 'toot', 'lean', 'spin', 'shake', 'rear', 'wheelspin', 'capOff', 'dusted'] as const) expect(Math.abs(after[key]), `${what} leaves ${key}`).toBeLessThan(0.25)
    }
    // No two happenings are acted the same way by the same parts, apart from a few that share one part and differ in size and sound.
    const ways = new Set(seen.values())
    expect(ways.size).toBeGreaterThanOrEqual(11)
  })

  it('sends a smoke ring when poked, shakes the dust off when it sneezes, and chuffs for every stretch of rail', () => {
    const poked = new EngineLife(makeRng(1))
    poked.happen('poke')
    expect(rest(poked, 0.5).filter((d) => d === 'smoke-ring').length).toBe(1)
    const dusty = new EngineLife(makeRng(1))
    dusty.happen('tangle')
    dusty.step(DT, 0, 0, false, null)
    expect(dusty.bearing.dusted).toBeGreaterThan(0.9)
    dusty.happen('sneeze')
    expect(rest(dusty, 0.5).filter((d) => d === 'dust-off').length).toBe(1)
    expect(dusty.bearing.dusted).toBe(0)
    const riding = new EngineLife(makeRng(1))
    const does: Does[] = []
    for (let i = 0; i < 120; i++) does.push(...riding.step(DT, 430, (i * 430) / 60, false, null))
    const chuffs = does.filter((d) => d === 'chuff').length
    expect(chuffs).toBeGreaterThan(9)
    expect(chuffs).toBeLessThan(16)
    expect(does).not.toContain('breath')
  })

  it('is the same for the same seed', () => {
    const a = new EngineLife(makeRng(9)), b = new EngineLife(makeRng(9))
    for (let i = 0; i < 900; i++) { a.step(DT, 0, 0, false, null); b.step(DT, 0, 0, false, null) }
    expect(a.bearing).toEqual(b.bearing)
    expect(a.idling).toBe(b.idling)
  })
})
