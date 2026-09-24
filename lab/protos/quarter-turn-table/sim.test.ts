// Proof that Quarter-Turn Table reaches its characteristic moment: a ball is
// trapped riding a closed loop of arrows that the child's own flipper shots
// turned into place. The seam tests (buildSim with a setup) pin the physics
// one rule at a time; the recorded play at the bottom reaches the moment
// through createSim, pointer events, and step() alone.

import { describe, expect, it } from 'vitest'
import type { Sim, SimConfig } from '../../kit/sim.ts'
import { FIELD_H, FIELD_W } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import {
  BALL_R,
  BUMPER_R,
  COLS,
  FLIP_R,
  PIVOTS,
  REST_ANGLE,
  ROWS,
  SERVE_DELAY,
  TRAP_AT,
  buildSim,
  createSim,
  cyclesOf,
  nextOf,
} from './sim.ts'
import type { TableSnapshot } from './sim.ts'

const E = 0
const S = 1
const W = 2
const N = 3

// Arrows are listed row by row: index = row * 3 + col.
const CLOCKWISE_TOP_LEFT = [E, S, 0, N, W, 0, 0, 0, 0]

function config(overrides: Partial<SimConfig> = {}): SimConfig {
  return { seed: 1, hooks: meta.hooks, hints: true, ...overrides }
}

function run(sim: Sim, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

function snap(sim: Sim): TableSnapshot {
  return sim.snapshot() as TableSnapshot
}

function names(sim: Sim): string[] {
  return sim.observe().events.map((e) => e.name)
}

// A ball hung above a bumper column, falling straight down onto it.
function dropOn(col: number, row = 0) {
  return { x: COLS[col]!, y: ROWS[row]! - 90, vx: 0, vy: 2 }
}

describe('the arrow lattice', () => {
  it('finds a closed loop of four, and knows a head-on pair is not one', () => {
    const square = nextOf(CLOCKWISE_TOP_LEFT)
    expect(cyclesOf(square).filter((c) => c.length >= 4)).toHaveLength(1)
    expect(cyclesOf(square)[0]!.slice().sort()).toEqual([0, 1, 3, 4])
    // (0,0) points east at (1,0), which points west back at it.
    const clash = nextOf([E, W, E, E, E, E, E, E, E])
    expect(cyclesOf(clash).some((c) => c.length === 2)).toBe(true)
  })

  it('reads the perimeter as one loop of eight', () => {
    const ring = [E, E, S, N, 0, S, N, W, W]
    const cycles = cyclesOf(nextOf(ring)).filter((c) => c.length >= 4)
    expect(cycles).toHaveLength(1)
    expect(cycles[0]).toHaveLength(8)
  })

  it('starts every seed with nine bumpers and no closed loop yet', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const sim = createSim(config({ seed }))
      const table = snap(sim)
      expect(table.bumpers).toHaveLength(9)
      const arrows = table.bumpers.map((b) => b.k)
      expect(cyclesOf(nextOf(arrows)).length).toBe(0)
      expect(sim.observe().signature).toMatch(/^(scatter|trail|long)\//)
      expect(sim.observe().features.orbit).toBe(0)
    }
  })

  it('different seeds give different tables, the same seed the same', () => {
    const arrowsOf = (seed: number) => snap(createSim(config({ seed }))).bumpers.map((b) => b.k).join('')
    expect(arrowsOf(3)).toBe(arrowsOf(3))
    const distinct = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(arrowsOf))
    expect(distinct.size).toBeGreaterThanOrEqual(6)
  })
})

describe('the bumpers', () => {
  it('sling a ball out of the way their arrow points, whichever side it hit', () => {
    // Falling onto the top-middle bumper, which points east, hits its side:
    // it catches the ball and slings it east into the top-right bumper.
    const sim = buildSim(config(), { arrows: [S, E, S, 0, 0, 0, 0, 0, 0], balls: [dropOn(1)] })
    sim.observe()
    run(sim, 40)
    expect(names(sim)).toContain('kick')
    expect(snap(sim).balls[0]!.x).toBeGreaterThan(COLS[1]! + 30)
  })

  it('turn a quarter-turn clockwise when hit on the nose, and bounce the ball back', () => {
    // North-pointing bumper, ball falling onto its top: a nose hit.
    const sim = buildSim(config(), { arrows: [0, N, 0, 0, 0, 0, 0, 0, 0], balls: [{ x: COLS[1]!, y: ROWS[0]! - 90, vx: 0, vy: 3 }] })
    sim.observe()
    run(sim, 30)
    expect(names(sim)).toContain('turn')
    expect(snap(sim).bumpers[1]!.k).toBe(E)
    expect(snap(sim).balls[0]!.vy).toBeLessThan(0)
    expect(sim.observe().features.turns).toBe(1)
  })

  it('do not turn for a ball that only brushes their nose', () => {
    const sim = buildSim(config(), { arrows: [0, N, 0, 0, 0, 0, 0, 0, 0], balls: [{ x: COLS[1]!, y: ROWS[0]! - BUMPER_R - BALL_R - 1, vx: 0, vy: 0 }] })
    run(sim, 25)
    expect(snap(sim).bumpers[1]!.k).toBe(N)
  })

  it('keep a ball circling a closed loop of arrows, and call it trapped after a dozen slings', () => {
    const sim = buildSim(config(), { arrows: CLOCKWISE_TOP_LEFT, balls: [dropOn(0)] })
    sim.observe()
    run(sim, 300)
    const events = names(sim)
    expect(events).toContain('trap')
    const table = snap(sim)
    expect(table.balls[0]!.trapped).toBe(true)
    expect(table.balls[0]!.chain).toBeGreaterThan(TRAP_AT)
    const obs = sim.observe()
    expect(obs.signature).toBe('square/trapped')
    expect(obs.features.orbit).toBe(4)
    expect(obs.features.bestChain).toBeGreaterThanOrEqual(TRAP_AT)
    // Still inside the block of four bumpers a while later.
    run(sim, 300)
    const later = snap(sim).balls[0]!
    expect(later.x).toBeLessThan(COLS[1]! + 120)
    expect(later.y).toBeLessThan(ROWS[1]! + 120)
    expect(later.trapped).toBe(true)
  })

  it('serve a second ball down the side once the first is trapped, and let the loop be broken', () => {
    const sim = buildSim(config(), { arrows: CLOCKWISE_TOP_LEFT, balls: [dropOn(0)] })
    run(sim, 200 + SERVE_DELAY + 5)
    expect(snap(sim).balls.length).toBe(2)
    expect(sim.observe().features.balls).toBe(2)
  })
})

