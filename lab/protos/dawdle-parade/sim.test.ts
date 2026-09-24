// Proof that Dawdle Parade reaches its loop. The characteristic moment is the
// dawdler stalling at a flower the parade walked over: the line stretches and
// the follower behind it waits. The other habits get their own scripted plays
// (the cutter hops on a bend, the last duckling runs up after a rest, the pond
// finishes a parade). The shared suite in lab/kit/contract.test.ts covers
// determinism, fuzz, affordances, and source hygiene.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim, SimEvent } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { GAP, HOME_TICKS, REST_TICKS, SHORE, STALL_R, createSim } from './sim.ts'
import type { DawdleSnapshot } from './sim.ts'

type Handle = Sim<DawdleSnapshot>

function start(o: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): Handle {
  return createSim({ seed: o.seed ?? 1, hooks: o.hooks ?? meta.hooks, hints: o.hints ?? true })
}

function walkTo(sim: Handle, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

// Runs and gathers every event and signature on the way.
function watch(sim: Handle, ticks: number) {
  const events: SimEvent[] = []
  const signatures: string[] = []
  let maxSpread = 0
  for (let i = 0; i < ticks; i++) {
    sim.step()
    const obs = sim.observe()
    events.push(...obs.events)
    signatures.push(obs.signature)
    maxSpread = Math.max(maxSpread, obs.features.spread!)
  }
  return { events, signatures, maxSpread }
}

const named = (events: SimEvent[], name: string) => events.filter((e) => e.kind === 'state' && e.name === name)
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
const place = (sim: Handle, id: number) => sim.snapshot().line.indexOf(id)
const DAWDLER = 0
const CUTTER = 1
const FOLLOWER = 2

// A point on the far side of the first flower, so the parade walks over it.
function beyondFlower(sim: Handle, reach: number): { x: number; y: number } {
  const { flowers, mother } = sim.snapshot()
  const f = flowers[0]!
  const len = dist(f, mother)
  const ux = (f.x - mother.x) / len
  const uy = (f.y - mother.y) / len
  for (let t = reach; t > 0; t -= 10) {
    const x = f.x + ux * t
    const y = f.y + uy * t
    if (x > 60 && x < FIELD_W - 60 && y > 60 && y < FIELD_H - 60) return { x, y }
  }
  return { x: f.x, y: f.y }
}

describe('the characteristic moment: the dawdler stalls at a flower', () => {
  it('stalls where the parade walks over a flower, stretches the line, then hurries back', () => {
    const sim = start({ hooks: [] })
    const goal = beyondFlower(sim, 400)
    walkTo(sim, goal.x, goal.y)

    let stalledAt = -1
    let maxSpread = 0
    const events: SimEvent[] = []
    for (let i = 0; i < 700; i++) {
      sim.step()
      const obs = sim.observe()
      events.push(...obs.events)
      maxSpread = Math.max(maxSpread, obs.features.spread!)
      if (stalledAt < 0 && named(obs.events, 'dawdle').length > 0) {
        stalledAt = i
        expect(obs.signature).toMatch(/-dawdle$/)
        expect(obs.features.dawdling).toBe(1)
        expect(sim.snapshot().ducklings[DAWDLER]!.stalled).toBe(true)
      }
    }
    expect(stalledAt).toBeGreaterThanOrEqual(0)
    expect(named(events, 'resume').length).toBeGreaterThanOrEqual(1)
    // The mother walked on while the dawdler stayed: the line stretched.
    expect(maxSpread).toBeGreaterThan(2.6)
    // It rejoined: nobody is stalled at the end and the line is close again.
    const end = sim.observe()
    expect(end.features.dawdling).toBe(0)
    expect(end.features.spread!).toBeLessThan(2.7)
  })

  it('walking straight to the pond meets a flower, and steering wide of it does not', () => {
    let proved = false
    for (let seed = 1; seed <= 30 && !proved; seed++) {
      const pond = start({ seed }).snapshot().pond!
      const straight = start({ seed, hooks: [] })
      walkTo(straight, pond.x, pond.y)
      // Flower 0 always sits on the straight way, so the straight walk stalls.
      expect(named(watch(straight, 500).events, 'dawdle').length).toBeGreaterThanOrEqual(1)

      const { flowers, mother } = start({ seed, hooks: [] }).snapshot()
      const f = flowers[0]!
      const len = dist(mother, pond)
      // A unit vector square to the way to the pond.
      const px = -(pond.y - mother.y) / len
      const py = (pond.x - mother.x) / len
      for (const side of [1, -1]) {
        const wide = { x: f.x + px * side * (STALL_R * 3), y: f.y + py * side * (STALL_R * 3) }
        if (wide.x < 60 || wide.x > FIELD_W - 60 || wide.y < 60 || wide.y > FIELD_H - 60) continue
        const sim = start({ seed, hooks: [] })
        walkTo(sim, wide.x, wide.y)
        const first = watch(sim, Math.ceil(dist(mother, wide) / 8) + 10)
        walkTo(sim, pond.x, pond.y)
        const second = watch(sim, 500)
        if (named([...first.events, ...second.events], 'dawdle').length === 0) proved = true
      }
    }
    expect(proved).toBe(true)
  })

  it('makes the follower wait behind a stalled dawdler', () => {
    let proved = false
    for (let seed = 1; seed <= 40 && !proved; seed++) {
      const probe = start({ seed, hooks: [] })
      const line = probe.snapshot().line
      const d = line.indexOf(DAWDLER)
      if (line[d + 1] !== FOLLOWER) continue
      const goal = beyondFlower(probe, 400)
      walkTo(probe, goal.x, goal.y)
      for (let i = 0; i < 700 && !proved; i++) {
        probe.step()
        if (probe.observe().features.dawdling !== 1) continue
        // Give the follower time to catch up to the stalled dawdler's tail.
        for (let k = 0; k < 20; k++) probe.step()
        const s = probe.snapshot()
        if (!s.ducklings[DAWDLER]!.stalled) continue
        expect(dist(s.ducklings[FOLLOWER]!, s.ducklings[DAWDLER]!)).toBeLessThan(GAP * 1.6)
        expect(dist(s.ducklings[FOLLOWER]!, s.mother)).toBeGreaterThan(200)
        proved = true
      }
    }
    expect(proved).toBe(true)
  })
})

describe('the cutter jumps the line on a bend', () => {
  it('moves up one place when the mother turns sharply, and stays put on a straight walk', () => {
    let proved = false
    for (let seed = 1; seed <= 40 && !proved; seed++) {
      const sim = start({ seed, hooks: [] })
      const mother = sim.snapshot().mother
      // A straight walk along the row first: no bend.
      const straightX = mother.x < FIELD_W / 2 ? mother.x + 300 : mother.x - 300
      walkTo(sim, straightX, mother.y)
      const straight = watch(sim, 120)
      if (named(straight.events, 'dawdle').length > 0 || named(straight.events, 'hop').length > 0) continue
      const before = place(sim, CUTTER)
      if (before === 0) continue
      // A hard right angle.
      walkTo(sim, straightX, mother.y < FIELD_H / 2 ? mother.y + 280 : mother.y - 280)
      const turn = watch(sim, 60)
      if (named(turn.events, 'dawdle').length > 0) continue
      expect(named(turn.events, 'hop').length).toBeGreaterThanOrEqual(1)
      // The duckling it barged past is bumped and freezes for a moment.
      expect(named(turn.events, 'bump').length).toBeGreaterThanOrEqual(1)
      expect(place(sim, CUTTER)).toBeLessThan(before)
      expect(sim.observe().features.cutter_place).toBe(place(sim, CUTTER))
      proved = true
    }
    expect(proved).toBe(true)
  })

  it('reaches the front after enough bends (walking a loop on purpose)', () => {
    const sim = start({ seed: 2, hooks: [] })
    const m = sim.snapshot().mother
    const r = 90
    for (let lap = 0; lap < 3; lap++) {
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2
        walkTo(sim, m.x + Math.sin(angle) * r, m.y + r - Math.cos(angle) * r)
        watch(sim, 14)
      }
    }
    expect(place(sim, CUTTER)).toBe(0)
  })
})

