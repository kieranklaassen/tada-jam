// Proof that the loop's characteristic moment happens: two held ripples, the
// right distance apart, make lines of dead-still water, and a cork parked on
// one of those lines rests there while the water around it stays alive. The
// same script also shows the rule behind it: the spacing, measured in ripple
// widths, decides how many still lines there are.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { createSim } from './sim.ts'
import type { PondSnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function tap(sim: Sim, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

const CY = FIELD_H / 2
const CX = FIELD_W / 2

// Two fingers holding the water `spacing` ripple widths apart, either side of
// the middle of the pond, for `ticks` steps. Fingers stay down.
function holdPair(sim: Sim<PondSnapshot>, spacing: number, ticks: number): void {
  const d = spacing * sim.snapshot().wavelength
  sim.pointer({ id: 1, phase: 'down', x: CX - d / 2, y: CY })
  sim.pointer({ id: 2, phase: 'down', x: CX + d / 2, y: CY })
  run(sim, ticks)
}

// Water height at a point, read from the snapshot (Int8 steps of 1/64).
function heightAt(snap: PondSnapshot, x: number, y: number): number {
  const i = Math.min(snap.cols - 1, Math.max(0, Math.floor(x / snap.cell)))
  const j = Math.min(snap.rows - 1, Math.max(0, Math.floor(y / snap.cell)))
  return snap.h[j * snap.cols + i]! / 64
}

// The biggest swing a spot shows over `ticks` steps of the sim.
function swingAt(sim: Sim<PondSnapshot>, x: number, y: number, ticks = 40): number {
  let peak = 0
  for (let t = 0; t < ticks; t++) {
    sim.step()
    peak = Math.max(peak, Math.abs(heightAt(sim.snapshot(), x, y)))
  }
  return peak
}

// The swing along a horizontal line, one value per probe, over `ticks` steps.
function swingsAlong(sim: Sim<PondSnapshot>, xs: number[], y: number, ticks = 30): number[] {
  const swings = xs.map(() => 0)
  for (let t = 0; t < ticks; t++) {
    sim.step()
    const snap = sim.snapshot()
    xs.forEach((x, i) => {
      swings[i] = Math.max(swings[i]!, Math.abs(heightAt(snap, x, y)))
    })
  }
  return swings
}

describe('rings on the pond', () => {
  it('a tap makes a ring that spreads outward and then dies away', () => {
    const sim = start()
    expect(sim.observe().features.energy).toBe(0)
    tap(sim, CX, CY)
    run(sim, 40)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'ring' })
    expect(obs.features.energy).toBeGreaterThan(0)
    expect(obs.signature).toBe('rings/p0')
    // The ring has moved out: some water a ring's distance away is swinging.
    const snap = sim.snapshot()
    let ringPeak = 0
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2
      for (let r = 120; r <= 330; r += 30) {
        ringPeak = Math.max(ringPeak, Math.abs(heightAt(snap, CX + Math.cos(angle) * r, CY + Math.sin(angle) * r)))
      }
    }
    expect(ringPeak).toBeGreaterThan(0.1)
    run(sim, 600)
    expect(sim.observe().signature).toBe('still/p0')
  })

  it('two rings cross and add: the water swings twice as far where both crests meet', () => {
    const one = start()
    const two = start()
    const lambda = one.snapshot().wavelength
    // Two stones an equal distance either side of a spot P on the bisector.
    const off = 1.5 * lambda
    one.pointer({ id: 1, phase: 'down', x: CX - off, y: CY })
    two.pointer({ id: 1, phase: 'down', x: CX - off, y: CY })
    two.pointer({ id: 2, phase: 'down', x: CX + off, y: CY })
    run(one, 200)
    run(two, 200)
    const alone = swingAt(one, CX, CY)
    const together = swingAt(two, CX, CY)
    expect(alone).toBeGreaterThan(0.05)
    expect(together / alone).toBeGreaterThan(1.7)
    expect(together / alone).toBeLessThan(2.3)
  })
})

