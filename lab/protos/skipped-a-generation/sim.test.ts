// The characteristic moment: a spotted hatchling from two spotless parents,
// because spots are recessive and skip a generation. Plus the other hidden
// rules (ears follow the longer, hues mix), keeping and letting go.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { GATE, MEADOW_MAX, NEST, NEST_TICKS, PAIR_TICKS, createSim } from './sim.ts'
import type { CreatureView, FamilySnapshot } from './sim.ts'

type S = Sim<FamilySnapshot>

// Hooks are off unless a test asks: a kept hatchling could meet a wish by
// accident and bring a gift, which would move the counts these tests check.
function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? [], hints: overrides.hints ?? true })
}

function run(sim: S, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function tapAt(sim: S, x: number, y: number): void {
  sim.pointer({ id: 1, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id: 1, phase: 'up', x, y })
}

function creature(sim: S, id: number): CreatureView {
  const found = sim.snapshot().meadow.find((c) => c.id === id)
  if (!found) throw new Error(`no creature ${id}`)
  return found
}

function tapCreature(sim: S, id: number): void {
  const c = creature(sim, id)
  tapAt(sim, c.x, c.y)
}

// Select two creatures, wait for the egg, and return the hatchling in the nest.
function cross(sim: S, a: number, b: number): CreatureView {
  tapCreature(sim, a)
  run(sim, 3)
  tapCreature(sim, b)
  run(sim, PAIR_TICKS + 2)
  const nest = sim.snapshot().nest
  if (!nest) throw new Error('nothing hatched')
  return nest.creature
}

function keep(sim: S): void {
  tapAt(sim, NEST.x + NEST.w / 2, NEST.y + NEST.h / 2)
}

const isCarrier = (c: CreatureView) => !c.spotted && c.alleles.includes(1)
const stateEvents = (sim: S) => sim.observe().events.filter((e) => e.kind === 'state').map((e) => e.name)

describe('skipped a generation', () => {
  it('starts with a small meadow that includes one spotted creature', () => {
    const sim = start()
    const first = sim.snapshot()
    expect(first.meadow).toHaveLength(5)
    expect(first.meadow.filter((c) => c.spotted)).toHaveLength(1)
    expect(sim.affordances().length).toBeGreaterThan(0)
    expect(new Set(first.meadow.map((c) => c.ears)).size).toBeGreaterThan(1)
  })

  it('different seeds start with different meadows', () => {
    const a = start({ seed: 1 }).snapshot().meadow.map((c) => Math.round(c.hue))
    const b = start({ seed: 2 }).snapshot().meadow.map((c) => Math.round(c.hue))
    expect(a).not.toEqual(b)
  })

  it('CHARACTERISTIC MOMENT: two spotless carriers raise a spotted hatchling, then spotted parents breed true', () => {
    const sim = start()
    const founders = sim.snapshot().meadow
    const spotted = founders.find((c) => c.spotted)!
    const pure = founders.filter((c) => !c.spotted && c.alleles[0] === 0 && c.alleles[1] === 0)
    expect(pure.length).toBeGreaterThanOrEqual(2)

    // A spotted creature crossed with an ordinary one: no spots, but a carrier.
    const kidA = cross(sim, spotted.id, pure[0]!.id)
    expect(kidA.spotted).toBe(false)
    expect(isCarrier(kidA)).toBe(true)
    keep(sim)
    run(sim, 30)
    const kidB = cross(sim, spotted.id, pure[1]!.id)
    expect(kidB.spotted).toBe(false)
    keep(sim)
    run(sim, 30)
    expect(sim.snapshot().meadow).toHaveLength(7)

    // Two spotless creatures, each with a spotted parent, cross until the spots
    // skip a generation and show.
    sim.observe()
    let skipped: CreatureView | null = null
    for (let tries = 0; tries < 60 && !skipped; tries++) {
      const baby = cross(sim, kidA.id, kidB.id)
      const names = stateEvents(sim)
      if (names.includes('skip')) skipped = baby
      run(sim, 5)
    }
    expect(skipped).not.toBeNull()
    expect(skipped!.spotted).toBe(true)
    expect(skipped!.parents.every((p) => !p.spotted)).toBe(true)
    expect(skipped!.grands.some((g) => g?.spotted)).toBe(true)

    // Raise it on purpose: two spotted creatures always give spotted hatchlings.
    keep(sim)
    run(sim, 30)
    const spottedNow = sim.snapshot().meadow.filter((c) => c.spotted)
    expect(spottedNow.length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < 4; i++) {
      const baby = cross(sim, spottedNow[0]!.id, spottedNow[1]!.id)
      expect(baby.spotted).toBe(true)
      run(sim, 5)
    }
    expect(sim.observe().features.spotted).toBeGreaterThanOrEqual(2)
  })

  it('a hatchling takes the longer ears and a hue between its parents', () => {
    const sim = start()
    const meadow = sim.snapshot().meadow
    const short = meadow.find((c) => c.ears === 1)!
    const long = meadow.find((c) => c.ears === 3)!
    const baby = cross(sim, short.id, long.id)
    expect(baby.ears).toBe(3)
    const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
    const between = gap(short.hue, long.hue)
    expect(gap(baby.hue, short.hue)).toBeLessThanOrEqual(between / 2 + 9)
    expect(gap(baby.hue, long.hue)).toBeLessThanOrEqual(between / 2 + 9)
  })

  it('keeping a hatchling adds it to the meadow; an ignored one wanders off', () => {
    const sim = start()
    const [a, b, c] = sim.snapshot().meadow
    cross(sim, a!.id, b!.id)
    keep(sim)
    run(sim, 5)
    expect(sim.snapshot().meadow).toHaveLength(6)
    expect(sim.snapshot().nest).toBeNull()

    cross(sim, a!.id, c!.id)
    sim.observe()
    run(sim, NEST_TICKS + 5)
    expect(sim.snapshot().nest).toBeNull()
    expect(sim.snapshot().meadow).toHaveLength(6)
    expect(stateEvents(sim)).toContain('wander-off')
  })

  it('a full meadow cannot keep another until someone is sent through the gate', () => {
    const sim = start()
    const ids = sim.snapshot().meadow.map((c) => c.id)
    for (let i = 0; i < MEADOW_MAX - 5; i++) {
      cross(sim, ids[0]!, ids[1 + i]!)
      keep(sim)
      run(sim, 20)
    }
    expect(sim.snapshot().meadow).toHaveLength(MEADOW_MAX)
    cross(sim, ids[0]!, ids[4]!)
    sim.observe()
    keep(sim)
    expect(sim.snapshot().meadow).toHaveLength(MEADOW_MAX)
    expect(stateEvents(sim)).toContain('full')
    // Send one through the gate: the hatchling can now be kept.
    tapCreature(sim, ids[2]!)
    run(sim, 30)
    tapAt(sim, GATE.x + GATE.w / 2, GATE.y + GATE.h / 2)
    expect(sim.snapshot().meadow).toHaveLength(MEADOW_MAX - 1)
    keep(sim)
    expect(sim.snapshot().meadow).toHaveLength(MEADOW_MAX)
  })

  it('a thin meadow gets a wild visitor', () => {
    const sim = start()
    const ids = sim.snapshot().meadow.map((c) => c.id)
    for (let i = 0; i < 3; i++) {
      tapCreature(sim, ids[i]!)
      run(sim, 30)
      tapAt(sim, GATE.x + GATE.w / 2, GATE.y + GATE.h / 2)
    }
    expect(sim.snapshot().meadow).toHaveLength(2)
    run(sim, 200)
    expect(sim.snapshot().meadow.length).toBeGreaterThanOrEqual(3)
  })

  it('the wish hook fires when a wanted body is kept, and brings a gift', () => {
    // Find a seed whose first wish one cross can meet (deterministic search).
    for (let seed = 1; seed < 200; seed++) {
      const sim = start({ seed, hooks: meta.hooks })
      const wish = sim.snapshot().wish!
      const meadow = sim.snapshot().meadow
      let pair: [CreatureView, CreatureView] | null = null
      for (const a of meadow) {
        for (const b of meadow) {
          if (a.id >= b.id) continue
          const d = ((b.hue - a.hue + 540) % 360) - 180
          const mid = (a.hue + d / 2 + 720) % 360
          if (Math.abs(((mid - wish.hue + 540) % 360) - 180) < 30) pair = pair ?? [a, b]
        }
      }
      if (!pair) continue
      sim.observe()
      cross(sim, pair[0].id, pair[1].id)
      keep(sim)
      const obs = sim.observe()
      expect(obs.events).toContainEqual({ kind: 'hook', name: 'wish' })
      expect(sim.snapshot().wishes).toBe(1)
      expect(sim.snapshot().meadow).toHaveLength(7)
      return
    }
    throw new Error('no seed found with a reachable wish')
  })

  it('with hooks off there is no wish, no hook event, and no gift', () => {
    const sim = start({ hooks: [] })
    expect(sim.snapshot().wish).toBeNull()
    const [a, b] = sim.snapshot().meadow
    cross(sim, a!.id, b!.id)
    keep(sim)
    const obs = sim.observe()
    expect(obs.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().meadow).toHaveLength(6)
  })

  it('the same seed and script give the same signature', () => {
    const play = () => {
      const sim = start({ seed: 3 })
      const [a, b, c] = sim.snapshot().meadow
      cross(sim, a!.id, b!.id)
      keep(sim)
      run(sim, 20)
      cross(sim, a!.id, c!.id)
      keep(sim)
      run(sim, 50)
      return { obs: sim.observe(), snap: JSON.stringify(sim.snapshot()) }
    }
    const one = play()
    const two = play()
    expect(one.obs.signature).toBe(two.obs.signature)
    expect(one.snap).toBe(two.snap)
  })

  it('the signature is a class, and it moves as the meadow changes', () => {
    const sim = start()
    const before = sim.observe().signature
    const [a, b] = sim.snapshot().meadow
    for (let i = 0; i < 3; i++) {
      cross(sim, a!.id, b!.id)
      keep(sim)
      run(sim, 20)
    }
    const after = sim.observe().signature
    expect(before).toMatch(/^(spotted|plain)\//)
    expect(after).not.toBe(before)
  })
})