describe('a U-turn', () => {
  it('flips the whole line, so the last duckling is first, and the cutter does not hop', () => {
    let proved = false
    for (let seed = 1; seed <= 40 && !proved; seed++) {
      const sim = start({ seed, hooks: [] })
      const mother = sim.snapshot().mother
      const out = mother.x < FIELD_W / 2 ? mother.x + 300 : mother.x - 300
      walkTo(sim, out, mother.y)
      const leg = watch(sim, 120)
      if (named(leg.events, 'dawdle').length > 0 || named(leg.events, 'hop').length > 0) continue
      const before = sim.snapshot().line.slice()
      walkTo(sim, mother.x, mother.y)
      const back = watch(sim, 100)
      if (named(back.events, 'dawdle').length > 0) continue
      expect(named(back.events, 'uturn')).toHaveLength(1)
      expect(named(back.events, 'hop')).toHaveLength(0)
      expect(sim.snapshot().line).toEqual(before.reverse())
      proved = true
    }
    expect(proved).toBe(true)
  })
})

describe('resting', () => {
  it('sends the last duckling running to the front after a walk and a rest', () => {
    let proved = false
    for (let seed = 1; seed <= 40 && !proved; seed++) {
      const sim = start({ seed, hooks: [] })
      const mother = sim.snapshot().mother
      const x = mother.x < FIELD_W / 2 ? mother.x + 200 : mother.x - 200
      walkTo(sim, x, mother.y)
      const walk = watch(sim, 60)
      if (named(walk.events, 'dawdle').length > 0 || named(walk.events, 'hop').length > 0) continue
      const before = sim.snapshot().line.slice()
      const rest = watch(sim, REST_TICKS + 10)
      // A duckling still catching up can trip a flower; that is another test.
      if (named(rest.events, 'dawdle').length > 0) continue
      expect(named(rest.events, 'shuffle')).toHaveLength(1)
      expect(sim.snapshot().line).toEqual([before[2], before[0], before[1]])
      proved = true
    }
    expect(proved).toBe(true)
  })

  it('does not shuffle a parade that never walked', () => {
    const sim = start({ hooks: [] })
    const seen = watch(sim, REST_TICKS * 3)
    expect(named(seen.events, 'shuffle')).toHaveLength(0)
  })
})

