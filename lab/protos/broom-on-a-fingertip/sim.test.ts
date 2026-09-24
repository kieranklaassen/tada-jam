// Proof for Broom on a Fingertip. The characteristic moments are scripted with
// small controllers that read the snapshot the way a child reads the screen:
// (1) sliding the fingertip under the lean keeps the broom up, and not moving
// lets it fall; (2) walking it to a flag and planting it; (3) shaking a
// hanging broom up to standing (the trick).

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W, TICK_MS } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { FOLLOW_TAU, G, HOME_X, LENGTHS, PIVOT_Y, RACK, createSim } from './sim.ts'
import type { BroomSnapshot } from './sim.ts'

type S = Sim<BroomSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// Put a finger on the fingertip point where it is now.
function grab(sim: S, id = 1): void {
  const p = sim.snapshot().pivot
  sim.pointer({ id, phase: 'down', x: p.x, y: PIVOT_Y })
}

// Where the finger must be held for one tick so the fingertip point gains
// `a` px/s^2 of average acceleration. The fingertip follows the finger like a
// critically damped spring (time constant FOLLOW_TAU); this is its closed form.
function fingerFor(s: BroomSnapshot, a: number): number {
  const t = TICK_MS / 1000
  const v = s.pivot.vx
  const wanted = v + a * t
  const offset = ((v - (v * t) / FOLLOW_TAU - wanted * Math.exp(t / FOLLOW_TAU)) * FOLLOW_TAU * FOLLOW_TAU) / t
  return s.pivot.x - offset
}

// The skilled child: full-state feedback (position, speed, lean, lean speed)
// with the poles placed at 1.2 and 4.5 rad/s, which keeps the broom up and
// drifts the fingertip toward where they want to be (the middle unless told).
function balanceStep(sim: S, id: number, goalX = 590): void {
  const s = sim.snapshot()
  const [w1, w2, z] = [1.2, 4.5, 0.9]
  const L = s.length
  const ke = (L / G) * w1 * w1 * w2 * w2
  const kv = (L / G) * (2 * z * w1 * w2 * w2 + 2 * z * w2 * w1 * w1)
  const kw = L * (kv + 2 * z * w1 + 2 * z * w2)
  const kt = G + L * ke + L * (w1 * w1 + w2 * w2 + 4 * z * z * w1 * w2)
  const aim = clamp(ke * (s.pivot.x - goalX) + kv * s.pivot.vx + kt * s.theta + kw * s.omega, -12000, 12000)
  sim.pointer({ id, phase: 'move', x: fingerFor(s, aim), y: PIVOT_Y })
  sim.step()
}

// The fiddling child: move the fingertip in time with the swing to feed it,
// and stop feeding once it has about enough to reach the top.
function pumpStep(sim: S, id: number, centre: number): void {
  const s = sim.snapshot()
  const energy = (0.5 * s.omega * s.omega * s.length) / G + 1 + Math.cos(s.theta)
  const feed = energy < 1.9 ? 400 * Math.sign(s.omega * Math.cos(s.theta - Math.PI) || 1) : 0
  const aim = feed - 1.5 * (s.pivot.x - centre) - 0.3 * s.pivot.vx
  sim.pointer({ id, phase: 'move', x: fingerFor(s, aim), y: PIVOT_Y })
  sim.step()
}

