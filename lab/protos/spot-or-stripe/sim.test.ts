// The characteristic moment of Spot or Stripe: on ONE animal, a lone drop of dye
// grows a round spot while a close row of drops grows a stripe, and the dye
// stays put until it is told to run. Everything else here pins the rules that
// make that discoverable: spacing decides spot or stripe, drops too near each
// other push back into one, and the coat is read region by region.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CELL, GO, WASH, createSim } from './sim.ts'
import type { SpotSnapshot } from './sim.ts'

type Pt = { x: number; y: number }

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? false })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function snap(sim: Sim<SpotSnapshot>): SpotSnapshot {
  return sim.snapshot()
}

function tap(sim: Sim, p: Pt, id = 1): void {
  sim.pointer({ id, phase: 'down', x: p.x, y: p.y })
  sim.step()
  sim.pointer({ id, phase: 'up', x: p.x, y: p.y })
}

function drag(sim: Sim, from: Pt, to: Pt, id = 1): void {
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 10; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / 10, y: from.y + ((to.y - from.y) * s) / 10 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}

const centre = (r: { x: number; y: number; w: number; h: number }): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

// Press GO and run until the dye stops moving.
function settle(sim: Sim<SpotSnapshot>): number {
  tap(sim, centre(GO))
  let ticks = 0
  while (snap(sim).phase === 'flowing' && ticks < 600) {
    sim.step()
    ticks++
  }
  return ticks
}

function dyeCells(s: SpotSnapshot): number {
  return s.dye.reduce((sum, row) => sum + [...row].filter((c) => c === '#' || c === 'o').length, 0)
}

// Where the coat lands, in logical pixels, from the animal's own anchors.
function bodySpot(s: SpotSnapshot, dxCells: number, dyCells = 0): Pt {
  return { x: s.anchors.body.x + dxCells * CELL, y: s.anchors.body.y + dyCells * CELL }
}

// A close row down the middle of the tail: the tail anchors are about 28 px apart.
// `every` thins it out into a dotted row.
function tailRow(s: SpotSnapshot, every = 1): Pt[] {
  return s.anchors.tail.filter((_, i) => i >= 1 && (i - 1) % every === 0)
}

describe('the blank animal', () => {
  it('starts blank, wet-free, and with something to touch', () => {
    const sim = start()
    const first = snap(sim)
    expect(first.phase).toBe('blank')
    expect(dyeCells(first)).toBe(0)
    expect(sim.observe().signature).toBe('blank/blank/blank')
    expect(sim.affordances().length).toBeGreaterThan(0)
    const regions = new Set(first.layout.join('').replace(/ /g, ''))
    expect([...regions].sort()).toEqual(['b', 'l', 't'])
  })

  it('a different seed draws a different animal, the same seed the same one', () => {
    expect(snap(start({ seed: 1 })).layout).toEqual(snap(start({ seed: 1 })).layout)
    expect(snap(start({ seed: 1 })).layout).not.toEqual(snap(start({ seed: 2 })).layout)
  })
})

