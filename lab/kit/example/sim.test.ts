// A prototype's sim.test.ts scripts a short play and asserts the loop's
// characteristic moment happened, so a sim that never reaches its mechanic
// cannot pass. This is the template: the moments here are a kick, a stow, an
// unlock, and a pump. The shared suite (lab/kit/contract.test.ts) covers
// determinism, fuzz, affordances, and hygiene without any of this.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../sim.ts'
import type { Sim } from '../sim.ts'
import { meta } from './meta.ts'
import { BASKET, PUMP, createSim } from './sim.ts'
import type { ExampleSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function ball(sim: Sim<ExampleSnapshot>, index: number) {
  return sim.snapshot().balls[index]!
}

function tap(sim: Sim, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

function dragTo(sim: Sim<ExampleSnapshot>, index: number, x: number, y: number, id = 1): void {
  const from = ball(sim, index)
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 8; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((x - from.x) * s) / 8, y: from.y + ((y - from.y) * s) / 8 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x, y })
}

const basketCentre = { x: BASKET.x + BASKET.w / 2, y: BASKET.y + BASKET.h / 2 }

function stowAll(sim: Sim<ExampleSnapshot>, count: number): void {
  for (let i = 0; i < count; i++) dragTo(sim, i, basketCentre.x, basketCentre.y)
}