describe('the pond hook', () => {
  it('finishes a parade when all three ducklings reach the shore, then lays out a new meadow', () => {
    const sim = start()
    const first = sim.snapshot()
    expect(first.pond).not.toBeNull()
    const pond = first.pond!
    walkTo(sim, pond.x, pond.y)
    const seen = watch(sim, 1500)
    expect(seen.events).toContainEqual({ kind: 'hook', name: 'pond' })
    expect(seen.signatures).toContain('home')
    run(sim, HOME_TICKS + 5)
    const next = sim.snapshot()
    expect(next.round).toBe(1)
    expect(next.phase).toBe('walk')
    expect(next.flowers.length).toBe(first.flowers.length + 1)
    // The new pond is on the far side from where the mother now stands.
    expect(Math.abs(next.pond!.x - next.mother.x)).toBeGreaterThan(400)
    expect(dist(next.pond!, next.mother)).toBeGreaterThan(SHORE + 100)
  })

  it('with hooks: [] there is no pond, no hook event, and no home', () => {
    const sim = start({ hooks: [] })
    expect(sim.snapshot().pond).toBeNull()
    const pond = start().snapshot().pond!
    walkTo(sim, pond.x, pond.y)
    const seen = watch(sim, 1200)
    expect(seen.events.some((e) => e.kind === 'hook')).toBe(false)
    expect(seen.signatures).not.toContain('home')
    expect(sim.observe().features.home).toBe(0)
    expect(sim.snapshot().round).toBe(0)
  })
})

describe('the sim contract details', () => {
  it('gives the same signature for the same seed and script, and different meadows for different seeds', () => {
    const play = (seed: number) => {
      const sim = start({ seed })
      walkTo(sim, 900, 400)
      const seen = watch(sim, 300)
      return { sig: seen.signatures.at(-1), snap: JSON.stringify(sim.snapshot()) }
    }
    expect(play(3)).toEqual(play(3))
    expect(start({ seed: 3 }).snapshot().flowers).not.toEqual(start({ seed: 4 }).snapshot().flowers)
  })

  it('reports affordances as top-left rectangles inside the field, mother first', () => {
    const sim = start()
    const list = sim.affordances()
    expect(list.length).toBeGreaterThan(3)
    for (const a of list) {
      expect(a.w).toBeGreaterThanOrEqual(60)
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
    const mother = sim.snapshot().mother
    const drag = list.find((a) => a.kind === 'drag')!
    expect(drag.x + drag.w / 2).toBeCloseTo(mother.x)
    expect(drag.y + drag.h / 2).toBeCloseTo(mother.y)
  })

  it('ignores non-finite coordinates and an up or move with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    sim.pointer({ id: 9, phase: 'move', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps everything inside the field however wild the goal', () => {
    const sim = start()
    walkTo(sim, 1e9, -1e9)
    run(sim, 600)
    for (const d of sim.snapshot().ducklings) {
      expect(d.x).toBeGreaterThan(-1)
      expect(d.x).toBeLessThan(FIELD_W + 1)
      expect(d.y).toBeGreaterThan(-1)
      expect(d.y).toBeLessThan(FIELD_H + 1)
    }
    const m = sim.snapshot().mother
    expect(m.x).toBeLessThanOrEqual(FIELD_W)
    expect(m.y).toBeGreaterThanOrEqual(0)
  })

  it('shows the idle hint only when hints are on, and never changes the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 40)
    run(off, 40)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    walkTo(on, 500, 400)
    expect(on.snapshot().hint).toBeNull()
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start({ hooks: [] })
    for (let i = 0; i < 300; i++) {
      const d = sim.snapshot().ducklings[FOLLOWER]!
      walkTo(sim, d.x, d.y, 4)
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the meta', () => {
  it('declares the pond as its only hook, and every declared feature is observed', () => {
    expect(meta.hooks).toEqual(['pond'])
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
    expect(meta.features.filter((f) => f.objective).map((f) => f.name)).toEqual(['together', 'dawdling', 'cutter_place', 'home'])
  })

  it('declares an honest signature bound: 6 orders x 4 shapes x dawdling or not, plus home', () => {
    expect(meta.signatureBound).toBe(6 * 4 * 2 + 1)
  })
})
