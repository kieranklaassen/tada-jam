// Proof that the loop's characteristic moment happens: the child pumps in step
// until the arc is wide, lets go a little before the forward peak, and the
// rider sails onto the far hill. Also that the arc only grows when pumping is
// in step, and that where the rider is released decides where the rider lands.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { LEGS_PAD, LETGO_PAD, createSim } from './sim.ts'
import type { SwingSnapshot } from './sim.ts'

type Bench = Sim<SwingSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): Bench {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

const legsCentre = { x: LEGS_PAD.x + LEGS_PAD.w / 2, y: LEGS_PAD.y + LEGS_PAD.h / 2 }
const letGoCentre = { x: LETGO_PAD.x + LETGO_PAD.w / 2, y: LETGO_PAD.y + LETGO_PAD.h / 2 }

function run(sim: Bench, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

// A child who keeps a finger on the legs pad only while `policy` says the legs
// should be out.
function play(sim: Bench, ticks: number, policy: (s: SwingSnapshot) => boolean): void {
  let out = false
  for (let i = 0; i < ticks; i++) {
    const want = policy(sim.snapshot())
    if (want && !out) sim.pointer({ id: 1, phase: 'down', ...legsCentre })
    if (!want && out) sim.pointer({ id: 1, phase: 'up', ...legsCentre })
    out = want
    sim.step()
  }
  if (out) sim.pointer({ id: 1, phase: 'up', ...legsCentre })
}

const inStep = (s: SwingSnapshot) => s.riding && s.omega > 0.05
const outOfStep = (s: SwingSnapshot) => s.riding && s.omega < -0.05
const always = () => true

function letGo(sim: Bench): void {
  sim.pointer({ id: 2, phase: 'down', ...letGoCentre })
  sim.pointer({ id: 2, phase: 'up', ...letGoCentre })
}

// Keep pumping in step (one hand on the legs pad) until `until` holds.
function rideUntil(sim: Bench, until: (s: SwingSnapshot) => boolean, maxTicks = 2400): void {
  let out = false
  for (let i = 0; i < maxTicks && !until(sim.snapshot()); i++) {
    const want = inStep(sim.snapshot())
    if (want && !out) sim.pointer({ id: 1, phase: 'down', ...legsCentre })
    if (!want && out) sim.pointer({ id: 1, phase: 'up', ...legsCentre })
    out = want
    sim.step()
  }
  if (out) sim.pointer({ id: 1, phase: 'up', ...legsCentre })
}

// Pump in step until the arc is at least `amp` radians wide.
function pumpUntil(sim: Bench, amp: number): void {
  rideUntil(sim, (s) => s.amp >= amp)
}

// Let the seat come back first, then wait for it to be going forward and up
// past `theta` (or, for 'peak', to have just stopped at the very top and
// turned back), pumping all the while, and let go with the other hand.
function releaseAt(sim: Bench, release: number | 'peak'): void {
  rideUntil(sim, (s) => s.omega < -0.05)
  rideUntil(sim, (s) => (release === 'peak' ? s.theta > 0.8 && s.omega <= 0 : s.omega > 0 && s.theta >= release))
  letGo(sim)
}

function land(sim: Bench): void {
  for (let i = 0; i < 400 && sim.snapshot().mode !== 'land'; i++) sim.step()
}

// A wide swing, then the release, then the landing. Returns the sim once it has landed.
function flyFrom(release: number | 'peak', options: Parameters<typeof start>[0] = {}): Bench {
  const sim = start(options)
  pumpUntil(sim, 1.1)
  releaseAt(sim, release)
  land(sim)
  return sim
}

const place = (sim: Bench) => sim.snapshot().landed!

describe('the swing', () => {
  it('is alive at tick 0, with something to touch', () => {
    const sim = start()
    const first = sim.snapshot()
    expect(first.riding).toBe(true)
    expect(sim.affordances().some((a) => a.kind === 'hold')).toBe(true)
    run(sim, 15)
    expect(sim.snapshot().theta).not.toBe(first.theta)
  })

  it('left alone, the swing runs down to a stop', () => {
    const sim = start()
    run(sim, 2400)
    expect(sim.snapshot().amp).toBeLessThan(0.1)
    expect(sim.observe().signature).toBe('ride-still/none')
  })
})

describe('pumping', () => {
  it('in step, the arc grows wide', () => {
    const sim = start()
    play(sim, 900, inStep)
    expect(sim.snapshot().amp).toBeGreaterThan(1.0)
    expect(sim.observe().features.arc).toBeGreaterThan(0.8)
    expect(sim.observe().features.sync).toBeGreaterThan(0.8)
  })

  it('out of step, or with the legs held out all the time, the arc never grows', () => {
    const wrong = start()
    play(wrong, 900, outOfStep)
    expect(wrong.snapshot().amp).toBeLessThan(0.2)
    const stuck = start()
    play(stuck, 900, always)
    expect(stuck.snapshot().amp).toBeLessThan(0.55)
  })

  it('stretching the legs shows as a state event', () => {
    const sim = start()
    sim.observe()
    play(sim, 2, always)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'legs-out' })
  })
})

