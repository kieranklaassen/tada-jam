// Scripted play for Clanking Chasers. The characteristic moment is a HERD: one
// step of the child drives two or more robots into each other, and a round
// ends with the whole squad in one scrap heap. The tests carry their own tiny
// model of the rule (written differently from the sim's) so a sim that drifts
// from "every robot takes one straight step toward the child" fails here.

import { describe, expect, it } from 'vitest'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import type { Sim, SimEvent } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { CELL, COLS, ROWS, X0, Y0, childStep, createSim, robotsMove } from './sim.ts'
import type { ChaserSnapshot, Robot } from './sim.ts'

// Calibrated against the sim: over twelve seeds a planner clears nearly every
// round and puts the whole squad in one heap more than a third of the time; a
// child who only runs clears about three in ten.
const HERDER_MIN_HERDS = 3
const RUNNER_GAP = 4

type Snap = ChaserSnapshot
interface P {
  c: number
  r: number
}

function start(overrides: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): Sim<Snap> {
  return createSim({ seed: overrides.seed ?? 1, hooks: overrides.hooks ?? meta.hooks, hints: overrides.hints ?? true })
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

const centre = (c: number, r: number) => ({ x: X0 + c * CELL + CELL / 2, y: Y0 + r * CELL + CELL / 2 })

function tapCell(sim: Sim, c: number, r: number, id = 1): void {
  const p = centre(c, r)
  sim.pointer({ id, phase: 'down', ...p })
  sim.step()
  sim.pointer({ id, phase: 'up', ...p })
}

// ---------------------------------------------------------------------------
// The rule, as the tests understand it
// ---------------------------------------------------------------------------

const keyOf = (p: P) => `${p.c},${p.r}`

// Every robot steps once toward the child, all at the same time. A cell that
// two robots reach, or that already holds a heap, ends them. A robot that
// reaches the child catches it.
function model(child: P, robots: P[], heaps: P[]) {
  const landing = new Map<string, P[]>()
  for (const b of robots) {
    const to = { c: b.c + Math.sign(child.c - b.c), r: b.r + Math.sign(child.r - b.r) }
    landing.set(keyOf(to), [...(landing.get(keyOf(to)) ?? []), to])
  }
  const heapKeys = new Set(heaps.map(keyOf))
  const nextHeaps = [...heaps]
  const nextRobots: P[] = []
  let caught = false
  let destroyed = 0
  for (const [k, group] of landing) {
    if (k === keyOf(child)) caught = true
    else if (heapKeys.has(k)) destroyed += group.length
    else if (group.length > 1) {
      destroyed += group.length
      nextHeaps.push(group[0]!)
    } else nextRobots.push(group[0]!)
  }
  return { robots: nextRobots, heaps: nextHeaps, caught, destroyed }
}

const sameCells = (a: P[], b: P[]) => JSON.stringify(a.map(keyOf).sort()) === JSON.stringify(b.map(keyOf).sort())

// Where the child may go: the eight neighbours and staying put, minus heaps,
// robots, and the edge.
function moves(child: P, robots: P[], heaps: P[]): P[] {
  const blocked = new Set([...robots, ...heaps].map(keyOf))
  const list: P[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const p = { c: child.c + dc, r: child.r + dr }
      if (p.c >= 0 && p.c < COLS && p.r >= 0 && p.r < ROWS && !blocked.has(keyOf(p))) list.push(p)
    }
  }
  return list
}

const chebyshev = (a: P, b: P) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r))
const nearest = (child: P, robots: P[]) => (robots.length === 0 ? 99 : Math.min(...robots.map((b) => chebyshev(child, b))))

// A herder looks three turns ahead for the step that ends the most robots, and
// never steps into a catch.
function lookahead(child: P, robots: P[], heaps: P[], depth: number): number {
  let best = -1000
  for (const move of moves(child, robots, heaps)) {
    const turn = model(move, robots, heaps)
    if (turn.caught) continue
    let value = turn.destroyed * 10
    if (turn.robots.length === 0) value += 100
    else if (depth > 1) value += lookahead(move, turn.robots, turn.heaps, depth - 1)
    best = Math.max(best, value)
  }
  return best
}