describe('the flippers', () => {
  it('raise on a hold of the left or right half, and bat a resting ball up the table', () => {
    for (const side of [0, 1] as const) {
      const sgn = side === 0 ? 1 : -1
      const t = 100
      const along = { x: PIVOTS[side]!.x + sgn * Math.cos(REST_ANGLE) * t, y: PIVOTS[side]!.y + Math.sin(REST_ANGLE) * t }
      const lift = BALL_R + FLIP_R + 1
      // The ball sits on top of the resting flipper: along the flipper's upward normal.
      const ball = { x: along.x + sgn * Math.sin(REST_ANGLE) * lift, y: along.y - Math.cos(REST_ANGLE) * lift, vx: 0, vy: 0 }
      const sim = buildSim(config(), { arrows: CLOCKWISE_TOP_LEFT, balls: [ball] })
      sim.observe()
      const x = side === 0 ? 200 : FIELD_W - 200
      sim.pointer({ id: 1, phase: 'down', x, y: 600 })
      run(sim, 12)
      expect(names(sim)).toContain('flip')
      expect(snap(sim).flippers[side]!.up).toBe(true)
      expect(snap(sim).balls[0]!.y).toBeLessThan(ball.y - 60)
      sim.pointer({ id: 1, phase: 'up', x, y: 600 })
      run(sim, 8)
      expect(snap(sim).flippers[side]!.up).toBe(false)
    }
  })

  it('never let a fast ball tunnel through a flipper, held up or swinging', () => {
    for (const side of [0, 1] as const) {
      const sgn = side === 0 ? 1 : -1
      for (let dx = 30; dx <= 130; dx += 20) {
        for (const swinging of [false, true]) {
          const x = PIVOTS[side]!.x + sgn * dx
          const sim = buildSim(config(), { arrows: CLOCKWISE_TOP_LEFT, balls: [{ x, y: 520, vx: 0, vy: 12 }] })
          const press = { id: 1, phase: 'down' as const, x: side === 0 ? 200 : FIELD_W - 200, y: 600 }
          if (!swinging) sim.pointer(press)
          for (let i = 0; i < 40; i++) {
            if (swinging && i === 3) sim.pointer(press)
            sim.step()
          }
          expect(sim.observe().features.drains, `side ${side} dx ${dx} swinging ${swinging}`).toBe(0)
          expect(snap(sim).balls[0]!.y).toBeLessThan(FIELD_H)
        }
      }
    }
  })

  it('lose a ball down the middle gap, then serve a fresh one after a short wait', () => {
    const sim = buildSim(config(), { arrows: CLOCKWISE_TOP_LEFT, balls: [{ x: FIELD_W / 2, y: FIELD_H - 30, vx: 0, vy: 4 }] })
    sim.observe()
    run(sim, 20)
    expect(names(sim)).toContain('drain')
    expect(snap(sim).balls).toHaveLength(0)
    run(sim, SERVE_DELAY + 3)
    expect(snap(sim).balls).toHaveLength(1)
    expect(sim.observe().features.drains).toBe(1)
  })

  it('never let a ball leave the table sideways or through the top', () => {
    const sim = createSim(config({ seed: 5 }))
    for (let i = 0; i < 2400; i++) {
      if (i % 37 === 0) sim.pointer({ id: 1, phase: 'down', x: i % 74 === 0 ? 200 : FIELD_W - 200, y: 500 })
      if (i % 37 === 9) sim.pointer({ id: 1, phase: 'up', x: 200, y: 500 })
      sim.step()
      for (const b of snap(sim).balls) {
        expect(b.x).toBeGreaterThan(0)
        expect(b.x).toBeLessThan(FIELD_W)
        expect(b.y).toBeGreaterThan(0)
      }
    }
  })
})