describe('the characteristic moment: a lone drop is a spot, a close row is a stripe', () => {
  it('a lone drop grows into a round spot bigger than the drop', () => {
    const sim = start()
    tap(sim, bodySpot(snap(sim), 0))
    const wet = dyeCells(snap(sim))
    settle(sim)
    const obs = sim.observe()
    expect(dyeCells(snap(sim))).toBeGreaterThan(wet + 10)
    expect(obs.signature).toBe('spots/blank/blank')
    expect(obs.features.spots).toBe(1)
    expect(obs.features.stripes).toBe(0)
  })

  it.each([3, 4, 7, 9])(
    'on one animal (seed %i), lone drops on the back and a close row on the tail settle into a leopard back and a zebra tail',
    (seed) => {
      const sim = start({ seed })
      sim.observe()
      const s = snap(sim)
      tap(sim, bodySpot(s, -6, 2))
      tap(sim, bodySpot(s, 8, -2))
      tap(sim, bodySpot(s, 20, 2))
      for (const p of tailRow(s)) tap(sim, p)
      settle(sim)
      const obs = sim.observe()
      expect(snap(sim).coats).toEqual({ body: 'spots', tail: 'stripes', legs: 'blank' })
      expect(obs.signature).toBe('spots/stripes/blank')
      expect(obs.features.coatVariety).toBe(2)
      expect(obs.features.spots).toBeGreaterThanOrEqual(3)
      expect(obs.features.stripes).toBeGreaterThanOrEqual(1)
      expect(obs.events).toContainEqual({ kind: 'state', name: 'settled' })
      expect(obs.events).toContainEqual({ kind: 'state', name: 'tail-stripes' })
    },
  )

  it('the same tail with the drops spread apart settles into spots instead: spacing decides', () => {
    const sim = start({ seed: 3 })
    const s = snap(sim)
    for (const p of tailRow(s, 4)) tap(sim, p)
    settle(sim)
    expect(snap(sim).coats.tail).toBe('spots')
    expect(sim.observe().features.spots).toBeGreaterThanOrEqual(2)
  })

  it('dragging a finger lays a row of drops, so a stroke is a stripe too', () => {
    const sim = start({ seed: 3 })
    const s = snap(sim)
    // One finger stroke down the tail, following its bend.
    const path = s.anchors.tail.slice(1)
    sim.pointer({ id: 1, phase: 'down', x: path[0]!.x, y: path[0]!.y })
    for (const p of path.slice(1)) {
      sim.pointer({ id: 1, phase: 'move', x: p.x, y: p.y })
      sim.step()
    }
    sim.pointer({ id: 1, phase: 'up', x: path[path.length - 1]!.x, y: path[path.length - 1]!.y })
    expect(snap(sim).phase).toBe('wet') // a stroke is only wet drops until GO
    settle(sim)
    expect(snap(sim).coats.tail).toBe('stripes')
  })

  it('a straight drag across the back is a row of drops, and settles into a stripe', () => {
    const sim = start()
    const s = snap(sim)
    drag(sim, bodySpot(s, -10), bodySpot(s, 10))
    expect(snap(sim).phase).toBe('wet')
    settle(sim)
    expect(sim.observe().signature).toBe('stripes/blank/blank')
  })

  it('two drops right beside each other push into one spot; far apart they stay two', () => {
    const near = start()
    tap(near, bodySpot(snap(near), -2))
    tap(near, bodySpot(snap(near), 2))
    settle(near)
    expect(near.observe().features.spots).toBe(1)

    const far = start()
    tap(far, bodySpot(snap(far), -8))
    tap(far, bodySpot(snap(far), 8))
    settle(far)
    expect(far.observe().features.spots).toBe(2)
  })

  it('a ring of drops does not fill in: it settles into a swirl', () => {
    const sim = start()
    const s = snap(sim)
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      tap(sim, bodySpot(s, Math.cos(a) * 9, Math.sin(a) * 9))
    }
    settle(sim)
    expect(snap(sim).coats.body).toBe('swirl')
  })
})

describe('the dye waits until it is told to run', () => {
  it('drops sit still before GO, however long the child thinks (up to the patience limit)', () => {
    const sim = start()
    const s = snap(sim)
    for (const p of tailRow(s)) tap(sim, p)
    const planned = JSON.stringify(snap(sim).dye)
    expect(snap(sim).phase).toBe('wet')
    run(sim, 150)
    expect(JSON.stringify(snap(sim).dye)).toBe(planned)
    sim.pointer({ id: 1, phase: 'down', x: centre(GO).x, y: centre(GO).y })
    expect(snap(sim).phase).toBe('flowing')
    run(sim, 6)
    expect(JSON.stringify(snap(sim).dye)).not.toBe(planned)
  })

  it('a child who only dabs and waits still sees the dye run by itself', () => {
    const sim = start()
    tap(sim, bodySpot(snap(sim), 0))
    const before = dyeCells(snap(sim))
    run(sim, 600)
    expect(snap(sim).phase).toBe('settled')
    expect(dyeCells(snap(sim))).toBeGreaterThan(before)
  })

  it('adding dye to a settled coat reflows it, and GO with nothing new does nothing', () => {
    const sim = start()
    tap(sim, bodySpot(snap(sim), -10))
    settle(sim)
    const settled = JSON.stringify(snap(sim).dye)
    tap(sim, centre(GO))
    run(sim, 5)
    expect(JSON.stringify(snap(sim).dye)).toBe(settled)
    tap(sim, bodySpot(snap(sim), 10))
    expect(snap(sim).phase).toBe('wet')
    settle(sim)
    expect(sim.observe().features.spots).toBe(2)
  })
})