describe('the broom', () => {
  it('starts standing, leaning a little, with something to touch', () => {
    const sim = start()
    const s = sim.snapshot()
    expect(s.pose).toBe('up')
    expect(Math.abs(s.theta)).toBeGreaterThan(0.01)
    expect(Math.abs(s.theta)).toBeLessThan(0.15)
    expect(sim.affordances().length).toBeGreaterThan(0)
    expect(sim.observe().signature).toBe('mid/up/open')
  })

  it('left alone it leans further and further, falls, and ends hanging', () => {
    const sim = start()
    sim.observe()
    run(sim, 60)
    expect(Math.abs(sim.snapshot().theta)).toBeGreaterThan(0.8)
    run(sim, 900)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'fall' })
    expect(sim.snapshot().pose).toBe('hang')
    expect(obs.features.falls).toBe(1)
    expect(obs.features.uprightTime).toBe(0)
  })

  it('CHARACTERISTIC MOMENT: sliding the fingertip under the lean keeps it up, holding still does not', () => {
    const still = start()
    grab(still)
    run(still, 200)
    expect(still.observe().features.falls).toBe(1)

    const sim = start()
    sim.observe()
    grab(sim)
    for (let i = 0; i < 450; i++) balanceStep(sim, 1)
    const obs = sim.observe()
    expect(obs.features.tilt).toBeLessThan(0.2)
    expect(obs.features.bestRun).toBeGreaterThan(12)
    expect(obs.features.uprightTime).toBeGreaterThan(12)
    expect(obs.features.falls).toBe(0)
    // Standing the whole time is not the trick.
    expect(obs.features.swingUps).toBe(0)
    expect(obs.signature).toBe('mid/up/open')
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'best' })
  })

  it('a lean caught late is a save', () => {
    const sim = start()
    sim.observe()
    grab(sim)
    // Let it lean well over, then catch it.
    while (Math.abs(sim.snapshot().theta) < 0.55) sim.step()
    for (let i = 0; i < 150; i++) balanceStep(sim, 1)
    const obs = sim.observe()
    expect(obs.features.falls).toBe(0)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'save' })
    expect(obs.features.saves).toBe(1)
  })

  it('a shorter broom falls faster than a longer one', () => {
    const fall = (slot: number) => {
      const sim = start()
      sim.pointer({ id: 9, phase: 'down', x: RACK[slot]!.x + 20, y: RACK[slot]!.y + 20 })
      let ticks = 0
      while (Math.abs(sim.snapshot().theta) < 1 && ticks < 400) {
        sim.step()
        ticks++
      }
      return ticks
    }
    expect(fall(0)).toBeGreaterThan(fall(1))
    expect(fall(1)).toBeGreaterThan(fall(2))
  })

  it('CHARACTERISTIC MOMENT: walking it to the flag and holding it there plants the flag', () => {
    const sim = start()
    sim.observe()
    const flag = sim.snapshot().flag!
    grab(sim)
    let planted = false
    for (let i = 0; i < 1500 && !planted; i++) {
      balanceStep(sim, 1, flag.x)
      planted = sim.snapshot().planted === 1
    }
    const obs = sim.observe()
    expect(planted).toBe(true)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'plant' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'flags' })
    expect(obs.features.planted).toBe(1)
    // The next flag is somewhere else.
    expect(Math.abs(sim.snapshot().flag!.x - flag.x)).toBeGreaterThan(200)
    expect(obs.features.walked).toBeGreaterThan(0.1)
  })

  it('CHARACTERISTIC MOMENT: shaking a hanging broom in time lifts it back to standing (the trick)', () => {
    const sim = start()
    run(sim, 900) // it has fallen and hangs
    expect(sim.snapshot().pose).toBe('hang')
    sim.observe()
    grab(sim)
    const centre = sim.snapshot().pivot.x
    let swung = false
    for (let i = 0; i < 2400 && !swung; i++) {
      const s = sim.snapshot()
      if (Math.abs(s.theta) < 0.45 && Math.abs(s.omega) < 2.5) balanceStep(sim, 1, centre)
      else pumpStep(sim, 1, centre)
      swung = sim.snapshot().swungUp
    }
    const obs = sim.observe()
    expect(swung).toBe(true)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'swing-up' })
    expect(obs.features.swingUps).toBe(1)
    expect(obs.signature).toMatch(/\/swung$/)
  })
})

describe('the rack', () => {
  it('a tap on a slot stands a fresh broom of that size at home', () => {
    const sim = start()
    run(sim, 600)
    sim.observe()
    const slot = RACK[2]!
    sim.pointer({ id: 3, phase: 'down', x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 })
    sim.pointer({ id: 3, phase: 'up', x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 })
    const s = sim.snapshot()
    expect(s.length).toBe(LENGTHS[2])
    expect(s.pose).toBe('up')
    expect(s.pivot.x).toBeCloseTo(HOME_X, 0)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'swap' })
    expect(sim.observe().signature).toBe('short/up/open')
  })

  it('a swap lets go of a finger that was carrying the broom', () => {
    const sim = start()
    grab(sim, 1)
    expect(sim.snapshot().held).toBe(true)
    sim.pointer({ id: 2, phase: 'down', x: RACK[0]!.x + 30, y: RACK[0]!.y + 30 })
    expect(sim.snapshot().held).toBe(false)
  })
})

