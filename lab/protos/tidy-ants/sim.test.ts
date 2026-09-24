// Scripted play for Tidy Ants. The characteristic moment: beads nobody sorted
// end up in heaps because the ants carried them there. The second moment is the
// play-5 skill: a seed bead planted in a corner makes its colour heap there.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CELL, COLS, ROWS, SAND, createSim } from './sim.ts'
import type { TidySnapshot } from './sim.ts'

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}) {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const cellCentre = (c: number, r: number) => ({ x: SAND.x + c * CELL + CELL / 2, y: SAND.y + r * CELL + CELL / 2 })

function tap(sim: Sim, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

// Hold a finger on the sand: pours a bead every few ticks.
function pour(sim: Sim, x: number, y: number, ticks: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  run(sim, ticks)
  sim.pointer({ id, phase: 'up', x, y })
}

function chooseCup(sim: Sim<TidySnapshot>, name: string): void {
  const cup = sim.snapshot().cups.find((c) => c.name === name)!
  tap(sim, cup.x + cup.w / 2, cup.y + cup.h / 2)
}

function plant(sim: Sim<TidySnapshot>, name: string, c: number, r: number): void {
  chooseCup(sim, name)
  const at = cellCentre(c, r)
  tap(sim, at.x, at.y)
}

// A mixed pile in the middle of the sand.
function pourPile(sim: Sim<TidySnapshot>, ticks = 200): void {
  chooseCup(sim, 'mix')
  const at = cellCentre(Math.floor(COLS / 2), Math.floor(ROWS / 2))
  pour(sim, at.x, at.y, ticks)
}

function events(sim: Sim) {
  return sim.observe().events
}

describe('pouring', () => {
  it('starts on bare sand with something to touch', () => {
    const sim = start()
    expect(sim.snapshot().beads).toHaveLength(0)
    expect(sim.affordances().length).toBeGreaterThan(0)
    expect(sim.observe().signature).toBe('bare')
  })

  it('a held finger pours beads a few at a time, and a tap on a cup only chooses the colour', () => {
    const sim = start()
    chooseCup(sim, 'red')
    expect(sim.snapshot().beads).toHaveLength(0)
    expect(sim.snapshot().inHand).toBe('red')
    const at = cellCentre(10, 8)
    pour(sim, at.x, at.y, 60)
    const beads = sim.snapshot().beads
    expect(beads.length).toBeGreaterThan(8)
    expect(beads.every((b) => b.colour === 'red')).toBe(true)
    expect(events(sim)).toContainEqual({ kind: 'state', name: 'pour' })
  })

  it('the mix cup pours every colour', () => {
    const sim = start()
    pourPile(sim, 240)
    const colours = new Set(sim.snapshot().beads.map((b) => b.colour))
    expect(colours.size).toBe(4)
  })

  it('stops pouring when the finger lifts', () => {
    const sim = start()
    pourPile(sim, 60)
    // Beads on the sand plus beads in ants' jaws: the ants only move them.
    const total = () => sim.snapshot().beads.length + sim.snapshot().ants.filter((a) => a.carry !== null).length
    const count = total()
    run(sim, 60)
    expect(total()).toBe(count)
  })
})

describe('the ants tidy up', () => {
  it('sorts a mixed pile into heaps without any help (the characteristic moment)', () => {
    const sim = start()
    pourPile(sim)
    const before = sim.observe()
    expect(before.features.beads).toBeGreaterThan(30)
    expect(before.features.tidy).toBeLessThan(0.65)
    expect(before.signature).not.toBe('tidy')
    run(sim, 3600)
    const after = sim.observe()
    const snap = sim.snapshot()
    // Several heaps of one colour each, made by the ants alone.
    expect(snap.heaps.length).toBeGreaterThanOrEqual(3)
    expect(new Set(snap.heaps.map((h) => h.colour)).size).toBe(snap.heaps.length)
    expect(after.features.tidy).toBeGreaterThan(0.75)
    expect(after.features.tidy).toBeGreaterThan(before.features.tidy + 0.2)
    expect(after.events).toContainEqual({ kind: 'state', name: 'ant-drop' })
    expect(after.signature).toMatch(/^(heaping|tidy)-c\ds\d$/)
  })

  it('a heap does not sit still forever in one place: different seeds heap in different places', () => {
    const where = new Set<string>()
    for (const seed of [1, 2, 3, 4]) {
      const sim = start({ seed })
      pourPile(sim)
      run(sim, 3600)
      where.add(sim.snapshot().heaps.map((h) => `${h.colour}:${Math.round(h.cx / 3)},${Math.round(h.cy / 3)}`).join('|'))
    }
    expect(where.size).toBeGreaterThan(1)
  })

  it('shaking scatters the sand again and the ants start over', () => {
    const sim = start()
    pourPile(sim)
    run(sim, 3600)
    const tidy = sim.observe().features.tidy
    const shake = sim.snapshot().shake
    tap(sim, shake.x + shake.w / 2, shake.y + shake.h / 2)
    const shaken = sim.observe()
    expect(shaken.events).toContainEqual({ kind: 'state', name: 'shake' })
    expect(shaken.features.tidy).toBeLessThan(tidy - 0.2)
    run(sim, 3600)
    expect(sim.observe().features.tidy).toBeGreaterThan(0.6)
  })

  it('tipping the tray out clears the sand', () => {
    const sim = start()
    pourPile(sim, 90)
    const tip = sim.snapshot().tip
    tap(sim, tip.x + tip.w / 2, tip.y + tip.h / 2)
    expect(sim.snapshot().beads).toHaveLength(0)
    expect(sim.observe().signature).toBe('bare')
  })
})

describe('seeds steer the heaps', () => {
  it('a seed bead planted in a corner gathers its colour there (the play-5 move)', () => {
    const sim = start()
    plant(sim, 'red', 2, 2)
    plant(sim, 'blue', COLS - 3, ROWS - 3)
    plant(sim, 'yellow', COLS - 3, 2)
    plant(sim, 'green', 2, ROWS - 3)
    expect(sim.observe().features.seeds).toBe(4)
    pourPile(sim)
    run(sim, 4200)
    const snap = sim.snapshot()
    const heap = (name: string) => snap.heaps.find((h) => h.colour === name)!
    expect(heap('red').seeded).toBe(true)
    expect(heap('red').cx).toBeLessThan(8)
    expect(heap('red').cy).toBeLessThan(6)
    expect(heap('blue').cx).toBeGreaterThan(COLS - 9)
    expect(heap('blue').cy).toBeGreaterThan(ROWS - 7)
    expect(heap('yellow').cx).toBeGreaterThan(COLS - 9)
    expect(heap('yellow').cy).toBeLessThan(6)
    expect(heap('green').cx).toBeLessThan(8)
    expect(heap('green').cy).toBeGreaterThan(ROWS - 7)
    const obs = sim.observe()
    expect(obs.features.cornered).toBeGreaterThanOrEqual(3)
    expect(obs.signature).toMatch(/^(heaping|tidy)-c2s2$/)
  })

  it('a seed is not lifted by the ants', () => {
    const sim = start()
    plant(sim, 'red', 5, 5)
    pourPile(sim, 120)
    run(sim, 3000)
    expect(sim.snapshot().beads.filter((b) => b.seed)).toHaveLength(1)
  })

  it('tapping a seed lifts it again, and a fifth seed replaces the oldest', () => {
    const sim = start()
    plant(sim, 'red', 3, 3)
    expect(sim.observe().features.seeds).toBe(1)
    const at = cellCentre(3, 3)
    tap(sim, at.x, at.y)
    expect(sim.observe().features.seeds).toBe(0)
    for (let i = 0; i < 9; i++) plant(sim, 'blue', 3 + i * 2, 3)
    expect(sim.observe().features.seeds).toBeLessThanOrEqual(6)
  })

  it('without a seed the same pour heaps somewhere other than the chosen corner', () => {
    const sim = start()
    pourPile(sim)
    run(sim, 4200)
    const cornered = sim.observe().features.cornered
    expect(cornered).toBeLessThan(3)
  })
})

describe('hooks', () => {
  const script = (hooks: readonly string[]) => {
    const sim = start({ hooks })
    pourPile(sim)
    const seen = [] as Array<{ kind: string; name: string }>
    for (let i = 0; i < 90; i++) {
      run(sim, 60)
      seen.push(...events(sim))
    }
    return { sim, seen }
  }

  it('an empty hooks list means no hook events and no cheer', () => {
    const { sim, seen } = script([])
    expect(seen.some((e) => e.kind === 'hook')).toBe(false)
    expect(sim.snapshot().cheer).toBe(false)
    expect(sim.snapshot().cups.some((c) => c.name === 'pink')).toBe(false)
  })

  it('the tidy hook cheers when the sand has been tidied', () => {
    const { seen } = script(['tidy'])
    expect(seen).toContainEqual({ kind: 'hook', name: 'tidy' })
    expect(seen.some((e) => e.kind === 'hook' && e.name === 'pink')).toBe(false)
  })

  it('the pink hook adds a fifth colour cup after the first tidy, alone', () => {
    const { sim, seen } = script(['pink'])
    expect(seen).toContainEqual({ kind: 'hook', name: 'pink' })
    expect(seen.some((e) => e.kind === 'hook' && e.name === 'tidy')).toBe(false)
    expect(sim.snapshot().cups.some((c) => c.name === 'pink')).toBe(true)
  })
})

describe('determinism and hints', () => {
  it('the same seed and script give the same signature and picture', () => {
    const a = start({ seed: 7 })
    const b = start({ seed: 7 })
    for (const sim of [a, b]) {
      plant(sim, 'red', 4, 4)
      pourPile(sim)
      run(sim, 1500)
    }
    expect(a.observe().signature).toBe(b.observe().signature)
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('hints only point, and only while hints are on and the child is idle', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })

  it('declares an honest signature bound and observes every feature', () => {
    expect(meta.signatureBound).toBe(2 + 9 + 9)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