describe('wash', () => {
  it('wipes the coat back to blank on the same animal', () => {
    const sim = start()
    const layout = snap(sim).layout
    tap(sim, bodySpot(snap(sim), 0))
    settle(sim)
    tap(sim, centre(WASH))
    const obs = sim.observe()
    expect(obs.signature).toBe('blank/blank/blank')
    expect(obs.features.coverage).toBe(0)
    expect(snap(sim).phase).toBe('blank')
    expect(snap(sim).layout).toEqual(layout)
  })
})

describe('determinism and safety', () => {
  it('the same seed and script give the same signature and picture', () => {
    const play = () => {
      const sim = start({ seed: 5 })
      const s = snap(sim)
      tap(sim, bodySpot(s, -6))
      for (const p of tailRow(s)) tap(sim, p)
      settle(sim)
      return { signature: sim.observe().signature, picture: JSON.stringify(snap(sim)) }
    }
    expect(play()).toEqual(play())
  })

  it('an empty hooks list yields no hook events', () => {
    const sim = start({ hooks: [] })
    const s = snap(sim)
    for (const p of tailRow(s)) tap(sim, p)
    tap(sim, bodySpot(s, 0))
    settle(sim)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
    expect(meta.hooks).toEqual([])
  })

  it('ignores non-finite coordinates, an up with no down, and far-off touches', () => {
    const sim = start()
    const before = JSON.stringify(snap(sim))
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    sim.pointer({ id: 2, phase: 'down', x: 1e12, y: 1e12 })
    sim.pointer({ id: 2, phase: 'move', x: 1e9, y: 1e9 })
    sim.pointer({ id: 2, phase: 'up', x: 0, y: 0 })
    expect(JSON.stringify(snap(sim))).toBe(before)
    expect(dyeCells(snap(sim))).toBe(0)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 300; i++) tap(sim, bodySpot(snap(sim), (i % 9) - 4))
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('affordances and hints', () => {
  it('reports top-left rectangles inside the field, big enough to touch, including GO and wash', () => {
    const sim = start()
    const list = sim.affordances()
    for (const a of list) {
      expect(a.w).toBeGreaterThanOrEqual(44)
      expect(a.h).toBeGreaterThanOrEqual(44)
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
    expect(list.some((a) => a.x === GO.x && a.y === GO.y && a.w === GO.w && a.h === GO.h)).toBe(true)
    expect(list.some((a) => a.x === WASH.x && a.y === WASH.y)).toBe(true)
  })

  it('GO draws the eye once there is wet dye', () => {
    const sim = start()
    const goSalience = () => sim.affordances().find((a) => a.x === GO.x && a.y === GO.y)!.salience
    const blank = goSalience()
    tap(sim, bodySpot(snap(sim), 0))
    expect(goSalience()).toBeGreaterThan(blank)
  })

  it('hints show after a quiet spell, only when on, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    expect(snap(on).hint).toBeNull()
    run(on, 200)
    run(off, 200)
    expect(snap(on).hint).not.toBeNull()
    expect(snap(off).hint).toBeNull()
    tap(on, bodySpot(snap(on), 0))
    tap(off, bodySpot(snap(off), 0))
    run(on, 200)
    run(off, 200)
    expect(snap(on).phase).toBe(snap(off).phase)
    expect(JSON.stringify(snap(on).dye)).toBe(JSON.stringify(snap(off).dye))
    expect(on.observe().signature).toBe(off.observe().signature)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound: three regions of four coats', () => {
    expect(meta.signatureBound).toBe(4 * 4 * 4)
  })

  it('names one objective feature, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
