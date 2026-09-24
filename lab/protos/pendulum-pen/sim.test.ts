// Proof for Pendulum Pen. The characteristic moment: the child sets the two
// weights to a two-to-three swing, says "four petals" from the weights alone,
// pulls both rods back, lets one go a moment after the other, and the pen draws
// the four-petal knot they aimed at, which then shrinks into a spiral. The shared
// suite (lab/kit/contract.test.ts) covers determinism, fuzz, and hygiene.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim, SimEvent } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import {
  AIM_CARD,
  DELTA,
  GUESS_BUTTONS,
  NEW_PAPER,
  NOTCH_D,
  PIVOT_Y,
  ROD_X,
  SWING,
  W,
  createSim,
  petalsOf,
} from './sim.ts'
import type { PenSnapshot } from './sim.ts'

type PenSim = Sim<PenSnapshot>

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): PenSim {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function centre(r: { x: number; y: number; w: number; h: number }) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

function tap(sim: Sim, x: number, y: number, id = 9): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

// Drag a weight (of a rod at rest) to a notch, 1 (slowest, lowest) to 5 (fastest, highest).
function setWeight(sim: PenSim, rod: 0 | 1, notch: number, id = 5): void {
  const from = sim.snapshot().rods[rod]!.weight
  const toY = PIVOT_Y + NOTCH_D[notch - 1]!
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 6; s++) {
    sim.pointer({ id, phase: 'move', x: from.x, y: from.y + ((toY - from.y) * s) / 6 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: from.x, y: toY })
}

// Where each finger last was, so a lift happens where the finger was.
const fingers = new Map<number, { x: number; y: number }>()

// Pull a rod at rest back to displacement u (-1 to 1) and keep the finger down.
function pull(sim: PenSim, rod: 0 | 1, u: number, id: number): void {
  const tip = sim.snapshot().rods[rod]!.tip
  sim.pointer({ id, phase: 'down', x: tip.x, y: tip.y })
  const at = { x: ROD_X[rod]! + u * SWING, y: tip.y }
  sim.pointer({ id, phase: 'move', ...at })
  fingers.set(id, at)
}

function letGo(sim: Sim, id: number): void {
  const at = fingers.get(id) ?? { x: 0, y: 0 }
  sim.pointer({ id, phase: 'up', ...at })
}

function guessBy(sim: Sim, petals: number): void {
  const c = centre(GUESS_BUTTONS[petals - 1]!)
  tap(sim, c.x, c.y)
}

const names = (events: SimEvent[], kind: SimEvent['kind']) => events.filter((e) => e.kind === kind).map((e) => e.name)

// The two-to-three knot: weights 2 and 3, both rods pulled to 0.8, A let go, and
// B let go `delay` ticks later.
function drawTwoThree(sim: PenSim, delay: number, guess?: number): void {
  setWeight(sim, 0, 2)
  setWeight(sim, 1, 3)
  if (guess !== undefined) guessBy(sim, guess)
  pull(sim, 0, 0.8, 1)
  pull(sim, 1, 0.8, 2)
  letGo(sim, 1)
  run(sim, delay)
  letGo(sim, 2)
}

function runUntilDone(sim: PenSim, limit = 1500): number {
  for (let i = 0; i < limit; i++) {
    sim.step()
    if (sim.snapshot().stage === 'done') return i + 1
  }
  return limit
}

// The farthest the pen got from the middle, between two fractions of the ink.
const radius = (trace: number[], from: number, to: number) => {
  const points = trace.length / 2
  let r = 0
  for (let i = Math.floor(points * from); i < Math.floor(points * to); i++) r = Math.max(r, Math.hypot(trace[2 * i]!, trace[2 * i + 1]!))
  return r
}

describe('the characteristic moment: a predicted knot, drawn, then shrinking to a spiral', () => {
  it('draws the four-petal knot the child aimed at, right on the analytic swing', () => {
    const sim = start()
    sim.observe()
    setWeight(sim, 0, 2)
    setWeight(sim, 1, 3)
    expect(petalsOf(2, 3)).toBe(4)
    guessBy(sim, 4)
    pull(sim, 0, 0.8, 1)
    pull(sim, 1, 0.8, 2)
    expect(sim.observe().signature).toBe('pulled-p4')
    expect(sim.snapshot().trace).toHaveLength(0) // nothing inks while the rods are held

    letGo(sim, 1)
    expect(sim.observe().signature).toBe('swing-line') // only one rod swings: a line
    run(sim, 4) // A swings for 4 ticks, B still held
    letGo(sim, 2)
    const obs = sim.observe()
    expect(obs.events).toContainEqual({ kind: 'state', name: 'lock' })
    expect(obs.events).toContainEqual({ kind: 'state', name: 'guess-right' })
    expect(obs.events).toContainEqual({ kind: 'hook', name: 'guess' })
    expect(obs.signature).toBe('swing-p4-wide')
    expect(sim.snapshot().guessResult).toBe('right')

    // The pen follows two damped swings from rest at the rates the weights set:
    // u(t) = u0 e^(-d t) (cos kt + (d / k) sin kt), the exact damped oscillator.
    const swing = (u0: number, k: number, t: number) => u0 * Math.exp(-DELTA * t) * (Math.cos(k * t) + (DELTA / k) * Math.sin(k * t))
    const dt = 0.033
    for (let m = 1; m <= 90; m++) {
      sim.step()
      const tA = (4 + m) * dt
      const tB = m * dt
      const pen = sim.snapshot().pen
      expect(pen.x).toBeCloseTo(swing(0.8, 2 * W, tA), 6)
      expect(pen.y).toBeCloseTo(swing(0.8, 3 * W, tB), 6)
    }

    const ticks = runUntilDone(sim)
    expect(ticks).toBeLessThan(1200)
    const done = sim.observe()
    expect(done.signature).toBe('done-p4-wide')
    expect(done.events).toContainEqual({ kind: 'state', name: 'done' })
    expect(done.features.figures).toBe(1)
    expect(done.features.hits).toBe(1)
    expect(done.features.kinds).toBe(1)

    // A slowly shrinking spiral: the ink near the end is far smaller than at the start.
    const snap = sim.snapshot()
    expect(snap.trace.length).toBeGreaterThan(600)
    const first = radius(snap.trace, 0, 0.2)
    const last = radius(snap.trace, 0.8, 1)
    expect(first).toBeGreaterThan(0.6)
    expect(last).toBeLessThan(first * 0.2)
    expect(snap.gallery).toHaveLength(1)
    expect(snap.gallery[0]!.petals).toBe(4)
  })

  it('a wrong guess is told so, and fires no hook', () => {
    const sim = start()
    drawTwoThree(sim, 4, 3)
    const obs = sim.observe()
    expect(names(obs.events, 'state')).toContain('guess-wrong')
    expect(names(obs.events, 'hook')).not.toContain('guess')
    expect(obs.features.hits).toBe(0)
    expect(sim.snapshot().guessResult).toBe('wrong')
  })

  it('release timing sets how open the knot is: together is a thin folded arc, a moment later is wide', () => {
    const together = start()
    drawTwoThree(together, 0)
    expect(together.observe().signature).toBe('swing-p4-thin')
    const later = start()
    drawTwoThree(later, 4)
    expect(later.observe().signature).toBe('swing-p4-wide')
    const halfway = start()
    drawTwoThree(halfway, 9)
    expect(halfway.observe().signature).toBe('swing-p4-thin') // half a swing on folds it again
    expect(later.observe().features.open).toBeGreaterThan(0.9)
  })
})

describe('the weights', () => {
  it('slide along the rod and snap to a notch; higher is faster', () => {
    const sim = start()
    setWeight(sim, 0, 5)
    setWeight(sim, 1, 1)
    const rods = sim.snapshot().rods
    expect(rods[0]!.notch).toBe(5)
    expect(rods[1]!.notch).toBe(1)
    expect(rods[0]!.weight.y).toBeLessThan(rods[1]!.weight.y)
    expect(sim.observe().signature).toBe(`set-p${petalsOf(5, 1)}`)
  })

  it('equal ratios are the same shape: 2 to 4 reads the same as 1 to 2', () => {
    expect(petalsOf(2, 4)).toBe(petalsOf(1, 2))
    expect(petalsOf(3, 3)).toBe(1)
    expect(petalsOf(1, 2)).toBe(2)
    expect(petalsOf(4, 5)).toBe(8)
    const a = start()
    const b = start()
    setWeight(a, 0, 2)
    setWeight(a, 1, 4)
    setWeight(b, 0, 1)
    setWeight(b, 1, 2)
    expect(a.observe().signature).toBe(b.observe().signature)
  })
})

describe('the rods', () => {
  it('a held rod shows where the pen will start, without inking', () => {
    const sim = start()
    pull(sim, 0, -0.5, 1)
    run(sim, 20)
    const snap = sim.snapshot()
    expect(snap.pen.x).toBeCloseTo(-0.5, 6)
    expect(snap.trace).toHaveLength(0)
    expect(snap.stage).toBe('pulled')
  })

  it('one rod alone draws a straight line that fades away', () => {
    const sim = start()
    pull(sim, 0, 0.9, 1)
    letGo(sim, 1)
    run(sim, 60)
    const xs = sim.snapshot().trace.filter((_, i) => i % 2 === 1)
    expect(xs.every((y) => y === 0)).toBe(true)
    runUntilDone(sim)
    expect(sim.observe().signature).toBe('done-line')
  })

  it('catching a swinging rod holds it where it is, with no jump', () => {
    const sim = start()
    setWeight(sim, 0, 2)
    pull(sim, 0, 0.9, 1)
    letGo(sim, 1)
    run(sim, 17)
    const before = sim.snapshot().rods[0]!
    expect(before.held).toBe(false)
    sim.pointer({ id: 3, phase: 'down', x: before.tip.x + 10, y: before.tip.y })
    const caught = sim.snapshot().rods[0]!
    expect(caught.held).toBe(true)
    expect(caught.u).toBeCloseTo(before.u, 9)
    run(sim, 10)
    expect(sim.snapshot().rods[0]!.u).toBeCloseTo(before.u, 9)
    expect(sim.snapshot().stage).toBe('swing')
  })

  it('pulling a rod after a figure is done starts fresh paper and keeps the old drawing', () => {
    const sim = start()
    drawTwoThree(sim, 4)
    runUntilDone(sim)
    expect(sim.snapshot().gallery).toHaveLength(1)
    sim.observe()
    pull(sim, 0, 0.5, 1)
    const snap = sim.snapshot()
    expect(snap.trace).toHaveLength(0)
    expect(snap.stage).toBe('pulled')
    expect(snap.gallery).toHaveLength(1)
    expect(names(sim.observe().events, 'state')).toContain('paper')
  })

  it('new paper wipes a figure mid-swing, and the guess with it', () => {
    const sim = start()
    drawTwoThree(sim, 4, 4)
    run(sim, 100)
    const c = centre(NEW_PAPER)
    tap(sim, c.x, c.y)
    const snap = sim.snapshot()
    expect(snap.trace).toHaveLength(0)
    expect(snap.guess).toBeNull()
    expect(snap.stage).toBe('set')
    expect(snap.rods.every((r) => r.u === 0 && !r.held)).toBe(true)
  })
})

describe('the aim', () => {
  it('shows a ghost figure to draw, and drawing it counts', () => {
    let met = false
    const probe = start()
    const target = probe.snapshot().target!
    expect(target).not.toBeNull()
    for (let delay = 1; delay <= 12 && !met; delay++) {
      const sim = start()
      setWeight(sim, 0, target.a)
      setWeight(sim, 1, target.b)
      pull(sim, 0, 0.8, 1)
      pull(sim, 1, 0.7, 2)
      letGo(sim, 1)
      run(sim, delay)
      letGo(sim, 2)
      const events = sim.observe().events
      if (names(events, 'hook').includes('target')) {
        met = true
        expect(names(events, 'state')).toContain('target-met')
        expect(sim.snapshot().target!.met).toBe(true)
        expect(sim.observe().features.matches).toBe(1)
      }
    }
    expect(met).toBe(true)
  })

  it('a different figure than the ghost is a miss', () => {
    const sim = start()
    const target = sim.snapshot().target!
    const other = target.a === 2 && target.b === 3 ? [3, 4] : [2, 3]
    setWeight(sim, 0, other[0]!)
    setWeight(sim, 1, other[1]!)
    pull(sim, 0, 0.8, 1)
    pull(sim, 1, 0.8, 2)
    letGo(sim, 1)
    run(sim, 4)
    letGo(sim, 2)
    const events = sim.observe().events
    expect(names(events, 'hook')).not.toContain('target')
    expect(names(events, 'state')).toContain('target-missed')
  })

  it('tapping the aim card asks for a different figure', () => {
    const sim = start()
    const first = sim.snapshot().target!
    const c = centre(AIM_CARD)
    tap(sim, c.x, c.y)
    const second = sim.snapshot().target!
    expect(second.a !== first.a || second.b !== first.b).toBe(true)
  })

  it('the ghost stays until it is drawn, then a new one comes with the next paper', () => {
    const sim = start()
    const target = sim.snapshot().target!
    setWeight(sim, 0, 3)
    setWeight(sim, 1, 2)
    const c = centre(NEW_PAPER)
    tap(sim, c.x, c.y)
    expect(sim.snapshot().target!.a).toBe(target.a)
    expect(sim.snapshot().target!.b).toBe(target.b)
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events, no guess strip, no ghost', () => {
    const sim = start({ hooks: [] })
    guessBy(sim, 4)
    drawTwoThree(sim, 4)
    run(sim, 30)
    const events = sim.observe().events
    expect(events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().guessButtons).toBeNull()
    expect(sim.snapshot().target).toBeNull()
    expect(sim.snapshot().guess).toBeNull()
    expect(sim.observe().features.hits).toBe(0)
  })

  it('removing guess alone keeps the ghost, and removing target alone keeps the strip', () => {
    const noGuess = start({ hooks: ['target'] })
    expect(noGuess.snapshot().guessButtons).toBeNull()
    expect(noGuess.snapshot().target).not.toBeNull()
    expect(noGuess.affordances().length).toBeLessThan(start().affordances().length)
    const noTarget = start({ hooks: ['guess'] })
    expect(noTarget.snapshot().guessButtons).toHaveLength(8)
    expect(noTarget.snapshot().target).toBeNull()
    drawTwoThree(noTarget, 4, 4)
    const events = noTarget.observe().events
    expect(events.filter((e) => e.kind === 'hook').map((e) => e.name)).toEqual(['guess'])
  })
})

describe('hints', () => {
  it('point at a rod after a quiet spell, only when on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 100)
    run(off, 100)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    const hint = on.snapshot().hint
    expect(hint).not.toBeNull()
    expect(hint!.kind).toBe('pull')
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })
})