function herderPick(snap: Snap): P {
  const robots = snap.robots
  const heaps = snap.heaps
  let best = snap.child
  let bestValue = -Infinity
  for (const move of moves(snap.child, robots, heaps)) {
    const turn = model(move, robots, heaps)
    if (turn.caught) continue
    let value = turn.destroyed * 10
    if (turn.robots.length === 0) value += 100
    else value += lookahead(move, turn.robots, turn.heaps, 2)
    value += 0.01 * nearest(move, turn.robots)
    if (value > bestValue) {
      bestValue = value
      best = move
    }
  }
  return best
}

// A runner does what a first-time child does: steps away from the closest
// robot, and never thinks about where the robots will bump.
function runnerPick(snap: Snap): P {
  let best = snap.child
  let bestGap = -1
  for (const move of moves(snap.child, snap.robots, snap.heaps)) {
    if (model(move, snap.robots, snap.heaps).caught) continue
    const gap = nearest(move, snap.robots)
    if (gap > bestGap) {
      bestGap = gap
      best = move
    }
  }
  return best
}

function playRound(sim: Sim<Snap>, pick: (snap: Snap) => P, maxTurns = 60): Snap {
  for (let turn = 0; turn < maxTurns; turn++) {
    const snap = sim.snapshot()
    if (snap.phase !== 'play') break
    const target = pick(snap)
    tapCell(sim, target.c, target.r)
  }
  return sim.snapshot()
}

const eventNames = (events: SimEvent[]) => events.map((e) => `${e.kind}:${e.name}`)

// ---------------------------------------------------------------------------

describe('the rule, piece by piece', () => {
  const blockedNever = () => false

  it('the child steps one square toward the tapped square, on the diagonal when both differ', () => {
    expect(childStep({ c: 5, r: 4 }, { c: 9, r: 1 }, blockedNever)).toEqual({ c: 6, r: 3 })
    expect(childStep({ c: 5, r: 4 }, { c: 5, r: 7 }, blockedNever)).toEqual({ c: 5, r: 5 })
    expect(childStep({ c: 5, r: 4 }, { c: 5, r: 4 }, blockedNever)).toEqual({ c: 5, r: 4 })
  })

  it('the child slides along an axis when the diagonal is blocked, and stays put when boxed in', () => {
    const heapAt = (c: number, r: number) => c === 6 && r === 3
    expect(childStep({ c: 5, r: 4 }, { c: 9, r: 1 }, heapAt)).toEqual({ c: 6, r: 4 })
    expect(childStep({ c: 5, r: 4 }, { c: 6, r: 3 }, (c, r) => c === 6 || r === 3)).toBeNull()
  })

  it('every robot takes one straight step toward the child', () => {
    const robots: Robot[] = [
      { id: 0, c: 0, r: 0, pc: 0, pr: 0 },
      { id: 1, c: 8, r: 1, pc: 8, pr: 1 },
      { id: 2, c: 5, r: 7, pc: 5, pr: 7 },
    ]
    const turn = robotsMove({ c: 4, r: 3 }, robots, [])
    expect(turn.robots.map((b) => [b.c, b.r])).toEqual([
      [1, 1],
      [7, 2],
      [4, 6],
    ])
    expect(turn.destroyed).toBe(0)
    expect(turn.caught).toBe(false)
  })

  it('two robots that step onto the same square tangle into one scrap heap', () => {
    const robots: Robot[] = [
      { id: 0, c: 3, r: 0, pc: 3, pr: 0 },
      { id: 1, c: 5, r: 0, pc: 5, pr: 0 },
      { id: 2, c: 10, r: 7, pc: 10, pr: 7 },
    ]
    const turn = robotsMove({ c: 4, r: 4 }, robots, [])
    expect(turn.heaps).toEqual([{ c: 4, r: 1, n: 2 }])
    expect(turn.destroyed).toBe(2)
    expect(turn.robots).toHaveLength(1)
  })

  it('a robot that steps into a scrap heap is stopped, and the heap grows', () => {
    const robots: Robot[] = [{ id: 0, c: 4, r: 0, pc: 4, pr: 0 }]
    const turn = robotsMove({ c: 4, r: 4 }, robots, [{ c: 4, r: 1, n: 2 }])
    expect(turn.robots).toHaveLength(0)
    expect(turn.heaps).toEqual([{ c: 4, r: 1, n: 3 }])
    expect(turn.joined).toBe(1)
  })

  it('a robot that steps onto the child catches it, even in a crowd', () => {
    const robots: Robot[] = [
      { id: 0, c: 3, r: 3, pc: 3, pr: 3 },
      { id: 1, c: 5, r: 5, pc: 5, pr: 5 },
    ]
    expect(robotsMove({ c: 4, r: 4 }, robots, []).caught).toBe(true)
  })
})