describe('the sim contract', () => {
  it('has an affordance at tick 0, every one a top-left rectangle inside the field', () => {
    const list = createSim(config()).affordances()
    expect(list.length).toBeGreaterThan(0)
    for (const a of list) {
      expect(a.x).toBeGreaterThanOrEqual(0)
      expect(a.y).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w).toBeLessThanOrEqual(FIELD_W)
      expect(a.y + a.h).toBeLessThanOrEqual(FIELD_H)
    }
  })

  it('has no hooks: an empty list means no hook events, and none are declared', () => {
    expect(meta.hooks).toEqual([])
    const sim = buildSim(config({ hooks: [] }), { arrows: CLOCKWISE_TOP_LEFT, balls: [dropOn(0)] })
    run(sim, 300)
    expect(sim.observe().events.some((e) => e.kind === 'hook')).toBe(false)
  })

  it('ignores non-finite coordinates and an up with no down', () => {
    const sim = createSim(config())
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('shows a hint after a quiet spell only with hints on, and the hint never changes the outcome', () => {
    const on = createSim(config({ hints: true }))
    const off = createSim(config({ hints: false }))
    run(on, 20)
    expect(snap(on).hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(snap(on).hint).not.toBeNull()
    expect(snap(off).hint).toBeNull()
    expect(on.observe().signature).toBe(off.observe().signature)
    expect(on.observe().features).toEqual(off.observe().features)
  })

  it('declares an honest signature bound and one objective feature that is observed', () => {
    expect(meta.signatureBound).toBe(7 * 4)
    expect(meta.features.filter((f) => f.objective)).toHaveLength(1)
    const observed = Object.keys(createSim(config()).observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})

// The characteristic moment through the front door. A rough flipper-timing
// bot (found by search, then frozen here as an input log) played seed 8 for
// 33 seconds: its ten nose hits turned arrows until four of them closed a
// loop, and the ball it batted into the loop circled until it was trapped.
// [tick, phase, x]: a hold of the left half (x 200) or the right (x 980).
const TRAP_PLAY: Array<[number, 'down' | 'up', number]> = [
  [72, 'down', 980], [80, 'up', 980], [84, 'down', 200], [93, 'up', 200], [121, 'down', 980], [130, 'up', 980],
  [160, 'down', 200], [167, 'up', 200], [316, 'down', 200], [326, 'up', 200], [396, 'down', 980], [405, 'up', 980],
  [536, 'down', 200], [545, 'up', 200], [566, 'down', 200], [574, 'up', 200], [574, 'down', 200], [581, 'up', 200],
  [585, 'down', 200], [595, 'up', 200], [631, 'down', 200], [640, 'up', 200], [784, 'down', 200], [794, 'up', 200],
]

function playTrap(seed: number, ticks = 1100) {
  const sim = createSim(config({ seed, hints: false }))
  const signatures: string[] = []
  const events: string[] = []
  let next = 0
  for (let tick = 0; tick < ticks; tick++) {
    while (next < TRAP_PLAY.length && TRAP_PLAY[next]![0] === tick) {
      const [, phase, x] = TRAP_PLAY[next++]!
      sim.pointer({ id: 1, phase, x, y: 600 })
    }
    sim.step()
    const obs = sim.observe()
    signatures.push(obs.signature)
    for (const e of obs.events) events.push(e.name)
  }
  return { sim, signatures, events }
}

describe('the characteristic moment: a trap the child built', () => {
  it('starts with no loop, turns arrows with flipper shots, closes a loop, and traps the ball', () => {
    const { sim, signatures, events } = playTrap(8)
    expect(signatures[0]).toMatch(/^(scatter|trail|long)\/free$/)
    expect(events.filter((e) => e === 'flip').length).toBeGreaterThan(5)
    expect(events.filter((e) => e === 'turn').length).toBeGreaterThanOrEqual(3)
    expect(events).toContain('trap')
    // The turns came first: the loop was made, not there from the start.
    expect(events.indexOf('turn')).toBeLessThan(events.indexOf('trap'))
    const moment = signatures.findIndex((sig) => sig.endsWith('/trapped'))
    expect(moment).toBeGreaterThan(0)
    expect(signatures[moment]).toMatch(/^(square|ring6|ring8|multi)\/trapped$/)
    const obs = sim.observe()
    expect(obs.features.orbit).toBeGreaterThanOrEqual(4)
    expect(obs.features.bestChain).toBeGreaterThanOrEqual(TRAP_AT)
  })

  it('gives the same signatures for the same seed and script, and no trap without the script', () => {
    expect(playTrap(8).signatures).toEqual(playTrap(8).signatures)
    const idle = createSim(config({ seed: 8, hints: false }))
    const seen = new Set<string>()
    for (let tick = 0; tick < 1100; tick++) {
      idle.step()
      seen.add(idle.observe().signature)
    }
    expect([...seen].some((sig) => sig.endsWith('/trapped'))).toBe(false)
  })
})