describe('the example balloons', () => {
  it('starts with three free balloons, drifting down', () => {
    const sim = start()
    const first = sim.snapshot()
    expect(first.balls).toHaveLength(3)
    expect(first.balls.every((b) => !b.stowed && !b.held)).toBe(true)
    run(sim, 30)
    expect(ball(sim, 0).y).toBeGreaterThan(first.balls[0]!.y)
  })

  it('never leaves the field, however long it runs', () => {
    const sim = start()
    run(sim, 2000)
    for (const b of sim.snapshot().balls) {
      expect(b.x).toBeGreaterThanOrEqual(b.r)
      expect(b.x).toBeLessThanOrEqual(FIELD_W - b.r)
      expect(b.y).toBeGreaterThanOrEqual(b.r)
      expect(b.y).toBeLessThanOrEqual(FIELD_H - b.r)
    }
  })

  it('a tap kicks a balloon up, and it slowly comes back down', () => {
    const sim = start()
    run(sim, 200) // let them settle near the floor
    const before = ball(sim, 1)
    tap(sim, before.x, before.y)
    run(sim, 20)
    expect(ball(sim, 1).y).toBeLessThan(before.y - 100)
    run(sim, 200)
    expect(ball(sim, 1).y).toBeGreaterThan(before.y - 50)
    expect(sim.observe().events.some((e) => e.kind === 'state' && e.name === 'kick')).toBe(true)
  })

  it('drops a dragged balloon into the basket, and the score hook fires', () => {
    const sim = start()
    sim.observe()
    dragTo(sim, 0, basketCentre.x, basketCentre.y)
    const obs = sim.observe()
    expect(ball(sim, 0).stowed).toBe(true)
    expect(obs.features.stowed).toBe(1)
    expect(obs.signature).toBe('drift/some/three')
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'score' })
    expect(sim.snapshot().score).toBe(1)
  })

  it('a balloon dropped outside the basket just falls', () => {
    const sim = start()
    dragTo(sim, 0, 300, 200)
    const obs = sim.observe()
    expect(ball(sim, 0).stowed).toBe(false)
    expect(obs.features.stowed).toBe(0)
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('a tap pops a stowed balloon back out', () => {
    const sim = start()
    dragTo(sim, 0, basketCentre.x, basketCentre.y)
    run(sim, 2)
    const stowed = ball(sim, 0)
    tap(sim, stowed.x, stowed.y)
    run(sim, 20)
    expect(ball(sim, 0).stowed).toBe(false)
    expect(ball(sim, 0).y).toBeLessThan(BASKET.y)
    expect(sim.observe().features.stowed).toBe(0)
  })

  it('three in the basket unlock a fourth balloon', () => {
    const sim = start()
    sim.observe()
    stowAll(sim, 3)
    const obs = sim.observe()
    expect(sim.snapshot().balls).toHaveLength(4)
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'unlock' })
    expect(obs.signature).toBe('drift/some/four')
    // The new balloon is free and can be stowed too.
    dragTo(sim, 3, basketCentre.x, basketCentre.y)
    expect(sim.observe().signature).toBe('drift/all/four')
  })

  it('holding the pump lifts the free balloons and shows in the signature', () => {
    const sim = start()
    run(sim, 200) // near the floor
    const low = ball(sim, 0).y
    sim.pointer({ id: 2, phase: 'down', x: PUMP.x + PUMP.w / 2, y: PUMP.y + PUMP.h / 2 })
    run(sim, 30)
    expect(sim.observe().signature).toBe('pump/empty/three')
    expect(ball(sim, 0).y).toBeLessThan(low - 150)
    sim.pointer({ id: 2, phase: 'up', x: PUMP.x, y: PUMP.y })
    expect(sim.observe().signature).toBe('drift/empty/three')
  })

  it('carrying shows in the signature while a finger is down', () => {
    const sim = start()
    const b = ball(sim, 0)
    sim.pointer({ id: 1, phase: 'down', x: b.x, y: b.y })
    expect(sim.observe().signature).toBe('carry/empty/three')
    expect(sim.observe().features.held).toBe(1)
    sim.pointer({ id: 1, phase: 'up', x: b.x + 200, y: b.y })
  })

  it('reports affordances as top-left rectangles that centre on what they name', () => {
    const sim = start()
    const affordances = sim.affordances()
    const balls = sim.snapshot().balls
    for (const b of balls) {
      const match = affordances.find((a) => Math.abs(a.x + a.w / 2 - b.x) < 1e-9 && Math.abs(a.y + a.h / 2 - b.y) < 1e-9)
      expect(match, `an affordance centred on the ball at ${b.x},${b.y}`).toBeDefined()
      expect(match!.w).toBeCloseTo(b.r * 2)
    }
    const pump = affordances.find((a) => a.kind === 'hold')!
    expect(pump.x).toBe(PUMP.x)
    expect(pump.y).toBe(PUMP.y)
    expect(pump.w).toBe(PUMP.w)
    expect(pump.h).toBe(PUMP.h)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('a second down on the same pointer id lets go of the first balloon', () => {
    const sim = start()
    const a = ball(sim, 0)
    const c = ball(sim, 2)
    sim.pointer({ id: 1, phase: 'down', x: a.x, y: a.y })
    sim.pointer({ id: 1, phase: 'down', x: c.x, y: c.y })
    const snap = sim.snapshot()
    expect(snap.balls[0]!.held).toBe(false)
    expect(snap.balls[2]!.held).toBe(true)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 400; i++) {
      const b = ball(sim, 0)
      tap(sim, b.x, b.y, 4) // every tap is a grab and a kick
    }
    expect(sim.observe().events).toHaveLength(64)
    expect(sim.observe().events).toHaveLength(0)
  })

  it('different seeds lay the balloons out differently, the same seed the same', () => {
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).toBe(JSON.stringify(start({ seed: 1 }).snapshot()))
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).not.toBe(JSON.stringify(start({ seed: 2 }).snapshot()))
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events and no hook behaviour', () => {
    const sim = start({ hooks: [] })
    stowAll(sim, 3)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().score).toBeNull()
    expect(sim.snapshot().balls).toHaveLength(3)
    expect(obs.features.stowed).toBe(3)
    expect(obs.signature).toBe('drift/all/three')
  })

  it('removing unlock alone keeps score and drops the fourth balloon', () => {
    const sim = start({ hooks: ['score'] })
    stowAll(sim, 3)
    const obs = sim.observe()
    expect(obs.events.filter((e) => e.kind === 'hook').every((e) => e.name === 'score')).toBe(true)
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(true)
    expect(sim.snapshot().balls).toHaveLength(3)
    expect(sim.snapshot().score).toBe(3)
  })

  it('removing score alone keeps unlock and drops the counter', () => {
    const sim = start({ hooks: ['unlock'] })
    stowAll(sim, 3)
    const obs = sim.observe()
    expect(obs.events.filter((e) => e.kind === 'hook').map((e) => e.name)).toEqual(['unlock'])
    expect(sim.snapshot().balls).toHaveLength(4)
    expect(sim.snapshot().score).toBeNull()
  })

  it('score changes neither affordances nor signatures, so the panel reads it as inconclusive', () => {
    const withScore = start({ hooks: ['score', 'unlock'] })
    const withoutScore = start({ hooks: ['unlock'] })
    stowAll(withScore, 3)
    stowAll(withoutScore, 3)
    expect(withoutScore.affordances()).toEqual(withScore.affordances())
    expect(withoutScore.observe().signature).toBe(withScore.observe().signature)
  })
})

describe('hints', () => {
  it('show the lowest free balloon after a quiet spell, and only when hints are on', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    run(off, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    const hint = on.snapshot().hint!
    expect(hint).not.toBeNull()
    const lowest = on.snapshot().balls.reduce((a, b) => (b.y > a.y ? b : a))
    expect(hint.x).toBe(lowest.x)
    expect(hint.y).toBe(lowest.y)
    expect(off.snapshot().hint).toBeNull()
  })

  it('go away when the child touches, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    // 3 modes x 3 basket states x 2 sizes of the world.
    expect(meta.signatureBound).toBe(3 * 3 * 2)
  })

  it('names exactly one objective feature, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