describe('the round', () => {
  it('starts with a full squad that keeps its distance and a child with room to step', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const snap = start({ seed }).snapshot()
      expect(snap.robots.length).toBe(4)
      expect(snap.phase).toBe('play')
      const cells = new Set([...snap.robots, ...snap.heaps, snap.child].map(keyOf))
      expect(cells.size).toBe(snap.robots.length + snap.heaps.length + 1)
      for (const b of snap.robots) expect(chebyshev(snap.child, b)).toBeGreaterThanOrEqual(3)
      expect(moves(snap.child, snap.robots, snap.heaps).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('different seeds lay the squad out differently, the same seed the same', () => {
    expect(JSON.stringify(start({ seed: 1 }).snapshot())).toBe(JSON.stringify(start({ seed: 1 }).snapshot()))
    const looks = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) looks.add(JSON.stringify(start({ seed }).snapshot().robots))
    expect(looks.size).toBeGreaterThan(8)
  })

  it('a tap steps the child one square and every robot answers with one step, as the model says', () => {
    const sim = start({ seed: 2 })
    for (let turn = 0; turn < 12; turn++) {
      const before = sim.snapshot()
      if (before.phase !== 'play') break
      const target = herderPick(before)
      const expected = model(target, before.robots, before.heaps)
      sim.observe()
      tapCell(sim, target.c, target.r)
      const after = sim.snapshot()
      expect(after.turns).toBe(before.turns + 1)
      expect(after.child).toEqual(target)
      if (expected.caught) break
      expect(sameCells(after.robots, expected.robots)).toBe(true)
      expect(sameCells(after.heaps, expected.heaps)).toBe(true)
    }
  })

  it('a tap far away is still one step', () => {
    const sim = start({ seed: 3 })
    const first = sim.snapshot()
    tapCell(sim, 0, 0)
    const stepped = sim.snapshot()
    expect(chebyshev(first.child, stepped.child)).toBe(1)
    expect(stepped.turns).toBe(1)
    // A tap out in the margin means "toward that edge" and still takes one step.
    const edge = start({ seed: 3 })
    edge.pointer({ id: 1, phase: 'down', x: 2, y: 2 })
    expect(edge.snapshot().turns).toBe(1)
  })

  it('a tap on a robot straight beside the child is refused and costs no turn', () => {
    let tried = 0
    for (let seed = 1; seed <= 30; seed++) {
      const sim = start({ seed })
      // Wait for the squad to close in until a robot stands straight beside the child
      // (a robot on the diagonal is slid around instead, see childStep).
      for (let turn = 0; turn < 10; turn++) {
        const snap = sim.snapshot()
        if (snap.phase !== 'play') break
        const beside = snap.robots.find((b) => chebyshev(snap.child, b) === 1 && (b.c === snap.child.c || b.r === snap.child.r))
        if (beside) {
          sim.observe()
          tapCell(sim, beside.c, beside.r)
          expect(sim.snapshot().turns).toBe(snap.turns)
          expect(sim.snapshot().robots).toEqual(snap.robots)
          expect(eventNames(sim.observe().events)).toEqual(['state:blocked'])
          tried++
          break
        }
        tapCell(sim, snap.child.c, snap.child.r)
      }
    }
    expect(tried).toBeGreaterThanOrEqual(3)
  })

  it('ignores non-finite coordinates, moves with no down, and an up with no down', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 300, y: 300 })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })
})

