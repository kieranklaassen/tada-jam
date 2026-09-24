// Sway and Settle: the characteristic moment is a whole hung mobile settling
// level and starting to turn slowly on its hook. These tests script real pointer
// play through createSim (the solved arrangement the generator built, then
// mistakes and rescues) and assert the loop happened.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { makePuzzle, createSim } from './sim.ts'
import type { Puzzle, SwaySnapshot } from './sim.ts'

type S = Sim<SwaySnapshot>

// The loop tests play hook-free so a finished mobile stays put; the hook tests
// switch next-mobile on by name.
function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? [], hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function where(sim: S, id: number): { x: number; y: number } {
  const snap = sim.snapshot()
  const shape = snap.shapes.find((s) => s.id === id)
  if (shape) return { x: shape.x, y: shape.y }
  const bar = snap.bars.find((b) => b.id === id)!
  return { x: bar.x, y: bar.y }
}

function slotAt(sim: S, bar: number, slot: number): { x: number; y: number } {
  const found = sim.snapshot().slots.find((s) => s.bar === bar && s.slot === slot && !s.held)
  if (!found) throw new Error(`no slot ${slot} on bar ${bar}`)
  return { x: found.x, y: found.y }
}

// Carry a piece to a slot, re-reading the slot as it sways, then let go.
function carry(sim: S, id: number, bar: number, slot: number, pointerId = 1): void {
  const from = where(sim, id)
  sim.pointer({ id: pointerId, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 6; s++) {
    const to = slotAt(sim, bar, slot)
    sim.pointer({ id: pointerId, phase: 'move', x: from.x + ((to.x - from.x) * s) / 6, y: from.y + ((to.y - from.y) * s) / 6 })
    sim.step()
  }
  const end = slotAt(sim, bar, slot)
  sim.pointer({ id: pointerId, phase: 'move', x: end.x, y: end.y })
  sim.pointer({ id: pointerId, phase: 'up', x: end.x, y: end.y })
}

function depthOf(puzzle: Puzzle, piece: number): number {
  const placement = puzzle.solution.find((p) => p.piece === piece)
  return placement === undefined || placement.parent === 0 ? 1 : 1 + depthOf(puzzle, placement.parent)
}

// The order that hangs a bar before anything hangs from it.
function inBuildOrder(puzzle: Puzzle) {
  return [...puzzle.solution].sort((a, b) => depthOf(puzzle, a.piece) - depthOf(puzzle, b.piece) || a.piece - b.piece)
}

function build(sim: S, puzzle: Puzzle, take = puzzle.solution.length): void {
  for (const step of inBuildOrder(puzzle).slice(0, take)) {
    carry(sim, step.piece, step.parent, step.slot)
    run(sim, 130) // sway and settle
  }
}

function names(sim: Sim): string[] {
  return sim.observe().events.map((e) => `${e.kind}:${e.name}`)
}

// Independent check that a puzzle's solution really balances every bar.
function balanced(puzzle: Puzzle): boolean {
  const barIds = new Set(puzzle.pieces.filter((p) => p.isBar).map((p) => p.id))
  const total = (id: number): number => {
    const piece = puzzle.pieces.find((p) => p.id === id)!
    if (!piece.isBar) return piece.mass
    return 1 + puzzle.solution.filter((p) => p.parent === id).reduce((sum, p) => sum + total(p.piece), 0)
  }
  for (const bar of [0, ...barIds]) {
    const kids = puzzle.solution.filter((p) => p.parent === bar)
    const torque = kids.reduce((sum, p) => sum + p.slot * total(p.piece), 0)
    if (torque !== 0) return false
    if (!kids.some((p) => p.slot < 0) || !kids.some((p) => p.slot > 0)) return false
  }
  return true
}

describe('the puzzle', () => {
  it('is solvable for every seed: each bar of the solved mobile balances and every piece has a place', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const puzzle = makePuzzle(seed)
      expect(balanced(puzzle), `seed ${seed}`).toBe(true)
      expect(puzzle.solution.map((p) => p.piece).sort((a, b) => a - b)).toEqual(puzzle.pieces.filter((p) => p.id !== 0).map((p) => p.id))
      const slots = new Set(puzzle.solution.map((p) => `${p.parent}/${p.slot}`))
      expect(slots.size).toBe(puzzle.solution.length)
    }
  })

  it('differs from seed to seed, and is the same for one seed', () => {
    expect(JSON.stringify(makePuzzle(3))).toBe(JSON.stringify(makePuzzle(3)))
    const distinct = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(makePuzzle(i + 1).pieces.map((p) => p.mass))))
    expect(distinct.size).toBeGreaterThan(10)
  })
})