describe('the characteristic moment', () => {
  it('two held ripples the right distance apart make lines of dead-still water', () => {
    const sim = start()
    const d = 1.6 * sim.snapshot().wavelength
    sim.observe()
    holdPair(sim, 1.6, 320)
    const obs = sim.observe()
    expect(sim.snapshot().sources.filter((s) => s.steady)).toHaveLength(2)
    expect(sim.snapshot().lines).toBeGreaterThanOrEqual(2)
    expect(obs.signature.startsWith('pair-')).toBe(true)
    expect(obs.signature.startsWith('pair-flat')).toBe(false)
    expect(obs.features.lines).toBeGreaterThanOrEqual(2)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'lines' })
    // Between the stones there are bright bands (crests meet) and dead ones.
    const xs: number[] = []
    for (let x = CX - d / 2 + 30; x <= CX + d / 2 - 30; x += 4) xs.push(x)
    const swings = swingsAlong(sim, xs, CY)
    const bright = Math.max(...swings)
    const dead = Math.min(...swings)
    // Never quite zero: the two rings are not equally strong at every spot.
    expect(bright).toBeGreaterThan(0.4)
    expect(dead).toBeLessThan(bright * 0.3)
  })

  it('a cork left on a still line rests there while the water around it stays alive', () => {
    const sim = start()
    sim.observe()
    holdPair(sim, 1.6, 320)
    // Find the quietest spot between the stones and carry a cork to it.
    const d = 1.6 * sim.snapshot().wavelength
    const xs: number[] = []
    for (let x = CX - d / 2 + 30; x <= CX + d / 2 - 30; x += 4) xs.push(x)
    const swings = swingsAlong(sim, xs, CY)
    const quietX = xs[swings.indexOf(Math.min(...swings))]!
    const cork = sim.snapshot().corks[0]!
    sim.pointer({ id: 3, phase: 'down', x: cork.x, y: cork.y })
    sim.pointer({ id: 3, phase: 'move', x: quietX, y: CY })
    sim.step()
    sim.pointer({ id: 3, phase: 'up', x: quietX, y: CY })
    expect(sim.snapshot().corks[0]!.parked).toBe(false)
    sim.observe()
    run(sim, 140)
    const obs = sim.observe()
    const after = sim.snapshot()
    expect(after.corks[0]!.parked).toBe(true)
    expect(obs.features.parked).toBeGreaterThanOrEqual(1)
    expect(obs.events).toContainEqual({ kind: 'state', name: 'parked' })
    // Other corks may have slid onto lines by themselves; at least this one rests.
    expect(obs.signature).toMatch(/\/p[1-3]$/)
    // "Resting" is not "the pond is calm": both stones are still ringing.
    expect(after.sources.filter((s) => s.steady)).toHaveLength(2)
    expect(obs.features.energy).toBeGreaterThan(0)
    // And the cork barely moves once it has settled.
    const settledAt = { x: after.corks[0]!.x, y: after.corks[0]!.y }
    run(sim, 60)
    const later = sim.snapshot().corks[0]!
    expect(Math.hypot(later.x - settledAt.x, later.y - settledAt.y)).toBeLessThan(20)
    expect(later.parked).toBe(true)
  })

  it('a cork on a bright band does not rest', () => {
    const sim = start()
    holdPair(sim, 1.6, 320)
    const cork = sim.snapshot().corks[0]!
    // Straight up the bisector, well clear of the still lines, is where the
    // two crests always meet: the water there keeps swinging.
    sim.pointer({ id: 3, phase: 'down', x: cork.x, y: cork.y })
    sim.pointer({ id: 3, phase: 'move', x: CX, y: CY - 200 })
    sim.step()
    sim.pointer({ id: 3, phase: 'up', x: CX, y: CY - 200 })
    run(sim, 120)
    expect(sim.snapshot().corks[0]!.parked).toBe(false)
    // It is riding ringing water, not sitting in a calm pond.
    let bob = 0
    for (let t = 0; t < 30; t++) {
      sim.step()
      bob = Math.max(bob, Math.abs(sim.snapshot().corks[0]!.bob))
    }
    expect(bob).toBeGreaterThan(0.2)
  })
})