describe('input and determinism', () => {
  it('reports the fingertip handle as a top-left rectangle centred on the pivot', () => {
    const sim = start()
    const s = sim.snapshot()
    const handle = sim.affordances().find((a) => a.kind === 'drag')!
    expect(handle.x + handle.w / 2).toBeCloseTo(s.pivot.x)
    expect(handle.y + handle.h / 2).toBeCloseTo(PIVOT_Y)
    expect(handle.w).toBeGreaterThanOrEqual(60)
    for (const a of sim.affordances()) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('never throws or leaves the field under wild input', () => {
    const sim = start()
    grab(sim)
    for (let i = 0; i < 300; i++) {
      sim.pointer({ id: 1, phase: 'move', x: i % 2 ? -1e9 : 1e9, y: 1e12 })
      sim.step()
    }
    const s = sim.snapshot()
    expect(Number.isFinite(s.theta) && Number.isFinite(s.omega)).toBe(true)
    expect(s.pivot.x).toBeGreaterThanOrEqual(0)
    expect(s.pivot.x).toBeLessThanOrEqual(FIELD_W)
  })

  it('the same seed and the same script give the same signature and snapshot', () => {
    const play = (seed: number) => {
      const sim = start({ seed })
      grab(sim)
      for (let i = 0; i < 200; i++) balanceStep(sim, 1, 900)
      return { signature: sim.observe().signature, snapshot: JSON.stringify(sim.snapshot()) }
    }
    expect(play(4)).toEqual(play(4))
    expect(play(4).snapshot).not.toBe(play(5).snapshot)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 200; i++) {
      sim.pointer({ id: 2, phase: 'down', x: RACK[i % 3]!.x + 30, y: RACK[i % 3]!.y + 30 })
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events, no flag, and no timer', () => {
    const sim = start({ hooks: [] })
    sim.observe()
    grab(sim)
    for (let i = 0; i < 450; i++) balanceStep(sim, 1)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().flag).toBeNull()
    expect(sim.snapshot().planted).toBeNull()
    expect(sim.snapshot().best).toBeNull()
    expect(sim.affordances().some((a) => a.kind === 'hold')).toBe(false)
    expect(obs.features.bestRun).toBeGreaterThan(12)
  })

  it('removing best alone keeps the flag; removing flags alone keeps the timer', () => {
    const noBest = start({ hooks: ['flags'] })
    expect(noBest.snapshot().flag).not.toBeNull()
    expect(noBest.snapshot().best).toBeNull()
    const noFlags = start({ hooks: ['best'] })
    expect(noFlags.snapshot().flag).toBeNull()
    expect(noFlags.snapshot().best).not.toBeNull()
  })

  it('the flag changes what there is to aim at, so the panel can measure it', () => {
    const on = start({ hooks: ['flags'] })
    const off = start({ hooks: [] })
    expect(on.affordances().length).toBe(off.affordances().length + 1)
  })

  it('the best timer changes neither affordances nor signatures', () => {
    const a = start({ hooks: ['best'] })
    const b = start({ hooks: [] })
    grab(a)
    grab(b)
    for (let i = 0; i < 100; i++) {
      balanceStep(a, 1)
      balanceStep(b, 1)
    }
    expect(a.affordances()).toEqual(b.affordances())
    expect(a.observe().signature).toBe(b.observe().signature)
  })
})

describe('hints', () => {
  it('show a way in after a quiet spell, and only when hints are on', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    run(off, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
  })

  it('go away on a touch, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 300)
    run(off, 300)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    expect(meta.signatureBound).toBe(3 * 4 * 2 * 2)
  })

  it('every feature is observed and one is the objective', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
    expect(observed.sort()).toEqual(meta.features.map((f) => f.name).sort())
  })

  it('the three brooms are ordered longest (easiest) to shortest (hardest)', () => {
    expect(LENGTHS[0]).toBeGreaterThan(LENGTHS[1]!)
    expect(LENGTHS[1]).toBeGreaterThan(LENGTHS[2]!)
  })
})