describe('the characteristic moment: a herd', () => {
  it('one step drives two or more robots into each other, and they become scrap', () => {
    // Seed 1 offers a bump inside the first few turns for a child who looks ahead.
    const sim = start({ seed: 1 })
    sim.observe()
    let bumped = 0
    for (let turn = 0; turn < 8 && bumped === 0; turn++) {
      const before = sim.snapshot()
      const target = herderPick(before)
      tapCell(sim, target.c, target.r)
      bumped = before.robots.length - sim.snapshot().robots.length
    }
    expect(bumped).toBeGreaterThanOrEqual(2)
    const obs = sim.observe()
    expect(eventNames(obs.events)).toContain('state:clank')
    expect(sim.snapshot().heaps.some((h) => h.n >= 2)).toBe(true)
    expect(obs.features.pile).toBeGreaterThanOrEqual(2)
    expect(obs.signature).toMatch(/\/(one-pile|herded)/)
  })

  it('a child who plans ahead herds the whole squad into one heap and clears the round', () => {
    let herded = 0
    for (let seed = 1; seed <= 12; seed++) {
      const sim = start({ seed })
      sim.observe()
      const done = playRound(sim, herderPick)
      if (done.phase === 'cleared' && done.heaps.filter((h) => h.n > 0).length === 1) {
        herded++
        expect(sim.observe().signature).toMatch(/\/herded-[123]$/)
      }
    }
    expect(herded).toBeGreaterThanOrEqual(HERDER_MIN_HERDS)
  })

  it('planning beats running: the same layouts, far more cleared rounds and stars', () => {
    let herderClears = 0
    let runnerClears = 0
    let herderTurns = 0
    let runnerTurns = 0
    for (let seed = 1; seed <= 12; seed++) {
      const herd = playRound(start({ seed }), herderPick)
      const run = playRound(start({ seed }), runnerPick)
      if (herd.phase === 'cleared') {
        herderClears++
        herderTurns += herd.turns
      }
      if (run.phase === 'cleared') {
        runnerClears++
        runnerTurns += run.turns
      }
    }
    expect(herderClears).toBeGreaterThanOrEqual(runnerClears + RUNNER_GAP)
    if (runnerClears > 0) expect(herderTurns / herderClears).toBeLessThan(runnerTurns / runnerClears)
  })
})

describe('rounds, catches, and retries', () => {
  it('a catch shows in the signature, then the same layout comes back for another try', () => {
    // A child who never moves is caught sooner or later.
    let sim: Sim<Snap> | null = null
    let first: Snap | null = null
    for (let seed = 1; seed <= 20 && sim === null; seed++) {
      const attempt = start({ seed })
      const layout = attempt.snapshot()
      for (let turn = 0; turn < 30 && attempt.snapshot().phase === 'play'; turn++) {
        const s = attempt.snapshot()
        tapCell(attempt, s.child.c, s.child.r)
      }
      if (attempt.snapshot().phase === 'caught') {
        sim = attempt
        first = layout
      }
    }
    expect(sim).not.toBeNull()
    const caught = sim!.observe()
    expect(caught.signature).toMatch(/\/caught$/)
    expect(caught.features.caught).toBe(1)
    expect(eventNames(caught.events)).toContain('state:caught')
    run(sim!, 45)
    const again = sim!.snapshot()
    expect(again.phase).toBe('play')
    expect(again.turns).toBe(0)
    expect(again.formation).toBe(first!.formation)
    expect(again.child).toEqual(first!.child)
    expect(sameCells(again.robots, first!.robots)).toBe(true)
    expect(sameCells(again.heaps, first!.heaps)).toBe(true)
  })

  function clearOne(hooks: readonly string[]): { sim: Sim<Snap>; cleared: Snap; events: string[] } {
    for (let seed = 1; seed <= 40; seed++) {
      const sim = start({ seed, hooks })
      sim.observe()
      const done = playRound(sim, herderPick)
      if (done.phase === 'cleared') return { sim, cleared: done, events: eventNames(sim.observe().events) }
    }
    throw new Error('the herder never cleared a round')
  }

  it('clearing a round starts a new one; the level hook adds a robot, and removing it does not', () => {
    const on = clearOne(['level', 'stars'])
    expect(on.events).toContain('hook:level')
    expect(on.events).toContain('hook:stars')
    // One star for clearing, one for par, one for a single heap.
    expect(on.cleared.stars).toBeGreaterThanOrEqual(on.cleared.heaps.filter((h) => h.n > 0).length === 1 ? 2 : 1)
    expect(on.cleared.stars).toBeLessThanOrEqual(3)
    run(on.sim, 60)
    const next = on.sim.snapshot()
    expect(next.phase).toBe('play')
    expect(next.round).toBe(1)
    expect(next.robots).toHaveLength(5)
    expect(next.formation).not.toBe(on.cleared.formation)
    expect(on.sim.observe().features.cleared).toBe(1)

    const off = clearOne([])
    expect(off.events.some((e) => e.startsWith('hook:'))).toBe(false)
    expect(off.cleared.stars).toBeNull()
    run(off.sim, 60)
    expect(off.sim.snapshot().robots).toHaveLength(4)
    expect(off.sim.snapshot().round).toBe(1)
  })

  it('the stars hook alone grades a cleared round in the signature; without it there is no grade', () => {
    const graded = clearOne(['stars'])
    expect(graded.sim.observe().signature).toMatch(/\/(herded|scattered)-[123]$/)
    expect(graded.events).toContain('hook:stars')
    expect(graded.events).not.toContain('hook:level')
    const plain = clearOne(['level'])
    expect(plain.sim.observe().signature).toMatch(/\/(herded|scattered)$/)
    expect(plain.events).not.toContain('hook:stars')
  })
})

