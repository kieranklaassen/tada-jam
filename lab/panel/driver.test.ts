import { describe, expect, it } from 'vitest'
import { createRng } from '../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../kit/sim.ts'
import type { Affordance, PointerInput } from '../kit/sim.ts'
import { affordanceCenter, createDriver, gaussian, insideAffordance } from './driver.ts'
import type { DriverStep } from './driver.ts'
import { HOLD_MIN_TICKS } from './thresholds.ts'
import { PERSONAS } from './personas.ts'
import type { Persona } from './types.ts'

const kaia = PERSONAS[0]!

function withJitter(persona: Persona, touchJitter: number): Persona {
  return { ...persona, touchJitter }
}

// A 40 by 40 tap target: (x, y) is the top-left corner.
const TARGET: Affordance = { x: 500, y: 400, w: 40, h: 40, kind: 'tap', salience: 1 }

interface Collected {
  steps: DriverStep[]
  inputs: { tick: number; input: PointerInput }[]
}

function drive(persona: Persona, seed: number, ticks: number, getAffordances: () => Affordance[], cueBlind = false): Collected {
  const driver = createDriver({ persona, rng: createRng(seed), cueBlind, keyStats: new Map() })
  const steps: DriverStep[] = []
  const inputs: Collected['inputs'] = []
  for (let tick = 0; tick < ticks; tick++) {
    const step = driver.act(tick, getAffordances)
    steps.push(step)
    for (const input of step.inputs) inputs.push({ tick, input })
  }
  return { steps, inputs }
}

function aimedStarts(steps: DriverStep[]) {
  return steps.flatMap((s) => (s.started && s.started.aimed ? [s.started] : []))
}

describe('driver geometry', () => {
  it('uses the top-left convention for affordance rectangles', () => {
    expect(affordanceCenter(TARGET)).toEqual({ x: 520, y: 420 })
    expect(insideAffordance(TARGET, { x: 500, y: 400 })).toBe(true)
    expect(insideAffordance(TARGET, { x: 540, y: 440 })).toBe(true)
    expect(insideAffordance(TARGET, { x: 541, y: 420 })).toBe(false)
  })

  it('draws standard normal noise from two rng values', () => {
    const rng = createRng(3)
    const draws = Array.from({ length: 4000 }, () => gaussian(rng))
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length
    const variance = draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length
    expect(Math.abs(mean)).toBeLessThan(0.06)
    expect(Math.abs(variance - 1)).toBeLessThan(0.1)
  })
})

