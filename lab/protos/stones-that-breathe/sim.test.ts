// Proof for Stones That Breathe. The characteristic moment: the frog crosses
// the whole river in ONE clean run because the child waited for the instant the
// day's path was up (and a run at the wrong instant gets dunked). The shared
// suite (lab/kit/contract.test.ts) covers determinism, fuzz, and hygiene.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import {
  BANKS,
  BANK_L,
  BANK_R,
  HOP_T,
  LAND_H,
  MAX_GAP_TICKS,
  PATTERNS,
  createSim,
  dayForSeed,
  findRun,
  goodStarts,
  maxGap,
  routeWorks,
  stoneHeight,
} from './sim.ts'
import type { Day, StonesSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 3, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const mod = (a: number, p: number) => ((a % p) + p) % p

function nodeXY(sim: Sim<StonesSnapshot>, node: number) {
  if (node === BANK_L) return { x: BANKS[0].x + BANKS[0].w / 2, y: BANKS[0].y + BANKS[0].h / 2 }
  if (node === BANK_R) return { x: BANKS[1].x + BANKS[1].w / 2, y: BANKS[1].y + BANKS[1].h / 2 }
  const s = sim.snapshot().stones[node]!
  return { x: s.x, y: s.y }
}

function tapNode(sim: Sim<StonesSnapshot>, node: number, id = 1): void {
  const p = nodeXY(sim, node)
  sim.pointer({ id, phase: 'down', x: p.x, y: p.y })
  sim.pointer({ id, phase: 'up', x: p.x, y: p.y })
}

// Step until the NEXT step's world clock is t0 (mod the day's period), so the
// taps that follow start the first hop exactly at t0.
function waitForStart(sim: Sim<StonesSnapshot>, day: Day, t0: number): void {
  while (mod(sim.snapshot().clock - (t0 - 1), day.period) !== 0) sim.step()
}

function crossingScript(sim: Sim<StonesSnapshot>, route: number[]): void {
  for (const id of route) tapNode(sim, id)
  tapNode(sim, BANK_R)
  run(sim, (route.length + 3) * HOP_T)
}

describe('the day', () => {
  it('every day has a beat, a pattern, and a path that comes up often enough to wait for', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const day = dayForSeed(seed)
      expect(PATTERNS).toContain(day.pattern)
      for (const cols of [4, 5]) {
        const good = goodStarts(day, cols)
        expect(good.length, `seed ${seed} cols ${cols} has a run`).toBeGreaterThan(0)
        expect(maxGap(good, day.period), `seed ${seed} cols ${cols} gap`).toBeLessThanOrEqual(MAX_GAP_TICKS)
      }
    }
  })

  it('every stone rises and sinks on a whole multiple of the one beat', () => {
    const day = dayForSeed(5)
    for (let id = 0; id < 10; id++) {
      const period = day.ks[id]! * day.beat
      for (const t of [0, 17, 300]) {
        expect(stoneHeight(day, id, t)).toBeCloseTo(stoneHeight(day, id, t + period), 9)
      }
    }
  })

  it('different seeds give different days', () => {
    const patterns = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => dayForSeed(s).pattern))
    expect(patterns.size).toBeGreaterThanOrEqual(3)
    expect(JSON.stringify(dayForSeed(1))).not.toBe(JSON.stringify(dayForSeed(2)))
    expect(JSON.stringify(dayForSeed(1))).toBe(JSON.stringify(dayForSeed(1)))
  })
})

describe('the characteristic moment', () => {
  it('crossing at the instant the path is up is one clean run, and the hooks fire', () => {
    const day = dayForSeed(3)
    const t0 = goodStarts(day, 4)[0]!
    const route = findRun(day, 4, t0)!
    expect(route).toHaveLength(4)
    const sim = start({ seed: 3 })
    sim.observe()
    waitForStart(sim, day, t0)
    crossingScript(sim, route)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'cross' })
    expect(obs.events.some((e) => e.kind === 'state' && e.name === 'dunk')).toBe(false)
    expect(obs.features.crossings).toBe(1)
    expect(obs.features.clean).toBe(1)
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'bloom' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'widen' })
    // The frog is home on the far bank, the river is one column wider.
    expect(obs.signature).toBe(`${day.pattern}/bank/clean`)
    expect(sim.snapshot().stones.filter((s) => s.live)).toHaveLength(10)
    expect(obs.features.progress).toBe(1)
  })

  it('the same route at the wrong instant gets a soft splash back to the bank', () => {
    const day = dayForSeed(3)
    const t0 = goodStarts(day, 4)[0]!
    const route = findRun(day, 4, t0)!
    let bad = -1
    for (let s = 0; s < day.period; s++) if (!routeWorks(day, route, s)) { bad = s; break }
    expect(bad).toBeGreaterThanOrEqual(0)
    const sim = start({ seed: 3 })
    sim.observe()
    waitForStart(sim, day, bad)
    crossingScript(sim, route)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'dunk' })
    expect(obs.features.crossings).toBe(0)
    expect(obs.signature).toBe(`${day.pattern}/bank/dunked`)
    expect(sim.snapshot().frog.node).toBe(BANK_L)
    expect(sim.snapshot().queue).toHaveLength(0)
    // Nothing is lost: the frog can hop again at once.
    tapNode(sim, route[0]!)
    run(sim, 2)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'leap' })
  })

  it('a dunk then a later success is a messy crossing, and stays off the hooks', () => {
    const day = dayForSeed(3)
    const t0 = goodStarts(day, 4)[0]!
    const route = findRun(day, 4, t0)!
    let bad = -1
    for (let s = 0; s < day.period; s++) if (!routeWorks(day, route, s)) { bad = s; break }
    const sim = start({ seed: 3 })
    waitForStart(sim, day, bad)
    crossingScript(sim, route)
    sim.observe()
    // Wait for the good instant and go again.
    waitForStart(sim, day, t0)
    crossingScript(sim, route)
    const obs = sim.observe()
    expect(obs.features.crossings).toBe(1)
    expect(obs.features.clean).toBe(0)
    expect(obs.signature).toBe(`${day.pattern}/bank/messy`)
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('a frog left sitting on a stone goes down with it', () => {
    const day = dayForSeed(3)
    const t0 = goodStarts(day, 4)[0]!
    const route = findRun(day, 4, t0)!
    const sim = start({ seed: 3 })
    waitForStart(sim, day, t0)
    tapNode(sim, route[0]!)
    run(sim, HOP_T + 2)
    expect(sim.snapshot().frog.node).toBe(route[0])
    expect(sim.snapshot().frog.node).not.toBe(BANK_L)
    sim.observe()
    run(sim, day.period + 40)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'dunk' })
    expect(sim.snapshot().frog.node).toBe(BANK_L)
  })

  it('a stone out of reach is refused quietly', () => {
    const sim = start()
    sim.observe()
    tapNode(sim, 6) // last column, from the far left bank
    run(sim, 20)
    const obs = sim.observe()
    expect(obs.events).toEqual([])
    expect(sim.snapshot().frog.node).toBe(BANK_L)
    expect(sim.snapshot().queue).toHaveLength(0)
  })

  it('a tap on a stone in reach queues a leap and the frog goes', () => {
    const day = dayForSeed(3)
    const sim = start({ seed: 3 })
    const first = [0, 1].find((id) => stoneHeight(day, id, day.start + HOP_T + 1) >= LAND_H) ?? 0
    sim.observe()
    tapNode(sim, first)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'queue' })
    sim.step()
    expect(sim.snapshot().frog.hopping).toBe(true)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'leap' })
  })
})