describe('the characteristic moment: releasing a wide swing lands the rider on the far hill', () => {
  it('lets go a little before the forward peak and the rider sails onto the hill', () => {
    const sim = start()
    pumpUntil(sim, 1.1)
    sim.observe()
    releaseAt(sim, 0.5)
    expect(sim.snapshot().mode).toBe('fly')
    expect(sim.observe().signature.startsWith('fly/')).toBe(true)
    land(sim)
    const obs = sim.observe()
    expect(place(sim).cls).toBe('hill')
    expect(obs.signature).toBe('land-hill')
    expect(obs.events).toContainEqual({ kind: 'state', name: 'landed-hill' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'flag' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'island' })
    expect(obs.features.reach).toBeGreaterThan(0.7)
    expect(obs.features.flights).toBe(1)
  })

  it('after a while the rider hops back on and the swing goes on', () => {
    const sim = flyFrom(0.5)
    run(sim, 80)
    expect(sim.snapshot().mode).toBe('ride')
    expect(sim.snapshot().riding).toBe(true)
  })
})

describe('where in the arc the rider is released decides where the rider lands', () => {
  it('a release at the bottom, at the sweet spot, and at the very top land in different places', () => {
    const bottom = place(flyFrom(0.0))
    const sweet = place(flyFrom(0.5))
    const top = place(flyFrom('peak'))
    expect(sweet.cls).toBe('hill')
    expect(sweet.x).toBeGreaterThan(bottom.x)
    expect(sweet.x).toBeGreaterThan(top.x)
    // The very top has no speed: the rider drops nearly straight down, short of the hill.
    expect(top.cls).not.toBe('hill')
    expect(new Set([bottom.cls, sweet.cls, top.cls]).size).toBeGreaterThanOrEqual(2)
  })

  it('the best release is before the peak, not at it: reach rises then falls along the forward swing', () => {
    const reaches = [0.0, 0.25, 0.5, 0.75, 0.95].map((theta) => place(flyFrom(theta)).x)
    const best = reaches.indexOf(Math.max(...reaches))
    expect(best).toBeGreaterThan(0)
    expect(best).toBeLessThan(reaches.length - 1)
  })

  it('a small swing cannot reach the hill however it is released', () => {
    const sim = start()
    play(sim, 200, inStep)
    const amp = sim.snapshot().amp
    expect(amp).toBeLessThan(0.8)
    for (let i = 0; i < 200 && !(sim.snapshot().omega > 0 && sim.snapshot().theta >= amp * 0.6); i++) sim.step()
    letGo(sim)
    land(sim)
    expect(['lawn', 'pond']).toContain(place(sim).cls)
  })

  it('a release while moving backwards sends the rider behind the swing', () => {
    const sim = start()
    pumpUntil(sim, 1.0)
    for (let i = 0; i < 400 && !(sim.snapshot().omega < 0 && sim.snapshot().theta <= -0.4); i++) sim.step()
    letGo(sim)
    land(sim)
    expect(place(sim).x).toBeLessThan(400)
  })
})

describe('the cloud island (the unlock hook)', () => {
  it('opens after the first hill landing, and a finer, higher release can land on it', () => {
    expect(start().snapshot().island).toBe(false)
    const first = flyFrom(0.5)
    expect(first.snapshot().island).toBe(true)
    const classes = new Set<string>()
    for (const theta of [0.7, 0.8, 0.9, 1.0, 1.1]) {
      const sim = start()
      pumpUntil(sim, 1.1)
      releaseAt(sim, 0.5)
      land(sim)
      run(sim, 80) // hop back on
      pumpUntil(sim, 1.1)
      releaseAt(sim, theta)
      land(sim)
      classes.add(place(sim).cls)
    }
    expect(classes.has('cloud')).toBe(true)
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events and no hook behaviour', () => {
    const sim = flyFrom(0.5, { hooks: [] })
    const obs = sim.observe()
    expect(place(sim).cls).toBe('hill')
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().flags).toBeNull()
    expect(sim.snapshot().island).toBe(false)
  })

  it('removing island alone keeps the flag; removing flag alone keeps the island', () => {
    const noIsland = flyFrom(0.5, { hooks: ['flag'] })
    expect(noIsland.observe().events.filter((e) => e.kind === 'hook').map((e) => e.name)).toEqual(['flag'])
    expect(noIsland.snapshot().island).toBe(false)
    const noFlag = flyFrom(0.5, { hooks: ['island'] })
    expect(noFlag.observe().events.filter((e) => e.kind === 'hook').map((e) => e.name)).toEqual(['island'])
    expect(noFlag.snapshot().island).toBe(true)
    expect(noFlag.snapshot().flags).toBeNull()
  })
})

describe('determinism and robustness', () => {
  it('the same seed and script give the same signature and snapshot', () => {
    const a = flyFrom(0.5, { seed: 3 })
    const b = flyFrom(0.5, { seed: 3 })
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('a tap on the let-go pad while landed does nothing', () => {
    const sim = flyFrom(0.5)
    const before = sim.snapshot().flights
    letGo(sim)
    expect(sim.snapshot().flights).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 300; i++) {
      sim.pointer({ id: 1, phase: 'down', ...legsCentre })
      sim.pointer({ id: 1, phase: 'up', ...legsCentre })
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('hints', () => {
  it('show after a quiet spell, only when hints are on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 60)
    run(off, 60)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })
})

describe('the meta', () => {
  it('declares an honest signature bound: 4 arcs x 6 last landings + 6 flying + 5 landed', () => {
    expect(meta.signatureBound).toBe(4 * 6 + 6 + 5)
  })

  it('observes every declared feature', () => {
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