describe('the rule behind it', () => {
  it('spacing, in ripple widths, decides how many still lines there are', () => {
    const linesFor = (spacing: number): number => {
      const sim = start()
      holdPair(sim, spacing, 380)
      return sim.observe().features.lines
    }
    const close = linesFor(0.3)
    const middling = linesFor(1.6)
    const wide = linesFor(3.6)
    expect(close).toBe(0)
    expect(middling).toBeGreaterThanOrEqual(2)
    expect(wide).toBeGreaterThan(middling)
  })

  it('the pattern class follows the spacing in the signature', () => {
    const signatureFor = (spacing: number): string => {
      const sim = start()
      holdPair(sim, spacing, 380)
      return sim.observe().signature
    }
    expect(signatureFor(0.3)).toBe('pair-flat/p0')
    expect(signatureFor(1.6)).toMatch(/^pair-l[246]\/p\d$/)
    expect(new Set([signatureFor(0.3), signatureFor(1.6), signatureFor(3.6)]).size).toBe(3)
  })

  it('a pair that has only just been dropped reads as settling, not as a pattern', () => {
    const sim = start()
    holdPair(sim, 1.6, 20)
    expect(sim.observe().signature.startsWith('pair-settling')).toBe(true)
    expect(sim.snapshot().lines).toBeNull()
  })

  it('a held stone keeps ringing for a while after the finger lifts, then the water settles', () => {
    const sim = start()
    sim.pointer({ id: 1, phase: 'down', x: CX, y: CY })
    run(sim, 30)
    sim.pointer({ id: 1, phase: 'up', x: CX, y: CY })
    run(sim, 60)
    expect(sim.observe().signature.startsWith('one/')).toBe(true)
    run(sim, 500)
    expect(sim.observe().signature).toBe('still/p0')
  })

  it('sliding a held stone moves the pattern, and the lines re-form after it stops', () => {
    const sim = start()
    const lambda = sim.snapshot().wavelength
    sim.pointer({ id: 1, phase: 'down', x: CX - 0.2 * lambda, y: CY })
    sim.pointer({ id: 2, phase: 'down', x: CX + 0.2 * lambda, y: CY })
    run(sim, 300)
    expect(sim.observe().features.lines).toBe(0)
    for (let s = 1; s <= 20; s++) {
      sim.pointer({ id: 2, phase: 'move', x: CX + (0.2 + (s / 20) * 1.4) * lambda, y: CY })
      sim.step()
    }
    expect(sim.observe().signature.startsWith('pair-settling')).toBe(true)
    run(sim, 300)
    expect(sim.observe().features.lines).toBeGreaterThanOrEqual(2)
  })
})

describe('picking a stone back up', () => {
  it('a finger near a ringing stone slides it instead of dropping a new one, and the lines follow', () => {
    const sim = start()
    const lambda = sim.snapshot().wavelength
    // Lay two stones one after the other with a single finger, close together.
    sim.pointer({ id: 1, phase: 'down', x: CX - 0.25 * lambda, y: CY })
    run(sim, 20)
    sim.pointer({ id: 1, phase: 'up', x: CX - 0.25 * lambda, y: CY })
    sim.pointer({ id: 1, phase: 'down', x: CX + 0.25 * lambda, y: CY })
    run(sim, 20)
    sim.pointer({ id: 1, phase: 'up', x: CX + 0.25 * lambda, y: CY })
    run(sim, 70)
    expect(sim.snapshot().sources.filter((s) => s.steady)).toHaveLength(2)
    expect(sim.observe().features.lines).toBe(0)
    // Pick up the right-hand stone and pull it out to 1.5 ripple widths.
    sim.observe()
    let x = CX + 0.25 * lambda
    sim.pointer({ id: 2, phase: 'down', x, y: CY })
    expect(sim.snapshot().sources).toHaveLength(2)
    expect(sim.observe().events).toContainEqual({ kind: 'state', name: 'stone-grab' })
    for (let s = 1; s <= 24; s++) {
      x = CX + (0.25 + (s / 24) * 1.0) * lambda
      sim.pointer({ id: 2, phase: 'move', x, y: CY })
      sim.step()
    }
    sim.pointer({ id: 2, phase: 'up', x, y: CY })
    expect(sim.snapshot().sources).toHaveLength(2)
    run(sim, 75)
    expect(sim.observe().features.lines).toBeGreaterThanOrEqual(2)
    expect(sim.observe().features.spacing).toBeGreaterThan(1.2)
  })
})