describe('the hooks list', () => {
  function crossCleanly(hooks: readonly string[]) {
    const day = dayForSeed(3)
    const t0 = goodStarts(day, 4)[0]!
    const route = findRun(day, 4, t0)!
    const sim = start({ seed: 3, hooks })
    waitForStart(sim, day, t0)
    crossingScript(sim, route)
    return { sim, day, obs: sim.observe() }
  }

  it('an empty list means no hook events and no hook behaviour', () => {
    const { sim, day, obs } = crossCleanly([])
    expect(obs.features.clean).toBe(1)
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().blooms).toBeNull()
    expect(sim.snapshot().stones.filter((s) => s.live)).toHaveLength(8)
    expect(obs.signature).toBe(`${day.pattern}/bank/clean`)
  })

  it('removing widen alone keeps the bloom and the four columns', () => {
    const { sim, obs } = crossCleanly(['bloom'])
    expect(obs.events.filter((e) => e.kind === 'hook')).toEqual([{ kind: 'hook', name: 'bloom' }])
    expect(sim.snapshot().blooms).toBe(1)
    expect(sim.snapshot().stones.filter((s) => s.live)).toHaveLength(8)
  })

  it('removing bloom alone keeps the wider river and drops the flower', () => {
    const { sim, obs } = crossCleanly(['widen'])
    expect(obs.events.filter((e) => e.kind === 'hook')).toEqual([{ kind: 'hook', name: 'widen' }])
    expect(sim.snapshot().blooms).toBeNull()
    expect(sim.snapshot().stones.filter((s) => s.live)).toHaveLength(10)
  })

  it('the wider river is still crossable at some instant', () => {
    const { sim, day } = crossCleanly(meta.hooks)
    sim.observe()
    // Now on the far bank of a five-column river: cross back to the left bank.
    const good = goodStarts(day, 5)
    expect(good.length).toBeGreaterThan(0)
  })
})

describe('determinism and variation', () => {
  it('the same seed and script give the same signature and snapshot', () => {
    const play = () => {
      const sim = start({ seed: 9 })
      run(sim, 20)
      tapNode(sim, 0)
      tapNode(sim, 2)
      run(sim, 90)
      return { signature: sim.observe().signature, snap: JSON.stringify(sim.snapshot()) }
    }
    expect(play()).toEqual(play())
  })

  it('different seeds end up in at least two different kinds of place after the same script', () => {
    const signatures = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const sim = start({ seed })
      run(sim, 10)
      tapNode(sim, 0)
      run(sim, 3)
      signatures.add(sim.observe().signature)
    }
    expect(signatures.size).toBeGreaterThanOrEqual(2)
  })
})

describe('hints', () => {
  it('ring a stone in reach after a quiet spell, only when hints are on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })
})

describe('the shape of the sim', () => {
  it('reports affordances as top-left rectangles centred on the stones, inside the field', () => {
    const sim = start()
    const affordances = sim.affordances()
    for (const s of sim.snapshot().stones.filter((st) => st.live)) {
      const match = affordances.find((a) => Math.abs(a.x + a.w / 2 - s.x) < 1e-9 && Math.abs(a.y + a.h / 2 - s.y) < 1e-9)
      expect(match, `an affordance centred on the stone at ${s.x},${s.y}`).toBeDefined()
      expect(match!.w).toBeGreaterThanOrEqual(60)
    }
    for (const a of affordances) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
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

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 400; i++) {
      tapNode(sim, 0)
      sim.step()
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    // 4 patterns x 4 places (bank, near, mid, far) x 4 last results.
    expect(meta.signatureBound).toBe(4 * 4 * 4)
  })

  it('gives every cumulative count an upward objective, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective === 'up').map((f) => f.name)).toEqual(['landings', 'crossings', 'clean'])
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