describe('the start', () => {
  it('has an empty root bar, a full tray, and nothing hung', () => {
    const sim = start()
    const snap = sim.snapshot()
    expect(snap.bars.filter((b) => !b.tray)).toHaveLength(1)
    expect(snap.shapes.every((s) => s.tray)).toBe(true)
    expect(sim.observe().signature).toBe('1b/bare/some')
    expect(sim.affordances().length).toBeGreaterThan(0)
  })
})

describe('sway and settle', () => {
  it('hanging one shape tips the bar to that side, it swings past, and settles at rest', () => {
    const sim = start()
    const puzzle = makePuzzle(1)
    const shape = puzzle.solution.find((p) => p.parent === 0 && !puzzle.pieces[p.piece]!.isBar)!
    carry(sim, shape.piece, 0, shape.slot)
    const angles: number[] = []
    for (let i = 0; i < 150; i++) {
      sim.step()
      angles.push(sim.snapshot().bars.find((b) => b.root)!.angle)
    }
    const side = Math.sign(shape.slot)
    // The heavier (only loaded) side goes down, overshoots, and comes back.
    expect(Math.sign(angles[angles.length - 1]!)).toBe(side)
    const peak = Math.max(...angles.map((a) => Math.abs(a)))
    expect(peak).toBeGreaterThan(Math.abs(angles[angles.length - 1]!) * 1.15)
    expect(angles[angles.length - 1]).toBe(angles[angles.length - 2])
    expect(sim.observe().signature.split('/')[1]).toMatch(/tipped|lopsided/)
  })

  it('a heavy shape near the middle balances a light one far out, and the same two swapped do not', () => {
    // Any seed whose tray has two shapes of different weight that the lever law
    // can balance on the root: heavy x near = light x far.
    let found: { seed: number; heavy: number; light: number; near: number; far: number } | null = null
    for (let seed = 1; seed < 400 && !found; seed++) {
      const shapes = makePuzzle(seed).pieces.filter((p) => !p.isBar)
      for (const h of shapes) {
        for (const l of shapes) {
          if (h.mass <= l.mass || found) continue
          for (let near = 1; near <= 4; near++) {
            for (let far = near + 1; far <= 4; far++) {
              if (!found && h.mass * near === l.mass * far) found = { seed, heavy: h.id, light: l.id, near, far }
            }
          }
        }
      }
    }
    expect(found).not.toBeNull()
    const { seed, heavy, light, near, far } = found!

    const ok = start({ seed })
    carry(ok, heavy, 0, -near)
    run(ok, 130)
    carry(ok, light, 0, far)
    run(ok, 130)
    expect(ok.snapshot().bars.find((bar) => bar.root)!.status).toBe('balanced')

    // Swap the distances: the light one near the middle, the heavy one far out.
    const swapped = start({ seed })
    carry(swapped, heavy, 0, -far)
    run(swapped, 130)
    carry(swapped, light, 0, near)
    run(swapped, 130)
    const root = swapped.snapshot().bars.find((bar) => bar.root)!
    expect(root.status).toBe('tipped')
    // ... and it leans toward the heavy shape's side.
    expect(root.angle).toBeLessThan(0)
  })

  it('a small mobile hung from one end weighs the sum of what is on it', () => {
    // Find a seed whose solution hangs a bar from the root.
    let seed = 1
    let puzzle = makePuzzle(seed)
    while (!puzzle.solution.some((p) => p.parent === 0 && puzzle.pieces[p.piece]!.isBar) && seed < 400) puzzle = makePuzzle(++seed)
    const sim = start({ seed })
    build(sim, puzzle)
    const snap = sim.snapshot()
    const root = snap.bars.find((b) => b.root)!
    const sub = snap.bars.find((b) => !b.root && !b.tray)!
    expect(root.status).toBe('balanced')
    expect(sub.total).toBeGreaterThanOrEqual(3)
    // The root's torque counts that whole mobile at its hook.
    expect(root.torque).toBe(0)
  })
})