describe('the hooks list', () => {
  it('an empty list means no hook events and no hook behaviour, however the round goes', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const sim = start({ seed, hooks: [] })
      for (let turn = 0; turn < 40; turn++) {
        const snap = sim.snapshot()
        if (snap.phase !== 'play') run(sim, 45)
        else {
          const target = herderPick(snap)
          tapCell(sim, target.c, target.r)
        }
        expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
      }
      expect(sim.snapshot().stars).toBeNull()
    }
  })
})

describe('signature, features, affordances, hints', () => {
  it('names outcome classes only, and stays inside the declared bound', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const sim = start({ seed })
      for (let turn = 0; turn < 120; turn++) {
        const snap = sim.snapshot()
        if (snap.phase !== 'play') run(sim, 45)
        else {
          const pick = turn % 3 === 0 ? runnerPick(snap) : herderPick(snap)
          tapCell(sim, pick.c, pick.r)
        }
        seen.add(sim.observe().signature)
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(6)
    expect(seen.size).toBeLessThanOrEqual(meta.signatureBound)
    for (const signature of seen) expect(signature).toMatch(/^(line|ring|corners|pillars|scatter)\/[a-z-]+(-[123])?$/)
  })

  it('reports the child neighbours as top-left cell rectangles inside the field', () => {
    const sim = start()
    const snap = sim.snapshot()
    const list = sim.affordances()
    expect(list.length).toBeGreaterThanOrEqual(5)
    for (const a of list) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
      expect(a.w).toBeGreaterThanOrEqual(60)
      expect(a.h).toBeGreaterThanOrEqual(60)
    }
    const own = list.find((a) => a.x === X0 + snap.child.c * CELL && a.y === Y0 + snap.child.r * CELL)
    expect(own).toBeDefined()
    // Tapping the centre of any listed rectangle does something.
    for (const a of list) {
      const probe = start()
      probe.observe()
      probe.pointer({ id: 1, phase: 'down', x: a.x + a.w / 2, y: a.y + a.h / 2 })
      const names = eventNames(probe.observe().events)
      expect(names.some((n) => n === 'state:step' || n === 'state:wait' || n === 'state:blocked')).toBe(true)
    }
  })

  it('shows where each robot will step after a quiet spell, only with hints on, and never changes the outcome', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    run(off, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 200)
    const hint = on.snapshot().hint
    expect(hint).not.toBeNull()
    expect(hint!.arrows).toHaveLength(4)
    expect(off.snapshot().hint).toBeNull()
    const arrow = hint!.arrows[0]!
    expect(Math.abs(arrow.c1 - arrow.c0)).toBeLessThanOrEqual(1)
    expect(Math.abs(arrow.r1 - arrow.r0)).toBeLessThanOrEqual(1)
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
    expect(JSON.stringify(on.affordances())).toBe(JSON.stringify(off.affordances()))
  })

  it('the same seed and the same taps give the same signatures', () => {
    const play = () => {
      const sim = start({ seed: 5 })
      const out: string[] = []
      for (let turn = 0; turn < 30; turn++) {
        const snap = sim.snapshot()
        if (snap.phase !== 'play') run(sim, 45)
        else {
          const target = herderPick(snap)
          tapCell(sim, target.c, target.r)
        }
        out.push(sim.observe().signature)
      }
      return out
    }
    expect(play()).toEqual(play())
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    for (let i = 0; i < 400; i++) tapCell(sim, 5, 4, 4)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound and observes every declared feature', () => {
    expect(meta.signatureBound).toBe(5 * (3 + 2 * 3 + 1))
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
    expect(meta.hooks).toEqual(['level', 'stars'])
  })
})