describe('driver touches', () => {
  it('with jitter 0 every aimed touch lands on the target centre', () => {
    const { steps, inputs } = drive(withJitter(kaia, 0), 11, 3000, () => [TARGET])
    const starts = aimedStarts(steps)
    expect(starts.length).toBeGreaterThan(50)
    const downs = inputs.filter((i) => i.input.phase === 'down')
    const aimedDowns = downs.filter((d) => d.input.x === 520 && d.input.y === 420)
    expect(aimedDowns.length).toBeGreaterThanOrEqual(starts.length)
    expect(starts.every((s) => s.hit)).toBe(true)
  })

  it('with jitter larger than the target it misses at about the expected rate over 1000 taps', () => {
    const sigma = 60
    const { steps, inputs } = drive(withJitter(kaia, sigma), 21, 40000, () => [TARGET])
    const aimedTaps = new Set<number>()
    // Collect the down input of each aimed tap: it is the input at the start tick.
    let taps = 0
    let hits = 0
    steps.forEach((step, tick) => {
      const started = step.started
      if (!started || !started.aimed || started.kind !== 'tap') return
      const down = inputs.find((i) => i.tick === tick && i.input.phase === 'down')!
      aimedTaps.add(tick)
      taps++
      if (insideAffordance(TARGET, down.input)) hits++
    })
    expect(taps).toBeGreaterThanOrEqual(1000)
    const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2))
    const perAxis = 2 * phi(20 / sigma) - 1
    const expected = perAxis * perAxis
    const missRate = 1 - hits / taps
    // Roughly the expected rate: within four standard errors.
    const se = Math.sqrt((expected * (1 - expected)) / taps)
    expect(Math.abs(hits / taps - expected)).toBeLessThan(4 * se)
    expect(missRate).toBeGreaterThan(0.85)
  })

  it('makes taps, holds, and drags with the shapes the sim contract names', () => {
    const affs: Affordance[] = [
      { x: 100, y: 100, w: 90, h: 90, kind: 'tap', salience: 0.9 },
      { x: 600, y: 300, w: 90, h: 90, kind: 'drag', salience: 0.8 },
      { x: 300, y: 600, w: 90, h: 90, kind: 'hold', salience: 0.7 },
    ]
    const persona = withJitter(PERSONAS.find((p) => p.id === 'arch-11')!, 8)
    const { steps, inputs } = drive(persona, 5, 12000, () => affs)
    const byGesture = new Map<number, PointerInput[]>()
    const order: PointerInput[][] = []
    steps.forEach((s) => {
      for (const input of s.inputs) {
        const list = byGesture.get(input.id)
        if (list) list.push(input)
        else {
          const fresh = [input]
          byGesture.set(input.id, fresh)
          order.push(fresh)
        }
      }
    })
    expect(order.length).toBeGreaterThan(100)
    for (const g of order) {
      expect(g[0]!.phase).toBe('down')
      expect(g[g.length - 1]!.phase).toBe('up')
      for (const mid of g.slice(1, -1)) expect(mid.phase).toBe('move')
    }
    // Each kind appears; a tap is down then up on the next tick.
    const kinds = new Set(steps.flatMap((s) => (s.started ? [s.started.kind] : [])))
    expect(kinds).toEqual(new Set(['tap', 'drag', 'hold']))
    const tapStarts = steps.flatMap((s, tick) => (s.started?.kind === 'tap' ? [tick] : []))
    for (const tick of tapStarts.slice(0, 20)) {
      const next = steps[tick + 1]!
      expect(next.inputs.map((i) => i.phase)).toEqual(['up'])
    }
    const holdStart = steps.findIndex((s) => s.started?.kind === 'hold')
    const holdEnd = steps.findIndex((s, tick) => tick > holdStart && s.ended?.kind === 'hold')
    expect(holdEnd - holdStart).toBeGreaterThanOrEqual(HOLD_MIN_TICKS - 1)
    const dragStart = steps.findIndex((s) => s.started?.kind === 'drag')
    const dragEnd = steps.findIndex((s, tick) => tick > dragStart && s.ended?.kind === 'drag')
    const moves = steps.slice(dragStart, dragEnd + 1).flatMap((s) => s.inputs.filter((i) => i.phase === 'move'))
    expect(moves.length).toBeGreaterThanOrEqual(3)
    // Every input is inside the field.
    for (const { input } of inputs) {
      expect(input.x).toBeGreaterThanOrEqual(0)
      expect(input.x).toBeLessThanOrEqual(FIELD_W)
      expect(input.y).toBeGreaterThanOrEqual(0)
      expect(input.y).toBeLessThanOrEqual(FIELD_H)
    }
  })

  it('cue-blind touches ignore affordances and spread over the whole field', () => {
    let asked = 0
    const { steps, inputs } = drive(kaia, 9, 6000, () => {
      asked++
      return [TARGET]
    }, true)
    expect(asked).toBe(0)
    expect(steps.every((s) => !s.started || !s.started.aimed)).toBe(true)
    const downs = inputs.filter((i) => i.input.phase === 'down').map((i) => i.input)
    expect(downs.length).toBeGreaterThan(200)
    const quadrant = (p: PointerInput) => (p.x < FIELD_W / 2 ? 0 : 1) + (p.y < FIELD_H / 2 ? 0 : 2)
    const counts = [0, 0, 0, 0]
    for (const d of downs) counts[quadrant(d)]!++
    for (const c of counts) expect(c / downs.length).toBeGreaterThan(0.15)
    // Almost none land on the lone 40 by 40 target (about 0.2 percent of the field).
    const onTarget = downs.filter((d) => insideAffordance(TARGET, d)).length
    expect(onTarget / downs.length).toBeLessThan(0.03)
  })

  it('with no affordances it makes free touches and no aimed touches', () => {
    const { steps } = drive(kaia, 4, 3000, () => [])
    const starts = steps.flatMap((s) => (s.started ? [s.started] : []))
    expect(starts.length).toBeGreaterThan(50)
    expect(starts.every((s) => !s.aimed)).toBe(true)
  })

  it('is deterministic for a seed and different for another seed', () => {
    const a = drive(kaia, 1, 800, () => [TARGET])
    const b = drive(kaia, 1, 800, () => [TARGET])
    const c = drive(kaia, 2, 800, () => [TARGET])
    expect(JSON.stringify(a.inputs)).toBe(JSON.stringify(b.inputs))
    expect(JSON.stringify(a.inputs)).not.toBe(JSON.stringify(c.inputs))
  })

  it('a younger persona touches more and drags less than an older one', () => {
    const affs: Affordance[] = [
      { x: 100, y: 100, w: 90, h: 90, kind: 'tap', salience: 0.9 },
      { x: 600, y: 300, w: 90, h: 90, kind: 'tap', salience: 0.8 },
    ]
    const count = (persona: Persona) => {
      const { steps } = drive(persona, 6, 20000, () => affs)
      const starts = steps.flatMap((s) => (s.started ? [s.started] : []))
      return { total: starts.length, drags: starts.filter((s) => s.kind === 'drag').length / starts.length }
    }
    const young = count(PERSONAS.find((p) => p.id === 'arch-3')!)
    const old = count(PERSONAS.find((p) => p.id === 'arch-11')!)
    expect(young.total).toBeGreaterThan(old.total)
    expect(old.drags).toBeGreaterThan(young.drags)
  })
})

// Abramowitz and Stegun 7.1.26, good to about 1e-7.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  return sign * (1 - poly * Math.exp(-ax * ax))
}