describe('the characteristic moment: the level mobile turns slowly on its hook', () => {
  it('a solved mobile settles level, turns, and completes', () => {
    const puzzle = makePuzzle(2)
    const sim = start({ seed: 2 })
    sim.observe()
    const seen: string[] = []
    for (const step of inBuildOrder(puzzle)) {
      carry(sim, step.piece, step.parent, step.slot)
      for (let i = 0; i < 130; i++) sim.step()
      seen.push(...names(sim))
    }
    run(sim, 200)
    seen.push(...names(sim))

    expect(seen).toContain('state:hang')
    expect(seen).toContain('state:turning')
    expect(seen).toContain('state:complete')
    const obs = sim.observe()
    expect(obs.signature).toMatch(/^\db\/(level|counter)\/all$/)
    const snap = sim.snapshot()
    expect(snap.complete).toBe(true)
    expect(snap.bars.filter((b) => !b.tray).every((b) => b.status === 'balanced')).toBe(true)
    expect(snap.bars.some((b) => b.turning)).toBe(true)
    expect(obs.features.balanced).toBe(snap.bars.filter((b) => !b.tray).length)
    expect(obs.features.turning).toBeGreaterThan(0)
  })

  it('the turning is visible: a turning bar narrows and widens as the mobile turns', () => {
    const puzzle = makePuzzle(2)
    const sim = start({ seed: 2 })
    build(sim, puzzle)
    const scales: number[] = []
    for (let i = 0; i < 160; i++) {
      sim.step()
      scales.push(sim.snapshot().bars.find((b) => b.root)!.scale)
    }
    expect(Math.min(...scales)).toBeLessThan(0.9)
    expect(Math.max(...scales)).toBeGreaterThan(0.99)
  })

  it('stops turning when poked, and turns again once it has settled', () => {
    const puzzle = makePuzzle(2)
    const sim = start({ seed: 2 })
    build(sim, puzzle)
    run(sim, 50)
    expect(sim.snapshot().bars.some((b) => b.turning)).toBe(true)
    sim.pointer({ id: 5, phase: 'down', x: 60, y: 300 }) // empty air: a puff of breeze
    sim.pointer({ id: 5, phase: 'up', x: 60, y: 300 })
    sim.step()
    expect(sim.snapshot().bars.find((b) => b.root)!.turning).toBe(false)
    run(sim, 260)
    expect(sim.snapshot().bars.find((b) => b.root)!.turning).toBe(true)
  })

  it('a mobile with a wrong piece is not level, and taking the piece away levels it', () => {
    const puzzle = makePuzzle(2)
    const sim = start({ seed: 2 })
    build(sim, puzzle)
    expect(sim.observe().signature).toMatch(/\/(level|counter)\/all$/)
    // Move one root shape to a free root slot: the balance is wrecked.
    const moved = puzzle.solution.find((p) => p.parent === 0 && !puzzle.pieces[p.piece]!.isBar)!
    const free = sim.snapshot().slots.find((s) => s.bar === 0 && s.free)!
    carry(sim, moved.piece, 0, free.slot)
    run(sim, 130)
    expect(sim.observe().signature).not.toMatch(/\/(level|counter)\//)
    // Back to its own slot.
    carry(sim, moved.piece, 0, moved.slot)
    run(sim, 200)
    expect(sim.observe().signature).toMatch(/\/(level|counter)\/all$/)
  })
})

describe('touch', () => {
  it('a piece let go over nothing near the tray goes home, and one let go in the air goes back to its slot', () => {
    const sim = start()
    const puzzle = makePuzzle(1)
    const shape = puzzle.solution.find((p) => p.parent === 0 && !puzzle.pieces[p.piece]!.isBar)!
    carry(sim, shape.piece, 0, shape.slot)
    run(sim, 60)
    const hungAt = where(sim, shape.piece)
    // Pick it off and let go in the empty air, far from any slot.
    sim.pointer({ id: 2, phase: 'down', x: hungAt.x, y: hungAt.y })
    sim.pointer({ id: 2, phase: 'move', x: 40, y: 520 })
    sim.pointer({ id: 2, phase: 'up', x: 40, y: 520 })
    expect(sim.snapshot().shapes.find((s) => s.id === shape.piece)!.tray).toBe(false)
    expect(sim.snapshot().slots.find((s) => s.bar === 0 && s.slot === shape.slot)!.free).toBe(false)
    // Now take it into the tray.
    const again = where(sim, shape.piece)
    sim.pointer({ id: 2, phase: 'down', x: again.x, y: again.y })
    sim.pointer({ id: 2, phase: 'move', x: 400, y: 700 })
    sim.pointer({ id: 2, phase: 'up', x: 400, y: 700 })
    expect(sim.snapshot().shapes.find((s) => s.id === shape.piece)!.tray).toBe(true)
    expect(sim.snapshot().slots.find((s) => s.bar === 0 && s.slot === shape.slot)!.free).toBe(true)
  })

  it('taking a bar with things on it into the tray sends the whole small mobile home', () => {
    let seed = 1
    let puzzle = makePuzzle(seed)
    while (!puzzle.solution.some((p) => p.parent === 0 && puzzle.pieces[p.piece]!.isBar) && seed < 400) puzzle = makePuzzle(++seed)
    const sim = start({ seed })
    build(sim, puzzle)
    const barStep = puzzle.solution.find((p) => p.parent === 0 && puzzle.pieces[p.piece]!.isBar)!
    const at = where(sim, barStep.piece)
    sim.pointer({ id: 1, phase: 'down', x: at.x, y: at.y })
    sim.pointer({ id: 1, phase: 'move', x: 600, y: 720 })
    sim.pointer({ id: 1, phase: 'up', x: 600, y: 720 })
    const snap = sim.snapshot()
    expect(snap.bars.find((b) => b.id === barStep.piece)!.tray).toBe(true)
    const below = puzzle.solution.filter((p) => p.parent === barStep.piece)
    for (const p of below) expect(snap.shapes.find((s) => s.id === p.piece)?.tray ?? true).toBe(true)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('reports affordances as top-left rectangles inside the field, centred on what they name', () => {
    const sim = start()
    const snap = sim.snapshot()
    const list = sim.affordances()
    for (const a of list) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
    for (const s of snap.shapes) {
      const match = list.find((a) => Math.abs(a.x + a.w / 2 - s.x) < 1e-9 && Math.abs(a.y + a.h / 2 - s.y) < 1e-9)
      expect(match, `an affordance centred on shape ${s.id}`).toBeDefined()
      expect(match!.kind).toBe('drag')
      expect(Math.min(match!.w, match!.h)).toBeGreaterThanOrEqual(44)
    }
  })
})

describe('determinism and the hooks list', () => {
  it('the same seed and the same play give the same signature and features', () => {
    const a = start({ seed: 4 })
    const b = start({ seed: 4 })
    const puzzle = makePuzzle(4)
    build(a, puzzle)
    build(b, puzzle)
    expect(a.observe()).toEqual(b.observe())
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()))
  })

  it('an empty hooks list means no hook events and no hook behaviour', () => {
    expect(meta.hooks).toEqual(['next-mobile'])
    const sim = start({ hooks: [] })
    const puzzle = makePuzzle(1)
    build(sim, puzzle)
    sim.observe()
    const events: string[] = []
    for (let i = 0; i < 400; i++) {
      sim.step()
      events.push(...names(sim))
    }
    expect(events.some((e) => e.startsWith('hook:'))).toBe(false)
    expect(sim.observe().signature).toMatch(/\/(level|counter)\/all$/)
    expect(sim.snapshot().round).toBeNull()
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 300; i++) {
      sim.pointer({ id: 3, phase: 'down', x: 30, y: 400 })
      sim.pointer({ id: 3, phase: 'up', x: 30, y: 400 })
    }
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the next-mobile hook', () => {
  it('takes a finished, turning mobile down after a spell and deals a fresh, bigger set', () => {
    const puzzle = makePuzzle(2)
    const sim = start({ seed: 2, hooks: ['next-mobile'] })
    build(sim, puzzle)
    expect(sim.snapshot().round).toBe(1)
    sim.observe()
    const events: string[] = []
    for (let i = 0; i < 400; i++) {
      sim.step()
      events.push(...names(sim))
    }
    expect(events).toContain('hook:next-mobile')
    const snap = sim.snapshot()
    expect(snap.round).toBe(2)
    expect(snap.shapes.every((s) => s.tray)).toBe(true)
    expect(snap.shapes.length + snap.bars.filter((b) => b.tray).length).toBeGreaterThanOrEqual(7)
    expect(sim.observe().signature).toBe('1b/bare/some')
  })

  it('does not fire on a mobile that is not finished', () => {
    const sim = start({ seed: 2, hooks: ['next-mobile'] })
    const puzzle = makePuzzle(2)
    build(sim, puzzle, puzzle.solution.length - 1)
    sim.observe()
    run(sim, 500)
    expect(names(sim).some((e) => e.startsWith('hook:'))).toBe(false)
  })
})

describe('hints', () => {
  it('point at the next piece and its slot after a quiet spell, only when hints are on', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    run(off, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    const hint = on.snapshot().hint!
    expect(hint).not.toBeNull()
    expect(hint.to.y).toBeLessThan(400)
    expect(off.snapshot().hint).toBeNull()
  })

  it('go away when the child touches, and never change the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 200)
    run(off, 200)
    expect(on.snapshot().hint).not.toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })

  it('following the hint over and over builds the solved mobile', () => {
    const sim = start({ seed: 5, hints: true })
    for (let round = 0; round < 20; round++) {
      run(sim, 200)
      const hint = sim.snapshot().hint
      if (!hint) break
      sim.pointer({ id: 1, phase: 'down', x: hint.from.x, y: hint.from.y })
      sim.pointer({ id: 1, phase: 'move', x: hint.to.x, y: hint.to.y })
      sim.pointer({ id: 1, phase: 'up', x: hint.to.x, y: hint.to.y })
    }
    run(sim, 200)
    expect(sim.observe().signature).toMatch(/\/(level|counter)\/all$/)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound: bars x states x used-all', () => {
    expect(meta.signatureBound).toBe(4 * 6 * 2)
  })

  it('names one objective feature, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })

  it('stays inside the field however long it runs', () => {
    const sim = start()
    run(sim, 1000)
    for (const s of sim.snapshot().shapes) {
      expect(s.x).toBeGreaterThan(0)
      expect(s.y).toBeLessThan(FIELD_H)
    }
  })
})