describe('touching corks and water', () => {
  it('a touch on a cork carries the cork and does not make a ripple', () => {
    const sim = start()
    const cork = sim.snapshot().corks[1]!
    sim.observe()
    sim.pointer({ id: 1, phase: 'down', x: cork.x, y: cork.y })
    sim.pointer({ id: 1, phase: 'move', x: 300, y: 300 })
    sim.step()
    expect(sim.snapshot().corks[1]!.x).toBeCloseTo(300)
    expect(sim.snapshot().corks[1]!.held).toBe(true)
    expect(sim.snapshot().sources).toHaveLength(0)
    sim.pointer({ id: 1, phase: 'up', x: 300, y: 300 })
    expect(sim.snapshot().corks[1]!.held).toBe(false)
  })

  it('different seeds make ponds of different ripple width; the same seed the same pond', () => {
    const widths = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => start({ seed }).snapshot().wavelength))
    expect(widths.size).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(start({ seed: 3 }).snapshot())).toBe(JSON.stringify(start({ seed: 3 }).snapshot()))
    expect(JSON.stringify(start({ seed: 3 }).snapshot())).not.toBe(JSON.stringify(start({ seed: 4 }).snapshot()))
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })
})

describe('determinism, hooks, and hints', () => {
  const script = (sim: Sim<PondSnapshot>) => {
    holdPair(sim, 1.6, 300)
    const cork = sim.snapshot().corks[0]!
    sim.pointer({ id: 3, phase: 'down', x: cork.x, y: cork.y })
    sim.pointer({ id: 3, phase: 'move', x: CX + 40, y: CY + 30 })
    sim.step()
    sim.pointer({ id: 3, phase: 'up', x: CX + 40, y: CY + 30 })
    run(sim, 100)
  }

  it('the same seed and the same script give the same signature, features, and picture', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 5 })
    script(a)
    script(b)
    expect(a.observe()).toEqual(b.observe())
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('the prototype declares no hooks, and an empty list gives no hook events', () => {
    expect(meta.hooks).toEqual([])
    const sim = start({ hooks: [] })
    script(sim)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
    const withNames = start({ hooks: ['score'] })
    script(withNames)
    expect(withNames.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('an idle hint points at the water first, only with hints on, and never changes the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })

  it('reports affordances as top-left rectangles that centre on each cork', () => {
    const sim = start()
    const affordances = sim.affordances()
    expect(affordances.length).toBeGreaterThan(0)
    for (const c of sim.snapshot().corks) {
      const match = affordances.find((a) => Math.abs(a.x + a.w / 2 - c.x) < 1e-9 && Math.abs(a.y + a.h / 2 - c.y) < 1e-9)
      expect(match, `an affordance centred on the cork at ${c.x},${c.y}`).toBeDefined()
      expect(match!.w).toBeGreaterThanOrEqual(56)
    }
  })
})

describe('the meta', () => {
  it('declares its features and its age band, and every feature is observed', () => {
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
    expect(
      meta.features
        .filter((f) => f.objective)
        .map((f) => f.name)
        .sort(),
    ).toEqual(['lines', 'parked'])
    expect(meta.ageBand).toEqual([8, 11])
  })
})