describe('the sim', () => {
  it('same seed and script give the same signature and snapshot', () => {
    const a = start({ seed: 5 })
    const b = start({ seed: 5 })
    drawTwoThree(a, 5, 4)
    drawTwoThree(b, 5, 4)
    run(a, 300)
    run(b, 300)
    expect(a.observe()).toEqual(b.observe())
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('different seeds start with different weights and aims', () => {
    const signatures = new Set<string>()
    const aims = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const sim = start({ seed })
      signatures.add(sim.observe().signature)
      const t = sim.snapshot().target!
      aims.add(`${t.a}:${t.b}`)
    }
    expect(signatures.size).toBeGreaterThanOrEqual(2)
    expect(aims.size).toBeGreaterThanOrEqual(2)
  })

  it('reports affordances as top-left rectangles that centre on the tips and weights', () => {
    const sim = start()
    const list = sim.affordances()
    expect(list.length).toBeGreaterThan(0)
    for (const r of sim.snapshot().rods) {
      for (const p of [r.tip, r.weight]) {
        const match = list.find((a) => Math.abs(a.x + a.w / 2 - p.x) < 1e-9 && Math.abs(a.y + a.h / 2 - p.y) < 1e-9)
        expect(match, `an affordance centred on ${p.x},${p.y}`).toBeDefined()
        expect(match!.w).toBeGreaterThanOrEqual(60)
      }
    }
    for (const a of list) {
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
    for (let i = 0; i < 300; i++) {
      pull(sim, 0, 0.5, 4)
      letGo(sim, 4)
      sim.step()
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    // 4 stages: set and pulled name 8 petal classes; swing and done name a line
    // or 8 petal classes times thin or wide.
    expect(meta.signatureBound).toBe(2 * 8 + 2 * (1 + 8 * 2))
  })

  it('names exactly one objective feature, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
